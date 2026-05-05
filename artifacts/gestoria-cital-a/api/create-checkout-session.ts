import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productType } = req.body;

    let amount = 999; // default 9.99€
    let name = "Servicio";

    // 🎯 هنا الفرق: تختار الثمن حسب الخدمة
    if (productType === "cita") {
      amount = 999; // 9.99€
      name = "Reserva de cita";
    }

    if (productType === "regularizacion") {
      amount = 1299; // 12.99€
      name = "Regularización 2026 - Mohamed";
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: name,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],

      mode: "payment",

      success_url: `${process.env.NEXT_PUBLIC_URL}/regularizacion?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/regularizacion?cancel=true`,

      metadata: {
        productType,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe error" });
  }
}
