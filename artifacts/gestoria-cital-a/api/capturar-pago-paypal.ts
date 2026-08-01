import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// ✅ Configuración de Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ URL del webhook de Make para notificaciones de nuevo trabajo
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || "https://hook.eu1.make.com/5ugo16vgnvx2rhhu3mwjfag553d1g0ij";

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
    // ✅ 1. VERIFICAR SI YA EXISTE (USANDO stripe_session_id)
    // ============================================
    const { data: existing, error: checkError } = await supabase
      .from("malta_applications")
      .select("id, worker_status, photo_url, pdf_url")
      .eq("stripe_session_id", paypal_order_id)  // ← CAMBIADO: usar stripe_session_id
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking existing application:", checkError);
    }

    let applicationId: string;
    let isNew = false;

    // ============================================
    // ✅ 2. SI YA EXISTE -> ACTUALIZAR
    // ============================================
    if (existing) {
      applicationId = existing.id;
      console.log(`🔄 Actualizando aplicación existente: ${applicationId}`);

      const updateData: any = {
        full_name: fullName,
        whatsapp: whatsapp,
        email: email,
        nacionalidad: nationality,
        nationality: nationality,
        current_city: currentCity,
        fecha_nacimiento: fechaNacimiento || null,
        idiomas: idiomas,
        ingles_nivel: ingles_nivel,
        frances_nivel: frances_nivel,
        italiano_nivel: italiano_nivel,
        espanol_nivel: espanol_nivel,
        arabe_nivel: arabe_nivel,
        aleman_nivel: aleman_nivel,
        // ✅ CAMBIADO: usar profesion y sectores en lugar de trabajo_busca y experiencia_previa
        profesion: trabajo_busca,
        sectores: experiencia_previa,
        anos_experiencia: anos_experiencia,
        education_level: education_level,
        estudios: education_level,
        carnet_conducir: carnetConducir,
        photo_url: photoUrl || existing.photo_url,
        pdf_url: pdfUrl || existing.pdf_url,
        plan: plan,
        paid: true,
        // ✅ CAMBIADO: usar stripe_session_id y stripe_customer_id
        stripe_session_id: paypal_order_id,
        stripe_customer_id: paypal_payer_id,
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      };

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
      // ✅ 3. SI NO EXISTE -> INSERTAR
      // ============================================
      isNew = true;
      console.log("🆕 Creando nueva aplicación");

      const { data: newApp, error: insertError } = await supabase
        .from("malta_applications")
        .insert({
          full_name: fullName,
          whatsapp: whatsapp,
          email: email,
          nacionalidad: nationality,
          nationality: nationality,
          current_city: currentCity,
          fecha_nacimiento: fechaNacimiento || null,
          idiomas: idiomas,
          ingles_nivel: ingles_nivel,
          frances_nivel: frances_nivel,
          italiano_nivel: italiano_nivel,
          espanol_nivel: espanol_nivel,
          arabe_nivel: arabe_nivel,
          aleman_nivel: aleman_nivel,
          // ✅ CAMBIADO: usar profesion y sectores
          profesion: trabajo_busca,
          sectores: experiencia_previa,
          anos_experiencia: anos_experiencia,
          education_level: education_level,
          estudios: education_level,
          carnet_conducir: carnetConducir,
          photo_url: photoUrl,
          pdf_url: pdfUrl,
          plan: plan,
          // ✅ CAMBIADO: usar stripe_session_id y stripe_customer_id
          stripe_session_id: paypal_order_id,
          stripe_customer_id: paypal_payer_id,
          payment_status: "paid",
          paid: true,
          worker_status: "ready",
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
      console.log("📄 pdf_url guardada:", newApp.pdf_url);
    }

    // ============================================
    // ✅ 4. ENVIAR EMAIL DE BIENVENIDA (SOLO SI ES NUEVO)
    // ============================================
    if (isNew) {
      console.log(`📄 Generando documentos para ${applicationId}`);

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
              applicationId: applicationId,
            }),
          }
        );

        if (docsResponse.ok) {
          const docs = await docsResponse.json();
          cvUrl = docs.cvUrl || "";
          letterUrl = docs.letterUrl || "";
          console.log("✅ CV y carta generados:", {
            cvUrl,
            letterUrl
          });
        } else {
          console.error(
            "❌ Error generando documentos",
            await docsResponse.text()
          );
        }
      } catch (error) {
        console.error("❌ Error generate-malta-documents:", error);
      }

      console.log(`📧 Enviando email de bienvenida para ${applicationId}`);
      
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 587,
          secure: false,
          requireTLS: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const planName = plan === "weekly" ? "Weekly Plan (7 days)" : "Monthly Plan (30 days)";

        await transporter.sendMail({
          from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
          to: email,
          subject: `🇲🇹 Welcome ${fullName}! Your Malta Job Journey Starts Today (PayPal)`,
          attachments: [
            {
              filename: "CV-Malta.pdf",
              content: Buffer.from(
                await (await fetch(cvUrl)).arrayBuffer()
              ),
            },
            {
              filename: "Cover-Letter-Malta.pdf",
              content: Buffer.from(
                await (await fetch(letterUrl)).arrayBuffer()
              ),
            },
          ],
          html: `
            <h1>Bienvenido a GestoriaCitaIA</h1>
            <p>Hola ${fullName},</p>
            <p>Tu pago por PayPal ha sido confirmado.</p>
            <p><strong>Plan:</strong> ${planName}</p>
            <p>En breve recibirás tu CV y Cover Letter.</p>
            <p>¡Gracias por confiar en nosotros!</p>
          `,
        });

        console.log(`✅ Email de bienvenida enviado a ${email} con CV y Cover Letter adjuntos`);
      } catch (emailError) {
        console.error("❌ Error enviando email de bienvenida:", emailError);
      }

      // ============================================
      // ✅ 5. AÑADIR A LA COLA DE TRABAJO (SOLO SI ES NUEVO)
      // ============================================
      try {
        const { error: queueError } = await supabase
          .from("worker_queue")
          .insert({
            application_id: applicationId,
            status: "ready",
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
      console.log(`⏳ Aplicación ${applicationId} ya existe, no se procesa`);
    }

    // ============================================
    // ✅ 6. NOTIFICAR A MAKE (WEBHOOK)
    // ============================================
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "new_job_paypal",
          applicationId: applicationId,
          isNew: isNew,
          fullName: fullName,
          whatsapp: whatsapp,
          email: email,
          plan: plan,
          nationality: nationality,
          currentCity: currentCity,
          // ✅ CAMBIADO: usar profesion y sectores
          profesion: trabajo_busca,
          sectores: experiencia_previa,
          // ✅ CAMBIADO: usar stripe_session_id
          stripe_session_id: paypal_order_id,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log(`✅ Notificado a Make: ${applicationId}`);
    } catch (err) {
      console.error("❌ Error notificando a Make:", err);
    }

    // ============================================
    // ✅ 7. RESPONDER ÉXITO
    // ============================================
    return res.status(200).json({
      success: true,
      applicationId,
      isNew,
      message: isNew ? "Application created and queued" : "Application updated",
    });

  } catch (error) {
    console.error("❌ Error en capturar-pago-paypal:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
