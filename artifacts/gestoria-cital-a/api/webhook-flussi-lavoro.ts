import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import Stripe from "stripe";

/*
============================================================
GESTORIACITAIA
STRIPE WEBHOOK — DECRETO FLUSSI LAVORO
============================================================

FLUJO:

CLIENTE
   ↓
STRIPE CHECKOUT
   ↓
checkout.session.completed
   ↓
ESTE WEBHOOK
   ↓
comprueba payment_status = paid
   ↓
comprueba el plan
   ↓
LLAMA DIRECTAMENTE A:

/api/flussi-lavoro-gmail

   ↓
GMAIL EXISTENTE
   ↓
SE ENVÍA EL EMAIL CON LA PLANTILLA ACTUAL

IMPORTANTE:

NO MODIFICAR flussi-lavoro-gmail.ts
NO GENERAR OTRA PLANTILLA
NO ENVIAR OTRO EMAIL DESDE ESTE WEBHOOK

============================================================
*/

export const config = {
  api: {
    bodyParser: false,
  },
};


/*
============================================================
STRIPE
============================================================
*/

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY || "";

const stripe =
  stripeSecretKey
    ? new Stripe(
        stripeSecretKey,
        {
          apiVersion:
            "2025-08-27.basil",
        },
      )
    : null;


/*
============================================================
HELPERS
============================================================
*/

function clean(
  value: unknown,
  maxLength = 2000,
): string {

  return String(
    value ?? "",
  )
    .trim()
    .slice(
      0,
      maxLength,
    );
}


/*
============================================================
RAW BODY
============================================================
*/

async function readRawBody(
  req: VercelRequest,
): Promise<Buffer> {

  if (
    Buffer.isBuffer(
      req.body,
    )
  ) {
    return req.body;
  }

  if (
    typeof req.body ===
    "string"
  ) {
    return Buffer.from(
      req.body,
    );
  }

  return new Promise(
    (
      resolve,
      reject,
    ) => {

      const chunks: Buffer[] =
        [];

      req.on(
        "data",
        (chunk) => {

          chunks.push(
            Buffer.isBuffer(
              chunk,
            )
              ? chunk
              : Buffer.from(
                  chunk,
                ),
          );

        },
      );

      req.on(
        "end",
        () => {

          resolve(
            Buffer.concat(
              chunks,
            ),
          );

        },
      );

      req.on(
        "error",
        reject,
      );

    },
  );
}


/*
============================================================
PLANES NUEVOS
============================================================
*/

const PLANS = {

  all_offers: {

    code:
      "all_offers",

    amount:
      50,

    realAmount:
      1499,

    durationDays:
      30,

    deliveries:
      1,

    nameIt:
      "Tutte le offerte",

    nameEs:
      "Todas las ofertas",

    nameEn:
      "All job offers",

    nameMa:
      "جميع عروض العمل",
  },


  new_10_days: {

    code:
      "new_10_days",

    amount:
      2499,

    realAmount:
      2499,

    durationDays:
      90,

    deliveries:
      6,

    nameIt:
      "Nuove offerte ogni 10 giorni",

    nameEs:
      "Nuevas ofertas cada 10 días",

    nameEn:
      "New job offers every 10 days",

    nameMa:
      "عروض جديدة كل 10 أيام",
  },

} as const;


type PackageCode =
  keyof typeof PLANS;


/*
============================================================
HANDLER
============================================================
*/

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {

  /*
  ==========================================================
  1. SOLO POST
  ==========================================================
  */

  if (
    req.method !==
    "POST"
  ) {

    return res
      .status(405)
      .json({

        ok: false,

        error:
          "Method not allowed",
      });
  }


  /*
  ==========================================================
  2. STRIPE CONFIG
  ==========================================================
  */

  if (!stripe) {

    console.error(
      "❌ STRIPE_SECRET_KEY no configurada",
    );

    return res
      .status(500)
      .json({

        ok: false,

        error:
          "STRIPE_SECRET_KEY no está configurada.",
      });
  }


  /*
  ==========================================================
  3. WEBHOOK SECRET
  ==========================================================
  */

  const webhookSecret =
    clean(
      process.env
        .FLUSSI_STRIPE_WEBHOOK_SECRET,
    );


  if (!webhookSecret) {

    console.error(
      "❌ FLUSSI_STRIPE_WEBHOOK_SECRET no configurada",
    );

    return res
      .status(500)
      .json({

        ok: false,

        error:
          "FLUSSI_STRIPE_WEBHOOK_SECRET no está configurada.",
      });
  }


  try {

    /*
    ========================================================
    4. RAW BODY
    ========================================================
    */

    const rawBody =
      await readRawBody(
        req,
      );


    /*
    ========================================================
    5. STRIPE SIGNATURE
    ========================================================
    */

    const signature =
      req.headers[
        "stripe-signature"
      ];


    if (
      !signature ||
      Array.isArray(
        signature,
      )
    ) {

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Missing Stripe signature.",
        });
    }


    /*
    ========================================================
    6. VERIFICAR EVENTO
    ========================================================
    */

    let event: Stripe.Event;


    try {

      event =
        stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );

    } catch (
      error: any
    ) {

      console.error(
        "❌ Stripe signature error:",
        error?.message ||
          error,
      );

      return res
        .status(400)
        .json({

          ok: false,

          error:
            `Webhook Error: ${
              error?.message ||
              "Invalid signature"
            }`,
        });
    }


    console.log(
      "📥 STRIPE FLUSSI EVENT:",
      event.type,
      event.id,
    );


    /*
    ========================================================
    7. SOLO CHECKOUT COMPLETADO
    ========================================================
    */

    if (
      event.type !==
      "checkout.session.completed"
    ) {

      return res
        .status(200)
        .json({

          ok: true,

          received: true,

          ignored: true,

          event:
            event.type,
        });
    }


    /*
    ========================================================
    8. SESSION
    ========================================================
    */

    const session =
      event.data
        .object as
        Stripe.Checkout.Session;


    const metadata =
      session.metadata ||
      {};


    /*
    ========================================================
    9. SEGURIDAD — NUEVO FLUSSI LAVORO
    ========================================================
    */

    const service =
      clean(
        metadata.service,
      );


    const product =
      clean(
        metadata.product,
      );


    if (
      service !==
      "flussi_lavoro"
    ) {

      console.log(
        "↩️ Evento ignorado — service:",
        service,
      );

      return res
        .status(200)
        .json({

          ok: true,

          received: true,

          ignored: true,

          reason:
            "NOT_FLUSSI_LAVORO",

          service,
        });
    }


    if (
      product !==
      "decreto_flussi_lavoro"
    ) {

      console.log(
        "↩️ Evento ignorado — product:",
        product,
      );

      return res
        .status(200)
        .json({

          ok: true,

          received: true,

          ignored: true,

          reason:
            "NOT_DECRETO_FLUSSI_LAVORO",

          product,
        });
    }


    /*
    ========================================================
    10. COMPROBAR PAGO
    ========================================================
    */

    if (
      session.payment_status !==
      "paid"
    ) {

      console.warn(
        "⚠️ Pago todavía no confirmado:",
        session.payment_status,
      );

      return res
        .status(200)
        .json({

          ok: true,

          received: true,

          ignored: true,

          reason:
            "PAYMENT_NOT_PAID",

          payment_status:
            session.payment_status,
        });
    }


    /*
    ========================================================
    11. PLAN
    ========================================================
    */

    const packageCode =
      clean(
        metadata.package_code,
      ) as PackageCode;


    if (
      packageCode !==
        "all_offers" &&
      packageCode !==
        "new_10_days"
    ) {

      console.error(
        "❌ PLAN DESCONOCIDO:",
        packageCode,
      );

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Plan Flussi desconocido.",

          packageCode,
        });
    }


    const plan =
      PLANS[
        packageCode
      ];


    /*
    ========================================================
    12. COMPROBAR IMPORTE
    ========================================================
    */

    const amountTotal =
      Number(
        session.amount_total ||
          0,
      );


    if (
      amountTotal !==
      plan.amount
    ) {

      console.error(
        "❌ IMPORTE INCORRECTO:",
        {
          packageCode,

          esperado:
            plan.amount,

          recibido:
            amountTotal,
        },
      );

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Importe de pago incorrecto.",

          packageCode,

          expected:
            plan.amount,

          received:
            amountTotal,
        });
    }


    /*
    ========================================================
    13. MONEDA
    ========================================================
    */

    if (
      session.currency &&
      session.currency
        .toLowerCase() !==
        "eur"
    ) {

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Moneda incorrecta.",

          currency:
            session.currency,
        });
    }


    /*
    ========================================================
    14. DATOS CLIENTE
    ========================================================
    */

    const firstName =
      clean(
        metadata.client_first_name,
      );


    const lastName =
      clean(
        metadata.client_last_name,
      );


    const email =
      (
        clean(
          metadata.email,
        ) ||

        clean(
          session.customer_details
            ?.email,
        ) ||

        clean(
          session.customer_email,
        )
      ).toLowerCase();


    const phone =
      clean(
        metadata.phone,
      );


    const gender =
      clean(
        metadata.gender,
      );


    const reference =
      clean(
        metadata.reference,
      ) ||

      clean(
        session.client_reference_id,
      ) ||

      `FLUSSI-${session.id}`;


    /*
    ========================================================
    15. VALIDAR EMAIL
    ========================================================
    */

    if (!email) {

      console.error(
        "❌ No existe email del cliente.",
      );

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "No se encontró el email del cliente.",
        });
    }


    /*
    ========================================================
    16. VALIDAR NOMBRE
    ========================================================
    */

    if (
      !firstName ||
      !lastName
    ) {

      console.error(
        "❌ Faltan nombre/apellido:",
        {
          firstName,
          lastName,
        },
      );

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Faltan nombre o apellido.",
        });
    }


    /*
    ========================================================
    17. DATOS PARA TU GMAIL EXISTENTE
    ========================================================

    IMPORTANTE:

    NO construimos HTML aquí.

    NO enviamos otro email.

    NO tocamos la plantilla.

    Simplemente llamamos:

    /api/flussi-lavoro-gmail

    ========================================================
    */

    const gmailUrl =
      clean(
        process.env
          .FLUSSI_LAVORO_GMAIL_URL,
      ) ||
      "https://gestoriacitaia.com/api/flussi-lavoro-gmail";


    const gmailSecret =
      clean(
        process.env
          .FLUSSI_LAVORO_INTERNAL_SECRET,
      );


    const gmailPayload = {

      service:
        "flussi_lavoro",

      product:
        "decreto_flussi_lavoro",

      paid:
        true,

      reference,

      stripeSessionId:
        session.id,

      client: {

        firstName,

        lastName,

        email,

        phone,
      },

      gender,

      packageCode,

      packageName:
        plan.nameIt,

      packageNameEs:
        plan.nameEs,

      packageNameEn:
        plan.nameEn,

      packageNameMa:
        plan.nameMa,

      packageAmountCents:
        plan.amount,

      durationDays:
        plan.durationDays,

      deliveries:
        plan.deliveries,
    };


    const gmailHeaders:
      Record<string, string> = {

      "Content-Type":
        "application/json",
    };


    if (
      gmailSecret
    ) {

      gmailHeaders[
        "x-flussi-lavoro-secret"
      ] =
        gmailSecret;
    }


    /*
    ========================================================
    18. LLAMAR DIRECTAMENTE AL GMAIL EXISTENTE
    ========================================================
    */

    console.log(
      "📧 LLAMANDO AL GMAIL EXISTENTE...",
    );

    console.log({
      gmailUrl,

      email,

      packageCode,

      amount:
        amountTotal,

      reference,
    });


    const gmailResponse =
      await fetch(
        gmailUrl,
        {

          method:
            "POST",

          headers:
            gmailHeaders,

          body:
            JSON.stringify(
              gmailPayload,
            ),
        },
      );


    const gmailText =
      await gmailResponse.text();


    /*
    ========================================================
    19. COMPROBAR GMAIL
    ========================================================
    */

    if (
      !gmailResponse.ok
    ) {

      console.error(
        "❌ EL ARCHIVO GMAIL RESPONDIÓ ERROR:",
        {
          status:
            gmailResponse.status,

          response:
            gmailText.slice(
              0,
              2000,
            ),
        },
      );


      /*
       * El pago YA está confirmado.
       *
       * Devolvemos 500 para que Stripe
       * pueda volver a intentar el webhook
       * y así intentar enviar el Gmail.
       */

      return res
        .status(500)
        .json({

          ok: false,

          payment_received:
            true,

          payment_status:
            session.payment_status,

          email:
            email,

          packageCode,

          error:
            "El archivo flussi-lavoro-gmail.ts no pudo enviar el email.",

          gmailStatus:
            gmailResponse.status,

          gmailResponse:
            gmailText.slice(
              0,
              1000,
            ),
        });
    }


    /*
    ========================================================
    20. GMAIL ENVIADO
    ========================================================
    */

    console.log(
      "✅ GMAIL ENVIADO CORRECTAMENTE",
    );

    console.log({
      email,

      packageCode,

      amount:
        amountTotal,

      reference,

      gmailResponse:
        gmailText.slice(
          0,
          500,
        ),
    });


    /*
    ========================================================
    21. RESPUESTA FINAL
    ========================================================
    */

    return res
      .status(200)
      .json({

        ok: true,

        received: true,

        processed: true,

        payment:
          "paid",

        emailSent:
          true,

        email,

        firstName,

        lastName,

        phone,

        gender,

        packageCode,

        packageName:
          plan.nameIt,

        amount:
          amountTotal,

        currency:
          session.currency,

        durationDays:
          plan.durationDays,

        deliveries:
          plan.deliveries,

        reference,

        stripeSessionId:
          session.id,

        gmailEndpoint:
          gmailUrl,
      });

  } catch (
    error: any
  ) {

    console.error(
      "❌ STRIPE FLUSSI WEBHOOK ERROR:",
      error?.message ||
        error,
    );

    return res
      .status(500)
      .json({

        ok: false,

        error:
          error?.message ||
          "Internal webhook error",
      });
  }
}
