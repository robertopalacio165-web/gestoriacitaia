import Stripe from "stripe";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

import {
  sendEstudiaMaltaEmail,
} from "./gmailSendEstudiaMalta";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const signature =
    req.headers["stripe-signature"] as string;

  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET;

  if (!webhookSecret) {
    console.error(
      "❌ STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET no configurado"
    );

    return res.status(500).json({
      error:
        "Study Malta webhook secret not configured",
    });
  }

  const rawBody = await getRawBody(req);

  let event: Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error: any) {
    console.error(
      "❌ Error verificando webhook:",
      error.message
    );

    return res.status(400).json({
      error:
        `Webhook Error: ${error.message}`,
    });
  }

  // ==========================================
  // CHECKOUT COMPLETADO
  // ==========================================

  if (
    event.type ===
    "checkout.session.completed"
  ) {
    const session =
      event.data.object as Stripe.Checkout.Session;

    const metadata =
      session.metadata || {};

    console.log(
      "======================================"
    );

    console.log(
      "🇲🇹 ESTUDIAR MALTA 2027"
    );

    console.log(
      "💳 PAGO CONFIRMADO"
    );

    console.log(
      "Session:",
      session.id
    );

    console.log(
      "======================================"
    );

    // ==========================================
    // COMPROBAR SERVICIO
    // ==========================================

    if (
      metadata.service !==
      "study_malta_2027"
    ) {
      console.log(
        "⏭️ Evento ignorado: no es Study Malta"
      );

      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    // ==========================================
    // DATOS
    // ==========================================

    const fullName =
      metadata.fullName || "";

    const whatsapp =
      metadata.whatsapp || "";

    const email =
      metadata.email ||
      session.customer_details?.email ||
      "";

    if (!email) {
      console.error(
        "❌ No existe email del cliente"
      );

      return res.status(400).json({
        error:
          "No customer email found",
      });
    }

    // ==========================================
    // ACTUALIZAR SUPABASE
    // ==========================================

    const { data: updatedApplication, error:
      updateError } =
      await supabase
        .from("estudiar_malta")
        .update({
          paid: true,

          status: "paid",

          stripe_customer_id:
            typeof session.customer === "string"
              ? session.customer
              : null,

          updated_at: new Date().toISOString(),
        })
        .eq(
          "stripe_session_id",
          session.id
        )
        .select("id")
        .maybeSingle();

    if (updateError) {
      console.error(
        "❌ ERROR ACTUALIZANDO estudiar_malta:",
        updateError
      );
    } else {
      console.log(
        "✅ Solicitud actualizada en Supabase:",
        updatedApplication?.id
      );
    }

    // ==========================================
    // ENVIAR EMAIL + PDF
    // ==========================================

    let emailSent = false;

    try {
      await sendEstudiaMaltaEmail({
        email,
        name: fullName,
        whatsapp,

        dateOfBirth:
          metadata.dateOfBirth || "",

        nationality:
          metadata.nationality || "",

        passportNumber:
          metadata.passportNumber || "",

        pdfUrl:
          metadata.pdfUrl || "",
      });

      emailSent = true;

      console.log(
        "✅ Gmail + PDF enviado correctamente"
      );

    } catch (emailError) {

      console.error(
        "❌ ERROR ENVIANDO GMAIL/PDF:",
        emailError
      );
    }

    // ==========================================
    // RESPUESTA
    // ==========================================

    console.log(
      "======================================"
    );

    console.log(
      "🇲🇹 ESTUDIAR MALTA FINALIZADO"
    );

    console.log(
      "💰 Pago:",
      "0,50 €"
    );

    console.log(
      "💾 Supabase:",
      updateError
        ? "ERROR"
        : "OK"
    );

    console.log(
      "📧 Email:",
      emailSent
        ? "ENVIADO"
        : "ERROR"
    );

    console.log(
      "======================================"
    );

    return res.status(200).json({
      received: true,
      service: "study_malta_2027",
      paid: true,
      supabaseUpdated:
        !updateError,
      emailSent,
      email,
      name: fullName,
    });
  }

  return res.status(200).json({
    received: true,
  });
}


// ==========================================
// RAW BODY PARA STRIPE
// ==========================================

async function getRawBody(
  req: VercelRequest
): Promise<string> {
  return new Promise(
    (resolve, reject) => {

      let body = "";

      req.on(
        "data",
        (chunk: Buffer) => {
          body += chunk.toString();
        }
      );

      req.on(
        "end",
        () => {
          resolve(body);
        }
      );

      req.on(
        "error",
        (error) => {
          reject(error);
        }
      );
    }
  );
}
