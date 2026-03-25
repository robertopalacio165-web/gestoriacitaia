import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { getStripeClient } from "../stripeClient";
import { getUserByEmail, getUserByStripeCustomerId, getUserByStripeSubscriptionId, upsertUser, updateUserSubscription } from "../storage";

const stripeRouter: IRouter = Router();

const PLAN_PRICE_IDS: Record<string, string> = {
  cita: process.env.STRIPE_PRICE_CITA ?? "",
  reg: process.env.STRIPE_PRICE_REG ?? "",
  std: process.env.STRIPE_PRICE_STD ?? "",
};

const PLAN_NAMES: Record<string, string> = {
  cita: "Buscar Cita",
  reg: "Regularización",
  std: "Estándar",
};

stripeRouter.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    const { planId, email, name } = req.body as { planId: string; email: string; name?: string };

    if (!planId || !email) {
      res.status(400).json({ error: "planId and email are required" });
      return;
    }

    const priceId = PLAN_PRICE_IDS[planId];
    if (!priceId) {
      res.status(400).json({ error: `Unknown plan: ${planId}. Set STRIPE_PRICE_${planId.toUpperCase()} env var.` });
      return;
    }

    const stripe = getStripeClient();

    let user = await getUserByEmail(email);
    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: name ?? undefined,
        metadata: { planId },
      });
      customerId = customer.id;

      await upsertUser({
        email,
        name: name ?? null,
        stripeCustomerId: customerId,
      });
    }

    const origin = req.headers.origin ?? `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancelado`,
      metadata: { planId, email },
      allow_promotion_codes: true,
      locale: "es",
    });

    res.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe] create-checkout-session error:", msg);
    res.status(500).json({ error: msg });
  }
});

stripeRouter.get("/subscription-status", async (req: Request, res: Response) => {
  try {
    const { email } = req.query as { email?: string };
    if (!email) {
      res.status(400).json({ error: "email required" });
      return;
    }

    const user = await getUserByEmail(email);
    if (!user) {
      res.json({ active: false, planId: null });
      return;
    }

    res.json({
      active: user.subscriptionStatus === "active",
      planId: user.planId,
      status: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

stripeRouter.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn("[Stripe] STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
    res.status(200).json({ received: true });
    return;
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook error";
    console.error("[Stripe] Webhook signature verification failed:", msg);
    res.status(400).json({ error: msg });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.metadata?.email ?? (session.customer_details?.email as string);
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const planId = session.metadata?.planId ?? "";

        if (email) {
          const stripe = getStripeClient();
          const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
          await updateUserSubscription(email, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? undefined,
            stripePriceId: subscription?.items.data[0]?.price.id,
            stripeProductId: subscription?.items.data[0]?.price.product as string | undefined,
            subscriptionStatus: "active",
            planId,
            currentPeriodEnd: subscription ? new Date((subscription as any).current_period_end * 1000) : undefined,
            cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
          });
          console.log(`[Stripe] Subscription activated for ${email} (plan: ${planId})`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer as string;
        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          await updateUserSubscription(user.email, {
            subscriptionStatus: sub.status,
            currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer as string;
        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          await updateUserSubscription(user.email, {
            subscriptionStatus: "inactive",
            stripeSubscriptionId: undefined,
            planId: undefined,
          });
          console.log(`[Stripe] Subscription cancelled for ${user.email}`);
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Handler error";
    console.error("[Stripe] Webhook handler error:", msg);
    res.status(500).json({ error: msg });
  }
});

export default stripeRouter;
