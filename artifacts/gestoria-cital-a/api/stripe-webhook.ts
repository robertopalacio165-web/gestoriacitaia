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

// ✅ URL del webhook de Make
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || "https://hook.eu1.make.com/5ugo16vgnvx2rhhu3mwjfag553d1g0ij";

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

    console.log("=========================================");
    console.log("📦 METADATA COMPLETA RECIBIDA:");
    console.log(JSON.stringify(metadata, null, 2));
    console.log("=========================================");
    console.log("✅ Checkout completado:", session.id);

    // ============================================
    // 1. DATOS PERSONALES
    // ============================================
    const fullName = metadata.fullName || "";
    const whatsapp = metadata.whatsapp || "";
    const email = metadata.email || "";
    const nationality = metadata.nationality || "";
    const currentCity = metadata.currentCity || "";
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
    // ✅ CAMBIO 1: añosExperiencia -> anosExperiencia
    const anosExperiencia = metadata.anosExperiencia || "";
    const educationLevel = metadata.education_level || "";
    const sectores = metadata.sectores || "";
    
    // ============================================
    // 4. CARNET
    // ============================================
    const carnetConducir = metadata.carnetConducir || "";
    
    // ============================================
    // 5. PREFERENCIAS
    // ============================================
    const preferredPosition = metadata.preferred_position || "";
    const workPreference = metadata.work_preference || "";
    const willingToRelocate = metadata.willing_to_relocate === "Yes";
    
    // ============================================
    // 6. CV Y DOCUMENTOS
    // ============================================
    // ✅ CAMBIO 2: tieneCV ahora acepta "Yes" o "Sí"
    const tieneCV =
      metadata.tieneCV === "Yes" ||
      metadata.tieneCV === "Sí";
    const cvUrl = metadata.cvUrl || "";
    const photoUrl = metadata.photoUrl || "";
    const pdfUrl = metadata.pdfUrl || "";
    
    // ============================================
    // 7. PLAN
    // ============================================
    const plan = metadata.plan || "monthly";

    console.log("📋 DATOS PROCESADOS:");
    console.log("  - fullName:", fullName);
    console.log("  - nationality:", nationality);
    console.log("  - currentCity:", currentCity);
    console.log("  - photoUrl:", photoUrl);
    console.log("  - cvUrl:", cvUrl);

    // ============================================
    // ✅ 8. VERIFICAR SI YA EXISTE (ANTES DE INSERTAR)
    // ============================================
    const { data: existing, error: checkError } = await supabase
      .from("malta_applications")
      .select("id, worker_status")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking existing application:", checkError);
    }

    let applicationId: string;
    let isNew = false;

    // ============================================
    // ✅ 9. SI YA EXISTE -> ACTUALIZAR
    // ============================================
    if (existing) {
      applicationId = existing.id;
      console.log(`🔄 Actualizando aplicación existente: ${applicationId}`);

      const updateData: any = {
        full_name: fullName,
        whatsapp: whatsapp,
        email: email,
        // ✅ CAMBIO 3: nationality -> nacionalidad
        nacionalidad: nationality,
        current_city: currentCity,
        // ✅ CAMBIO 3: country_residence -> pais_residencia
        pais_residencia: countryResidence,
        fecha_nacimiento: fechaNacimiento || null,
        idiomas: idiomas,
        ingles_nivel: ingles_nivel,
        frances_nivel: frances_nivel,
        italiano_nivel: italiano_nivel,
        espanol_nivel: espanol_nivel,
        arabe_nivel: arabe_nivel,
        aleman_nivel: aleman_nivel,
        profesion: profesion,
        // ✅ CAMBIO 3: anos_experiencia usa la variable correcta
        anos_experiencia: anosExperiencia,
        education_level: educationLevel,
        sectores: sectores,
        carnet_conducir: carnetConducir,
        preferred_position: preferredPosition,
        work_preference: workPreference,
        willing_to_relocate: willingToRelocate,
        tiene_cv: tieneCV,
        cv_url: cvUrl,
        photo_url: photoUrl,
        pdf_url: pdfUrl,
        plan: plan,
        paid: true,
        updated_at: new Date().toISOString(),
      };

      if (session.payment_intent) {
        updateData.stripe_payment_intent = session.payment_intent as string;
      }

      const { error: updateError } = await supabase
        .from("malta_applications")
        .update(updateData)
        .eq("id", applicationId);

      if (updateError) {
        console.error("❌ Error updating application:", updateError);
        return res.status(500).json({ error: "Failed to update application" });
      }

      console.log(`✅ Aplicación ${applicationId} actualizada correctamente`);

    } else {
      // ============================================
      // ✅ 10. SI NO EXISTE -> INSERTAR
      // ============================================
      isNew = true;
      console.log("🆕 Creando nueva aplicación");

      const { data: newApp, error: insertError } = await supabase
        .from("malta_applications")
        .insert({
          full_name: fullName,
          whatsapp: whatsapp,
          email: email,
          // ✅ CAMBIO 4: nationality -> nacionalidad
          nacionalidad: nationality,
          current_city: currentCity,
          // ✅ CAMBIO 4: country_residence -> pais_residencia
          pais_residencia: countryResidence,
          fecha_nacimiento: fechaNacimiento || null,
          idiomas: idiomas,
          ingles_nivel: ingles_nivel,
          frances_nivel: frances_nivel,
          italiano_nivel: italiano_nivel,
          espanol_nivel: espanol_nivel,
          arabe_nivel: arabe_nivel,
          aleman_nivel: aleman_nivel,
          profesion: profesion,
          // ✅ CAMBIO 4: anos_experiencia usa la variable correcta
          anos_experiencia: anosExperiencia,
          education_level: educationLevel,
          sectores: sectores,
          carnet_conducir: carnetConducir,
          preferred_position: preferredPosition,
          work_preference: workPreference,
          willing_to_relocate: willingToRelocate,
          tiene_cv: tieneCV,
          cv_url: cvUrl,
          photo_url: photoUrl,
          pdf_url: pdfUrl,
          plan: plan,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string,
          paid: true,
          worker_status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error insertando en Supabase:");
        console.error(JSON.stringify(insertError, null, 2));
        return res.status(500).json({ error: insertError });
      }

      applicationId = newApp.id;
      console.log(`✅ Registro creado en Supabase: ${applicationId}`);
      console.log("📸 photo_url guardada:", newApp.photo_url);
    }

    // ============================================
    // ✅ 11. AÑADIR A LA COLA DE TRABAJO (SOLO SI ES NUEVO)
    // ============================================
    if (isNew) {
      try {
        const { error: queueError } = await supabase
          .from("worker_queue")
          .insert({
            application_id: applicationId,
            status: "pending",
            priority: 1,
            created_at: new Date().toISOString(),
          });

        if (queueError) {
          console.error("❌ Error adding to worker queue:", queueError);
        } else {
          console.log(`✅ Añadido a la cola de trabajo: ${applicationId}`);
        }
      } catch (queueErr) {
        console.error("❌ Worker queue exception:", queueErr);
      }
    } else {
      console.log(`⏳ Aplicación ${applicationId} ya existe, no se añade a la cola`);
    }

    // ============================================
    // ✅ 12. NOTIFICAR A MAKE (WEBHOOK)
    // ============================================
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "new_job",
          applicationId: applicationId,
          isNew: isNew,
          fullName: fullName,
          whatsapp: whatsapp,
          email: email,
          plan: plan,
          nationality: nationality,
          currentCity: currentCity,
          preferredPosition: preferredPosition,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log(`✅ Notificado a Make: ${applicationId}`);
    } catch (err) {
      console.error("❌ Error notificando a Make:", err);
    }

    // ============================================
    // ✅ 13. RESPONDER RÁPIDO (NO ESPERAR GENERACIÓN)
    // ============================================
    return res.status(200).json({
      received: true,
      applicationId,
      isNew,
      message: isNew ? "Application created and queued" : "Application updated",
    });
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
