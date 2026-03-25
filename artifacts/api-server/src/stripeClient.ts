import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Connect the Stripe integration or add STRIPE_SECRET_KEY to environment variables.",
    );
  }

  _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return _stripe;
}
