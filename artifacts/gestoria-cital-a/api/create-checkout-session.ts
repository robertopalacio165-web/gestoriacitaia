import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
apiVersion: "2024-06-20",
});

export default async function handler(req: any, res: any) {

  // ✅ غير POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    // ✅ حل مشكل Vercel body
    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const { productType } = body || {};

    // 💰 الثمن
    let amount = 1200;
    let name = "Servicio";

    if (productType === "regularizacion") {
      amount = 1200;
      name = "Regularización 2026 - Mohamed";
    }

    // 🌍 رابط الموقع
    const baseUrl =
      process.env.NEXT_PUBLIC_URL ||
      "http://localhost:5173";

    // ✅ إنشاء Stripe Checkout
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

      // ✅ من بعد الأداء
      success_url: `${baseUrl}/regularizacion-2026?paid=true`,

      // ❌ إلا خرج
      cancel_url: `${baseUrl}/regularizacion-2026?canceled=true`,

      metadata: {
        productType: productType || "unknown",
      },
    });

    // ✅ رجع الرابط
    return res.status(200).json({
      url: session.url,
    });

  } catch (err: any) {

    console.error("❌ STRIPE ERROR FULL:", err);

    return res.status(500).json({
      error: err.message || "Stripe error",
    });
  }
}
