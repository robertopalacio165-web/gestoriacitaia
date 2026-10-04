import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * STRIPE WEBHOOK — DECRETO FLUSSI LAVORO
 * ============================================================
 *
 * FLUJO:
 *
 * Stripe
 *   ↓
 * checkout.session.completed
 *   ↓
 * verificar firma Stripe
 *   ↓
 * comprobar pago
 *   ↓
 * comprobar Decreto Flussi Lavoro
 *   ↓
 * llamar /api/flussi-lavoro-gmail
 *   ↓
 * Gmail existente
 *
 * IMPORTANTE:
 *
 * NO GENERAMOS NINGUNA PLANTILLA EMAIL AQUÍ.
 *
 * NO TOCAR:
 *
 * /api/flussi-lavoro-gmail.ts
 *
 * Ese archivo conserva su plantilla actual.
 * ============================================================
 */

export const config = {
  api: {
    bodyParser: false,
  },
};


/**
 * ============================================================
 * STRIPE
 * ============================================================
 */

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecretKey
  ? new Stripe(
      stripeSecretKey,
      {
        apiVersion: "2025-08-27.basil",
      },
    )
  : null;


/**
 * ============================================================
 * RAW BODY
 *
 * ESTA PARTE SE MANTIENE COMO EL WEBHOOK VIEJO
 * QUE FUNCIONABA.
 * ============================================================
 */

async function readRawBody(
  req: VercelRequest,
): Promise<Buffer> {

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }

  return new Promise(
    (resolve, reject) => {

      const chunks: Buffer[] = [];

      req.on(
        "data",
        (chunk) => {

          chunks.push(
            Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk),
          );

        },
      );

      req.on(
        "end",
        () => {

          resolve(
            Buffer.concat(chunks),
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


/**
 * ============================================================
 * CLEAN
 * ============================================================
 */

function clean(
  value: unknown,
): string {

  return String(
    value ?? "",
  ).trim();
}


/**
 * ============================================================
 * GMAIL
 *
 * NO SE CREA HTML AQUÍ.
 *
 * SE LLAMA AL ARCHIVO:
 *
 * /api/flussi-lavoro-gmail
 * ============================================================
 */

async function sendFlussiWelcomeEmail(
  params: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    gender: string;
    packageCode: string;
    reference: string;
    session: Stripe.Checkout.Session;
    metadata: Stripe.Metadata;
  },
) {

  const gmailUrl =
    clean(
      process.env.FLUSSI_LAVORO_GMAIL_URL,
    ) ||
    "https://gestoriacitaia.com/api/flussi-lavoro-gmail";


  const internalSecret =
    clean(
      process.env.FLUSSI_LAVORO_INTERNAL_SECRET,
    );


  const packageCode =
    params.packageCode;


  let packageNameIt =
    "Tutte le offerte";

  let packageNameEs =
    "Todas las ofertas";

  let packageNameEn =
    "All job offers";

  let packageNameMa =
    "جميع عروض العمل";

  let durationDays =
    "30";

  let deliveries =
    "1";


  if (
    packageCode ===
    "new_10_days"
  ) {

    packageNameIt =
      "Nuove offerte ogni 10 giorni";

    packageNameEs =
      "Nuevas ofertas cada 10 días";

    packageNameEn =
      "New job offers every 10 days";

    packageNameMa =
      "عروض جديدة كل 10 أيام";

    durationDays =
      "90";

    deliveries =
      "6";
  }


  const payload = {

    service:
      "flussi_lavoro",

    product:
      "decreto_flussi_lavoro",

    paid:
      true,

    payment_status:
      params.session.payment_status,

    stripe_session_id:
      params.session.id,

    reference:
      params.reference,

    client: {

      firstName:
        params.firstName,

      lastName:
        params.lastName,

      email:
        params.email,

      phone:
        params.phone,

      gender:
        params.gender,
    },

    packageCode,

    packageName:
      packageNameIt,

    packageNameEs,

    packageNameEn,

    packageNameMa,

    packageAmountCents:
      params.session.amount_total || 0,

    durationDays,

    deliveries,

    metadata:
      params.metadata,
  };


  console.log(
    "📧 LLAMANDO AL GMAIL FLUSSI...",
  );

  console.log({
    gmailUrl,

    email:
      params.email,

    packageCode,

    reference:
      params.reference,
  });


  const headers: Record<
    string,
    string
  > = {

    "Content-Type":
      "application/json",
  };


  if (internalSecret) {

    headers[
      "x-flussi-lavoro-secret"
    ] =
      internalSecret;
  }


  const response =
    await fetch(
      gmailUrl,
      {

        method:
          "POST",

        headers,

        body:
          JSON.stringify(
            payload,
          ),
      },
    );


  const responseText =
    await response.text();


  if (!response.ok) {

    console.error(
      "❌ ERROR GMAIL FLUSSI:",
      {
        status:
          response.status,

        response:
          responseText.slice(
            0,
            2000,
          ),
      },
    );


    throw new Error(
      `Gmail Flussi respondió ${response.status}: ${responseText.slice(
        0,
        1000,
      )}`,
    );
  }


  console.log(
    "✅ GMAIL FLUSSI ENVIADO",
  );

  console.log(
    responseText.slice(
      0,
      1000,
    ),
  );


  return {
    sent: true,

    response:
      responseText,
  };
}


/**
 * ============================================================
 * WEBHOOK
 * ============================================================
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {

  /**
   * ==========================================================
   * 1. METHOD
   * ==========================================================
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


  /**
   * ==========================================================
   * 2. STRIPE
   * ==========================================================
   */

  if (!stripe) {

    console.error(
      "❌ STRIPE_SECRET_KEY NO CONFIGURADA",
    );

    return res
      .status(500)
      .json({

        ok: false,

        error:
          "STRIPE_SECRET_KEY no está configurada en Vercel.",
      });
  }


  /**
   * ==========================================================
   * 3. WEBHOOK SECRET
   * ==========================================================
   */

  const webhookSecret =
    clean(
      process.env
        .FLUSSI_STRIPE_WEBHOOK_SECRET,
    );


  if (!webhookSecret) {

    console.error(
      "❌ FLUSSI_STRIPE_WEBHOOK_SECRET NO CONFIGURADA",
    );

    return res
      .status(500)
      .json({

        ok: false,

        error:
          "FLUSSI_STRIPE_WEBHOOK_SECRET no está configurada en Vercel.",
      });
  }


  try {

    /**
     * ========================================================
     * 4. RAW BODY
     *
     * EXACTAMENTE ANTES DE CONSTRUIR EL EVENTO.
     * ========================================================
     */

    const rawBody =
      await readRawBody(
        req,
      );


    /**
     * ========================================================
     * 5. STRIPE SIGNATURE
     * ========================================================
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


    /**
     * ========================================================
     * 6. CONSTRUIR EVENTO
     *
     * ESTA PARTE ES LA DEL WEBHOOK VIEJO.
     * ========================================================
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
      "📥 FLUSSI WEBHOOK:",
      event.type,
      event.id,
    );


    /**
     * ========================================================
     * 7. SOLO CHECKOUT COMPLETED
     * ========================================================
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


    /**
     * ========================================================
     * 8. SESSION
     * ========================================================
     */

    const session =
      event.data
        .object as
        Stripe.Checkout.Session;


    const metadata =
      session.metadata ||
      {};


    /**
     * ========================================================
     * 9. SERVICIO
     *
     * ACEPTAMOS EL NUEVO SERVICIO.
     *
     * También aceptamos el antiguo para no romper
     * pagos/eventos antiguos.
     * ========================================================
     */

    const service =
      clean(
        metadata.service,
      );


    const isNewFlussi =
      service ===
      "flussi_lavoro";


    const isOldFlussi =
      service ===
      "verificacion_decreto_flussi";


    if (
      !isNewFlussi &&
      !isOldFlussi
    ) {

      console.log(
        "↩️ IGNORADO: NO ES FLUSSI",
        service,
      );


      return res
        .status(200)
        .json({

          ok: true,

          received: true,

          ignored: true,

          reason:
            "NOT_FLUSSI",

          service:
            service ||
            null,
        });
    }


    /**
     * ========================================================
     * 10. PRODUCTO
     *
     * ACEPTAMOS:
     *
     * decreto_flussi_lavoro
     *
     * Y el antiguo:
     *
     * decreto_flussi
     * ========================================================
     */

    const product =
      clean(
        metadata.product,
      );


    const validNewProduct =
      product ===
      "decreto_flussi_lavoro";


    const validOldProduct =
      product ===
      "decreto_flussi";


    if (
      product &&
      !validNewProduct &&
      !validOldProduct
    ) {

      console.log(
        "↩️ IGNORADO: PRODUCTO NO FLUSSI",
        product,
      );


      return res
        .status(200)
        .json({

          ok: true,

          received: true,

          ignored: true,

          reason:
            "NOT_FLUSSI_PRODUCT",

          product,
        });
    }


    /**
     * ========================================================
     * 11. PAGO CONFIRMADO
     * ========================================================
     */

    if (
      session.payment_status !==
      "paid"
    ) {

      console.warn(
        "⚠️ PAGO NO CONFIRMADO:",
        session.payment_status,
      );


      return res
        .status(200)
        .json({

          ok: true,

          received: true,

          ignored: true,

          reason:
            "PAYMENT_NOT_CONFIRMED",

          payment_status:
            session.payment_status,
        });
    }


    /**
     * ========================================================
     * 12. PRECIO
     *
     * PLAN 1:
     *
     * 0,50 €
     *
     * PLAN 2:
     *
     * 24,99 €
     * ========================================================
     */

    const packageCode =
      clean(
        metadata.package_code,
      );


    let expectedAmount:
      number | null = null;


    if (
      packageCode ===
      "all_offers"
    ) {

      expectedAmount =
        50;

    } else if (
      packageCode ===
      "new_10_days"
    ) {

      expectedAmount =
        2499;
    }


    /**
     * Para eventos antiguos que no tienen package_code,
     * no bloqueamos el webhook.
     */

    if (
      expectedAmount !==
      null &&
      typeof session.amount_total ===
        "number" &&
      session.amount_total !==
        expectedAmount
    ) {

      console.error(
        "❌ IMPORTE FLUSSI INCORRECTO:",
        {
          packageCode,

          esperado:
            expectedAmount,

          recibido:
            session.amount_total,
        },
      );


      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Importe de pago Flussi inesperado.",

          packageCode,

          expectedAmount,

          amount_total:
            session.amount_total,
        });
    }


    /**
     * ========================================================
     * 13. MONEDA
     * ========================================================
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
            "Moneda de pago Flussi inesperada.",

          currency:
            session.currency,
        });
    }


    /**
     * ========================================================
     * 14. DATOS CLIENTE
     * ========================================================
     */

    const email = (
      clean(
        metadata.email,
      ) ||

      clean(
        session
          .customer_details
          ?.email,
      ) ||

      clean(
        session.customer_email,
      )
    ).toLowerCase();


    const firstName =
      clean(
        metadata.client_first_name,
      );


    const lastName =
      clean(
        metadata.client_last_name,
      );


    const metadataName =
      clean(
        metadata.client_name,
      );


    const metadataSurname =
      clean(
        metadata.client_surname,
      );


    const customerName =
      clean(
        session
          .customer_details
          ?.name,
      );


    const name =
      `${firstName} ${lastName}`
        .trim() ||

      `${metadataName} ${metadataSurname}`
        .trim() ||

      customerName;


    const phone =
      clean(
        metadata.phone,
      ) ||

      clean(
        metadata.whatsapp,
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


    /**
     * ========================================================
     * 15. EMAIL OBLIGATORIO
     * ========================================================
     */

    if (!email) {

      console.error(
        "❌ PAGO FLUSSI SIN EMAIL:",
        session.id,
      );


      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Pago recibido pero no se encontró el email del cliente.",
        });
    }


    /**
     * ========================================================
     * 16. SEPARAR NOMBRE
     * ========================================================
     */

    let finalFirstName =
      firstName;

    let finalLastName =
      lastName;


    if (
      !finalFirstName &&
      !finalLastName &&
      customerName
    ) {

      const parts =
        customerName
          .trim()
          .split(/\s+/);


      finalFirstName =
        parts.shift() ||
        "";


      finalLastName =
        parts.join(" ");
    }


    /**
     * ========================================================
     * 17. LOG
     * ========================================================
     */

    console.log(
      "================================================",
    );

    console.log(
      "🇮🇹 DECRETO FLUSSI — PAGO CONFIRMADO",
    );

    console.log(
      "Session:",
      session.id,
    );

    console.log(
      "Event:",
      event.id,
    );

    console.log(
      "Email:",
      email,
    );

    console.log(
      "Nombre:",
      name,
    );

    console.log(
      "Phone:",
      phone,
    );

    console.log(
      "Gender:",
      gender,
    );

    console.log(
      "Package:",
      packageCode,
    );

    console.log(
      "Reference:",
      reference,
    );

    console.log(
      "Amount:",
      session.amount_total,
    );

    console.log(
      "Currency:",
      session.currency,
    );

    console.log(
      "Payment:",
      session.payment_status,
    );

    console.log(
      "================================================",
    );


    /**
     * ========================================================
     * 18. SOLO NUEVO SERVICIO → GMAIL
     *
     * NO TOCAMOS EL ARCHIVO GMAIL.
     * ========================================================
     */

    let gmailResult:
      unknown = null;


    if (
      isNewFlussi
    ) {

      try {

        gmailResult =
          await sendFlussiWelcomeEmail(
            {

              email,

              firstName:
                finalFirstName,

              lastName:
                finalLastName,

              phone,

              gender,

              packageCode,

              reference,

              session,

              metadata,
            },
          );

      } catch (
        gmailError: any
      ) {

        console.error(
          "❌ ERROR ENVIANDO GMAIL:",
          gmailError?.message ||
            gmailError,
        );


        /**
         * El pago ya está confirmado.
         *
         * Devolvemos 500 para que Stripe
         * pueda volver a entregar el evento.
         */

        return res
          .status(500)
          .json({

            ok: false,

            payment_received:
              true,

            payment_status:
              session.payment_status,

            reference,

            email,

            error:
              gmailError?.message ||
              "Error enviando Gmail.",
          });
      }


      /**
       * ======================================================
       * GMAIL ENVIADO
       * ======================================================
       */

      console.log(
        "✅ TODO CORRECTO: PAGO + GMAIL",
      );


      return res
        .status(200)
        .json({

          ok: true,

          received: true,

          processed: true,

          service:
            "flussi_lavoro",

          product:
            "decreto_flussi_lavoro",

          event_id:
            event.id,

          session_id:
            session.id,

          payment_status:
            session.payment_status,

          amount_total:
            session.amount_total,

          currency:
            session.currency,

          reference,

          email,

          firstName:
            finalFirstName,

          lastName:
            finalLastName,

          phone,

          gender,

          packageCode,

          gmail:
            gmailResult,
        });
    }


    /**
     * ========================================================
     * 19. EVENTO ANTIGUO
     *
     * No rompemos el flujo antiguo.
     *
     * Si llega un pago antiguo:
     * usamos FLUSSI_REPORT_URL.
     * ========================================================
     */

    const reportUrl =
      clean(
        process.env.FLUSSI_REPORT_URL,
      );


    if (
      reportUrl &&
      isOldFlussi
    ) {

      try {

        const oldPayload = {

          source:
            "stripe-webhook-flussi",

          reference,

          payment: {

            paid:
              true,

            sessionId:
              session.id,

            paymentStatus:
              session.payment_status,

            amountTotal:
              session.amount_total,

            currency:
              session.currency,
          },

          client: {

            name,

            email,

            country:
              clean(
                metadata.country,
              ),

            whatsapp:
              clean(
                metadata.whatsapp,
              ),
          },

          employer: {

            name:
              clean(
                metadata.employer_name,
              ),

            city:
              clean(
                metadata.employer_city,
              ),

            birthDate:
              clean(
                metadata.employer_birth_date,
              ),
          },

          document: {

            type:
              clean(
                metadata.document_type,
              ) ||
              "Documento Decreto Flussi",

            count:
              Number(
                metadata.document_count ||
                  "0",
              ),
          },

          searchPersonOnly:
            clean(
              metadata.search_person_only,
            ) ===
            "true",

          flussiMetadata:
            metadata,
        };


        const reportResponse =
          await fetch(
            reportUrl,
            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  oldPayload,
                ),
            },
          );


        const reportText =
          await reportResponse.text();


        if (
          !reportResponse.ok
        ) {

          throw new Error(
            `FLUSSI_REPORT_URL respondió ${reportResponse.status}: ${reportText.slice(
              0,
              1000,
            )}`,
          );
        }


        console.log(
          "✅ FLUSSI REPORT TRIGGERED",
        );


        return res
          .status(200)
          .json({

            ok: true,

            received: true,

            processed: true,

            legacy:
              true,

            report:
              reportText,
          });

      } catch (
        oldError: any
      ) {

        console.error(
          "❌ ERROR FLUSSI REPORT:",
          oldError?.message ||
            oldError,
        );


        return res
          .status(500)
          .json({

            ok: false,

            payment_received:
              true,

            error:
              oldError?.message ||
              "Error generando informe Flussi.",
          });
      }
    }


    /**
     * ========================================================
     * 20. SI NO HAY FLUSSI_REPORT_URL
     * ========================================================
     */

    return res
      .status(200)
      .json({

        ok: true,

        received: true,

        processed: true,

        payment_status:
          session.payment_status,

        reference,

        email,

        message:
          "Pago Flussi confirmado.",
      });

  } catch (
    error: any
  ) {

    console.error(
      "❌ FLUSSI WEBHOOK ERROR:",
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
