import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ URL del webhook de Make para notificaciones de nuevo trabajo
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
    console.log("📦 trabajo_busca:", metadata.trabajo_busca);
    console.log("📦 experiencia_previa:", metadata.experiencia_previa);
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
    // 3. EXPERIENCIA - ACTUALIZADO con snake_case
    // ============================================
    const trabajo_busca = metadata.trabajo_busca || "";
    const experiencia_previa = metadata.experiencia_previa || "";
    const anos_experiencia = metadata.anos_experiencia || "";
    const educationLevel = metadata.education_level || "";
    
    // ============================================
    // 4. CARNET
    // ============================================
    const carnetConducir = metadata.carnetConducir || "";
    
    // ============================================
    // 5. DOCUMENTOS - Recibir desde metadata
    // ============================================
    const photoUrl = metadata.photoUrl || null;
    const pdfUrl = metadata.pdfUrl || null;
    
    // ============================================
    // 6. PLAN
    // ============================================
    const plan = metadata.plan || "monthly";

    console.log("📋 DATOS PROCESADOS:");
    console.log("  - fullName:", fullName);
    console.log("  - nationality:", nationality);
    console.log("  - currentCity:", currentCity);
    console.log("  - photoUrl:", photoUrl);
    console.log("  - pdfUrl:", pdfUrl);
    console.log("  - trabajo_busca:", trabajo_busca);
    console.log("  - experiencia_previa:", experiencia_previa);

    // ============================================
    // ✅ 7. VERIFICAR SI YA EXISTE (ANTES DE INSERTAR)
    // ============================================
    const { data: existing, error: checkError } = await supabase
      .from("malta_applications")
    .select(`
  id,
  worker_status,
  photo_url,
  pdf_url,
  cv_url,
  letter_url,
  cover_letter_url,
  welcome_email_sent_at,
  welcome_email_message_id
`)
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking existing application:", checkError);
    }

    let applicationId: string;
    let isNew = false;

    // ============================================
    // ✅ 8. SI YA EXISTE -> ACTUALIZAR
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
        trabajo_busca: trabajo_busca,
        experiencia_previa: experiencia_previa,
        // Compatibilidad con columnas antiguas
        profesion: trabajo_busca,
        sectores: experiencia_previa,
        anos_experiencia: anos_experiencia,
        education_level: educationLevel,
        estudios: educationLevel,
        carnet_conducir: carnetConducir,
        // ✅ Usar nuevos valores si vienen, sino mantener los existentes
        photo_url: photoUrl || existing.photo_url,
        pdf_url: pdfUrl || existing.pdf_url,
        plan: plan,
        paid: true,
        worker_ready: true,
worker_started: false,
worker_finished: false,
        updated_at: new Date().toISOString(),
      };

      if (session.payment_intent) {
        updateData.stripe_payment_intent = session.payment_intent as string;
      }

      if (session.customer) {
        updateData.stripe_customer_id = session.customer as string;
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
      // ✅ 9. SI NO EXISTE -> INSERTAR
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
          trabajo_busca: trabajo_busca,
          experiencia_previa: experiencia_previa,
          // Compatibilidad con columnas antiguas
          profesion: trabajo_busca,
          sectores: experiencia_previa,
          anos_experiencia: anos_experiencia,
          education_level: educationLevel,
          estudios: educationLevel,
          carnet_conducir: carnetConducir,
          // ✅ Usar valores recibidos de metadata
          photo_url: photoUrl,
          pdf_url: pdfUrl,
          plan: plan,
          stripe_session_id: session.id,
          stripe_customer_id: session.customer as string,
          stripe_payment_intent: session.payment_intent as string,
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
    // ✅ 10. WELCOME EMAIL ROBUSTO
    //    - Genera documentos si faltan
    //    - Reintenta si hay error
    //    - Comprueba que CV + carta existen
    //    - Evita duplicar Welcome
    //    - Si los PDFs son demasiado grandes,
    //      manda enlaces en lugar de adjuntos
    //    - Si falla el envío, devuelve ERROR
    //      para que Stripe pueda reintentar
    // ============================================

    // Recuperar estado actual de los documentos y Welcome
    const { data: currentApplication, error: currentApplicationError } =
      await supabase
        .from("malta_applications")
        .select(`
          id,
          email,
          full_name,
          plan,
          pdf_url,
          cv_url,
          letter_url,
          cover_letter_url,
          welcome_email_sent_at,
          welcome_email_message_id
        `)
        .eq("id", applicationId)
        .single();

    if (currentApplicationError || !currentApplication) {
      console.error(
        "❌ No se pudo recuperar la aplicación:",
        currentApplicationError
      );

      return res.status(500).json({
        error: "Could not retrieve Malta application",
        applicationId,
      });
    }

    // ------------------------------------------------
    // Si el Welcome ya fue enviado correctamente,
    // NO volver a enviarlo.
    // ------------------------------------------------
    if (currentApplication.welcome_email_sent_at) {
      console.log(
        `✅ Welcome ya enviado anteriormente: ${applicationId}`
      );
    } else {

      console.log(
        `📧 Welcome pendiente. Preparando documentos y email: ${applicationId}`
      );

      let cvUrl =
        currentApplication.cv_url ||
        currentApplication.pdf_url ||
        "";

      let letterUrl =
        currentApplication.letter_url ||
        currentApplication.cover_letter_url ||
        "";

      // ------------------------------------------------
      // FUNCIÓN: generar documentos con reintentos
      // ------------------------------------------------
      async function generateDocumentsWithRetry(
        applicationId: string,
        attempts = 3
      ) {
        let lastError: any = null;

        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            console.log(
              `📄 Generando documentos - intento ${attempt}/${attempts}`
            );

            const baseUrl =
              process.env.NEXT_PUBLIC_URL ||
              "https://www.gestoriacitaia.com";

            const response = await fetch(
              `${baseUrl}/api/generate-malta-documents`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  applicationId,
                }),
              }
            );

            const responseText = await response.text();

            if (!response.ok) {
              throw new Error(
                `Document generation HTTP ${response.status}: ${responseText}`
              );
            }

            let result: any = {};

            try {
              result = JSON.parse(responseText);
            } catch {
              throw new Error(
                "Document generation returned invalid JSON"
              );
            }

            const generatedCvUrl =
              result.cvUrl ||
              result.cv_url ||
              "";

            const generatedLetterUrl =
              result.letterUrl ||
              result.letter_url ||
              result.coverLetterUrl ||
              result.cover_letter_url ||
              "";

            if (generatedCvUrl) {
              cvUrl = generatedCvUrl;
            }

            if (generatedLetterUrl) {
              letterUrl = generatedLetterUrl;
            }

            if (!cvUrl || !letterUrl) {
              throw new Error(
                `Documents incomplete. CV=${!!cvUrl}, Letter=${!!letterUrl}`
              );
            }

            console.log("✅ CV y Cover Letter preparados");

            return {
              cvUrl,
              letterUrl,
            };

          } catch (error) {
            lastError = error;

            console.error(
              `❌ Error generando documentos intento ${attempt}/${attempts}:`,
              error
            );

            if (attempt < attempts) {
              await new Promise((resolve) =>
                setTimeout(resolve, attempt * 3000)
              );
            }
          }
        }

        throw lastError || new Error("Document generation failed");
      }

      // ------------------------------------------------
      // Si falta CV o carta, generarlos.
      // ------------------------------------------------
      if (!cvUrl || !letterUrl) {
        try {
          const generated = await generateDocumentsWithRetry(
            applicationId,
            3
          );

          cvUrl = generated.cvUrl;
          letterUrl = generated.letterUrl;

        } catch (generationError) {
          console.error(
            "❌❌ NO SE PUDO GENERAR CV + COVER LETTER:",
            generationError
          );

          // IMPORTANTE:
          // NO continuamos al email.
          // Stripe recibirá 500 y podrá reintentar.
          return res.status(500).json({
            error: "Malta documents could not be generated",
            applicationId,
          });
        }
      }

      // ------------------------------------------------
      // FUNCIÓN: descargar documento con reintentos
      // ------------------------------------------------
      async function downloadFileWithRetry(
        url: string,
        name: string,
        attempts = 3
      ): Promise<Buffer> {
        let lastError: any = null;

        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            console.log(
              `📥 Descargando ${name} - intento ${attempt}/${attempts}`
            );

            const response = await fetch(url);

            if (!response.ok) {
              throw new Error(
                `${name}: HTTP ${response.status}`
              );
            }

            const arrayBuffer = await response.arrayBuffer();

            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
              throw new Error(
                `${name}: archivo vacío`
              );
            }

            console.log(
              `✅ ${name} descargado: ${(
                arrayBuffer.byteLength /
                1024 /
                1024
              ).toFixed(2)} MB`
            );

            return Buffer.from(arrayBuffer);

          } catch (error) {
            lastError = error;

            console.error(
              `❌ Error descargando ${name} intento ${attempt}/${attempts}:`,
              error
            );

            if (attempt < attempts) {
              await new Promise((resolve) =>
                setTimeout(resolve, attempt * 2000)
              );
            }
          }
        }

        throw lastError || new Error(`${name} download failed`);
      }

      // ------------------------------------------------
      // Descargar CV + carta
      // ------------------------------------------------
      let cvBuffer: Buffer;
      let letterBuffer: Buffer;

      try {
        cvBuffer = await downloadFileWithRetry(
          cvUrl,
          "CV-Malta.pdf",
          3
        );

        letterBuffer = await downloadFileWithRetry(
          letterUrl,
          "Cover-Letter-Malta.pdf",
          3
        );

      } catch (downloadError) {
        console.error(
          "❌❌ No se pudieron descargar los documentos:",
          downloadError
        );

        return res.status(500).json({
          error: "Malta documents could not be downloaded",
          applicationId,
        });
      }

      // ------------------------------------------------
      // LÍMITE SEGURO PARA SMTP
      //
      // Brevo tiene límite de tamaño de email.
      // Usamos 12 MB de archivos como límite seguro
      // para evitar problemas de MIME/base64.
      // ------------------------------------------------
      const MAX_ATTACHMENT_BYTES =
        12 * 1024 * 1024;

      const totalDocumentBytes =
        cvBuffer.length +
        letterBuffer.length;

      const canAttachDocuments =
        totalDocumentBytes <= MAX_ATTACHMENT_BYTES;

      console.log(
        `📦 Tamaño total documentos: ${(
          totalDocumentBytes /
          1024 /
          1024
        ).toFixed(2)} MB`
      );

      console.log(
        `📎 Adjuntos permitidos: ${canAttachDocuments}`
      );

      // ------------------------------------------------
      // PLAN
      // ------------------------------------------------
      const planName =
        plan === "weekly"
          ? "Weekly Plan (7 days)"
          : "Monthly Plan (30 days)";

      // ------------------------------------------------
      // HTML
      // ------------------------------------------------
      const documentLinksHtml = `
        <div style="background:#F5F8FC;border:1px solid #DCE6F2;padding:22px;margin:25px 0;border-radius:8px;">
          <h3 style="margin-top:0;color:#0B57D0;">
            📄 Your Malta Documents
          </h3>

          <p style="font-size:16px;line-height:28px;">
            Your CV and Cover Letter are ready.
          </p>

          <p style="margin:18px 0;">
            <a href="${cvUrl}"
              style="background:#0B57D0;color:white;text-decoration:none;padding:14px 22px;border-radius:7px;font-weight:bold;display:inline-block;">
              📄 Download CV
            </a>
          </p>

          <p style="margin:18px 0;">
            <a href="${letterUrl}"
              style="background:#0B57D0;color:white;text-decoration:none;padding:14px 22px;border-radius:7px;font-weight:bold;display:inline-block;">
              📄 Download Cover Letter
            </a>
          </p>
        </div>
      `;

      const attachments = canAttachDocuments
        ? [
            {
              filename: "CV-Malta.pdf",
              content: cvBuffer,
              contentType: "application/pdf",
            },
            {
              filename: "Cover-Letter-Malta.pdf",
              content: letterBuffer,
              contentType: "application/pdf",
            },
          ]
        : [];

      // ------------------------------------------------
      // EMAIL HTML
      // ------------------------------------------------
      const emailHtml = `
<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f4f6f9;padding:40px 0;font-family:Arial,sans-serif;">

<tr>
<td align="center">

<table width="700" cellpadding="0" cellspacing="0"
style="width:100%;max-width:700px;background:#ffffff;border-radius:12px;overflow:hidden;">

<tr>
<td style="background:#0B57D0;padding:35px;text-align:center;color:#fff;">

<h1 style="margin:0;">GestoriaCitaIA</h1>

<p style="margin-top:10px;font-size:18px;">
🇲🇹 Malta Jobs
</p>

</td>
</tr>

<tr>

<td style="padding:40px;">

<div dir="rtl" style="direction:rtl;text-align:right;">

<h2 style="margin-top:0;">
🇲🇦 🇲🇹 السلام عليكم ${fullName}
</h2>

<div style="background:#EAF3FF;border-right:5px solid #0B57D0;padding:18px;margin:25px 0;border-radius:8px;text-align:right;">

<b>⏳ شحال غادي ياخذ الوقت؟</b><br><br>

📄 تحضير CV و Cover Letter خلال 24 ساعة.<br>
📤 من بعد غادي نبداو نرسلو الترشيحات كل نهار.<br>
📩 إلى جاك أي استدعاء أو مقابلة غادي نخبرك مباشرة.

</div>

<p style="font-size:18px;line-height:32px;">
شكراً بزاف على الثقة ديالك فـ
<b>GestoriaCitaIA</b>.
</p>

<p style="font-size:18px;line-height:32px;">
🌟 حلمك تخدم فمالطا غادي يتحقق معانا إن شاء الله.
</p>

<p style="font-size:18px;line-height:32px;">
من اليوم فريقنا غادي يبدا يخدم على الملف ديالك ويرسل الترشيحات يومياً حتى تلقى أفضل فرصة عمل.
</p>

<p style="font-size:18px;">
<b>الباقة ديالك:</b> ${planName}
</p>

<p style="line-height:34px;font-size:18px;">

✅ غادي نحضرو ليك CV احترافي باللغة الإنجليزية.

<br><br>

✅ غادي نحضرو ليك Cover Letter احترافية.

<br><br>

✅ غادي نرسلو الترشيح ديالك حتى لـ <b>10 شركات كل نهار</b> حسب الباقة ديالك.

<br><br>

✅ وإنت مرتاح، فريقنا هو اللي غادي يخدم عليك كل يوم.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
استمتع بوقتك وخلي الخدمة علينا ✈️
</p>

<p style="font-size:18px;">
أول ما توصلنا أي مقابلة أو عرض عمل غادي نخبرك مباشرة.
</p>

</div>

<hr style="margin:45px 0;">

<div style="text-align:left;">

<h2>
🇬🇧 🇲🇹 Hello ${fullName},
</h2>

<div style="background:#EAF3FF;border-left:5px solid #0B57D0;padding:18px;margin:25px 0;border-radius:8px;">

<b>⏳ Estimated processing time</b><br><br>

📄 CV & Cover Letter: within 24 hours.<br>
📤 Daily applications: immediately after your documents are ready.<br>
📩 Interview invitations: we will notify you immediately.

</div>

<p style="font-size:18px;line-height:30px;">
Thank you for choosing
<b>GestoriaCitaIA</b>.
</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
🌟 Your dream to work in Malta starts today.
</p>

<p style="font-size:18px;line-height:30px;">
From today our recruitment team starts working on your profile and will submit your application every day until you receive the best job opportunity in Malta.
</p>

<p style="font-size:18px;">
<b>Your plan:</b> ${planName}
</p>

<p style="font-size:18px;line-height:34px;">

✅ Professional CV in English

<br><br>

✅ Professional Cover Letter

<br><br>

✅ We submit your application to <b>up to 10 companies every day</b> depending on your plan.

<br><br>

✅ While you enjoy your holidays, our team works every day to find the best employer for you.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
Relax while our team works for you every single day. 🌴
</p>

<p style="font-size:18px;">
As soon as an employer contacts us or invites you for an interview, we will notify you immediately.
</p>

${!canAttachDocuments ? documentLinksHtml : ""}

<div style="text-align:center;margin-top:45px;">

<a href="https://gestoriacitaia.com"
style="background:#0B57D0;color:white;text-decoration:none;padding:18px 36px;border-radius:8px;font-size:18px;font-weight:bold;display:inline-block;">

Visit GestoriaCitaIA

</a>

</div>

</div>

</td>
</tr>

<tr>

<td style="background:#f5f5f5;padding:20px;text-align:center;color:#666;">

<p style="font-size:14px;color:#777;line-height:24px;text-align:center;">

Questions?<br>

📧 gestoriacitaia@gmail.com

</p>

© 2026 GestoriaCitaIA · Malta Recruitment

</td>

</tr>

</table>

</td>
</tr>

</table>
`;

      // ------------------------------------------------
      // FUNCIÓN: enviar email con reintentos
      // ------------------------------------------------
      async function sendWelcomeWithRetry(
        attempts = 3
      ) {
        let lastError: any = null;

        for (let attempt = 1; attempt <= attempts; attempt++) {
          let transporter: nodemailer.Transporter | null =
            null;

          try {
            console.log(
              `📧 Enviando Welcome - intento ${attempt}/${attempts}`
            );

            transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: 587,
              secure: false,
              requireTLS: true,
              connectionTimeout: 30000,
              greetingTimeout: 30000,
              socketTimeout: 60000,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            });

            // Comprobar conexión SMTP antes de enviar
            await transporter.verify();

            const info = await transporter.sendMail({
              from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
              to: email,
              subject:
                `🇲🇹 Welcome ${fullName}! Your Malta Job Journey Starts Today`,
              attachments,
              html: emailHtml,
            });

            console.log(
              `✅ Welcome enviado correctamente a ${email}`
            );

            console.log(
              `📨 Message-ID: ${info.messageId}`
            );

            return info;

          } catch (error) {
            lastError = error;

            console.error(
              `❌ Error SMTP intento ${attempt}/${attempts}:`,
              error
            );

            if (attempt < attempts) {
              await new Promise((resolve) =>
                setTimeout(resolve, attempt * 5000)
              );
            }

          } finally {
            if (transporter) {
              try {
                transporter.close();
              } catch {}
            }
          }
        }

        throw lastError || new Error("Welcome email failed");
      }

      // ------------------------------------------------
      // ENVIAR
      // ------------------------------------------------
      try {
        const mailInfo =
          await sendWelcomeWithRetry(3);

        // ------------------------------------------------
        // MUY IMPORTANTE:
        // Solo marcamos como enviado DESPUÉS de
        // que Brevo/SMTP confirme correctamente.
        // ------------------------------------------------
        const { error: welcomeUpdateError } =
          await supabase
            .from("malta_applications")
            .update({
              welcome_email_sent_at:
                new Date().toISOString(),
              welcome_email_message_id:
                mailInfo.messageId || null,
              cv_url: cvUrl,
              letter_url: letterUrl,
              cover_letter_url: letterUrl,
              cv_generated: true,
              letter_generated: true,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", applicationId);

        if (welcomeUpdateError) {
          console.error(
            "❌ Email enviado pero error guardando estado Welcome:",
            welcomeUpdateError
          );

          // El email YA fue enviado.
          // No devolvemos 500 para evitar duplicarlo.
          console.log(
            "⚠️ Welcome enviado correctamente aunque no se pudo guardar el marcador."
          );

        } else {
          console.log(
            `✅ Welcome marcado como enviado: ${applicationId}`
          );
        }

      } catch (emailError) {

        console.error(
          "❌❌❌ ERROR DEFINITIVO EN WELCOME:",
          emailError
        );

        // IMPORTANTE:
        // NO ocultamos el error.
        // Stripe recibirá 500 y podrá reintentar
        // el webhook automáticamente.
        return res.status(500).json({
          error: "Welcome email could not be sent",
          applicationId,
        });
      }
    }

      // ============================================
      // ✅ 11. AÑADIR A LA COLA DE TRABAJO (SOLO SI ES NUEVO)
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
          trabajo_busca: trabajo_busca,
          experiencia_previa: experiencia_previa,
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
