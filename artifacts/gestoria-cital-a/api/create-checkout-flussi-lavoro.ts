import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * DECRETO FLUSSI LAVORO
 * CREATE STRIPE CHECKOUT
 * ============================================================
 *
 * ESTE ENDPOINT ES EXCLUSIVO DE:
 *   /decreto-flussi-2027
 *
 * IMPORTANTE:
 * - NO documentos
 * - NO verificación documental
 * - NO workType
 * - NO categories
 *
 * Datos recibidos desde el frontend:
 *   firstName
 *   lastName
 *   email
 *   phone
 *   gender
 *   packageCode
 *
 * Planes:
 *   all_offers   -> 14,99 €
 *   new_10_days  -> 24,99 €
 * ============================================================
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

const CURRENCY = "eur";
const PRODUCT = "decreto_flussi_lavoro";
const SERVICE = "flussi_lavoro";

const PLANS = {
  all_offers: {
    code: "all_offers",
    name: "Todas las ofertas",
    amount: 1499,
    durationDays: 30,
    deliveries: 1,
  },
  new_10_days: {
    code: "new_10_days",
    name: "Nuevas ofertas cada 10 días",
    amount: 2499,
    durationDays: 90,
    deliveries: 6,
  },
} as const;

type PackageCode = keyof typeof PLANS;
type GenderCode = "male" | "both" | "female";

function cleanString(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function cleanEmail(value: unknown): string {
  return cleanString(value, 320).toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeGender(value: unknown): GenderCode {
  const raw = cleanString(value, 30).toLowerCase();

  if (
    raw === "male" ||
    raw === "hombre" ||
    raw === "hombres" ||
    raw === "man" ||
    raw === "men"
  ) {
    return "male";
  }

  if (
    raw === "female" ||
    raw === "mujer" ||
    raw === "mujeres" ||
    raw === "woman" ||
    raw === "women"
  ) {
    return "female";
  }

  return "both";
}

function getBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://gestoriacitaia.com";

  return baseUrl.replace(/\/+$/, "");
}

function createReference(): string {
  return `FLUSSI-LAVORO-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  try {
    if (!stripe) {
      console.error("❌ STRIPE_SECRET_KEY no está configurada.");

      return res.status(500).json({
        ok: false,
        error: "Stripe no está configurado correctamente en el servidor.",
      });
    }

    const body = req.body || {};

    // ==========================================================
    // DATOS DEL CLIENTE
    // ==========================================================

    const firstName = cleanString(body.firstName, 100);
    const lastName = cleanString(body.lastName, 150);
    const email = cleanEmail(body.email);
    const phone = cleanString(body.phone, 40);
    const gender = normalizeGender(body.gender);

    const packageCodeRaw = cleanString(
      body.packageCode,
      50
    ) as PackageCode;

    // ==========================================================
    // VALIDACIONES
    // ==========================================================

    if (!firstName) {
      return res.status(400).json({
        ok: false,
        error: "El nombre es obligatorio.",
      });
    }

    if (!lastName) {
      return res.status(400).json({
        ok: false,
        error: "Los apellidos son obligatorios.",
      });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        ok: false,
        error: "Introduce un email válido.",
      });
    }

    if (!phone) {
      return res.status(400).json({
        ok: false,
        error: "El teléfono es obligatorio.",
      });
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        PLANS,
        packageCodeRaw
      )
    ) {
      return res.status(400).json({
        ok: false,
        error: "El paquete seleccionado no es válido.",
      });
    }

    const plan = PLANS[packageCodeRaw];

    // ==========================================================
    // REFERENCIA
    // ==========================================================

    const reference = createReference();

    // ==========================================================
    // STRIPE METADATA
    // Compatible con webhook-flussi-lavoro.ts
    // ==========================================================

    const metadata: Record<string, string> = {
      product: PRODUCT,
      service: SERVICE,
      reference,

      client_name: firstName,
      client_surname: lastName,
      email,
      phone,

      gender,

      package_code: plan.code,
      package_name: plan.name,
      package_amount_cents: String(plan.amount),
      duration_days: String(plan.durationDays),
      deliveries: String(plan.deliveries),
    };

    // ==========================================================
    // CREAR STRIPE CHECKOUT
    // ==========================================================

    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      customer_email: email,

      client_reference_id: reference,

      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            unit_amount: plan.amount,

            product_data: {
              name: `Decreto Flussi Lavoro — ${plan.name}`,
              description:
                plan.code === "all_offers"
                  ? "Todas las ofertas de trabajo Decreto Flussi. Entrega por email."
                  : "Nuevas ofertas de trabajo Decreto Flussi cada 10 días durante 3 meses.",
            },
          },

          quantity: 1,
        },
      ],

      success_url:
        `${baseUrl}/decreto-flussi-2027?payment=success&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${baseUrl}/decreto-flussi-2027?payment=cancelled`,

      metadata,

      payment_intent_data: {
        metadata,
      },

      billing_address_collection: "auto",

      allow_promotion_codes: false,

      submit_type: "pay",
    });

    console.log("✅ FLUSSI LAVORO CHECKOUT CREATED", {
      sessionId: session.id,
      reference,
      email,
      gender,
      packageCode: plan.code,
      amount: plan.amount,
    });

    return res.status(200).json({
      ok: true,

      session_id: session.id,

      checkout_url: session.url,
      checkoutUrl: session.url,
      url: session.url,

      reference,

      product: PRODUCT,
      service: SERVICE,

      packageCode: plan.code,
      packageName: plan.name,

      amount: plan.amount,
      currency: CURRENCY,

      durationDays: plan.durationDays,
      deliveries: plan.deliveries,

      gender,

      paid: false,

      message:
        "Checkout de Stripe creado. El pago todavía no está confirmado.",
    });
  } catch (error: any) {
    console.error(
      "❌ FLUSSI LAVORO CHECKOUT ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "No se pudo crear el pago de Stripe.",
    });
  }
}
