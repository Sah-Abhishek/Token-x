import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import type { User } from "@/app/generated/prisma";

/**
 * Resolve the signed-in Clerk user to their row in Postgres.
 *
 * The Clerk webhook is the primary sync path, but it only fires for accounts
 * created after the endpoint was configured, and it cannot fire at all in
 * local development without a tunnel. Creating the row on first sight here
 * means a signed-in user always has somewhere to put a trade.
 */
export async function getCurrentDbUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { externalId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) return null;

  const base =
    (clerkUser.username ?? email.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "trader";

  const taken = await prisma.user.findFirst({
    where: { username: base },
    select: { id: true },
  });

  const username = taken ? `${base.slice(0, 20)}_${userId.slice(-6).toLowerCase()}` : base;

  // upsert rather than create: two tabs loading at once would otherwise race
  // and one would hit the unique constraint on externalId.
  return prisma.user.upsert({
    where: { externalId: userId },
    create: {
      externalId: userId,
      email,
      username,
      name:
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        email.split("@")[0],
    },
    update: {},
  });
}

/** True when the failure is the database being unreachable rather than a bug
 *  in our own logic. Neon suspends idle projects, so this is a normal state
 *  to render around instead of a 500. */
export function isDatabaseUnreachable(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return (
    code === "P1001" || // can't reach database server
    code === "P1002" || // timed out
    code === "P1017" || // server closed the connection
    code === "P2024" // connection pool timeout
  );
}
