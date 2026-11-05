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


function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
    // ============================================
// 🔒 SEGURIDAD — SOLO TRABAJO MALTA
// ============================================

if (metadata.service !== "malta") {
  console.log(
    "⏭️ Evento ignorado: no es Trabajo Malta:",
    metadata.service
  );

  return res.status(200).json({
    received: true,
    ignored: true,
    reason: "NOT_WORK_MALTA",
    service: metadata.service || null,
  });
}

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
const plan = "single_payment_19_99";

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
      .select("id, worker_status, photo_url, pdf_url")
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
        worker_ready: false,
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
worker_ready: false,
worker_started: false,
worker_finished: false,
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
    // ✅ 10. ENVIAR EMAIL DE BIENVENIDA (SOLO SI ES NUEVO)
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
      } catch(error){
        console.error(
          "❌ Error generate-malta-documents:",
          error
        );
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

       const planName = "One-time payment / أداء مرة واحدة — €17.99";

        await transporter.sendMail({
          from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
          to: email,
          subject: `🇲🇹 مرحبا ${fullName}! Malta Recruitment Directory / دليل وكالات التوظيف في مالطا`,
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
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;font-family:Arial,sans-serif;">
<tr>
<td align="center">

<table width="700" cellpadding="0" cellspacing="0" style="width:100%;max-width:700px;background:#ffffff;border-radius:12px;overflow:hidden;">

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

<b>🇲🇹 جميع عروض العمل المتاحة هاد الشهر</b><br><br>

📩 شكراً على الثقة ديالك فينا.<br>
🔎 دخل للعروض، اختار اللي مناسب ليك، وتاصل بالشركات مباشرة.<br>
📄 صيفط CV ديالك للشركات اللي بغيتي ترشح ليها.

</div>

<p style="font-size:18px;line-height:32px;">
شكراً بزاف على الثقة ديالك فـ
<b>GestoriaCitaIA</b>.
</p>

<p style="font-size:18px;line-height:32px;">
🌟 كنتمناو ليك كامل التوفيق والنجاح فالبحث على خدمة فمالطا.
</p>

<p style="font-size:18px;line-height:32px;">
ها هي جميع عروض العمل المتاحة فقاعدة البيانات ديالنا هاد الشهر. تقدر تدخل لكل عرض، تتاصل بالشركة مباشرة وتصيفط ليهم CV ديالك حسب طريقة التقديم المنشورة.
</p>

<p style="font-size:18px;">
<b>الباقة ديالك:</b> ${planName}
</p>

<p style="line-height:34px;font-size:18px;">

✅ مرفقين مع هاد الإيميل CV و Cover Letter ديالك.

<br><br>

✅ هنا غادي تلقى جميع عروض العمل المتاحة فمالطا هاد الشهر.

<br><br>

✅ اختار العروض المناسبة ليك، تاصل بالشركات وصيفط CV ديالك حسب التعليمات ديال كل عرض.

<br><br>

💡 نصيحة: حاول تتعلم شوية ديال الإنجليزية وتتمرن على التواصل بها، حيث غادي تعاونك فالتواصل مع الشركات وفالمقابلات.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
بالتوفيق خويا/ختي، ونتمنى ليك تلقى فرصة زوينة فمالطا! 🇲🇹
</p>

</div>

<hr style="margin:45px 0;">

<div style="text-align:left;">

<h2>
🇬🇧 🇲🇹 Hello ${fullName},
</h2>

<div style="background:#EAF3FF;border-left:5px solid #0B57D0;padding:18px;margin:25px 0;border-radius:8px;">

<b>🇲🇹 All job offers available this month</b><br><br>

📩 Thank you for trusting us.<br>
🔎 Browse the listings, choose suitable vacancies, and contact employers directly.<br>
📄 Send your CV to the companies you want to apply to.

</div>

<p style="font-size:18px;line-height:30px;">
Thank you for choosing
<b>GestoriaCitaIA</b>.
</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
🌟 We wish you the best of luck finding a job opportunity in Malta.
</p>

<p style="font-size:18px;line-height:30px;">
Here are recruitment agencies and hiring offices across Malta, with their published contact details. Open a listing, contact the employer directly, and send your CV using the application instructions provided.
</p>

<p style="font-size:18px;">
<b>Your plan:</b> ${planName}
</p>

<p style="font-size:18px;line-height:34px;">

✅ Your CV and Cover Letter are attached to this email.

<br><br>

✅ Browse all Malta job offers available in our database this month.

<br><br>

✅ Choose suitable vacancies, contact employers, and send your CV according to each listing's instructions.

<br><br>

💡 Tip: Try to learn and practise some English. It can help you communicate with employers and during job interviews.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
Good luck with your job search in Malta! 🇲🇹
</p>

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
`,
        });

        console.log(`✅ Email de bienvenida enviado a ${email} con CV y Cover Letter adjuntos`);
      } catch (emailError) {
        console.error("❌ Error enviando email de bienvenida:", emailError);
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
    // 🇲🇹 ENVIAR TODAS LAS VACANTES DE malta_job_offers
    // Paginación explícita y control de idempotencia por sesión Stripe.
    // ============================================
    try {
      const { data: deliveryState, error: deliveryStateError } = await supabase
        .from("malta_applications")
        .select("offers_email_sent_session_id")
        .eq("id", applicationId)
        .single();

      if (deliveryStateError) throw deliveryStateError;

      if (deliveryState?.offers_email_sent_session_id !== session.id) {
        type MaltaOffer = {
          id: string;
          company: string | null;
          company_name: string | null;
          title: string | null;
          job_title: string | null;
          location: string | null;
          url: string | null;
          job_url: string | null;
          apply_email: string | null;
          salary: string | null;
          job_type: string | null;
        };
        const allOffers: MaltaOffer[] = [];
        const pageSize = 500;
        for (let offset = 0; ; offset += pageSize) {
          const { data: page, error: offersError } = await supabase
            .from("malta_job_offers")
            .select("id,company,company_name,title,job_title,location,url,job_url,apply_email,salary,job_type")
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(offset, offset + pageSize - 1);
          if (offersError) throw offersError;
          allOffers.push(...((page || []) as MaltaOffer[]));
          if (!page || page.length < pageSize) break;
        }

        if (!allOffers.length) {
          throw new Error("malta_job_offers está vacía; no se envió un correo sin ofertas.");
        }

        // Datos textuales escapados y URLs de aplicación limitadas a http(s).
        const offerRows = allOffers.map((offer) => {
          const title = escapeHtml(offer.title || offer.job_title || "Job opportunity");
          const company = escapeHtml(offer.company || offer.company_name || "Employer not specified");
          const location = escapeHtml(offer.location || "Malta");
          const salary = offer.salary ? '<div><b>Salary:</b> ' + escapeHtml(offer.salary) + '</div>' : "";
          const jobType = offer.job_type ? '<div><b>Job type:</b> ' + escapeHtml(offer.job_type) + '</div>' : "";
          const applicationUrl = String(offer.job_url || offer.url || "").trim();
          const applyLink = /^https?:\/\/[^\s]+$/i.test(applicationUrl)
            ? '<a href="' + escapeHtml(applicationUrl) + '" style="display:inline-block;margin-top:10px;padding:10px 16px;background:#e5ad42;color:#071426;border-radius:7px;text-decoration:none;font-weight:bold">View job / شوف العرض</a>'
            : "";
          const email = String(offer.apply_email || "").trim();
          const emailLink = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ? '<div style="margin-top:8px"><b>Apply by email:</b> <a href="mailto:' + escapeHtml(email) + '">' + escapeHtml(email) + '</a></div>'
            : "";
          return '<tr><td style="padding:0 0 14px"><div style="padding:17px;border:1px solid #d6dfeb;border-radius:10px;background:#fff">'
            + '<div style="font-size:17px;font-weight:bold;color:#071426">' + title + '</div>'
            + '<div style="margin:6px 0;color:#334155">' + company + ' · ' + location + '</div>'
            + salary + jobType + applyLink + emailLink
            + (!applyLink && !emailLink ? '<div style="margin-top:8px;color:#64748b">Application details not provided in the listing.</div>' : "")
            + '</div></td></tr>';
        }).join("");

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

        const safeName = escapeHtml(fullName || "Hello");
        const offersMail = await transporter.sendMail({
          from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
          to: email,
          subject: "🇲🇹 Ofertas de trabajo en Malta",
          html: `<!doctype html>
<html><body style="margin:0;padding:22px 10px;background:#edf1f6;font-family:Arial,sans-serif;color:#172033;line-height:1.6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="850" cellpadding="0" cellspacing="0" style="width:100%;max-width:850px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#071426;padding:28px;text-align:center;color:#fff">
<h1 style="margin:0;color:#e5ad42">GestoriaCitaIA</h1>
<div style="font-size:20px;font-weight:bold;margin-top:10px">🇲🇹 Ofertas de trabajo en Malta</div>
</td></tr>
<tr><td style="padding:24px">
<div dir="rtl" style="text-align:right;background:#f8fafc;padding:18px;border-radius:9px">
<b>السلام عليكم ${safeName}</b>
<p>هادي لائحة عروض العمل الموجودة فقاعدة البيانات ديال GestoriaCitaIA. اختار العرض المناسب وتواصل مباشرة مع الشركة حسب المعلومات المنشورة.</p>
</div>
<p><b>Hello ${safeName},</b> browse the Malta job listings in our database. Apply directly using the available application link or email. Availability is subject to the employer's listing.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${offerRows}</tbody></table>
<p style="font-size:12px;color:#64748b">Job listings are sourced from our database. Some entries may lack a direct application link. Check each vacancy with the employer before applying.</p>
</td></tr>
<tr><td style="background:#071426;padding:18px;text-align:center"><a href="https://gestoriacitaia.com" style="color:#e5ad42;text-decoration:none">GestoriaCitaIA · Malta Jobs</a></td></tr>
</table></td></tr></table></body></html>`,
        });

        const { error: markSentError } = await supabase
          .from("malta_applications")
          .update({
            offers_email_sent_session_id: session.id,
            offers_email_sent_at: new Date().toISOString(),
            worker_ready: false,
            worker_started: false,
            worker_finished: true,
            worker_status: "offers_email_sent",
            last_worker_run: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", applicationId);
        if (markSentError) throw markSentError;
        console.log('✅ Malta job listings sent; listings=' + allOffers.length + '; messageId=' + offersMail.messageId);
      } else {
        console.log('⏭️ Malta job listings already sent for this Stripe session');
      }
    } catch (offersEmailError: any) {
      console.error("❌ Error enviando ofertas Malta:", offersEmailError?.message || offersEmailError);
      await supabase
        .from("malta_applications")
        .update({
          worker_ready: false,
          worker_status: "offers_email_error",
          last_error: String(offersEmailError?.message || offersEmailError).slice(0, 1000),
        })
        .eq("id", applicationId);
      return res.status(500).json({ error: "Payment saved, but Malta offers email failed. Stripe may retry this webhook." });
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
