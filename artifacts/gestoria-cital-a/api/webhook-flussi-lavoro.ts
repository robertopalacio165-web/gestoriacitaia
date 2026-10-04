import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

/**
 * ============================================================
 * RAW BODY
 * ============================================================
 *
 * NO TOCAR.
 * Esta es la versión que funcionaba.
 */
function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      resolve(body);
    });

    req.on("error", reject);
  });
}

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

const clean = (
  v: unknown,
  max = 2000
) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

const supabaseUrl = clean(
  process.env.SUPABASE_URL
);

const serviceKey = clean(
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function supabaseRequest(
  path: string,
  options: RequestInit = {}
) {
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Supabase configuration missing"
    );
  }

  return fetch(
    `${supabaseUrl}/rest/v1/${path}`,
    {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        apikey:
          serviceKey,

        Authorization:
          `Bearer ${serviceKey}`,

        ...(options.headers || {}),
      },
    }
  );
}

/**
 * ============================================================
 * DUPLICATE CHECK
 * ============================================================
 */

async function existsBySession(
  table: string,
  sessionId: string
) {
  const r =
    await supabaseRequest(
      `${table}?select=id&stripe_session_id=eq.${encodeURIComponent(
        sessionId
      )}&limit=1`
    );

  const text =
    await r.text();

  if (!r.ok) {
    throw new Error(
      `Supabase lookup failed: ${r.status} ${text}`
    );
  }

  const rows =
    JSON.parse(text);

  return (
    Array.isArray(rows) &&
    rows.length > 0
  );
}

/**
 * ============================================================
 * DATE
 * ============================================================
 */

function addDays(
  date: Date,
  days: number
) {
  const d =
    new Date(date);

  d.setUTCDate(
    d.getUTCDate() + days
  );

  return d.toISOString();
}

/**
 * ============================================================
 * WEBHOOK
 * ============================================================
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  /**
   * ==========================================================
   * METHOD
   * ==========================================================
   */

  if (
    req.method !==
    "POST"
  ) {
    return res
      .status(405)
      .json({
        error:
          "Method not allowed",
      });
  }

  /**
   * ==========================================================
   * SECRET
   * ==========================================================
   *
   * ⚠️ NO TOCAR.
   *
   * Es exactamente el secret del webhook viejo.
   */

  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET_FLUSSI_LAVORO;

  if (
    !process.env
      .STRIPE_SECRET_KEY ||
    !webhookSecret
  ) {
    return res
      .status(500)
      .json({
        error:
          "Stripe Flussi Lavoro configuration missing",
      });
  }

  try {

    /**
     * ========================================================
     * RAW BODY
     * ========================================================
     */

    const rawBody =
      await readRawBody(req);

    const signature =
      req.headers[
        "stripe-signature"
      ];

    if (
      !signature ||
      Array.isArray(signature)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Missing Stripe signature",
        });
    }

    /**
     * ========================================================
     * STRIPE SIGNATURE
     * ========================================================
     *
     * ⚠️ NO TOCAR.
     */

    let event: Stripe.Event;

    try {

      event =
        stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret
        );

    } catch (error) {

      console.error(
        "Flussi Lavoro Stripe signature verification failed:",
        error
      );

      return res
        .status(400)
        .json({
          error:
            "Invalid Stripe signature",
        });
    }

    console.log(
      "📥 FLUSSI LAVORO STRIPE:",
      event.type,
      event.id
    );

    /**
     * ========================================================
     * EVENT
     * ========================================================
     */

    if (
      event.type !==
      "checkout.session.completed"
    ) {

      return res
        .status(200)
        .json({
          received:
            true,

          ignored:
            true,

          event:
            event.type,
        });
    }

    /**
     * ========================================================
     * SESSION
     * ========================================================
     */

    const session =
      event.data.object as
        Stripe.Checkout.Session;

    const metadata =
      session.metadata || {};

    /**
     * ========================================================
     * PRODUCT
     * ========================================================
     *
     * NUEVO SERVICIO:
     *
     * service = flussi_lavoro
     * product = decreto_flussi_lavoro
     */

    if (
      metadata.service !==
        "flussi_lavoro" ||
      metadata.product !==
        "decreto_flussi_lavoro"
    ) {

      return res
        .status(200)
        .json({

          received:
            true,

          ignored:
            true,

          reason:
            "not_flussi_lavoro",
        });
    }

    /**
     * ========================================================
     * PAYMENT
     * ========================================================
     */

    if (
      session.payment_status !==
      "paid"
    ) {

      return res
        .status(200)
        .json({

          received:
            true,

          ignored:
            true,

          reason:
            "payment_not_paid",
        });
    }

    /**
     * ========================================================
     * CLIENT DATA
     * ========================================================
     */

    const fullName =
      clean(
        metadata.client_name ||
        metadata.full_name ||
        session
          .customer_details
          ?.name
      );

    const firstName =
      clean(
        metadata.first_name ||
        metadata.client_first_name ||
        fullName
          .split(" ")[0]
      );

    const lastName =
      clean(
        metadata.last_name ||
        metadata.client_surname ||
        metadata.client_last_name ||
        fullName
          .split(" ")
          .slice(1)
          .join(" ")
      );

    const email =
      clean(
        metadata.email ||
        metadata.client_email ||
        session
          .customer_details
          ?.email
      ).toLowerCase();

    const phone =
      clean(
        metadata.phone ||
        metadata.client_phone ||
        session
          .customer_details
          ?.phone
      );

    const gender =
      clean(
        metadata.gender
      );

    if (
      !firstName ||
      !lastName ||
      !email
    ) {

      return res
        .status(400)
        .json({
          error:
            "Missing client data",
        });
    }

    /**
     * ========================================================
     * CATEGORIES
     * ========================================================
     *
     * El nuevo formulario no utiliza categorías.
     * Permitimos igualmente metadata antigua.
     */

    const categories =
      clean(
        metadata.categories
      )
        .split(",")
        .map(
          (x) =>
            x.trim()
        )
        .filter(Boolean);

    /**
     * ========================================================
     * PACKAGE
     * ========================================================
     *
     * NUEVOS PLANES:
     *
     * all_offers
     * 0,50 €
     *
     * new_10_days
     * 24,99 €
     */

    const packageCode =
      clean(
        metadata.package_code
      );

    if (
      packageCode !==
        "all_offers" &&
      packageCode !==
        "new_10_days"
    ) {

      return res
        .status(400)
        .json({

          error:
            "Unknown Flussi Lavoro package",

          packageCode,
        });
    }

    /**
     * ========================================================
     * PRECIO
     * ========================================================
     *
     * TEST:
     *
     * all_offers = 0,50 €
     *
     * new_10_days = 24,99 €
     */

    const expectedAmount =
      packageCode ===
        "all_offers"
   ? 1499
        : 2499;

    const amountCents =
      Number(
        session.amount_total
      ) || 0;

    if (
      amountCents !==
      expectedAmount
    ) {

      return res
        .status(400)
        .json({

          error:
            "Unexpected Flussi Lavoro amount",

          amountCents,

          expectedAmount,

          packageCode,
        });
    }

    /**
     * ========================================================
     * TABLE
     * ========================================================
     *
     * Mantenemos las tablas existentes.
     *
     * all_offers
     *   → monthly
     *
     * new_10_days
     *   → single_category
     *
     * El precio no determina la tabla.
     */

    const table =
      packageCode ===
        "all_offers"
   ? "flussi_lavoro_14_99"
        : "flussi_lavoro_24_99";

    /**
     * ========================================================
     * TEMPORARY TEST
     * ========================================================
     *
     * Ambos pagos pueden probarse con:
     *
     * all_offers → 0,50
     * new_10_days → 24,99
     */

    /**
     * ========================================================
     * DUPLICATE
     * ========================================================
     */

    const alreadyExists =
      await existsBySession(
        table,
        session.id
      );

    if (
      alreadyExists
    ) {

      console.log(
        "ℹ️ FLUSSI LAVORO: customer already exists; continuing to welcome email",
        {
          table,
          stripeSessionId:
            session.id,
          email,
        }
      );
    }

    /**
     * ========================================================
     * WORK TYPE
     * ========================================================
     */

    const workType =
      metadata.work_type ===
        "stagionale"
        ? "stagionale"
        : "non_stagionale";

    /**
     * ========================================================
     * DATES
     * ========================================================
     */

    const now =
      new Date();

    const startsAt =
      packageCode ===
        "all_offers"
        ? null
        : now.toISOString();

    const expiresAt =
      packageCode ===
        "new_10_days"
        ? addDays(
            now,
            30
          )
        : null;

    /**
     * ========================================================
     * PAYMENT INTENT
     * ========================================================
     */

    const paymentIntent =
      typeof session.payment_intent ===
      "string"
        ? session.payment_intent
        : null;

    /**
     * ========================================================
     * SUPABASE RECORD
     * ========================================================
     */

    const record:
      Record<
        string,
        unknown
      > = {

      first_name:
        firstName,

      last_name:
        lastName,

      email,

      phone,

      work_type:
        workType,

      stripe_session_id:
        session.id,

      stripe_payment_intent_id:
        paymentIntent,

      payment_status:
        "paid",

      purchased_at:
        now.toISOString(),

      updated_at:
        now.toISOString(),
    };

    /**
     * ========================================================
     * PACKAGE DATA
     * ========================================================
     */

    if (
      packageCode ===
      "new_10_days"
    ) {

      record.categories =
        categories;

      record.starts_at =
        startsAt;

      record.expires_at =
        expiresAt;

    } else {

      record.categories =
        categories;
    }

    /**
     * ========================================================
     * SAVE SUPABASE
     * ========================================================
     */

    if (
      !alreadyExists
    ) {

      const insert =
        await supabaseRequest(
          table,
          {

            method:
              "POST",

            headers: {
              Prefer:
                "return=representation",
            },

            body:
              JSON.stringify(
                record
              ),
          }
        );

      const insertText =
        await insert.text();

      if (
        !insert.ok
      ) {

        console.error(
          "Supabase Flussi Lavoro insert failed:",
          table,
          insert.status,
          insertText
        );

        return res
          .status(500)
          .json({
            error:
              "Could not save Flussi Lavoro customer",
          });
      }

      console.log(
        "✅ FLUSSI LAVORO: customer saved in Supabase",
        {
          table,
          email,
        }
      );
    }

    /**
     * ========================================================
     * REFERENCE
     * ========================================================
     */

    const reference =
      clean(
        metadata.reference
      ) ||
      `FL-${session.id
        .slice(-10)
        .toUpperCase()}`;

    /**
     * ========================================================
     * PACKAGE NAME
     * ========================================================
     */

    const packageName =
      clean(
        metadata.package_name
      ) ||
      (
        packageCode ===
          "all_offers"
          ? "Offerte del mese"
          : "Nuove offerte Flussi"
      );

    /**
     * ========================================================
     * EXISTING GMAIL FILE
     * ========================================================
     *
     * ⚠️ NO SE CREA NINGUNA PLANTILLA AQUÍ.
     *
     * Se utiliza el archivo Gmail EXISTENTE.
     */

    const gmailUrl =
      process.env
        .FLUSSI_LAVORO_GMAIL_URL ||
      "https://www.gestoriacitaia.com/api/flussi-lavoro-gmail";

    /**
     * ========================================================
     * GMAIL PAYLOAD
     * ========================================================
     */

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

      workType,

      categories,

      /**
       * El Gmail existente utiliza estos códigos.
       *
       * all_offers
       * → monthly
       *
       * new_10_days
       * → single_category
       */

      packageCode:
        packageCode ===
          "all_offers"
          ? "monthly"
          : "single_category",

      packageName,

      /**
       * Precio REAL enviado al Gmail.
       */

      packageAmountCents:
        expectedAmount,

      durationDays:
        packageCode ===
          "all_offers"
          ? 30
          : 30,
    };

    /**
     * ========================================================
     * GMAIL HEADERS
     * ========================================================
     */

    const gmailHeaders:
      Record<
        string,
        string
      > = {

      "Content-Type":
        "application/json",
    };

    /**
     * Secret interno del Gmail.
     *
     * ⚠️ NO ES EL SECRET DE STRIPE.
     *
     * No se cambia.
     */

    if (
      process.env
        .FLUSSI_LAVORO_INTERNAL_SECRET
    ) {

      gmailHeaders[
        "x-flussi-lavoro-secret"
      ] =
        process.env
          .FLUSSI_LAVORO_INTERNAL_SECRET;
    }

    /**
     * ========================================================
     * CALL EXISTING GMAIL
     * ========================================================
     */

    console.log(
      "📧 Calling EXISTING welcome Gmail file:",
      {
        gmailUrl,

        email,

        packageCode,

        amountCents:
          expectedAmount,
      }
    );

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
              gmailPayload
            ),
        }
      );

    const gmailResponseText =
      await gmailResponse.text();

    /**
     * ========================================================
     * GMAIL ERROR
     * ========================================================
     */

    if (
      !gmailResponse.ok
    ) {

      console.error(
        "❌ Existing welcome Gmail endpoint failed:",
        {
          status:
            gmailResponse.status,

          response:
            gmailResponseText.slice(
              0,
              1000
            ),
        }
      );

      return res
        .status(500)
        .json({

          error:
            "Welcome email endpoint failed",

          status:
            gmailResponse.status,
        });
    }

    /**
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    console.log(
      "✅ EXISTING WELCOME EMAIL SENT:",
      {

        email,

        packageCode,

        table,

        amountCents:
          expectedAmount,

        response:
          gmailResponseText.slice(
            0,
            500
          ),
      }
    );

    console.log(
      "Flussi Lavoro completed:",
      {

        table,

        amountCents,

        email,

        sessionId:
          session.id,

        reference,
      }
    );

    /**
     * ========================================================
     * FINAL RESPONSE
     * ========================================================
     */

    return res
      .status(200)
      .json({

        received:
          true,

        processed:
          true,

        saved:
          true,

        emailSent:
          true,

        table,

        amountCents,

        reference,

        stripeSessionId:
          session.id,
      });

  } catch (error) {

    console.error(
      "webhook-flussi-lavoro error:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "Webhook processing failed",
      });
  }
}
