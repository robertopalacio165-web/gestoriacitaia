import Stripe from "stripe";

async function getStripeClient(): Promise<Stripe> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", "stripe");
    url.searchParams.set("environment", "development");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    });
    const data = await response.json() as { items?: any[] };
    const conn = data.items?.[0];

    if (conn?.settings?.secret) {
      console.log("✅ Using Stripe credentials from Replit connector\n");
      return new Stripe(conn.settings.secret as string, { apiVersion: "2025-02-24.acacia" });
    }
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (key) {
    console.log("✅ Using STRIPE_SECRET_KEY from environment\n");
    return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }

  throw new Error("No Stripe credentials found. Connect Stripe integration or set STRIPE_SECRET_KEY.");
}

async function main() {
  console.log("🚀 Creating GestoriaCitaIA Stripe products...\n");

  const stripe = await getStripeClient();

  const plans = [
    {
      name: "Buscar Cita",
      description: "Búsqueda 24/7 de citas de extranjería con la IA de Sara",
      price: 999,
      envKey: "STRIPE_PRICE_CITA",
    },
    {
      name: "Regularización 2026",
      description: "Tramitación completa de regularización e indulto 2026 con IA",
      price: 999,
      envKey: "STRIPE_PRICE_REG",
    },
    {
      name: "Estándar",
      description: "Todo incluido: búsqueda de citas + regularización + asesoría premium IA",
      price: 1999,
      envKey: "STRIPE_PRICE_STD",
    },
  ];

  const priceIds: Record<string, string> = {};

  for (const plan of plans) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { app: "gestoriacitaia" },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: "eur",
      recurring: { interval: "month" },
    });

    priceIds[plan.envKey] = price.id;
    console.log(`✅ ${plan.name}: ${price.id}`);
  }

  console.log("\n📋 Add these to your environment variables:\n");
  for (const [key, value] of Object.entries(priceIds)) {
    console.log(`   ${key}=${value}`);
  }

  console.log("\n✅ Done! Stripe products created in sandbox mode.");
  console.log("   When you're ready for production, re-run this after connecting your live Stripe account.");
}

main().catch(err => {
  console.error("❌ Error:", (err as Error).message);
  process.exit(1);
});
