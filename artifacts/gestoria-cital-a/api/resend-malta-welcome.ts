import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_SINGLE_FILE_BYTES = 18 * 1024 * 1024;
const MAX_COMBINED_BYTES = 18 * 1024 * 1024;
const MAX_PER_RUN = 10;

function mb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadPdf(url: string, label: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo descargar ${label} (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length < 100) {
    throw new Error(`${label} descargado pero parece vacío.`);
  }

  if (buffer.length > MAX_SINGLE_FILE_BYTES) {
    throw new Error(
      `${label} demasiado grande (${mb(buffer.length)} MB).`
    );
  }

  return buffer;
}

/**
 * IMPORTANTE:
 * El Welcome NO depende de que exista CV o Cover Letter.
 *
 * Si existen:
 *   - se descargan y pueden adjuntarse.
 *
 * Si no existen:
 *   - se devuelve null y el Welcome se envía igualmente.
 *
 * NO generamos documentos aquí.
 */
async function getDocuments(application: any) {
  let cvUrl = application.pdf_url || "";
  let letterUrl = application.cover_letter_url || "";

  let cv: Buffer | null = null;
  let letter: Buffer | null = null;

  if (cvUrl) {
    try {
      cv = await downloadPdf(cvUrl, "el CV");
    } catch (e: any) {
      console.warn(`⚠️ CV URL failed: ${e?.message || e}`);
      cv = null;
    }
  }

  if (letterUrl) {
    try {
      letter = await downloadPdf(letterUrl, "el Cover Letter");
    } catch (e: any) {
      console.warn(`⚠️ Cover Letter URL failed: ${e?.message || e}`);
      letter = null;
    }
  }

  return {
    cvUrl,
    letterUrl,
    cv,
    letter,
  };
}

async function sendMail(
  transporter: nodemailer.Transporter,
  application: any,
  attachments: any[],
  documentLinks: { cvUrl?: string; letterUrl?: string } = {}
) {
  const fullName = application.full_name?.trim() || "there";

  const planName =
    application.plan === "weekly"
      ? "Weekly Plan (7 days)"
      : "Monthly Plan (30 days)";

  return transporter.sendMail({
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

<h1 style="margin:0;">GestoriaCitaIA</h1>

<p style="margin-top:10px;font-size:18px;">
🇲🇹 Malta Jobs
</p>

</td>
</tr>

<tr>
<td style="padding:40px;">

<div dir="rtl" style="direction:rtl;text-align:right;">

<h2>🇲🇦 🇲🇹 السلام عليكم ${fullName}</h2>

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
شكراً بزاف على الثقة ديالك فـ <b>GestoriaCitaIA</b>.
</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
🌟 حلمك تخدم فمالطا غادي يتحقق معانا إن شاء الله.
</p>

<p style="font-size:18px;line-height:32px;">
من اليوم فريقنا غادي يبدا يخدم على الملف ديالك ويرسل الترشيحات يومياً حتى تلقى أفضل فرصة عمل فمالطا.
</p>

<p style="font-size:18px;">
<b>الباقة ديالك:</b> ${planName}
</p>

<p style="font-size:18px;line-height:34px;">

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

<h2>🇬🇧 🇲🇹 Hello ${fullName},</h2>

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
Thank you for choosing <b>GestoriaCitaIA</b>.
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

✅ Our team works every day to find the best employer for you.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
Relax while our team works for you every single day. 🌴
</p>

<p style="font-size:18px;">
As soon as an employer contacts us or invites you for an interview, we will notify you immediately.
</p>

<div style="text-align:center;margin-top:45px;">

<a href="https://gestoriacitaia.com"
style="background:#0B57D0;color:white;text-decoration:none;padding:18px 36px;border-radius:8px;font-size:18px;font-weight:bold;display:inline-block;">

Visit GestoriaCitaIA

</a>

</div>

${
  documentLinks.cvUrl || documentLinks.letterUrl
    ? `
<div style="margin-top:30px;padding:20px;background:#FFF7E6;border-radius:10px;">

<h3 style="margin-top:0;">
📥 Your documents
</h3>

${
  documentLinks.cvUrl
    ? `<p><a href="${documentLinks.cvUrl}">📄 Download CV</a></p>`
    : ""
}

${
  documentLinks.letterUrl
    ? `<p><a href="${documentLinks.letterUrl}">📄 Download Cover Letter</a></p>`
    : ""
}

</div>
`
    : ""
}

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
}

async function processOne(
  queue: any,
  transporter: nodemailer.Transporter
) {
  const queueId = queue.id;
  const applicationId = queue.application_id;

  const { data: claimed, error: claimError } = await supabase
    .from("welcome_email_resend_queue")
    .update({
      status: "processing",
      error_message: null,
    })
    .eq("id", queueId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError) {
    throw claimError;
  }

  if (!claimed) {
    return {
      skipped: true,
    };
  }

  try {
    const { data: application, error } = await supabase
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

    if (error || !application) {
      throw new Error(
        error?.message || "Application not found."
      );
    }

    if (!application.paid) {
      throw new Error("Application is not paid.");
    }

    if (!application.email?.trim()) {
      throw new Error("Application has no email.");
    }

    console.log(
      `🇲🇹 Processing Welcome ${application.email}`
    );

    /*
     * IMPORTANTE:
     * CV y Cover Letter son OPCIONALES para el Welcome.
     */
    const docs = await getDocuments(application);

    const attachments: any[] = [];

    const links: {
      cvUrl?: string;
      letterUrl?: string;
    } = {};

    /*
     * Adjuntar CV solamente si existe y se pudo descargar.
     */
    if (docs.cv) {
      attachments.push({
        filename: "CV-Malta.pdf",
        content: docs.cv,
        contentType: "application/pdf",
      });
    } else if (docs.cvUrl) {
      links.cvUrl = docs.cvUrl;
    }

    /*
     * Adjuntar Cover Letter solamente si existe y se pudo descargar.
     */
    if (docs.letter) {
      attachments.push({
        filename: "Cover-Letter-Malta.pdf",
        content: docs.letter,
        contentType: "application/pdf",
      });
    } else if (docs.letterUrl) {
      links.letterUrl = docs.letterUrl;
    }

    /*
     * Límite combinado de seguridad.
     * Si hay documentos demasiado grandes, los quitamos
     * de los adjuntos y dejamos el enlace.
     */
    let attachmentBytes = attachments.reduce(
      (total, item) => total + item.content.length,
      0
    );

    if (attachmentBytes > MAX_COMBINED_BYTES) {
      console.warn(
        `⚠️ Adjuntos demasiado grandes: ${mb(attachmentBytes)} MB`
      );

      const originalAttachments = [...attachments];

      attachments.length = 0;

      for (const item of originalAttachments) {
        if (item.filename === "CV-Malta.pdf") {
          links.cvUrl = docs.cvUrl || undefined;
        }

        if (item.filename === "Cover-Letter-Malta.pdf") {
          links.letterUrl = docs.letterUrl || undefined;
        }
      }

      attachmentBytes = 0;
    }

    console.log(
      `📧 Sending Welcome to ${application.email} | attachments=${attachments.length}`
    );

    const result = await sendMail(
      transporter,
      application,
      attachments,
      links
    );

    const sentAt = new Date().toISOString();

    await supabase
      .from("malta_applications")
      .update({
        welcome_email_sent_at: sentAt,
        welcome_email_message_id: result.messageId,

        /*
         * Guardamos URLs solamente si ya existían.
         * No generamos documentos.
         */
        pdf_url: docs.cvUrl || null,
        cover_letter_url: docs.letterUrl || null,
      })
      .eq("id", application.id);

    await supabase
      .from("welcome_email_resend_queue")
      .update({
        status: "sent",
        sent_at: sentAt,
        message_id: result.messageId,
        error_message: null,
      })
      .eq("id", queueId);

    return {
      sent: true,
      email: application.email,
      mode:
        attachments.length === 2
          ? "both_attachments"
          : attachments.length === 1
          ? "one_attachment"
          : "welcome_only",
    };
  } catch (error: any) {
    const message =
      error?.message || String(error);

    console.error(
      `❌ FAILED ${applicationId}: ${message}`
    );

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

  console.log(
    "========================================"
  );

  console.log(
    "🇲🇹 WELCOME EMAIL RESEND — PENDING QUEUE"
  );

  console.log(
    "========================================"
  );

  try {
    const { data: queue, error: queueError } =
      await supabase
        .from("welcome_email_resend_queue")
        .select(
          "id, application_id, status, created_at"
        )
        .eq("status", "pending")
        .order("created_at", {
          ascending: true,
        })
        .limit(MAX_PER_RUN);

    if (queueError) {
      return res.status(500).json({
        ok: false,
        error: queueError.message,
      });
    }

    if (!queue?.length) {
      return res.status(200).json({
        ok: true,
        message: "No hay Welcome pendientes.",
        total: 0,
      });
    }

    const transporter =
      nodemailer.createTransport({
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

    const results: any[] = [];

    /*
     * Procesamiento secuencial.
     * Máximo 10 por ejecución.
     */
    for (const item of queue) {
      const result = await processOne(
        item,
        transporter
      );

      results.push(result);

      await sleep(1500);
    }

    const sent = results.filter(
      (r) => r.sent
    ).length;

    const failed = results.filter(
      (r) => r.sent === false
    ).length;

    return res.status(200).json({
      ok: true,
      message:
        "Welcome resend terminado.",
      total: queue.length,
      sent,
      failed,
      results,
    });
  } catch (error: any) {
    console.error(
      "❌ FATAL:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        String(error),
    });
  }
}
