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
  let currentQueueId: string | null = null;

  try {
    // =====================================================
    // 1. MÉTODO
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
    // 2. BUSCAR PRIMER EMAIL PENDING
    // =====================================================

    const { data: queue, error: queueError } =
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

    currentQueueId = queue.id;

    console.log("📦 Queue ID:", queue.id);
    console.log("📦 Application ID:", queue.application_id);

    // =====================================================
    // 3. MARCAR PROCESSING
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
    // 4. OBTENER CLIENTE
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
      .maybeSingle();

    if (applicationError || !application) {
      const message =
        applicationError?.message ||
        "Application not found.";

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

    // =====================================================
    // 5. COMPROBAR PAGO
    // =====================================================

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

    // =====================================================
    // 6. COMPROBAR EMAIL
    // =====================================================

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

    console.log("👤 Cliente:", application.full_name);
    console.log("📧 Email:", application.email);
    console.log("💳 Paid:", application.paid);
    console.log("📋 Plan:", application.plan);
    console.log("📄 CV actual:", application.pdf_url);
    console.log(
      "📄 Cover Letter actual:",
      application.cover_letter_url
    );

    // =====================================================
    // 7. SI NO EXISTE CV -> GENERAR DOCUMENTOS
    // =====================================================

    let cvUrl = application.pdf_url || "";
    let letterUrl = application.cover_letter_url || "";

    if (!cvUrl) {
      console.log(
        "⚠️ El cliente no tiene CV. Generando documentos..."
      );

      const baseUrl =
        process.env.NEXT_PUBLIC_URL ||
        "https://gestoriacitaia.com";

      try {
        const docsResponse = await fetch(
          `${baseUrl}/api/generate-malta-documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              applicationId: application.id,
            }),
          }
        );

        const responseText =
          await docsResponse.text();

        console.log(
          "📄 generate-malta-documents status:",
          docsResponse.status
        );

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

        cvUrl = docs.cvUrl || "";
        letterUrl =
          docs.letterUrl ||
          docs.coverLetterUrl ||
          letterUrl;

        console.log("✅ Documentos generados:");
        console.log("CV:", cvUrl);
        console.log("Letter:", letterUrl);

      } catch (error: any) {
        console.error(
          "❌ Error generando documentos:",
          error
        );

        const message =
          error?.message ||
          String(error);

        await supabase
          .from("welcome_email_resend_queue")
          .update({
            status: "failed",
            error_message:
              `Error generando documentos: ${message}`,
          })
          .eq("id", queue.id);

        return res.status(500).json({
          ok: false,
          error:
            `No se pudo generar el CV: ${message}`,
        });
      }
    } else {
      console.log(
        "✅ El cliente ya tiene CV. No se genera otro."
      );
    }

    // =====================================================
    // 8. GUARDAR URLS GENERADAS
    // =====================================================

    const documentUpdate: any = {};

    if (cvUrl && cvUrl !== application.pdf_url) {
      documentUpdate.pdf_url = cvUrl;
    }

    if (
      letterUrl &&
      letterUrl !== application.cover_letter_url
    ) {
      documentUpdate.cover_letter_url = letterUrl;
    }

    if (Object.keys(documentUpdate).length > 0) {
      console.log(
        "💾 Guardando URLs de documentos..."
      );

      const { error: documentUpdateError } =
        await supabase
          .from("malta_applications")
          .update(documentUpdate)
          .eq("id", application.id);

      if (documentUpdateError) {
        console.error(
          "⚠️ Error guardando documentos:",
          documentUpdateError
        );
      } else {
        console.log(
          "✅ URLs guardadas correctamente."
        );
      }
    }

    // =====================================================
    // 9. COMPROBAR QUE TENEMOS CV
    // =====================================================

    if (!cvUrl) {
      const message =
        "No se pudo obtener el CV.";

      await supabase
        .from("welcome_email_resend_queue")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", queue.id);

      return res.status(500).json({
        ok: false,
        error: message,
      });
    }

    // =====================================================
    // 10. CREAR SMTP BREVO
    // =====================================================

    console.log("📨 Conectando con Brevo SMTP...");

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

    console.log("✅ Brevo SMTP conectado.");

    // =====================================================
    // 11. DESCARGAR ADJUNTOS
    // =====================================================

    const attachments: any[] = [];

    // ---------------- CV ----------------

    console.log("📥 Descargando CV...");

    const cvResponse = await fetch(cvUrl);

    if (!cvResponse.ok) {
      throw new Error(
        `No se pudo descargar el CV (${cvResponse.status})`
      );
    }

    const cvBuffer = Buffer.from(
      await cvResponse.arrayBuffer()
    );

    attachments.push({
      filename: "CV-Malta.pdf",
      content: cvBuffer,
      contentType: "application/pdf",
    });

    console.log("✅ CV adjuntado.");

    // ---------------- COVER LETTER ----------------

    if (letterUrl) {
      console.log(
        "📥 Descargando Cover Letter..."
      );

      const letterResponse =
        await fetch(letterUrl);

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
          "✅ Cover Letter adjuntada."
        );
      } else {
        console.warn(
          "⚠️ No se pudo descargar Cover Letter:",
          letterResponse.status
        );
      }
    }

    // =====================================================
    // 12. DATOS DEL EMAIL
    // =====================================================

    const fullName =
      application.full_name?.trim() ||
      "there";

    const planName =
      application.plan === "weekly"
        ? "Weekly Plan (7 days)"
        : "Monthly Plan (30 days)";

    // =====================================================
    // 13. ENVIAR EMAIL
    // =====================================================

    console.log(
      "📧 Enviando email a:",
      application.email
    );

    const mailResult =
      await transporter.sendMail({
        from:
          `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,

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

    // =====================================================
    // 14. ÉXITO
    // =====================================================

    const sentAt =
      new Date().toISOString();

    console.log("========================================");
    console.log("✅ EMAIL ENVIADO");
    console.log("📧:", application.email);
    console.log("🆔:", mailResult.messageId);
    console.log(
      "📎:",
      attachments.map(
        (a) => a.filename
      )
    );
    console.log("========================================");

    // =====================================================
    // 15. GUARDAR EN APPLICATION
    // =====================================================

    const applicationUpdate: any = {
      welcome_email_sent_at: sentAt,
      welcome_email_message_id:
        mailResult.messageId,
    };

    if (cvUrl) {
      applicationUpdate.pdf_url = cvUrl;
    }

    if (letterUrl) {
      applicationUpdate.cover_letter_url =
        letterUrl;
    }

    const {
      error: applicationUpdateError,
    } = await supabase
      .from("malta_applications")
      .update(applicationUpdate)
      .eq("id", application.id);

    if (applicationUpdateError) {
      console.error(
        "⚠️ Error actualizando application:",
        applicationUpdateError
      );
    }

    // =====================================================
    // 16. MARCAR QUEUE COMO SENT
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
    // 17. RESPUESTA
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

      cvUrl,

      letterUrl,

      attachments:
        attachments.map(
          (a) => a.filename
        ),
    });

  } catch (error: any) {

    console.error("========================================");
    console.error(
      "❌ ERROR RESEND MALTA WELCOME"
    );
    console.error(error);
    console.error("========================================");

    // Marcar failed si conocemos la cola
    if (currentQueueId) {
      try {
        await supabase
          .from("welcome_email_resend_queue")
          .update({
            status: "failed",
            error_message:
              error?.message ||
              String(error),
          })
          .eq("id", currentQueueId);
      } catch (queueError) {
        console.error(
          "❌ Error actualizando failed:",
          queueError
        );
      }
    }

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        String(error),
    });
  }
}
