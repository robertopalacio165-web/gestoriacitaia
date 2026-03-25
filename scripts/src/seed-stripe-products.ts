import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not set. Connect Stripe integration first.");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });

async function main() {
  console.log("🚀 Creating GestoriaCitaIA Stripe products...\n");

  const plans = [
    {
      name: "Buscar Cita",
      description: "Búsqueda 24/7 de citas de extranjería con Sara IA",
      price: 999,
      envKey: "STRIPE_PRICE_CITA",
    },
    {
      name: "Regularización 2026",
      description: "Tramitación completa de regularización e indulto 2026",
      price: 999,
      envKey: "STRIPE_PRICE_REG",
    },
    {
      name: "Estándar",
      description: "Todo incluido: búsqueda de citas + regularización + asesoría premium",
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
    console.log(`${key}=${value}`);
  }

  console.log("\n✅ Done! Copy the price IDs above to your environment variables.");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
