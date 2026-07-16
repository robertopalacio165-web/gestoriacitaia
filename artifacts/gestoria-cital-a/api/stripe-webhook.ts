import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET no configurado");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const rawBody = await getRawBody(req);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // ✅ MEJORA: Log completo de metadata para depuración
    console.log("=========================================");
    console.log("📦 METADATA COMPLETA RECIBIDA:");
    console.log(JSON.stringify(metadata, null, 2));
    console.log("=========================================");
    console.log("✅ Checkout completado:", session.id);

    // ============================================
    // 1. DATOS PERSONALES (adaptados al nuevo formulario)
    // ============================================
    const fullName = metadata.fullName || "";
    const whatsapp = metadata.whatsapp || "";
    const email = metadata.email || "";
    
    // ✅ CORREGIDO: nationality en lugar de nacionalidad
    const nationality = metadata.nationality || "";
    
    // ✅ NUEVO: currentCity
    const currentCity = metadata.currentCity || "";
    
    // ✅ CORREGIDO: countryResidence en lugar de paisResidencia
    const countryResidence = metadata.countryResidence || "";
    
    const fechaNacimiento = metadata.fechaNacimiento || "";
    
    // ============================================
    // 2. IDIOMAS
    // ============================================
    const idiomas = metadata.idiomas || "";
    const ingles_nivel = metadata.ingles_nivel || "";
    const frances_nivel = metadata.frances_nivel || "";
    const italiano_nivel = metadata.italiano_nivel || "";
    const espanol_nivel = metadata.espanol_nivel || "";
    const arabe_nivel = metadata.arabe_nivel || "";
    const aleman_nivel = metadata.aleman_nivel || "";
    
    // ============================================
    // 3. EXPERIENCIA
    // ============================================
    const profesion = metadata.profesion || "";
    const añosExperiencia = metadata.añosExperiencia || "";
    
    // ✅ NUEVO: education_level
    const educationLevel = metadata.education_level || "";
    
    const sectores = metadata.sectores || "";
    
    // ============================================
    // 4. CARNET
    // ============================================
    const carnetConducir = metadata.carnetConducir || "";
    
    // ============================================
    // 5. PREFERENCIAS (NUEVOS)
    // ============================================
    const preferredPosition = metadata.preferred_position || "";
    const workPreference = metadata.work_preference || "";
    const willingToRelocate = metadata.willing_to_relocate === "Yes";
    
    // ============================================
    // 6. CV Y DOCUMENTOS
    // ============================================
    // ✅ CORREGIDO: El formulario envía "Sí" o "No" en español
    // Si el formulario cambia a inglés, cambiar aquí también
    const tieneCV = metadata.tieneCV === "Sí";
    
    const cvUrl = metadata.cvUrl || "";
    const photoUrl = metadata.photoUrl || "";
    const pdfUrl = metadata.pdfUrl || "";
    
    // ============================================
    // 7. PLAN
    // ============================================
    const plan = metadata.plan || "monthly";

    // ============================================
    // 8. CAMPOS ELIMINADOS (ya no se usan)
    // ============================================
    // ❌ ELIMINADO: pasaporteValido
    // ❌ ELIMINADO: entrevistaVideo
    // ❌ ELIMINADO: disponibilidadInicio
    // ❌ ELIMINADO: estudios (ahora se usa education_level)

    // ============================================
    // 9. LOG DE VERIFICACIÓN
    // ============================================
    console.log("📋 DATOS PROCESADOS:");
    console.log("  - fullName:", fullName);
    console.log("  - nationality:", nationality);
    console.log("  - currentCity:", currentCity);
    console.log("  - countryResidence:", countryResidence);
    console.log("  - educationLevel:", educationLevel);
    console.log("  - preferredPosition:", preferredPosition);
    console.log("  - workPreference:", workPreference);
    console.log("  - willingToRelocate:", willingToRelocate);
    console.log("  - tieneCV:", tieneCV);
    console.log("  - photoUrl:", photoUrl);
    console.log("  - cvUrl:", cvUrl);
    console.log("  - pdfUrl:", pdfUrl);

    // ============================================
    // 10. INSERT EN SUPABASE (adaptado al nuevo formulario)
    // ============================================
    // ⚠️ IMPORTANTE: Asegúrate de que la tabla tenga estas columnas:
    // - nationality (antes nacionalidad)
    // - country_residence (antes pais_residencia)
    // - current_city (NUEVA)
    // - education_level (NUEVA)
    // - preferred_position (NUEVA)
    // - work_preference (NUEVA)
    // - willing_to_relocate (NUEVA)
    // - pdf_url (NUEVA)
    
    const { data, error } = await supabase
      .from("malta_applications")
      .insert({
        // Datos personales
        full_name: fullName,
        whatsapp: whatsapp,
        email: email,
        
        // ✅ CORREGIDO: nationality
        nationality: nationality,
        
        // ✅ NUEVO: current_city
        current_city: currentCity,
        
        // ✅ CORREGIDO: country_residence
        country_residence: countryResidence,
        
        fecha_nacimiento: fechaNacimiento || null,
        
        // Idiomas
        idiomas: idiomas,
        ingles_nivel: ingles_nivel,
        frances_nivel: frances_nivel,
        italiano_nivel: italiano_nivel,
        espanol_nivel: espanol_nivel,
        arabe_nivel: arabe_nivel,
        aleman_nivel: aleman_nivel,
        
        // Experiencia
        profesion: profesion,
        anos_experiencia: añosExperiencia,
        
        // ✅ NUEVO: education_level
        education_level: educationLevel,
        
        sectores: sectores,
        
        // Carnet
        carnet_conducir: carnetConducir,
        
        // ✅ NUEVAS PREFERENCIAS
        preferred_position: preferredPosition,
        work_preference: workPreference,
        willing_to_relocate: willingToRelocate,
        
        // CV y documentos
        tiene_cv: tieneCV,
        cv_url: cvUrl,
        photo_url: photoUrl,
        pdf_url: pdfUrl,
        
        // Plan
        plan: plan,
        
        // Stripe
        stripe_session_id: session.id,
        worker_status: "waiting",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error insertando en Supabase:");
      console.error(JSON.stringify(error, null, 2));
      return res.status(500).json({ error });
    }

    console.log("✅ Registro creado en Supabase:", data.id);
    console.log("📸 photo_url guardada:", data.photo_url);
    console.log("📄 cv_url guardada:", data.cv_url);
    console.log("📎 pdf_url guardada:", data.pdf_url);
    console.log("🏙️ current_city guardada:", data.current_city);
    console.log("📚 education_level guardada:", data.education_level);
    console.log("💼 preferred_position guardada:", data.preferred_position);
    console.log("🔧 work_preference guardada:", data.work_preference);
    console.log("🔄 willing_to_relocate guardado:", data.willing_to_relocate);

    // ============================================
    // 11. LLAMAR A GENERATE-MALTA-DOCUMENTS
    // ============================================
    try {
      await fetch(`${process.env.NEXT_PUBLIC_URL}/api/generate-malta-documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: data.id,
        }),
      });

      console.log("✅ Generación de documentos iniciada");
    } catch (err) {
      console.error("❌ Error llamando generate-malta-documents:", err);
    }

    // ============================================
    // 12. NOTIFICACIÓN A MAKE
    // ============================================
    try {
      const webhookUrl = process.env.MAKE_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "new_application",
            applicationId: data.id,
            fullName: fullName,
            whatsapp: whatsapp,
            email: email,
            plan: plan,
            nationality: nationality,
            currentCity: currentCity,
            preferredPosition: preferredPosition,
          }),
        });
        console.log("✅ Notificación enviada a Make");
      }
    } catch (webhookError) {
      console.error("⚠️ Error enviando a Make:", webhookError);
    }
  }

  return res.status(200).json({ received: true });
}

async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}
