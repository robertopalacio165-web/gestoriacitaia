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
    // =====================================================
    // 1. Solo GET/POST
    // =====================================================

    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    console.log("========================================");
    console.log("🇲🇹 RESEND MALTA WELCOME EMAIL");
    console.log("========================================");

    // =====================================================
    // 2. Buscar el primer email pendiente
    // =====================================================

    const { data: queueRows, error: queueError } =
      await supabase
        .from("welcome_email_resend_queue")
        .select(`
          id,
          application_id,
          status,
          created_at
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);

    if (queueError) {
      console.error("❌ Queue error:", queueError);

      return res.status(500).json({
        ok: false,
        error: queueError.message,
      });
    }

    // =====================================================
    // 3. No hay emails pendientes
    // =====================================================

    if (!queueRows || queueRows.length === 0) {
      console.log("ℹ️ No hay emails pendientes.");

      return res.status(200).json({
        ok: true,
        message: "No hay emails pendientes.",
      });
    }

    const queue = queueRows[0];

    console.log("📦 Queue ID:", queue.id);
    console.log("📦 Application ID:", queue.application_id);

    // =====================================================
    // 4. Marcar como processing
    // =====================================================

    const { error: processingError } = await supabase
      .from("welcome_email_resend_queue")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", queue.id)
      .eq("status", "pending");

    if (processingError) {
      console.error(
        "❌ Error marcando processing:",
        processingError
      );

      return res.status(500).json({
        ok: false,
        error: processingError.message,
      });
    }

    // =====================================================
    // 5. Buscar aplicación
    // =====================================================

    const {
      data: application,
      error: applicationError,
    } = await supabase
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
      .eq("id", queue.application_id)
      .single();

    if (applicationError || !application) {
      const errorMessage =
        applicationError?.message ||
        "Application not found";

      console.error("❌", errorMessage);

      await supabase
        .from("welcome_email_resend_queue")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", queue.id);

      return res.status(404).json({
        ok: false,
        error: errorMessage,
      });
    }

    console.log("👤 Cliente:", application.full_name);
    console.log("📧 Email:", application.email);
    console.log("💳 Paid:", application.paid);
    console.log("📋 Plan:", application.plan);

    // =====================================================
    // 6. Verificar pago
    // =====================================================

    if (!application.paid) {
      const errorMessage =
        "Application is not paid.";

      await supabase
        .from("welcome_email_resend_queue")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", queue.id);

      return res.status(400).json({
        ok: false,
        error: errorMessage,
      });
    }

    // =====================================================
    // 7. Verificar email
    // =====================================================

    if (!application.email) {
      const errorMessage =
        "Application has no email.";

      await supabase
        .from("welcome_email_resend_queue")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", queue.id);

      return res.status(400).json({
        ok: false,
        error: errorMessage,
      });
    }

    // =====================================================
    // 8. CREAR SMTP BREVO
    // =====================================================

    console.log("📨 Conectando con SMTP...");

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

    // =====================================================
    // 9. Verificar SMTP
    // =====================================================

    await transporter.verify();

    console.log("✅ SMTP conectado correctamente");

    // =====================================================
    // 10. Adjuntos
    // =====================================================

    const attachments: any[] = [];

    // -----------------------------------------------------
    // CV
    // -----------------------------------------------------

    if (application.pdf_url) {
      console.log("📄 Descargando CV...");

      try {
        const cvResponse = await fetch(
          application.pdf_url
        );

        if (cvResponse.ok) {
          const cvBuffer = Buffer.from(
            await cvResponse.arrayBuffer()
          );

          attachments.push({
            filename: "CV-Malta.pdf",
            content: cvBuffer,
            contentType: "application/pdf",
          });

          console.log("✅ CV añadido");
        } else {
          console.log(
            "⚠️ No se pudo descargar CV:",
            cvResponse.status
          );
        }
      } catch (error) {
        console.error(
          "⚠️ Error descargando CV:",
          error
        );
      }
    } else {
      console.log("ℹ️ Esta aplicación no tiene CV.");
    }

    // -----------------------------------------------------
    // COVER LETTER
    // -----------------------------------------------------

    if (application.cover_letter_url) {
      console.log(
        "📄 Descargando Cover Letter..."
      );

      try {
        const letterResponse = await fetch(
          application.cover_letter_url
        );

        if (letterResponse.ok) {
          const letterBuffer = Buffer.from(
            await letterResponse.arrayBuffer()
          );

          attachments.push({
            filename: "Cover-Letter-Malta.pdf",
            content: letterBuffer,
            contentType: "application/pdf",
          });

          console.log(
            "✅ Cover Letter añadida"
          );
        } else {
          console.log(
            "⚠️ No se pudo descargar Cover Letter:",
            letterResponse.status
          );
        }
      } catch (error) {
        console.error(
          "⚠️ Error descargando Cover Letter:",
          error
        );
      }
    } else {
      console.log(
        "ℹ️ Esta aplicación no tiene Cover Letter."
      );
    }

    // =====================================================
    // 11. Nombre y plan
    // =====================================================

    const fullName =
      application.full_name?.trim() ||
      "there";

    const planName =
      application.plan === "weekly"
        ? "Weekly Plan (7 days)"
        : "Monthly Plan (30 days)";

    // =====================================================
    // 12. ENVIAR EMAIL
    // =====================================================

    console.log(
      "📧 Enviando email a:",
      application.email
    );

    const mailResult =
      await transporter.sendMail({
        from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,

        to: application.email,

        subject:
          `🇲🇹 Welcome ${fullName}! Your Malta Job Journey Starts Today`,

        attachments,

        html: `
<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  style="
    background:#f4f6f9;
    padding:40px 0;
    font-family:Arial,sans-serif;
"
>
<tr>
<td align="center">

<table
  width="700"
  cellpadding="0"
  cellspacing="0"
  style="
    width:100%;
    max-width:700px;
    background:#ffffff;
    border-radius:12px;
    overflow:hidden;
"
>

<tr>
<td
  style="
    background:#0B57D0;
    padding:35px;
    text-align:center;
    color:#fff;
"
>

<h1 style="margin:0;">
GestoriaCitaIA
</h1>

<p style="
  margin-top:10px;
  font-size:18px;
">
🇲🇹 Malta Jobs
</p>

</td>
</tr>

<tr>
<td style="padding:40px;">

<div
  dir="rtl"
  style="
    direction:rtl;
    text-align:right;
"
>

<h2 style="margin-top:0;">
🇲🇦 🇲🇹 السلام عليكم ${fullName}
</h2>

<div
  style="
    background:#EAF3FF;
    border-right:5px solid #0B57D0;
    padding:18px;
    margin:25px 0;
    border-radius:8px;
    text-align:right;
"
>

<b>⏳ شحال غادي ياخذ الوقت؟</b>
<br><br>

📄 تحضير CV و Cover Letter خلال 24 ساعة.
<br>

📤 من بعد غادي نبداو نرسلو الترشيحات كل نهار.
<br>

📩 إلى جاك أي استدعاء أو مقابلة غادي نخبرك مباشرة.

</div>

<p style="
  font-size:18px;
  line-height:32px;
">

شكراً بزاف على الثقة ديالك فـ
<b>GestoriaCitaIA</b>.

</p>

<p style="
  font-size:20px;
  color:#0B57D0;
  font-weight:bold;
">

🌟 حلمك تخدم فمالطا غادي يتحقق معانا إن شاء الله.

</p>

<p style="
  font-size:18px;
  line-height:32px;
">

من اليوم فريقنا غادي يبدا يخدم على الملف ديالك
ويرسل الترشيحات يومياً حتى تلقى أفضل فرصة عمل.

</p>

<p style="font-size:18px;">

<b>الباقة ديالك:</b>
${planName}

</p>

<p style="
  line-height:34px;
  font-size:18px;
">

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

<p style="
  font-size:20px;
  color:#0B57D0;
  font-weight:bold;
">

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

<div
  style="
    background:#EAF3FF;
    border-left:5px solid #0B57D0;
    padding:18px;
    margin:25px 0;
    border-radius:8px;
"
>

<b>⏳ Estimated processing time</b>
<br><br>

📄 CV & Cover Letter: within 24 hours.
<br>

📤 Daily applications: immediately after
your documents are ready.
<br>

📩 Interview invitations:
we will notify you immediately.

</div>

<p style="
  font-size:18px;
  line-height:30px;
">

Thank you for choosing
<b>GestoriaCitaIA</b>.

</p>

<p style="
  font-size:20px;
  color:#0B57D0;
  font-weight:bold;
">

🌟 Your dream to work in Malta starts today.

</p>

<p style="
  font-size:18px;
  line-height:30px;
">

From today our recruitment team starts working
on your profile and will submit your application
every day until you receive the best job
opportunity in Malta.

</p>

<p style="font-size:18px;">

<b>Your plan:</b>
${planName}

</p>

<p style="
  font-size:18px;
  line-height:34px;
">

✅ Professional CV in English

<br><br>

✅ Professional Cover Letter

<br><br>

✅ We submit your application to
<b>up to 10 companies every day</b>
depending on your plan.

<br><br>

✅ While you enjoy your holidays,
our team works every day to find
the best employer for you.

</p>

<p style="
  font-size:20px;
  color:#0B57D0;
  font-weight:bold;
">

Relax while our team works for you
every single day. 🌴

</p>

<p style="font-size:18px;">

As soon as an employer contacts us
or invites you for an interview,
we will notify you immediately.

</p>

<div
  style="
    text-align:center;
    margin-top:45px;
"
>

<a
  href="https://gestoriacitaia.com"
  style="
    background:#0B57D0;
    color:white;
    text-decoration:none;
    padding:18px 36px;
    border-radius:8px;
    font-size:18px;
    font-weight:bold;
    display:inline-block;
"
>

Visit GestoriaCitaIA

</a>

</div>

</div>

</td>
</tr>

<tr>
<td
  style="
    background:#f5f5f5;
    padding:20px;
    text-align:center;
    color:#666;
"
>

<p style="
  font-size:14px;
  color:#777;
  line-height:24px;
  text-align:center;
">

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

    // =====================================================
    // 13. EMAIL ENVIADO
    // =====================================================

    console.log(
      "========================================"
    );

    console.log(
      "✅ EMAIL ENVIADO CORRECTAMENTE"
    );

    console.log(
      "📧 To:",
      application.email
    );

    console.log(
      "🆔 Message ID:",
      mailResult.messageId
    );

    console.log(
      "📎 Attachments:",
      attachments.map(
        (item) => item.filename
      )
    );

    console.log(
      "========================================"
    );

    const sentAt =
      new Date().toISOString();

    // =====================================================
    // 14. Guardar en malta_applications
    // =====================================================

    const {
      error: applicationUpdateError,
    } = await supabase
      .from("malta_applications")
      .update({
        welcome_email_sent_at: sentAt,
        welcome_email_message_id:
          mailResult.messageId,
      })
      .eq("id", application.id);

    if (applicationUpdateError) {
      console.error(
        "⚠️ Error actualizando application:",
        applicationUpdateError
      );
    }

    // =====================================================
    // 15. Marcar queue como SENT
    // =====================================================

    const {
      error: queueUpdateError,
    } = await supabase
      .from("welcome_email_resend_queue")
      .update({
        status: "sent",
        sent_at: sentAt,
        message_id:
          mailResult.messageId,
        error_message: null,
      })
      .eq("id", queue.id);

    if (queueUpdateError) {
      console.error(
        "⚠️ Error actualizando queue:",
        queueUpdateError
      );
    }

    // =====================================================
    // 16. RESPUESTA
    // =====================================================

    return res.status(200).json({
      ok: true,

      message:
        "Welcome email sent successfully.",

      applicationId:
        application.id,

      queueId:
        queue.id,

      email:
        application.email,

      messageId:
        mailResult.messageId,

      attachments:
        attachments.map(
          (item) => item.filename
        ),
    });

  } catch (error: any) {

    console.error(
      "========================================"
    );

    console.error(
      "❌ RESEND EMAIL ERROR"
    );

    console.error(error);

    console.error(
      "========================================"
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        String(error),
    });
  }
}
