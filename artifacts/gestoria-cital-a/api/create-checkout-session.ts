import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-03-31.basil",
  }
);

export async function POST(req: Request) {

  try {

    console.log("🚀 API START");

    const body = await req.json();

    console.log("BODY:", body);

    const session = await stripe.checkout.sessions.create({

      mode: "payment",

      line_items: [
        {
          price_data: {

            currency: "eur",

            unit_amount: 1200,

            product_data: {
              name: "Regularización 2026 - Mohamed",
            },
          },

          quantity: 1,
        },
      ],

      success_url:
        "https://gestoriacitaia.com/regularizacion-2026?paid=true",

      cancel_url:
        "https://gestoriacitaia.com/regularizacion-2026?canceled=true",
    });

    console.log("SESSION:", session.id);

    return Response.json({
      url: session.url,
    });

  } catch (error: any) {

    console.error("STRIPE ERROR:", error);

    return Response.json(
      {
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}
