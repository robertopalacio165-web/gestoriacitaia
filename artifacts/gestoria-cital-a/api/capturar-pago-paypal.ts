import type { VercelRequest, VercelResponse } from "@vercel/node";
import { saveMaltaApplication } from "./saveMaltaApplication";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { 
      plan, 
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
      paypal_order_id,
      paypal_payer_id,
    } = req.body;

    console.log("=========================================");
    console.log("📦 PAYPAL PAYLOAD RECIBIDO:");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("=========================================");

    // ============================================
    // ✅ LLAMAR A LA FUNCIÓN COMPARTIDA
    // ============================================
    const result = await saveMaltaApplication({
      plan: (plan || "monthly") as "weekly" | "monthly",
      fullName: fullName || "",
      whatsapp: whatsapp || "",
      email: email || "",
      nationality: nationality || "",
      currentCity: currentCity || "",
      fechaNacimiento: fechaNacimiento || "",
      idiomas: idiomas || "",
      ingles_nivel: ingles_nivel || "",
      frances_nivel: frances_nivel || "",
      italiano_nivel: italiano_nivel || "",
      espanol_nivel: espanol_nivel || "",
      arabe_nivel: arabe_nivel || "",
      aleman_nivel: aleman_nivel || "",
      trabajo_busca: trabajo_busca || "",
      experiencia_previa: experiencia_previa || "",
      anos_experiencia: anos_experiencia || "",
      education_level: education_level || "",
      carnetConducir: carnetConducir || "None",
      photoUrl: photoUrl || null,
      pdfUrl: pdfUrl || null,
      payment_method: "paypal",
      payment_id: paypal_order_id,
      payment_customer_id: paypal_payer_id || undefined,
      payment_intent: undefined,
    });

    console.log(`✅ Aplicación procesada: ${result.applicationId} (${result.isNew ? "nueva" : "actualizada"})`);

    return res.status(200).json({
      success: true,
      applicationId: result.applicationId,
      isNew: result.isNew,
      message: result.isNew ? "Application created and queued" : "Application updated",
    });

  } catch (error) {
    console.error("❌ Error en capturar-pago-paypal:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
