import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

function cleanString(value: unknown, maxLength = 200): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  if (!stripe) {
    console.error("Falta la variable de entorno STRIPE_SECRET_KEY.");
    return res.status(500).json({
      error: "Stripe no está configurado en el servidor.",
    });
  }

  try {
    const body = req.body ?? {};

    const fullName = cleanString(body.fullName, 200);
    const email = cleanString(body.email, 320).toLowerCase();
    const whatsapp = cleanString(body.whatsapp, 40);

    if (!fullName) {
      return res.status(400).json({ error: "Introduce tu nombre completo." });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Introduce un correo electrónico válido.",
      });
    }

    if (!whatsapp) {
      return res.status(400).json({
        error: "Introduce tu número de WhatsApp.",
      });
    }

    // Datos opcionales del formulario. No envíes documentos privados en metadata.
    const nationality = cleanString(body.nationality, 100);
    const currentCity = cleanString(body.currentCity, 120);
    const fechaNacimiento = cleanString(body.fechaNacimiento, 30);
    const idiomas = cleanString(body.idiomas, 300);
    const ingles_nivel = cleanString(body.ingles_nivel, 50);
    const frances_nivel = cleanString(body.frances_nivel, 50);
    const italiano_nivel = cleanString(body.italiano_nivel, 50);
    const espanol_nivel = cleanString(body.espanol_nivel, 50);
    const arabe_nivel = cleanString(body.arabe_nivel, 50);
    const aleman_nivel = cleanString(body.aleman_nivel, 50);
    const trabajo_busca = cleanString(body.trabajo_busca, 200);
    const experiencia_previa = cleanString(body.experiencia_previa, 200);
    const anos_experiencia = cleanString(body.anos_experiencia, 50);
    const education_level = cleanString(body.education_level, 100);
    const carnetConducir = cleanString(body.carnetConducir, 30);

    const baseUrl = (
      process.env.NEXT_PUBLIC_URL || "https://gestoriacitaia.com"
    ).replace(/\/+$/, "");

    const metadata: Record<string, string> = {
      service: "malta",
      product: "all_available_offers",
      payment_type: "one_time",
      plan: "single_payment_test_0_50",
      fullName,
      email,
      whatsapp,
      nationality,
      currentCity,
      fechaNacimiento,
      idiomas,
      ingles_nivel,
      frances_nivel,
      italiano_nivel,
      espanol_nivel,
      arabe_nivel,
      aleman_nivel,
      trabajo_busca,
      experiencia_previa,
      anos_experiencia,
      education_level,
      carnetConducir,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      customer_creation: "always",
      payment_method_types: ["card"],
      invoice_creation: {
        enabled: true,
      },
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: 50,
            product_data: {
              name: "Ofertas de empleo disponibles en Malta",
              description:
                "PRECIO DE PRUEBA: 0,50 €. Recibirás las ofertas disponibles en el momento de la compra. No es una suscripción y no incluye futuras ofertas.",
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        receipt_email: email,
        metadata,
      },
      metadata,
      success_url:
        `${baseUrl}/trabajo-malta?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/trabajo-malta?canceled=true`,
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    console.error("Error creando Stripe Checkout de Malta:", error);
    return res.status(500).json({
      error: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    });
  }
}
