import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import Stripe from "stripe";
import {
  sendSubscriptionConfirmEmail,
  sendPaymentFailedEmail,
  sendCancellationEmail,
} from "@/lib/email";

function mapSubscriptionStatus(status: Stripe.Subscription.Status): string {
  const map: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    unpaid: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "expired",
    canceled: "canceled",
    paused: "paused",
  };
  return map[status] ?? "canceled";
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const createdUser = await prisma.user.update({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionId: subscription.id,
          subscriptionStatus: mapSubscriptionStatus(subscription.status),
        },
        select: { email: true, name: true },
      });

      // Send confirmation email when subscription becomes active
      if (
        event.type === "customer.subscription.created" &&
        subscription.status === "active"
      ) {
        sendSubscriptionConfirmEmail(
          createdUser.email,
          createdUser.name || ""
        );
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const deletedUser = await prisma.user.update({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionStatus: "expired",
          subscriptionId: null,
        },
        select: { email: true, name: true },
      });

      sendCancellationEmail(deletedUser.email, deletedUser.name || "");
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        const failedUser = await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "past_due" },
          select: { email: true, name: true },
        });

        sendPaymentFailedEmail(failedUser.email, failedUser.name || "");
      }
      break;
    }
  }

  return Response.json({ received: true });
}
