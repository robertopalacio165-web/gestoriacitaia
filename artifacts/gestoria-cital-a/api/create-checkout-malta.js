import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
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

    // ✅ TODOS LOS CAMPOS DEL FORMULARIO DE MALTA
    const {
      plan,
      fullName,
      whatsapp,
      email,
      nacionalidad,
      paisResidencia,
      fechaNacimiento,
      nivelIngles,
      otrosIdiomas,
      profesion,
      añosExperiencia,
      estudios,
      carnetConducir,
      tieneCV,
      puestoBusca,
      disponibilidadViajar,
      fechaDisponible,
    } = body;
    
    console.log("📞 WHATSAPP RECEIVED:", whatsapp);
    console.log("📋 BODY:", body);
    console.log("📋 PLAN:", plan);

    // ✅ CONSTRUIR WHATSAPP COMPLETO (sin espacios)
    const whatsappLimpio = whatsapp.replace(/\s/g, "");
    console.log("📞 WHATSAPP FINAL:", whatsappLimpio);

    // ✅ PRECIO SEGÚN PLAN
    const unitAmount = plan === "weekly" ? 1999 : 2999;
    const planName = plan === "weekly" ? "Plan Semanal" : "Plan Mensual";
    const planDays = plan === "weekly" ? "7 días" : "30 días";
    const planApplications = plan === "weekly" ? "70 candidaturas" : "300 candidaturas";

    const session = await stripe.checkout.sessions.create({

      payment_method_types: ["card"],

      mode: "payment",

      // ✅ METADATA COMPLETA - NOMBRES CONSISTENTES CON EL WEBHOOK
      metadata: {
        service: "malta",
        plan: plan || "monthly",

        // ✅ Coincide con webhook: customer_name, customer_phone, customer_email
        customer_name: fullName || "",
        customer_phone: whatsappLimpio || "",
        customer_email: email || "",

        // ✅ Coincide con webhook
        nacionalidad: nacionalidad || "",
        pais_residencia: paisResidencia || "",
        fecha_nacimiento: fechaNacimiento || "",
        nivel_ingles: nivelIngles || "",
        otros_idiomas: otrosIdiomas || "",
        profesion: profesion || "",
        anos_experiencia: añosExperiencia || "",  // ✅ SIN ACENTO
        estudios: estudios || "",
        carnet_conducir: carnetConducir || "",
        tiene_cv: tieneCV || "",
        puesto_busca: puestoBusca || "",
        disponibilidad_viajar: disponibilidadViajar || "",
        fecha_disponible: fechaDisponible || "",
      },

      line_items: [
        {
          price_data: {
            currency: "eur",

            product_data: {
              // ✅ NOMBRE DEL PRODUCTO SEGÚN PLAN
              name: `Trabajo en Malta - ${planName}`,
              description: `${planDays} · ${planApplications} · CV IA · Carta IA · WhatsApp`,
            },

            // ✅ PRECIO SEGÚN PLAN
            unit_amount: unitAmount,
          },

          quantity: 1,
        },
      ],

      success_url:
        `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paid=true&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${process.env.NEXT_PUBLIC_URL}/trabajo-malta`,
    });

    return res.status(200).json({
      url: session.url,
    });

  } catch (err: any) {

    console.error(
      "❌ STRIPE ERROR (MALTA):",
      err
    );

    return res.status(500).json({
      error:
        err.message || "Server error",
    });

  }

}
