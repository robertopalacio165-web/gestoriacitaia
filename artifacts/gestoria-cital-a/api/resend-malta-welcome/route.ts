import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const applicationId = body?.applicationId;

    if (!applicationId) {
      return NextResponse.json(
        {
          success: false,
          error: "applicationId es obligatorio",
        },
        { status: 400 }
      );
    }

    // Buscar cliente
    const { data: application, error: dbError } = await supabase
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
      .single();

    if (dbError || !application) {
      return NextResponse.json(
        {
          success: false,
          error: "Cliente no encontrado",
          details: dbError?.message,
        },
        { status: 404 }
      );
    }

    // Solo clientes que han pagado
    if (!application.paid) {
      return NextResponse.json(
        {
          success: false,
          error: "Este cliente no tiene el pago confirmado",
        },
        { status: 400 }
      );
    }

    if (!application.email) {
      return NextResponse.json(
        {
          success: false,
          error: "El cliente no tiene email",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANTE:
     * Este endpoint es para REENVIAR.
     * Por eso NO bloqueamos si welcome_email_sent_at ya tiene valor.
     */

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

    // Descargar CV
    let cvBuffer: Buffer | null = null;

    if (application.pdf_url) {
      try {
        const cvResponse = await fetch(application.pdf_url);

        if (cvResponse.ok) {
          cvBuffer = Buffer.from(await cvResponse.arrayBuffer());
        } else {
          console.warn(
            "No se pudo descargar el CV:",
            cvResponse.status,
            application.pdf_url
          );
        }
      } catch (error) {
        console.warn("Error descargando CV:", error);
      }
    }

    // Descargar Cover Letter
    let letterBuffer: Buffer | null = null;

    if (application.cover_letter_url) {
      try {
        const letterResponse = await fetch(application.cover_letter_url);

        if (letterResponse.ok) {
          letterBuffer = Buffer.from(
            await letterResponse.arrayBuffer()
          );
        } else {
          console.warn(
            "No se pudo descargar Cover Letter:",
            letterResponse.status,
            application.cover_letter_url
          );
        }
      } catch (error) {
        console.warn("Error descargando Cover Letter:", error);
      }
    }

    const planDisplay =
      application.plan === "weekly"
        ? "Weekly Plan (7 days)"
        : "Monthly Plan (30 days)";

    const name = application.full_name || "there";

    const attachments: Array<{
      filename: string;
      content: Buffer;
    }> = [];

    if (cvBuffer) {
      attachments.push({
        filename: "CV-Malta.pdf",
        content: cvBuffer,
      });
    }

    if (letterBuffer) {
      attachments.push({
        filename: "Cover-Letter-Malta.pdf",
        content: letterBuffer,
      });
    }

    const mailResult = await transporter.sendMail({
      from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
      to: application.email,
      subject: `🇲🇹 Welcome ${name}! Your Malta Job Journey Starts Today`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#222">

          <div style="background:#111;padding:30px;text-align:center">
            <h1 style="color:white;margin:0">
              🇲🇹 Malta Jobs
            </h1>
          </div>

          <div style="padding:30px">

            <h2>Hello ${name}! 👋</h2>

            <p>
              Welcome to <strong>GestoriaCitaIA Malta Jobs</strong>.
            </p>

            <p>
              Your Malta job search service has been successfully activated.
            </p>

            <div style="
              background:#f5f5f5;
              padding:20px;
              border-radius:10px;
              margin:25px 0;
            ">
              <strong>Your plan:</strong><br>
              ${planDisplay}
            </div>

            <p>
              Our system will search for suitable job opportunities
              in Malta and submit applications according to your plan.
            </p>

            <p>
              Your CV and motivation letter are attached to this email
              when available.
            </p>

            <p>
              🇲🇹 We wish you the best of luck with your Malta job journey!
            </p>

            <hr style="border:none;border-top:1px solid #ddd;margin:30px 0">

            <p style="font-size:12px;color:#777">
              GestoriaCitaIA<br>
              Malta Jobs Service
            </p>

          </div>
        </div>
      `,
      attachments,
    });

    // Guardar que el email fue enviado correctamente
    const { error: updateError } = await supabase
      .from("malta_applications")
      .update({
        welcome_email_sent_at: new Date().toISOString(),
        welcome_email_message_id: mailResult.messageId,
      })
      .eq("id", application.id);

    if (updateError) {
      console.error(
        "Email enviado pero no se pudo actualizar Supabase:",
        updateError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Welcome email enviado correctamente",
      applicationId: application.id,
      email: application.email,
      messageId: mailResult.messageId,
      cvAttached: !!cvBuffer,
      coverLetterAttached: !!letterBuffer,
      supabaseUpdated: !updateError,
    });
  } catch (error: any) {
    console.error("❌ Error reenviando Malta welcome email:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error enviando email",
      },
      { status: 500 }
    );
  }
}
