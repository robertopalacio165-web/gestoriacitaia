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

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const {
      fullName,
      phone,
      email,
      nie,
      city,
      province,
      tramite,
    } = body;
    
console.log("PHONE RECEIVED:");
console.log(phone);
console.log("BODY:");
console.log(body);
    
    const session =
      await stripe.checkout.sessions.create({

        payment_method_types: ["card"],

        mode: "payment",

        metadata: {
          customer_name:
            fullName || "",

          customer_phone:
            phone || "",

          customer_email:
            email || "",

          customer_nie:
            nie || "",

          city:
            city || "",

          province:
            province || "",

          tramite:
            tramite || "",
        },

        line_items: [
          {
            price_data: {
              currency: "eur",

              product_data: {
                name:
                  "Reserva inicial Sara",
              },

          unit_amount: 1000,
            },

            quantity: 1,
          },
        ],

        success_url:
`${process.env.NEXT_PUBLIC_URL}/buscar-citas?paid=true`,

        cancel_url:
`${process.env.NEXT_PUBLIC_URL}/buscar-citas`,
      });

    return res.status(200).json({
      url: session.url,
    });

  } catch (err: any) {

    console.error(
      "STRIPE ERROR:",
      err
    );

    return res.status(500).json({
      error:
        err.message || "Server error",
    });

  }

}
