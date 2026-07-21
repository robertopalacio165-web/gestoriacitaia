import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ URL del webhook de Make para WhatsApp de bienvenida
const MAKE_WEBHOOK_MALTA =
  process.env.MAKE_WEBHOOK_MALTA ||
  "https://hook.eu1.make.com/noxce8cky0r0jr7ujf62fywggn3l824b";

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
    // ✅ ENVIAR WHATSAPP DE BIENVENIDA - ACTUALIZADO
    // ============================================
    fetch(MAKE_WEBHOOK_MALTA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tipo: "malta_bienvenida",

        id: data.id,

        nombre: fullName,
        whatsapp: whatsapp,
        email: email,

        plan: plan || "monthly",

        trabajo_busca: trabajo_busca,
        experiencia_previa: experiencia_previa,

        mensaje:
          `👋 Hola ${fullName}. Hemos recibido correctamente tu solicitud para Trabajo en Malta. En unos minutos comenzaremos a generar tu CV profesional y tu carta de presentación mediante IA. Después empezaremos a buscar ofertas adaptadas a tu perfil.`,

        fecha: new Date().toISOString(),
      }),
    })
    .then(async (response) => {
      if (!response.ok) {
        console.error(
          "❌ MAKE MALTA:",
          response.status,
          await response.text()
        );
      } else {
        console.log("✅ WhatsApp de bienvenida enviado");
      }
    })
    .catch((err) => {
      console.error("❌ Error enviando WhatsApp:", err);
    });

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
