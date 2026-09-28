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

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const clean = (v: unknown, max = 2000) =>
  String(v ?? "").trim().slice(0, max);

const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = clean(
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function supabaseInsert(
  table: string,
  data: Record<string, unknown>
) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase configuration missing");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase insert failed (${table}): ${response.status} ${text}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function supabaseSelectBySession(
  table: string,
  stripeSessionId: string
) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase configuration missing");
  }

  const url =
    `${SUPABASE_URL}/rest/v1/${table}` +
    `?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}` +
    `&select=id`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase lookup failed (${table}): ${response.status} ${text}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const gmailUrl =
    process.env.FLUSSI_LAVORO_GMAIL_URL ||
    "https://gestoriacitaia.com/api/flussi-lavoro-gmail";

  const internalSecret =
    process.env.FLUSSI_LAVORO_INTERNAL_SECRET;

  if (
    !process.env.STRIPE_SECRET_KEY ||
    !webhookSecret
  ) {
    return res.status(500).json({
      error: "Stripe configuration missing",
    });
  }

  try {
    // ============================================================
    // 1. LEER WEBHOOK STRIPE
    // ============================================================

    const rawBody = await readRawBody(req);

    const signature = req.headers["stripe-signature"];

    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({
        error: "Missing Stripe signature",
      });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error(
        "Stripe signature verification failed:",
        error
      );

      return res.status(400).json({
        error: "Invalid Stripe signature",
      });
    }

    // ============================================================
    // 2. SOLO CHECKOUT COMPLETED
    // ============================================================

    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({
        received: true,
        ignored: true,
        event: event.type,
      });
    }

    const session =
      event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata || {};

    // ============================================================
    // 3. SOLO FLUSSI LAVORO
    // ============================================================

    if (
      metadata.service !== "flussi_lavoro" ||
      metadata.product !== "decreto_flussi_lavoro"
    ) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "not_flussi_lavoro",
      });
    }

    // ============================================================
    // 4. SOLO PAGOS CONFIRMADOS
    // ============================================================

    if (session.payment_status !== "paid") {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "payment_not_paid",
      });
    }

    // ============================================================
    // 5. DATOS DEL CLIENTE
    // ============================================================

    const email = clean(
      metadata.client_email ||
        metadata.email ||
        session.customer_details?.email
    );

    const fullName = clean(
      metadata.client_name ||
        metadata.full_name ||
        session.customer_details?.name
    );

    const firstName = clean(
      metadata.first_name ||
        fullName.split(" ")[0]
    );

    const lastName = clean(
      metadata.last_name ||
        fullName.split(" ").slice(1).join(" ")
    );

    const phone = clean(
      metadata.client_phone ||
        metadata.phone ||
        session.customer_details?.phone
    );

    if (!email || !firstName || !lastName) {
      console.error("Missing client data", {
        email,
        firstName,
        lastName,
        sessionId: session.id,
      });

      return res.status(400).json({
        error: "Missing client data",
      });
    }

    // ============================================================
    // 6. CATEGORÍAS
    // ============================================================

    const categories = clean(metadata.categories)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    // ============================================================
    // 7. PLAN
    // ============================================================

    const packageCode =
      metadata.package_code === "biweekly"
        ? "biweekly"
        : metadata.package_code === "single_category"
        ? "single_category"
        : "monthly";

    const packageAmountCents =
      Number(metadata.package_amount_cents) ||
      session.amount_total ||
      0;

    // ============================================================
    // 8. IDENTIFICAR TABLA
    // ============================================================

    let targetTable = "";

    if (packageAmountCents === 999) {
      targetTable = "flussi_lavoro_9_99";
    } else if (packageAmountCents === 1999) {
      targetTable = "flussi_lavoro_19_99";
    } else if (packageAmountCents === 2499) {
      targetTable = "flussi_lavoro_24_99";
    } else {
      console.error(
        "Unknown Flussi Lavoro amount:",
        packageAmountCents
      );

      return res.status(400).json({
        error: "Unknown Flussi Lavoro package",
        amountCents: packageAmountCents,
      });
    }

    // ============================================================
    // 9. FECHAS
    // ============================================================

    const now = new Date();

    let startsAt: string | null = null;
    let expiresAt: string | null = null;

    if (packageAmountCents === 1999) {
      startsAt = now.toISOString();

      const expiration = new Date(now);
      expiration.setDate(expiration.getDate() + 15);

      expiresAt = expiration.toISOString();
    }

    if (packageAmountCents === 2499) {
      startsAt = now.toISOString();

      const expiration = new Date(now);
      expiration.setDate(expiration.getDate() + 30);

      expiresAt = expiration.toISOString();
    }

    // ============================================================
    // 10. EVITAR DUPLICADOS
    // ============================================================

    const existing = await supabaseSelectBySession(
      targetTable,
      session.id
    );

    if (Array.isArray(existing) && existing.length > 0) {
      console.log(
        "Flussi Lavoro payment already saved:",
        session.id
      );

      return res.status(200).json({
        received: true,
        processed: true,
        alreadyExists: true,
        table: targetTable,
        stripeSessionId: session.id,
      });
    }

    // ============================================================
    // 11. GUARDAR CLIENTE EN LA TABLA CORRESPONDIENTE
    // ============================================================

    let databaseRecord: Record<string, unknown>;

    if (packageAmountCents === 999) {
      databaseRecord = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,

        work_type:
          metadata.work_type === "stagionale"
            ? "stagionale"
            : "non_stagionale",

        categories,

        stripe_session_id: session.id,

        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,

        payment_status: "paid",

        purchased_at: now.toISOString(),

        updated_at: now.toISOString(),
      };
    } else if (packageAmountCents === 1999) {
      databaseRecord = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,

        work_type:
          metadata.work_type === "stagionale"
            ? "stagionale"
            : "non_stagionale",

        categories,

        stripe_session_id: session.id,

        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,

        payment_status: "paid",

        starts_at: startsAt,
        expires_at: expiresAt,

        purchased_at: now.toISOString(),

        updated_at: now.toISOString(),
      };
    } else {
      // 24,99 €
      const selectedCategory =
        categories.length > 0
          ? categories[0]
          : clean(metadata.category);

      if (!selectedCategory) {
        return res.status(400).json({
          error:
            "24.99 package requires exactly one category",
        });
      }

      databaseRecord = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,

        work_type:
          metadata.work_type === "stagionale"
            ? "stagionale"
            : "non_stagionale",

        category: selectedCategory,

        stripe_session_id: session.id,

        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,

        payment_status: "paid",

        starts_at: startsAt,
        expires_at: expiresAt,

        purchased_at: now.toISOString(),

        updated_at: now.toISOString(),
      };
    }

    const saved = await supabaseInsert(
      targetTable,
      databaseRecord
    );

    console.log(
      "Flussi Lavoro client saved successfully:",
      {
        table: targetTable,
        sessionId: session.id,
        email,
        amountCents: packageAmountCents,
      }
    );

    // ============================================================
    // 12. PAYLOAD PARA EMAIL
    // ============================================================

    const payload = {
      service: "flussi_lavoro",
      product: "decreto_flussi_lavoro",
      paid: true,

      reference:
        clean(metadata.reference) ||
        `FL-${session.id.slice(-10).toUpperCase()}`,

      stripeSessionId: session.id,

      client: {
        firstName,
        lastName,
        email,
        phone,
      },

      workType:
        metadata.work_type === "stagionale"
          ? "stagionale"
          : "non_stagionale",

      categories,

      packageCode,

      packageName: clean(metadata.package_name),

      packageAmountCents,

      durationDays:
        Number(metadata.duration_days) ||
        (packageAmountCents === 1999
          ? 15
          : packageAmountCents === 2499
          ? 30
          : 0),
    };

    // ============================================================
    // 13. EMAIL DE BIENVENIDA
    // ============================================================

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (internalSecret) {
      headers["x-flussi-lavoro-secret"] =
        internalSecret;
    }

    const gmailResponse = await fetch(gmailUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const gmailResponseText =
      await gmailResponse.text();

    if (!gmailResponse.ok) {
      console.error(
        "Gmail endpoint failed:",
        {
          status: gmailResponse.status,
          response: gmailResponseText,
          sessionId: session.id,
        }
      );

      /*
       * IMPORTANTE:
       * El cliente YA está guardado en Supabase.
       * Si Stripe reintenta el webhook, el sistema
       * detectará el stripe_session_id y NO duplicará
       * el cliente.
       */

      return res.status(500).json({
        error:
          "Welcome email endpoint failed",
        saved: true,
        table: targetTable,
      });
    }

    // ============================================================
    // 14. FINAL
    // ============================================================

    console.log(
      "Flussi Lavoro processed successfully:",
      {
        table: targetTable,
        sessionId: session.id,
        email,
        reference: payload.reference,
      }
    );

    return res.status(200).json({
      received: true,
      processed: true,
      saved: true,
      emailSent: true,

      table: targetTable,

      stripeSessionId: session.id,

      reference: payload.reference,
    });
  } catch (error) {
    console.error(
      "webhook-flussi-lavoro error:",
      error
    );

    return res.status(500).json({
      error: "Webhook processing failed",
    });
  }
}
