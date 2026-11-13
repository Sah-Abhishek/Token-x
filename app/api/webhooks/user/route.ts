import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/app/lib/prisma";

/**
 * Clerk -> Postgres user sync.
 *
 * Subscribe this endpoint to user.created, user.updated and user.deleted in
 * the Clerk dashboard (Webhooks -> Endpoints), pointing at
 * https://<your-domain>/api/webhooks/user
 */

/** Derive a unique username. Deterministic, so a webhook redelivery resolves
 *  to the same value instead of minting a new one each time (the previous
 *  Date.now() suffix meant every retry produced a different username). */
async function deriveUsername(preferred: string | null, externalId: string): Promise<string> {
  const base =
    (preferred ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "trader";

  const taken = await prisma.user.findFirst({
    where: { username: base, NOT: { externalId } },
    select: { id: true },
  });

  if (!taken) return base;

  return `${base.slice(0, 20)}_${externalId.slice(-6).toLowerCase()}`;
}

export async function POST(req: Request) {
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("WEBHOOK_SECRET is not set; cannot verify Clerk webhooks.");
    return new Response("Server misconfigured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    // Previously returned an implicit 200, so Clerk recorded unverifiable
    // deliveries as successful and never retried them.
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  let evt: WebhookEvent;

  try {
    evt = new Webhook(webhookSecret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, primary_email_address_id, first_name, last_name, username } =
          evt.data;

        const primaryEmail =
          email_addresses.find((email) => email.id === primary_email_address_id) ??
          email_addresses[0];

        if (!primaryEmail) {
          // Nothing to key the record on, and a retry will not help.
          console.error(`No email address on Clerk user ${id}; skipping.`);
          return new Response("No email address on user", { status: 200 });
        }

        const email = primaryEmail.email_address;
        const name = `${first_name ?? ""} ${last_name ?? ""}`.trim() || email.split("@")[0];
        const resolvedUsername = await deriveUsername(username ?? email.split("@")[0], id);

        // upsert, not create: Clerk retries deliveries, and a duplicate
        // user.created previously hit the unique constraint and 500'd.
        const user = await prisma.user.upsert({
          where: { externalId: id },
          create: { externalId: id, email, name, username: resolvedUsername },
          update: {
            email,
            name,
            // Only overwrite the username when Clerk actually has one, so an
            // update event never clobbers a derived handle with a new guess.
            ...(username ? { username: resolvedUsername } : {}),
          },
        });

        console.log(`Synced user ${user.id} (${evt.type})`);
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;

        if (!id) {
          return new Response("No user id on delete event", { status: 400 });
        }

        const user = await prisma.user.findUnique({
          where: { externalId: id },
          select: { id: true },
        });

        if (!user) {
          // Already gone. Acknowledge so Clerk stops retrying.
          return new Response("User already absent", { status: 200 });
        }

        // The relations are ON DELETE RESTRICT, so dependants must go first.
        // One transaction keeps a partial delete from stranding orphan rows.
        await prisma.$transaction([
          prisma.trade.deleteMany({ where: { userId: user.id } }),
          prisma.bet.deleteMany({ where: { userId: user.id } }),
          prisma.holding.deleteMany({ where: { userId: user.id } }),
          prisma.user.delete({ where: { id: user.id } }),
        ]);

        console.log(`Deleted user ${user.id} and their trading history`);
        break;
      }

      default:
        // Unsubscribed event types are acknowledged, not retried.
        break;
    }
  } catch (error) {
    console.error(`Failed to process ${evt.type}:`, error);
    // 5xx so Clerk retries a transient database failure.
    return new Response("Failed to process webhook", { status: 500 });
  }

  return new Response("Webhook received", { status: 200 });
}
