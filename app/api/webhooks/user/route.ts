import { Webhook } from 'svix';
import { headers } from 'next/headers';

import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '../../../lib/prisma'


export async function POST(req: Request) {
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Please add webhook secret");


  }
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured --no svix headers");
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature
    }) as WebhookEvent;
  } catch (err) {
    console.log("Error verifying response: ", err);
    return new Response("Error occured", { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType == "user.created") {
    try {
      const { email_addresses, primary_email_address_id } = evt.data;
      console.log("email_addresses: ", email_addresses);
      console.log("primary_email_address_id: ", primary_email_address_id);

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      )

      if (!primaryEmail) {
        return new Response("No primary email found: ", { status: 400 });
      }

      // create a user in neon (postgres)

      const newUser = await prisma.user.create({
        data: {
          //@ts-ignore
          externalId: id,
          name: evt.data.first_name + " " + evt.data.last_name || primaryEmail.email_address

        }
      })

      console.log("A new user was created: ", newUser);

    } catch {
      return new Response("Error while creating user in db: ", { status: 400 })

    }


  }

  return new Response("Webhook recieved successfully: ", { status: 200 });


}
