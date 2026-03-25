import Stripe from "stripe";

/**
 * Returns a Stripe client using STRIPE_SECRET_KEY environment variable.
 * Works in any hosting environment (Vercel, Railway, Render, etc.).
 *
 * To connect Stripe:
 * 1. Get your secret key from https://dashboard.stripe.com/apikeys
 * 2. Add STRIPE_SECRET_KEY=sk_live_... to your Vercel environment variables
 * 3. Re-deploy
 */
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add your Stripe secret key to the environment variables.",
    );
  }
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}
