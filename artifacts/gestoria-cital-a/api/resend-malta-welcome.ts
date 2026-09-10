import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CONCURRENCY = 5;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(queue: any) {
  const queueId = queue.id;
  const applicationId = queue.application_id;

  // Claim this queue item. If another invocation already claimed it, skip it.
  const { data: claimed, error: claimError } = await supabase
    .from("welcome_email_resend_queue")
    .update({ status: "processing", error_message: null })
    .eq("id", queueId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claimed) return { skipped: true };

  try {
    const { data: application, error: applicationError } = await supabase
      .from("malta_applications")
      .select(`
        id,
        full_name,
        email,
        plan,
        paid,
        pdf_url,
        cover_letter_url,
        welcome_email_sent_at,
        welcome_email_message_id
      `)
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError || !application) {
      throw new Error(applicationError?.message || "Application not found.");
    }

    if (!application.paid) throw new Error("Application is not paid.");
    if (!application.email?.trim()) throw new Error("Application has no email.");

    console.log(`\\n🇲🇹 Processing ${application.email}`);

    let cvUrl = application.pdf_url || "";
    let letterUrl = application.cover_letter_url || "";

    // IMPORTANT: generate if EITHER document is missing.
    if (!cvUrl || !letterUrl) {
      const baseUrl =
        process.env.NEXT_PUBLIC_URL || "https://gestoriacitaia.com";

      console.log(`📄 Missing document(s). Generating for ${application.id}...`);

      const docsResponse = await fetch(
        `${baseUrl}/api/generate-malta-documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: application.id }),
        }
      );

      const responseText = await docsResponse.text();

      if (!docsResponse.ok) {
        throw new Error(
          `generate-malta-documents failed (${docsResponse.status}): ${responseText}`
        );
      }

      let docs: any;
      try {
        docs = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Respuesta inválida de generate-malta-documents: ${responseText}`
        );
      }

      cvUrl = docs.cvUrl || cvUrl;
      letterUrl =
        docs.letterUrl ||
        docs.coverLetterUrl ||
        letterUrl;
    }

    // NEVER send a Welcome email without BOTH documents.
    if (!cvUrl) throw new Error("Falta el CV.");
    if (!letterUrl) throw new Error("Falta el Cover Letter.");

    // Save document URLs.
    const documentUpdate: any = {};
    if (cvUrl !== application.pdf_url) documentUpdate.pdf_url = cvUrl;
    if (letterUrl !== application.cover_letter_url) {
      documentUpdate.cover_letter_url = letterUrl;
    }

    if (Object.keys(documentUpdate).length) {
      const { error } = await supabase
        .from("malta_applications")
        .update(documentUpdate)
        .eq("id", application.id);
      if (error) throw new Error(`Error guardando documentos: ${error.message}`);
    }

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

    await transporter.verify();

    // Download and validate BOTH PDFs before sending.
    console.log("📥 Downloading CV...");
    const cvResponse = await fetch(cvUrl);
    if (!cvResponse.ok) {
      throw new Error(`No se pudo descargar el CV (${cvResponse.status})`);
    }
    const cvBuffer = Buffer.from(await cvResponse.arrayBuffer());

    console.log("📥 Downloading Cover Letter...");
    const letterResponse = await fetch(letterUrl);
    if (!letterResponse.ok) {
      throw new Error(
        `No se pudo descargar Cover Letter (${letterResponse.status})`
      );
    }
    const letterBuffer = Buffer.from(await letterResponse.arrayBuffer());

    const fullName = application.full_name?.trim() || "there";
    const planName =
      application.plan === "weekly"
        ? "Weekly Plan (7 days)"
        : "Monthly Plan (30 days)";

    const attachments = [
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
    ];

    console.log(`📧 Sending Welcome to ${application.email}...`);

    const mailResult = await transporter.sendMail({
      from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
      to: application.email,
      subject: `🇲🇹 Welcome ${fullName}! Your Malta Job Journey Starts Today`,
      attachments,
      html: `
<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f4f6f9;padding:40px 0;font-family:Arial,sans-serif;">
<tr>
<td align="center">

<table width="700" cellpadding="0" cellspacing="0"
style="width:100%;max-width:700px;background:#ffffff;border-radius:12px;overflow:hidden;">

<tr>
<td style="background:#0B57D0;padding:35px;text-align:center;color:#fff;">

<h1 style="margin:0;">
GestoriaCitaIA
</h1>

<p style="margin-top:10px;font-size:18px;">
🇲🇹 Malta Jobs
</p>

</td>
</tr>

<tr>
<td style="padding:40px;">

<div dir="rtl"
style="direction:rtl;text-align:right;">

<h2>
🇲🇦 🇲🇹 السلام عليكم ${fullName}
</h2>

<div style="background:#EAF3FF;border-right:5px solid #0B57D0;padding:18px;margin:25px 0;border-radius:8px;">

<b>⏳ شحال غادي ياخذ الوقت؟</b>

<br><br>

📄 تحضير CV و Cover Letter خلال 24 ساعة.

<br><br>

📤 من بعد غادي نبداو نرسلو الترشيحات كل نهار.

<br><br>

📩 إلى جاك أي استدعاء أو مقابلة غادي نخبرك مباشرة.

</div>

<p style="font-size:18px;line-height:32px;">
شكراً بزاف على الثقة ديالك فـ
<b>GestoriaCitaIA</b>.
</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
🌟 حلمك تخدم فمالطا غادي يتحقق معانا إن شاء الله.
</p>

<p style="font-size:18px;line-height:32px;">
من اليوم فريقنا غادي يبدا يخدم على الملف ديالك
ويرسل الترشيحات يومياً حتى تلقى أفضل فرصة عمل.
</p>

<p style="font-size:18px;">
<b>الباقة ديالك:</b> ${planName}
</p>

<p style="font-size:18px;line-height:34px;">

✅ غادي نحضرو ليك CV احترافي باللغة الإنجليزية.

<br><br>

✅ غادي نحضرو ليك Cover Letter احترافية.

<br><br>

✅ غادي نرسلو الترشيح ديالك حتى لـ
<b>10 شركات كل نهار</b>
حسب الباقة ديالك.

<br><br>

✅ وإنت مرتاح، فريقنا هو اللي غادي يخدم عليك كل يوم.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
استمتع بوقتك وخلي الخدمة علينا ✈️
</p>

<p style="font-size:18px;">
أول ما توصلنا أي مقابلة أو عرض عمل
غادي نخبرك مباشرة.
</p>

</div>

<hr style="margin:45px 0;">

<div style="text-align:left;">

<h2>
🇬🇧 🇲🇹 Hello ${fullName},
</h2>

<div style="background:#EAF3FF;border-left:5px solid #0B57D0;padding:18px;margin:25px 0;border-radius:8px;">

<b>⏳ Estimated processing time</b>

<br><br>

📄 CV & Cover Letter: within 24 hours.

<br><br>

📤 Daily applications: immediately after your documents are ready.

<br><br>

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
From today our recruitment team starts working
on your profile and will submit your application
every day until you receive the best job
opportunity in Malta.
</p>

<p style="font-size:18px;">
<b>Your plan:</b> ${planName}
</p>

<p style="font-size:18px;line-height:34px;">

✅ Professional CV in English

<br><br>

✅ Professional Cover Letter

<br><br>

✅ We submit your application to
<b>up to 10 companies every day</b>
depending on your plan.

<br><br>

✅ Our team works every day to find the best employer for you.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
Relax while our team works for you every single day. 🌴
</p>

<p style="font-size:18px;">
As soon as an employer contacts us
or invites you for an interview,
we will notify you immediately.
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

Questions?
<br>

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

    const sentAt = new Date().toISOString();

    await supabase
      .from("malta_applications")
      .update({
        welcome_email_sent_at: sentAt,
        welcome_email_message_id: mailResult.messageId,
        pdf_url: cvUrl,
        cover_letter_url: letterUrl,
      })
      .eq("id", application.id);

    await supabase
      .from("welcome_email_resend_queue")
      .update({
        status: "sent",
        sent_at: sentAt,
        message_id: mailResult.messageId,
        error_message: null,
      })
      .eq("id", queueId);

    console.log(`✅ SENT ${application.email} | ${mailResult.messageId}`);

    return {
      sent: true,
      email: application.email,
      messageId: mailResult.messageId,
    };
  } catch (error: any) {
    const message = error?.message || String(error);

    console.error(`❌ FAILED ${applicationId}:`, message);

    await supabase
      .from("welcome_email_resend_queue")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", queueId);

    return {
      sent: false,
      email: applicationId,
      error: message,
    };
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  console.log("========================================");
  console.log("🇲🇹 RESEND ALL MALTA WELCOME EMAILS");
  console.log("========================================");

  try {
    // Take ALL currently pending rows.
    const { data: queue, error: queueError } = await supabase
      .from("welcome_email_resend_queue")
      .select("id, application_id, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(300);

    if (queueError) {
      return res.status(500).json({ ok: false, error: queueError.message });
    }

    if (!queue?.length) {
      return res.status(200).json({
        ok: true,
        message: "No hay emails pendientes.",
        total: 0,
      });
    }

    console.log(`📦 Pendientes encontrados: ${queue.length}`);
    console.log(`⚡ Concurrencia: ${CONCURRENCY}`);

    const results: any[] = [];

    // Process in small parallel batches so 236 can be sent in this invocation
    // without opening 236 SMTP connections simultaneously.
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      const batch = queue.slice(i, i + CONCURRENCY);

      console.log(
        `\\n🚀 Batch ${Math.floor(i / CONCURRENCY) + 1} / ${Math.ceil(queue.length / CONCURRENCY)}`
      );

      const batchResults = await Promise.all(
        batch.map((item) => processOne(item))
      );

      results.push(...batchResults);

      // Small pause between batches to be gentle with SMTP/Brevo.
      if (i + CONCURRENCY < queue.length) {
        await sleep(300);
      }
    }

    const sent = results.filter((r) => r.sent).length;
    const failed = results.filter((r) => r.sent === false).length;
    const skipped = results.filter((r) => r.skipped).length;

    console.log("========================================");
    console.log(`✅ ENVIADOS: ${sent}`);
    console.log(`❌ FALLIDOS: ${failed}`);
    console.log(`⏭️ OMITIDOS: ${skipped}`);
    console.log("========================================");

    return res.status(200).json({
      ok: true,
      message: "Procesamiento terminado.",
      total: queue.length,
      sent,
      failed,
      skipped,
      results,
    });
  } catch (error: any) {
    console.error("❌ FATAL:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
}
