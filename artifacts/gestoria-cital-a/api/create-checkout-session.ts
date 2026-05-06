import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: any, res: any) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    console.log("KEY EXISTS:", !!process.env.STRIPE_SECRET_KEY);

    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const { productType } = body || {};

    let amount = 1200;
    let name = "Servicio";

    if (productType === "regularizacion") {
      amount = 1200;
      name = "Regularización 2026 - Mohamed";
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_URL ||
      "https://gestoriacitaia.com";

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

      success_url: `${baseUrl}/regularizacion-2026?paid=true`,

      cancel_url: `${baseUrl}/regularizacion-2026?canceled=true`,

      metadata: {
        productType: productType || "unknown",
      },
    });

    return res.status(200).json({
      url: session.url,
    });

  } catch (err: any) {

    console.error("❌ STRIPE ERROR FULL:", err);

    return res.status(500).json({
      error: err?.message || "Stripe error",
    });
  }
}
