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

    const {
      appointment_id,
      token,
    } = req.body;

const metadata = {
  appointment_id: appointment_id || "",
  token: token || "",
  customer_name: req.body.customer_name || "",
  customer_phone: req.body.customer_phone || "",
  customer_email: req.body.customer_email || "",
  city: req.body.city || "",
  office: req.body.office || "",
  appointment_date: req.body.appointment_date || "",
  appointment_hour: req.body.appointment_hour || "",
  tramite: req.body.tramite || "",
  type: "SARA_CONFIRMATION",
};

    const session = await stripe.checkout.sessions.create({

      metadata,

      payment_method_types: ["card"],

      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "eur",

            product_data: {
              name: "Reserva cita Sara",
            },

            unit_amount: 1399,
          },

          quantity: 1,
        },
      ],

     success_url:
`${process.env.NEXT_PUBLIC_URL}/buscar-citas?paid=true&success=true&appointment_id=${appointment_id}&token=${token}`,
      
      cancel_url:
`${process.env.NEXT_PUBLIC_URL}/cancel`,
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
