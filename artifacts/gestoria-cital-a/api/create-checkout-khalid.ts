import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2024-06-20",
  }
);

export default async function handler(
  req: any,
  res: any
) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

   const session =
  await stripe.checkout.sessions.create({

    payment_method_types: ["card"],

    mode: "payment",

customer_creation: "if_required",

    phone_number_collection: {
      enabled: false,
    },

    line_items: [
          {
            price_data: {
              currency: "eur",

              product_data: {
                name: "Khalid IA Premium",
              },

              unit_amount: 1199,
            },

            quantity: 1,
          },
        ],

        success_url:
          `${process.env.NEXT_PUBLIC_URL}/khalid-extranjeria?paid=true`,

        cancel_url:
          `${process.env.NEXT_PUBLIC_URL}/khalid-extranjeria`,
      });

    return res.status(200).json({
      url: session.url,
    });

  } catch (error: any) {

    console.error(error);

    return res.status(500).json({
      error: error.message,
    });

  }
}
