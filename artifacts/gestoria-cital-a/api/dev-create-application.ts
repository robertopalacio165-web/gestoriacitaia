import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendWelcomeEmail } from "../src/lib/sendWelcomeEmail";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Obtener el body
    const body = req.body;

    console.log("========== DEV CREATE APPLICATION ==========");
    console.log("📦 Body recibido:", JSON.stringify(body, null, 2));
    console.log("============================================");

    // ✅ Desestructurar todos los campos - ACTUALIZADO
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
    } = body;

    // ✅ Insertar directamente en Supabase (modo desarrollo) - ACTUALIZADO
    const { data, error } = await supabase
      .from("malta_applications")
      .insert({
        full_name: fullName || "",
        whatsapp: whatsapp || "",
        email: email || "",
        nacionalidad: nationality || "",
        nationality: nationality || "",
        current_city: currentCity || "",
        fecha_nacimiento: fechaNacimiento || null,
        idiomas: idiomas || "",
        ingles_nivel: ingles_nivel || "",
        frances_nivel: frances_nivel || "",
        italiano_nivel: italiano_nivel || "",
        espanol_nivel: espanol_nivel || "",
        arabe_nivel: arabe_nivel || "",
        aleman_nivel: aleman_nivel || "",
        // Nuevos campos
        trabajo_busca: trabajo_busca || "",
        experiencia_previa: experiencia_previa || "",
        // Compatibilidad con columnas antiguas
        profesion: trabajo_busca || "",
        sectores: experiencia_previa || "",
        anos_experiencia: anos_experiencia || "",
        education_level: education_level || "",
        estudios: education_level || "",
        carnet_conducir: carnetConducir || "",
        photo_url: photoUrl || "",
        pdf_url: pdfUrl || "",
        plan: plan || "monthly",
        paid: true,
        worker_status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error insertando en Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Aplicación creada en modo DEV: ${data.id}`);

    // ============================================
    // ✅ ENVIAR EMAIL DE BIENVENIDA
    // ============================================
    try {
      await sendWelcomeEmail({
        email,
        name: fullName,
        plan: plan || "monthly",
      });
      console.log("✅ Email de bienvenida enviado");
    } catch (err) {
      console.error("❌ Error enviando email de bienvenida:", err);
    }

    // ✅ Añadir a la cola de trabajo
    const { error: queueError } = await supabase
      .from("worker_queue")
      .insert({
        application_id: data.id,
        status: "pending",
        priority: 1,
        created_at: new Date().toISOString(),
      });

    if (queueError) {
      console.error("❌ Error añadiendo a worker_queue:", queueError);
    } else {
      console.log(`✅ Añadido a la cola de trabajo: ${data.id}`);
    }

    // ✅ Generar CV y carta inmediatamente (modo administrador)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/generate-malta-documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId: data.id,
          }),
        }
      );

      // ✅ Mejor control de errores
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error generate-malta-documents:", errorText);
      } else {
        const result = await response.json();
        console.log("✅ Documentos generados:", result);
      }
    } catch (err) {
      console.error("❌ Error generando documentos:", err);
    }

    // ✅ Responder con éxito
    return res.status(200).json({
      success: true,
      applicationId: data.id,
      message: "Application created in dev mode",
      url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?success=true&dev=true`,
    });

  } catch (error: any) {
    console.error("❌ Error en dev-create-application:", error);
    return res.status(500).json({ error: error.message });
  }
}
