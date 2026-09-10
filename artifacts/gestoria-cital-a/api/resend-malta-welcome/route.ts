import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let queueId: string | null = null;

  try {
    // =====================================================
    // 1. Leer queueId opcional
    // =====================================================
    try {
      const body = await req.json();
      queueId = body?.queueId || null;
    } catch {
      // Sin body: procesamos automáticamente
      // el primer email pendiente.
    }

    // =====================================================
    // 2. Buscar email pendiente
    // =====================================================
    let queueRows;
    let queueError;

    if (queueId) {
      const result = await supabase
        .from("welcome_email_resend_queue")
        .select(`
          id,
          application_id,
          status,
          created_at
        `)
        .eq("id", queueId)
        .eq("status", "pending")
        .limit(1);

      queueRows = result.data;
      queueError = result.error;
    } else {
      const result = await supabase
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

      queueRows = result.data;
      queueError = result.error;
    }

    if (queueError) {
      console.error("QUEUE ERROR:", queueError);

      return NextResponse.json(
        {
          ok: false,
          error: queueError.message,
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 3. No hay pendientes
    // =====================================================
    if (!queueRows || queueRows.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No hay emails pendientes en la cola.",
      });
    }

    const queue = queueRows[0];

    queueId = queue.id;

    console.log("========================================");
    console.log("MALTA WELCOME EMAIL QUEUE");
    console.log("Queue ID:", queue.id);
    console.log("Application ID:", queue.application_id);
    console.log("========================================");

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
        "PROCESSING ERROR:",
        processingError
      );

      return NextResponse.json(
        {
          ok: false,
          error: processingError.message,
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 5. Buscar aplicación Malta
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
        "Application not found.";

      await supabase
        .from("welcome_email_resend_queue")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", queue.id);

      return NextResponse.json(
        {
          ok: false,
          error: errorMessage,
        },
        { status: 404 }
      );
    }

    console.log("Application found:", application.id);
    console.log("Client:", application.full_name);
    console.log("Email:", application.email);
    console.log("Plan:", application.plan);
    console.log("Paid:", application.paid);

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

      return NextResponse.json(
        {
          ok: false,
          error: errorMessage,
        },
        { status: 400 }
      );
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

      return NextResponse.json(
        {
          ok: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 8. Crear conexión SMTP
    // =====================================================
    console.log("Creating SMTP transporter...");

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
    console.log("Checking SMTP connection...");

    await transporter.verify();

    console.log("SMTP connection OK");

    // =====================================================
    // 10. Preparar adjuntos
    // =====================================================
    const attachments: any[] = [];

    // -----------------------------------------------------
    // CV
    // -----------------------------------------------------
    if (application.pdf_url) {
      console.log("Downloading CV...");

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

          console.log("CV attached successfully.");
        } else {
          console.warn(
            "CV download failed:",
            cvResponse.status
          );
        }
      } catch (error) {
        console.warn(
          "CV download error:",
          error
        );
      }
    } else {
      console.log("No CV URL available.");
    }

    // -----------------------------------------------------
    // COVER LETTER
    // -----------------------------------------------------
    if (application.cover_letter_url) {
      console.log("Downloading Cover Letter...");

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
            "Cover Letter attached successfully."
          );
        } else {
          console.warn(
            "Cover Letter download failed:",
            letterResponse.status
          );
        }
      } catch (error) {
        console.warn(
          "Cover Letter download error:",
          error
        );
      }
    } else {
      console.log(
        "No Cover Letter URL available."
      );
    }

    // =====================================================
    // 11. Preparar nombre
    // =====================================================
    const name =
      application.full_name?.trim() || "there";

    // =====================================================
    // 12. Preparar plan
    // =====================================================
    const plan =
      application.plan === "weekly"
        ? "Weekly Plan (7 days)"
        : "Monthly Plan (30 days)";

    // =====================================================
    // 13. Enviar email
    // =====================================================
    console.log("Sending welcome email...");
    console.log("TO:", application.email);

    const mailResult = await transporter.sendMail({
      from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,

      to: application.email,

      subject:
        `🇲🇹 Welcome ${name}! Your Malta Job Journey Starts Today`,

      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to GestoriaCitaIA</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f5f5f5;
  font-family:Arial,Helvetica,sans-serif;
">

  <div style="
    max-width:600px;
    margin:30px auto;
    background:#ffffff;
    border-radius:14px;
    padding:35px;
    box-shadow:0 2px 10px rgba(0,0,0,0.08);
  ">

    <div style="
      text-align:center;
      margin-bottom:25px;
    ">

      <div style="
        font-size:48px;
        margin-bottom:10px;
      ">
        🇲🇹
      </div>

      <h1 style="
        margin:0;
        font-size:28px;
      ">
        Welcome ${name}!
      </h1>

    </div>

    <p style="
      font-size:16px;
      line-height:1.6;
    ">
      Thank you for choosing
      <strong>GestoriaCitaIA</strong>.
    </p>

    <p style="
      font-size:16px;
      line-height:1.6;
    ">
      Your Malta job search has officially started.
    </p>

    <div style="
      background:#f7f7f7;
      border-radius:10px;
      padding:20px;
      margin:25px 0;
    ">

      <p style="
        margin:0 0 8px 0;
        font-size:14px;
        color:#666;
      ">
        YOUR PLAN
      </p>

      <p style="
        margin:0;
        font-size:20px;
        font-weight:bold;
      ">
        ${plan}
      </p>

    </div>

    <p style="
      font-size:16px;
      line-height:1.6;
    ">
      Our system will search for suitable job
      opportunities in Malta according to the
      information you provided.
    </p>

    <p style="
      font-size:16px;
      line-height:1.6;
    ">
      Your CV and motivation letter are attached
      to this email when available.
    </p>

    <div style="
      margin-top:30px;
      padding-top:20px;
      border-top:1px solid #eeeeee;
    ">

      <p style="
        margin:0;
        font-size:13px;
        color:#777;
        line-height:1.5;
      ">
        GestoriaCitaIA<br>
        Malta Jobs Service
      </p>

    </div>

  </div>

</body>
</html>
      `,

      attachments,
    });

    console.log(
      "========================================"
    );

    console.log(
      "EMAIL SENT SUCCESSFULLY"
    );

    console.log(
      "Message ID:",
      mailResult.messageId
    );

    console.log(
      "To:",
      application.email
    );

    console.log(
      "Attachments:",
      attachments.map(
        (a) => a.filename
      )
    );

    console.log(
      "========================================"
    );

    // =====================================================
    // 14. Guardar email enviado en aplicación
    // =====================================================
    const sentAt =
      new Date().toISOString();

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
        "APPLICATION UPDATE ERROR:",
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
        message_id: mailResult.messageId,
        error_message: null,
      })
      .eq("id", queue.id);

    if (queueUpdateError) {
      console.error(
        "QUEUE UPDATE ERROR:",
        queueUpdateError
      );
    }

    // =====================================================
    // 16. Respuesta OK
    // =====================================================
    return NextResponse.json({
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
          (attachment) =>
            attachment.filename
        ),
    });

  } catch (error: any) {

    console.error(
      "========================================"
    );

    console.error(
      "RESEND WELCOME EMAIL ERROR"
    );

    console.error(error);

    console.error(
      "========================================"
    );

    // =====================================================
    // Marcar como FAILED
    // =====================================================
    if (queueId) {
      try {
        await supabase
          .from("welcome_email_resend_queue")
          .update({
            status: "failed",
            error_message:
              error?.message ||
              String(error),
          })
          .eq("id", queueId);
      } catch (queueUpdateError) {
        console.error(
          "Could not update failed queue:",
          queueUpdateError
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}

// =========================================================
// GET
// Permite ejecutar la prueba directamente desde Chrome
// =========================================================
export async function GET(
  req: NextRequest
) {
  return POST(
    new NextRequest(req.url, {
      method: "POST",
      headers: req.headers,
    })
  );
}
