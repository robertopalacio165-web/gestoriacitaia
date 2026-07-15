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
    const {
      fullName,
      whatsapp,
      email,
      nacionalidad,
      paisResidencia,
      fechaNacimiento,
      idiomas,
      ingles_nivel,
      frances_nivel,
      italiano_nivel,
      espanol_nivel,
      arabe_nivel,
      aleman_nivel,
      profesion,
      añosExperiencia,
      estudios,
      sectores,
      carnetConducir,
      tieneCV,
      cvUrl,
      photoUrl,
      pdfUrl,
      pasaporteValido,
      entrevistaVideo,
      disponibilidadInicio,
      plan
    } = req.body;

    // Determinar precio según el plan
    const unitAmount = plan === "weekly" ? 1999 : 2999;
    const planName = plan === "weekly" ? "Semanal" : "Mensual";
console.log("========== DOCUMENTOS ==========");
console.log("photoUrl:", photoUrl);
console.log("cvUrl:", cvUrl);
console.log("pdfUrl:", pdfUrl);
console.log("================================");
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
      metadata: {
        fullName: fullName || "",
        whatsapp: whatsapp || "",
        email: email || "",
        nacionalidad: nacionalidad || "",
        paisResidencia: paisResidencia || "",
        fechaNacimiento: fechaNacimiento || "",
        idiomas: idiomas || "",
        ingles_nivel: ingles_nivel || "",
        frances_nivel: frances_nivel || "",
        italiano_nivel: italiano_nivel || "",
        espanol_nivel: espanol_nivel || "",
        arabe_nivel: arabe_nivel || "",
        aleman_nivel: aleman_nivel || "",
        profesion: profesion || "",
        añosExperiencia: añosExperiencia || "",
        estudios: estudios || "",
        sectores: sectores || "",
        carnetConducir: carnetConducir || "",
        tieneCV: tieneCV || "",
        cvUrl: cvUrl || "",
        photoUrl: photoUrl || "",
        pdfUrl: pdfUrl || "",
        pasaporteValido: pasaporteValido || "",
        entrevistaVideo: entrevistaVideo || "",
        disponibilidadInicio: disponibilidadInicio || "",
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
