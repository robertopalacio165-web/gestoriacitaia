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

    // ✅ 2. DESESTRUCTURACIÓN ACTUALIZADA con todos los nuevos campos usando 'body'
    const {
      fullName,
      whatsapp,
      email,

      nationality,
      currentCity,
      countryResidence,

      fechaNacimiento,

      idiomas,
      ingles_nivel,
      frances_nivel,
      italiano_nivel,
      espanol_nivel,
      arabe_nivel,
      aleman_nivel,

      profesion,
      anosExperiencia,
      estudios, // ✅ AÑADIDO: estudios
      education_level,

      sectores,
      carnetConducir,

      preferred_position,
      work_preference,
      willing_to_relocate,

      tieneCV,
      cvUrl,
      photoUrl,
      pdfUrl,

      plan,
    } = body;

    // Determinar precio según el plan
    const unitAmount = plan === "weekly" ? 1999 : 2999;
    const planName = plan === "weekly" ? "Semanal" : "Mensual";

    console.log("========== DOCUMENTOS ==========");
    console.log("photoUrl:", photoUrl);
    console.log("cvUrl:", cvUrl);
    console.log("pdfUrl:", pdfUrl);
    console.log("nationality:", nationality);
    console.log("currentCity:", currentCity);
    console.log("countryResidence:", countryResidence);
    console.log("preferred_position:", preferred_position);
    console.log("work_preference:", work_preference);
    console.log("willing_to_relocate:", willing_to_relocate);
    console.log("education_level:", education_level);
    console.log("estudios:", estudios); // ✅ AÑADIDO: log de estudios
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
      // ✅ 3. METADATA ACTUALIZADA con todos los nuevos campos
      metadata: {
        fullName: fullName || "",
        whatsapp: whatsapp || "",
        email: email || "",

        nationality: nationality || "",
        currentCity: currentCity || "",
        countryResidence: countryResidence || "",

        fechaNacimiento: fechaNacimiento || "",

        idiomas: idiomas || "",
        ingles_nivel: ingles_nivel || "",
        frances_nivel: frances_nivel || "",
        italiano_nivel: italiano_nivel || "",
        espanol_nivel: espanol_nivel || "",
        arabe_nivel: arabe_nivel || "",
        aleman_nivel: aleman_nivel || "",

        profesion: profesion || "",
        anosExperiencia: anosExperiencia || "",
        estudios: estudios || "", // ✅ AÑADIDO: estudios en metadata
        education_level: education_level || "",

        sectores: sectores || "",
        carnetConducir: carnetConducir || "",

        preferred_position: preferred_position || "",
        work_preference: work_preference || "",
        willing_to_relocate: willing_to_relocate || "Yes",

        tieneCV: tieneCV || "",

        cvUrl: cvUrl || "",
        photoUrl: photoUrl || "",
        pdfUrl: pdfUrl || "",

        plan: plan || "monthly",
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
