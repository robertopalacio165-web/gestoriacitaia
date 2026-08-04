import type { VercelRequest, VercelResponse } from "@vercel/node";
import { saveMaltaApplication } from "./saveMaltaApplication.js";
import { sendWelcomeEmail } from "./sendWelcomeEmail.js";

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
       skipQueue: true,
    });

// ============================================
// ✅ GENERAR CV + COVER LETTER (IGUAL QUE STRIPE)
// ============================================

let cvUrl = "";
let letterUrl = "";

try {
  const docsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/generate-malta-documents`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        applicationId: result.applicationId,
      }),
    }
  );

  if (docsResponse.ok) {
    const docs = await docsResponse.json();

    cvUrl = docs.cvUrl || "";
    letterUrl = docs.letterUrl || "";

    console.log("✅ CV y carta generados desde PayPal");
    console.log(cvUrl);
    console.log(letterUrl);

  } else {
    console.error(
      "❌ Error generando documentos:",
      await docsResponse.text()
    );
  }


   } catch (err) {
  console.error("❌ generate-malta-documents:", err);
}
// ============================================
// ✅ ENVIAR EMAIL DE BIENVENIDA (PAYPAL)
// ============================================

try {
await sendWelcomeEmail({
  email: email || "",
  name: fullName || "",
  plan: String(plan || "monthly"),
  cvUrl,
  letterUrl,
});

  console.log("✅ Email de bienvenida enviado (PayPal)");

} catch (err) {
  console.error("❌ Error enviando email de bienvenida:", err);
}
// ============================================
// ✅ AÑADIR A WORKER_QUEUE DESPUÉS DE GENERAR DOCUMENTOS
// ============================================

try {
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: queueError } = await supabase
    .from("worker_queue")
    .insert({
      application_id: result.applicationId,
      status: "ready",
      priority: 1,
      created_at: new Date().toISOString(),
    });

  if (queueError) {
    console.error("❌ Error añadiendo a worker_queue:", queueError);
  } else {
    console.log("✅ Añadido a worker_queue después de generar documentos");
  }

} catch (err) {
  console.error("❌ Error creando worker_queue:", err);
} 

    console.log(`✅ Aplicación procesada: ${result.applicationId} (${result.isNew ? "nueva" : "actualizada"})`);

    return res.status(200).json({
      success: true,
      applicationId: result.applicationId,
      isNew: result.isNew,
      message: result.isNew ? "Application created and queued" : "Application updated",
    });
} catch (error: any) {
  console.error("=========================================");
  console.error("❌ ERROR EN capturar-pago-paypal");
  console.error("=========================================");
  console.error("Mensaje:", error?.message);
  console.error("Stack:");
  console.error(error?.stack);
  console.error("Objeto completo:");
  console.error(error);
  console.error("=========================================");

  return res.status(500).json({
    success: false,
    error: error?.message || "Unknown error",
    stack: error?.stack || null,
  });
}

}
