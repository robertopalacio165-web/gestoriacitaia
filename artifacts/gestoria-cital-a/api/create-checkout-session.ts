import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productType } = req.body || {};

    let amount = 1200;
    let name = "Servicio";

    if (productType === "regularizacion") {
      amount = 1200;
      name = "Regularización 2026 - Mohamed";
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: amount,
            product_data: {
              name,
            },
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_URL}/regularizacion-2026?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/regularizacion-2026?cancel=true`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("❌ STRIPE ERROR FULL:", err);
    return res.status(500).json({
      error: err.message || "Stripe error",
    });
  }
}
