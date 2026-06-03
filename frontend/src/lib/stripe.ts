import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_PRICE_ID!,
    name: "スタンダードプラン",
    price: 1980,
    interval: "month" as const,
  },
} as const;
