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
    // ✅ 1. OBTENER EL BODY PRIMERO
    const body = req.body;

    console.log("========== BODY RECIBIDO ==========");
    console.log(body);
    console.log("==================================");

    // ✅ 2. DESESTRUCTURACIÓN ACTUALIZADA - snake_case
    const {
      fullName,
      whatsapp,
      email,

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

      photoUrl,
      pdfUrl,


      plan,
    
      } = body;
      // Determinar precio según el plan
const unitAmount = 100;
const planName = plan === "weekly" ? "Semanal" : "Mensual";

    console.log("========== DOCUMENTOS ==========");
    console.log("photoUrl:", photoUrl);
    console.log("pdfUrl:", pdfUrl);
    console.log("nationality:", nationality);
    console.log("currentCity:", currentCity);
    console.log("trabajo_busca:", trabajo_busca);
    console.log("experiencia_previa:", experiencia_previa);
    console.log("anos_experiencia:", anos_experiencia);
    console.log("education_level:", education_level);
    console.log("=================================");

    const session = await stripe.checkout.sessions.create({
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
              name: `Búsqueda de Empleo Malta - Plan ${planName}`,
              description: `Plan ${planName} de búsqueda de empleo en Malta con IA`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?canceled=true`,
      // ✅ 3. METADATA ACTUALIZADA - snake_case
      metadata: {
        fullName: fullName?.trim() || "",
        whatsapp: whatsapp?.trim() || "",
        email: email?.trim().toLowerCase() || "",

        nationality: nationality?.trim() || "",
        currentCity: currentCity?.trim() || "",

        fechaNacimiento: fechaNacimiento?.trim() || "",

        idiomas: idiomas?.trim() || "",
        ingles_nivel: ingles_nivel?.trim() || "",
        frances_nivel: frances_nivel?.trim() || "",
        italiano_nivel: italiano_nivel?.trim() || "",
        espanol_nivel: espanol_nivel?.trim() || "",
        arabe_nivel: arabe_nivel?.trim() || "",
        aleman_nivel: aleman_nivel?.trim() || "",

        trabajo_busca: trabajo_busca?.trim() || "",
        experiencia_previa: experiencia_previa?.trim() || "",
        anos_experiencia: anos_experiencia?.trim() || "",
        education_level: education_level?.trim() || "",

        carnetConducir: carnetConducir?.trim() || "",

        photoUrl: photoUrl?.trim() || "",
        pdfUrl: pdfUrl?.trim() || "",

        plan: plan?.trim() || "monthly",
      },
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error("❌ Error creating Stripe session:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
}
