import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export default async function handler(req: any, res: any) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    const { amount } = req.body;

    const session = await stripe.checkout.sessions.create({

      payment_method_types: ["card"],

      mode: "payment",

      // ❌ حيد SMS verification
      phone_number_collection: {
        enabled: false,
      },

      // ❌ ما ينشئش Link account
      customer_creation: "if_required",

      // ✅ checkout مباشر
      billing_address_collection: "auto",

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Análisis de expediente",
            },

            unit_amount: (amount || 12) * 100,
          },

          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_URL}/success`,

      cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
    });

    return res.status(200).json({
      url: session.url,
    });

  } catch (error: any) {

    console.error("STRIPE FULL ERROR:");
    console.error(error);
    console.error(error?.message);
    console.error(error?.stack);

    return res.status(500).json({
      error: error.message,
    });

  }
}
