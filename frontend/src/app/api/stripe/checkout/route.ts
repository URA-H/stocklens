import { auth } from "@/lib/auth";
import { stripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return Response.json(
      { error: "ユーザーが見つかりません" },
      { status: 404 }
    );
  }

  // Prevent duplicate subscriptions
  if (user.subscriptionStatus === "active") {
    return Response.json(
      { error: "すでに有効なサブスクリプションがあります" },
      { status: 400 }
    );
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PLANS.monthly.priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 30,
    },
    payment_method_collection: "if_required",
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?checkout=canceled`,
  });

  return Response.json({ url: checkoutSession.url });
}
