import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {

  try {

    console.log("🚀 STRIPE API HIT");

    console.log(
      "✅ SECRET EXISTS:",
      !!process.env.STRIPE_SECRET_KEY
    );

    const body = await req.json();

    console.log("📦 BODY:", body);

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

    console.log("🌍 BASE URL:", baseUrl);

    console.log("💳 CREATING STRIPE SESSION...");

    const session = await stripe.checkout.sessions.create({

      mode: "payment",

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

      success_url:
        `${baseUrl}/regularizacion-2026?paid=true`,

      cancel_url:
        `${baseUrl}/regularizacion-2026?canceled=true`,

      metadata: {
        productType: productType || "unknown",
      },
    });

    console.log("✅ SESSION CREATED:", session.id);

    return Response.json({
      url: session.url,
    });

  } catch (err: any) {

    console.error("❌ STRIPE FULL ERROR:", err);

    return Response.json(
      {
        error: err?.message || "Stripe error",
      },
      {
        status: 500,
      }
    );
  }
}
