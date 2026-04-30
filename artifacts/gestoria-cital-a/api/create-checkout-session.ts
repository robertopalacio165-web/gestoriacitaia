import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, appointment_id } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Reserva de cita extranjería",
            },
            unit_amount: 3000, // 30€
          },
          quantity: 1,
        },
      ],

      mode: "payment",

      success_url: `${process.env.NEXT_PUBLIC_URL}/checkout-success?token=${token}&appointment_id=${appointment_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/confirmar`,

      metadata: {
        token,
        appointment_id,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe error" });
  }
}
