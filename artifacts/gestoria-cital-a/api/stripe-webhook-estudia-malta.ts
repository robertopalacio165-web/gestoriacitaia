import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { sendEstudiaMaltaEmail } from "./gmailSendEstudiaMalta";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
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
    process.env.STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET;

  if (!webhookSecret) {
    console.error(
      "❌ STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET no configurado"
    );

    return res.status(500).json({
      error: "Study Malta webhook secret not configured",
    });
  }

  const rawBody = await getRawBody(req);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error: any) {
    console.error(
      "❌ Error verificando webhook Estudios Malta:",
      error.message
    );

    return res.status(400).json({
      error: `Webhook Error: ${error.message}`,
    });
  }

  // ============================================
  // PAGO COMPLETADO
  // ============================================

  if (event.type === "checkout.session.completed") {
    const session =
      event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata || {};

    console.log("======================================");
    console.log("🇲🇹 ESTUDIAR MALTA 2027");
    console.log("💳 PAGO CONFIRMADO");
    console.log("======================================");

    console.log(
      "Session:",
      session.id
    );

    console.log(
      "Metadata:",
      JSON.stringify(metadata, null, 2)
    );

    // ============================================
    // COMPROBAR QUE SEA ESTUDIAR MALTA 2027
    // ============================================

    if (
      metadata.service !==
      "study_malta_2027"
    ) {
      console.log(
        "⏭️ No es Estudiar Malta 2027. Ignorando."
      );

      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    // ============================================
    // DATOS DEL CLIENTE
    // ============================================

    const fullName =
      metadata.fullName || "";

    const whatsapp =
      metadata.whatsapp || "";

    const email =
      metadata.email ||
      session.customer_details?.email ||
      "";

    // ============================================
    // COMPROBAR DATOS
    // ============================================

    if (!email) {
      console.error(
        "❌ No existe email del cliente."
      );

      return res.status(400).json({
        error:
          "No customer email found.",
      });
    }

    console.log(
      "👤 Cliente:",
      fullName
    );

    console.log(
      "📱 WhatsApp:",
      whatsapp
    );

    console.log(
      "📧 Email:",
      email
    );

    // ============================================
    // PDF
    // ============================================

    const pdfUrl =
      metadata.pdfUrl || "";

    // ============================================
    // ENVIAR GMAIL
    // ============================================

    try {
      await sendEstudiaMaltaEmail({
        email,
        name: fullName,
        whatsapp,
        pdfUrl,
      });

      console.log(
        "✅ Gmail Estudios Malta 2027 enviado correctamente"
      );

    } catch (emailError) {

      console.error(
        "❌ ERROR ENVIANDO GMAIL ESTUDIOS MALTA:",
        emailError
      );

      /*
       * No devolvemos error de Stripe por un fallo
       * del email. El pago ya está confirmado.
       */
    }

    console.log("======================================");

    return res.status(200).json({
      received: true,
      service: "study_malta_2027",
      paid: true,
      emailSent: true,
      email,
      name: fullName,
    });
  }

  return res.status(200).json({
    received: true,
  });
}


// ============================================
// RAW BODY PARA STRIPE
// ============================================

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
