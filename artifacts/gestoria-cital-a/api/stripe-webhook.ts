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

       const planName = "One-time payment / أداء مرة واحدة — €19.99";

        await transporter.sendMail({
          from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
          to: email,
          subject: `🇲🇹 مرحبا ${fullName}! All Malta Job Offers / جميع عروض العمل في مالطا`,
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
Here are all job offers currently available in our database this month. Open a listing, contact the employer directly, and send your CV using the application instructions provided.
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
    // 🇲🇹 ENVIAR TODAS LAS OFERTAS DESDE VERCEL/GITHUB
    // Sin depender del worker de contactos de Ubuntu.
    // Idempotencia por sesión Stripe para evitar reenvíos.
    // ============================================
    try {
      const { data: deliveryState, error: deliveryStateError } = await supabase
        .from("malta_applications")
        .select("offers_email_sent_session_id")
        .eq("id", applicationId)
        .single();

      if (deliveryStateError) throw deliveryStateError;

      if (deliveryState?.offers_email_sent_session_id !== session.id) {
        const allOffers: any[] = [];
        const pageSize = 500;
        let from = 0;

        while (true) {
          const { data: page, error: offersError } = await supabase
            .from("malta_job_offers")
            .select("*")
            .order("company_phone", { ascending: false, nullsFirst: false }).order("id", { ascending: true })
            .range(from, from + pageSize - 1);

          if (offersError) throw offersError;
          if (!page || page.length === 0) break;

          allOffers.push(...page);
          console.log(`📥 Ofertas Malta cargadas desde Supabase: ${allOffers.length}`);

          from += page.length;
          if (page.length < pageSize) break;
        }

        if (allOffers.length === 0) {
          throw new Error("malta_job_offers está vacía; no se envió el email.");
        }

        const offerRows = allOffers.map((offer, index) => {
          const title = offer.job_title || offer.title || offer.job_type || "Job offer";
          const company = offer.company_name || offer.company || "Company not specified";
          const location = offer.location || offer.city || "Malta";
          const url = offer.job_url || offer.url || offer.source_url || "";
          const companyWebsite = offer.company_website || offer.website || offer.company_url || "";
          const salary = offer.salary || "";
          const contact = offer.apply_email || offer.email || offer.contact_email || "";
          const phone = offer.company_phone || offer.phone || offer.telephone || offer.contact_phone || "";
          const category = offer.category || offer.job_category || offer.industry || offer.job_type || "Not specified";
          const description = offer.description || offer.details || offer.job_description || "";
          const safeUrl = String(url);
          const safeWebsite = String(companyWebsite);
          const link = /^https?:\/\//i.test(safeUrl)
            ? `<a href="${escapeHtml(safeUrl)}" style="display:inline-block;background:#071426;color:#E5AD42;text-decoration:none;font-weight:bold;padding:10px 15px;border-radius:7px;margin:4px 6px 4px 0">VIEW VACANCY ↗</a>`
            : "";
          const websiteLink = /^https?:\/\//i.test(safeWebsite)
            ? `<a href="${escapeHtml(safeWebsite)}" style="display:inline-block;background:#E5AD42;color:#071426;text-decoration:none;font-weight:bold;padding:10px 15px;border-radius:7px;margin:4px 6px 4px 0">COMPANY WEBSITE ↗</a>`
            : "";
          const emailLine = contact
            ? `<a href="mailto:${escapeHtml(contact)}" style="color:#075985;font-weight:bold;word-break:break-word">${escapeHtml(contact)}</a>`
            : '<span style="color:#8a94a5">Not published</span>';
          const phoneLine = phone
            ? `<a href="tel:${escapeHtml(phone)}" style="color:#075985;font-weight:bold">${escapeHtml(phone)}</a>`
            : '<span style="color:#8a94a5">Not published</span>';
          const safeSalary = salary ? escapeHtml(salary) : "Not specified";
          const safeDescription = description
            ? escapeHtml(description)
            : "Full job description is not included in the source listing. Open the vacancy link to check duties and requirements.";
          return `<tr>
<td style="padding:0 0 15px;border:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #d6dfeb;border-radius:12px;overflow:hidden">
<tr><td style="padding:15px 18px;background:#071426;border-bottom:3px solid #E5AD42;color:#fff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="46" style="vertical-align:top"><span style="display:inline-block;background:#E5AD42;color:#071426;font-weight:900;font-size:15px;line-height:34px;width:34px;height:34px;border-radius:50%;text-align:center">${index + 1}</span></td>
<td style="vertical-align:middle"><div style="font-size:17px;font-weight:800;color:#fff;line-height:1.35">${escapeHtml(title)}</div><div style="font-size:13px;color:#E5AD42;font-weight:bold;margin-top:4px">${escapeHtml(company)}</div></td>
</tr></table></td></tr>
<tr><td style="padding:16px 18px">
<div style="display:inline-block;background:#fff5d8;border:1px solid #f0d58d;border-radius:20px;padding:5px 10px;font-size:11px;font-weight:bold;color:#78520a;margin-bottom:12px">CATEGORY: ${escapeHtml(category)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e3e9f1;border-radius:8px"><tr>
<td style="padding:10px 12px;color:#334155;font-size:13px"><b>📍 LOCATION</b><br>${escapeHtml(location)}</td>
<td style="padding:10px 12px;color:#334155;font-size:13px"><b>💶 SALARY</b><br>${safeSalary}</td>
</tr></table>
<div style="margin-top:13px;padding:12px;background:#f7f9fc;border:1px solid #e3e9f1;border-radius:8px">
<h3 style="font-size:13px;color:#071426;margin:0 0 7px">JOB DETAILS / تفاصيل الخدمة</h3>
<p style="margin:0;color:#334155;line-height:1.65;font-size:13px">${safeDescription}</p>
</div>
<h3 style="font-size:13px;color:#071426;margin:17px 0 9px;border-bottom:1px solid #e5eaf1;padding-bottom:7px">DIRECT EMPLOYER CONTACT</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px"><tr>
<td style="padding:8px 5px 8px 0;width:50%;vertical-align:top"><b>✉️ EMAIL</b><br>${emailLine}</td>
<td style="padding:8px 0 8px 5px;width:50%;vertical-align:top"><b>📞 PHONE</b><br>${phoneLine}</td>
</tr></table>
<div style="margin-top:10px">${link}${websiteLink}</div>
<p dir="rtl" style="margin:10px 0 0;font-size:11px;color:#718096;text-align:right">إلا ما كانش رقم الهاتف ولا الإيميل منشور فالمصدر، غادي يبان بأنه غير متوفر.</p>
</td></tr></table>
</td></tr>`;
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

        const safeName = escapeHtml(fullName || "صاحبي / Hello");
        const offersMail = await transporter.sendMail({
          from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
          to: email,
          subject: `🇲🇦🇲🇹 Malta Job Offers | ${allOffers.length} listings`,
          html: `<!doctype html>
<html><body style="margin:0;padding:24px 10px;background:#edf1f6;font-family:Arial,sans-serif;color:#172033;line-height:1.6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf1f6"><tr><td align="center">
<table role="presentation" width="900" cellpadding="0" cellspacing="0" style="width:100%;max-width:900px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d8e0ea">
<tr><td style="background:#071426;padding:26px 24px;text-align:center;color:#fff">
<div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#E5AD42;margin-bottom:14px"><span style="display:inline-block;vertical-align:middle;margin-right:5px;width:30px;height:20px"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="20" viewBox="0 0 30 20"><rect width="30" height="20" fill="#c1272d"/><path d="M15 3 L16.8 8.2 L22.3 8.2 L17.8 11.4 L19.5 16.6 L15 13.4 L10.5 16.6 L12.2 11.4 L7.7 8.2 L13.2 8.2 Z" fill="#006233"/></svg></span>MOROCCO <span style="margin:0 10px">·</span><span style="display:inline-block;vertical-align:middle;margin-right:5px;width:30px;height:20px"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="20" viewBox="0 0 30 20"><rect width="15" height="20" fill="#fff"/><rect x="15" width="15" height="20" fill="#cf142b"/><path d="M5 3v5m-2.5-2.5h5" stroke="#cf142b" stroke-width="1.2"/></svg></span>MALTA</div>
<div style="display:inline-block;width:54px;height:54px;line-height:54px;border-radius:15px;background:#E5AD42;color:#071426;font-size:25px;font-weight:900;margin-bottom:10px">G</div>
<h1 style="margin:0;font-size:27px;font-weight:800;letter-spacing:.3px">Gestoria<span style="color:#E5AD42">CitaIA</span></h1>
<p style="margin:8px 0;color:#E5AD42;font-weight:bold;font-size:16px">MALTA JOB OFFERS</p>
<p style="margin:0;color:#e5edf7;font-weight:bold">${allOffers.length} Available Job Offers</p></td></tr>
<tr><td style="padding:20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #d7e1ee;border-left:5px solid #dba53b;border-radius:10px"><tr><td dir="rtl" style="direction:rtl;text-align:right;padding:20px">
<h2 style="margin:0 0 12px;color:#071426;font-size:20px">🇲🇦 السلام عليكم ${safeName}</h2>
<p style="margin:0 0 10px">شكراً بزاف على الثقة ديالك فـ GestoriaCitaIA. هادي هي عروض العمل المتاحة كاملة فقاعدة البيانات ديالنا هاد الشهر. اختار اللي مناسب ليك، تاصل بالشركة مباشرة وصيفط CV ديالك حسب طريقة التقديم.</p>
<p style="margin:0;color:#087f5b;font-weight:bold">❤️🇲🇹 كنتمناو ليك التوفيق والنجاح فمالطا.</p></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#f8fafc;border:1px solid #d7e1ee;border-left:5px solid #dba53b;border-radius:10px"><tr><td style="padding:20px;text-align:left">
<h2 style="margin:0 0 12px;color:#071426;font-size:20px">🇬🇧 Hello ${safeName},</h2>
<p style="margin:0 0 10px">Thank you for trusting GestoriaCitaIA. Here are all job offers currently available in our database this month. Choose suitable vacancies, contact employers directly, and send your CV using each listing's application instructions.</p>
<p style="margin:0;color:#087f5b;font-weight:bold">❤️🇲🇹 We wish you the very best of luck finding a job in Malta.</p></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#071426;border-radius:10px 10px 0 0"><tr><td style="padding:18px;color:#fff">
<h2 style="margin:0;font-size:22px">MT · All Malta Job Offers</h2><p style="margin:5px 0 0;color:#E5AD42;font-weight:bold">Numbered job listings · ${allOffers.length} offers · Category, details and direct contacts</p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;font-size:13px">
<tbody>${offerRows}</tbody></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#f4f6f9;border-radius:8px"><tr><td style="padding:18px;text-align:center;color:#596579"><b>GestoriaCitaIA · Malta Jobs</b><br><a href="https://gestoriacitaia.com" style="color:#005ea8;text-decoration:none">gestoriacitaia.com</a></td></tr></table>
</td></tr></table></td></tr></table></body></html>`,
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
        console.log(`✅ Email de todas las ofertas enviado a ${email}; ofertas=${allOffers.length}; messageId=${offersMail.messageId}`);
      } else {
        console.log(`⏭️ Email de ofertas ya enviado para esta sesión Stripe: ${session.id}`);
      }
    } catch (offersEmailError: any) {
      console.error("❌ Error enviando todas las ofertas Malta:", offersEmailError?.message || offersEmailError);
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
