import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    console.log("========================================");
    console.log("🇲🇹 RESEND MALTA WELCOME EMAIL");
    console.log("========================================");

    // Buscar el primer correo pendiente
    const { data: queue, error: queueError } = await supabase
      .from("welcome_email_resend_queue")
      .select(`
        id,
        application_id,
        status,
        created_at
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (queueError) {
      console.error("❌ Queue error:", queueError);

      return res.status(500).json({
        ok: false,
        error: queueError.message,
      });
    }

    if (!queue) {
      return res.status(200).json({
        ok: true,
        message: "No hay emails pendientes.",
      });
    }

    console.log("📦 Queue:", queue.id);
    console.log("📦 Application:", queue.application_id);

    // Marcar processing
    const { error: processingError } = await supabase
      .from("welcome_email_resend_queue")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", queue.id)
      .eq("status", "pending");

    if (processingError) {
      console.error("❌ Processing error:", processingError);

      return res.status(500).json({
        ok: false,
        error: processingError.message,
      });
    }

    // Obtener cliente
    const { data: application, error: applicationError } =
      await supabase
        .from("malta_applications")
        .select(`
          id,
          full_name,
          email,
          plan,
          paid,
          pdf_url,
          cover_letter_url
        `)
        .eq("id", queue.application_id)
        .maybeSingle();

    if (applicationError || !application) {
      const message =
        applicationError?.message ||
        "Application not found";

      await supabase
        .from("welcome_email_resend_queue")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", queue.id);

      return res.status(404).json({
        ok: false,
        error: message,
      });
    }

    if (!application.paid) {
      const message = "Application is not paid.";

      await supabase
        .from("welcome_email_resend_queue")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", queue.id);

      return res.status(400).json({
        ok: false,
        error: message,
      });
    }

    if (!application.email) {
      const message = "Application has no email.";

      await supabase
        .from("welcome_email_resend_queue")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", queue.id);

      return res.status(400).json({
        ok: false,
        error: message,
      });
    }

    console.log("👤 Nombre:", application.full_name);
    console.log("📧 Email:", application.email);
    console.log("💳 Paid:", application.paid);
    console.log("📋 Plan:", application.plan);

    // =====================================================
    // SMTP BREVO
    // MISMA CONFIGURACIÓN QUE TU STRIPE WEBHOOK
    // =====================================================

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

    console.log("📨 Verificando SMTP...");

    await transporter.verify();

    console.log("✅ SMTP OK");

    // =====================================================
    // ADJUNTOS
    // =====================================================

    const attachments: any[] = [];

    // CV
    if (application.pdf_url) {
      try {
        console.log("📄 Descargando CV...");

        const response = await fetch(application.pdf_url);

        if (response.ok) {
          const buffer = Buffer.from(
            await response.arrayBuffer()
          );

          attachments.push({
            filename: "CV-Malta.pdf",
            content: buffer,
            contentType: "application/pdf",
          });

          console.log("✅ CV adjuntado");
        }
      } catch (error) {
        console.error("⚠️ Error CV:", error);
      }
    }

    // COVER LETTER
    if (application.cover_letter_url) {
      try {
        console.log("📄 Descargando Cover Letter...");

        const response = await fetch(
          application.cover_letter_url
        );

        if (response.ok) {
          const buffer = Buffer.from(
            await response.arrayBuffer()
          );

          attachments.push({
            filename: "Cover-Letter-Malta.pdf",
            content: buffer,
            contentType: "application/pdf",
          });

          console.log("✅ Cover Letter adjuntada");
        }
      } catch (error) {
        console.error(
          "⚠️ Error Cover Letter:",
          error
        );
      }
    }

    const fullName =
      application.full_name?.trim() || "there";

    const planName =
      application.plan === "weekly"
        ? "Weekly Plan (7 days)"
        : "Monthly Plan (30 days)";

    // =====================================================
    // ENVIAR EMAIL
    // =====================================================

    console.log(
      "📧 ENVIANDO A:",
      application.email
    );

    const result = await transporter.sendMail({
      from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
      to: application.email,
      subject:
        `🇲🇹 Welcome ${fullName}! Your Malta Job Journey Starts Today`,

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
من اليوم فريقنا غادي يبدا يخدم على الملف ديالك ويرسل الترشيحات يومياً حتى تلقى أفضل فرصة عمل.
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
أول ما توصلنا أي مقابلة أو عرض عمل غادي نخبرك مباشرة.
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
As soon as an employer contacts us or invites you for an interview, we will notify you immediately.
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

    console.log("========================================");
    console.log("✅ EMAIL ENVIADO");
    console.log("📧:", application.email);
    console.log("🆔:", result.messageId);
    console.log("📎:", attachments.map(a => a.filename));
    console.log("========================================");

    const sentAt = new Date().toISOString();

    // Guardar en aplicación
    await supabase
      .from("malta_applications")
      .update({
        welcome_email_sent_at: sentAt,
        welcome_email_message_id: result.messageId,
      })
      .eq("id", application.id);

    // Marcar cola como enviada
    await supabase
      .from("welcome_email_resend_queue")
      .update({
        status: "sent",
        sent_at: sentAt,
        message_id: result.messageId,
        error_message: null,
      })
      .eq("id", queue.id);

    return res.status(200).json({
      ok: true,
      message: "Welcome email sent successfully.",
      applicationId: application.id,
      email: application.email,
      queueId: queue.id,
      messageId: result.messageId,
      attachments: attachments.map(
        a => a.filename
      ),
    });

  } catch (error: any) {

    console.error("========================================");
    console.error("❌ ERROR ENVIANDO WELCOME EMAIL");
    console.error(error);
    console.error("========================================");

    return res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
}
