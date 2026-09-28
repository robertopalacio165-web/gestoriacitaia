import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * DECRETO FLUSSI LAVORO
 * CREATE STRIPE CHECKOUT
 * ============================================================
 *
 * ARCHIVO:
 *   api/create-checkout-flussi-lavoro.ts
 *
 * ESTE CHECKOUT ES EXCLUSIVO DEL SERVICIO:
 *   "Decreto Flussi Lavoro"
 *
 * NO toca el checkout de:
 *   - Verificación Decreto Flussi
 *   - Malta
 *   - otros servicios
 *
 * FLUJO:
 *
 * FORMULARIO
 *    ↓
 * seleccionar tipo de trabajo
 *    ↓
 * seleccionar categorías
 *    ↓
 * seleccionar paquete
 *    ↓
 * Stripe Checkout
 *    ↓
 * checkout.session.completed
 *    ↓
 * WEBHOOK FLUSSI LAVORO
 *    ↓
 * confirmar pago
 *    ↓
 * enviar email del plan contratado
 *
 * IMPORTANTE:
 * El precio definitivo se decide EN EL SERVIDOR.
 * No confiamos en packagePriceCents enviado por el navegador.
 * ============================================================
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

const FLUSSI_LAVORO_CURRENCY = "eur";
const FLUSSI_LAVORO_PRODUCT = "decreto_flussi_lavoro";

/**
 * Precios oficiales del servicio.
 *
 * monthly:
 *   9,99 € / 30 días
 *
 * biweekly:
 *   19,99 € / 30 días
 *
 * single_category:
 *   24,99 € / 30 días
 */
const PLANS = {
  monthly: {
    code: "monthly",
    name: "Offerte del mese",
    amount: 50,
    durationDays: 30,
  },

  biweekly: {
    code: "biweekly",
    name: "Aggiornamenti ogni 15 giorni",
    amount: 50,
    durationDays: 30,
  },

  single_category: {
    code: "single_category",
    name: "Una sola categoria",
    amount: 50,
    durationDays: 30,
  },
} as const;

type PackageCode = keyof typeof PLANS;

/**
 * Limpieza básica de strings.
 */
function cleanString(
  value: unknown,
  maxLength = 500
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

/**
 * Limpieza de email.
 */
function cleanEmail(value: unknown): string {
  return cleanString(value, 320).toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Convierte categorías a una lista segura.
 */
function cleanCategories(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => cleanString(item, 100))
    .filter(Boolean)
    .slice(0, 30);
}

/**
 * Devuelve la URL pública de la web.
 */
function getBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://gestoriacitaia.com";

  return baseUrl.replace(/\/+$/, "");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /**
   * ----------------------------------------------------------
   * SOLO POST
   * ----------------------------------------------------------
   */
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  try {
    if (!stripe) {
      console.error(
        "❌ STRIPE_SECRET_KEY no está configurada."
      );

      return res.status(500).json({
        ok: false,
        error:
          "Stripe no está configurado correctamente en el servidor.",
      });
    }

    const body = req.body || {};

    /**
     * --------------------------------------------------------
     * DATOS DEL CLIENTE
     * --------------------------------------------------------
     *
     * Compatibles con el frontend DecretoFlussi2027.tsx:
     *
     * firstName
     * lastName
     * email
     * phone
     * workType
     * categories
     * packageCode
     */
    const firstName = cleanString(
      body.firstName ??
        body.client_name ??
        body.clientName,
      100
    );

    const lastName = cleanString(
      body.lastName ??
        body.client_surname ??
        body.clientSurname,
      150
    );

    const email = cleanEmail(
      body.email ??
        body.gmail
    );

    const phone = cleanString(
      body.phone ??
        body.whatsapp ??
        body.telefono,
      40
    );

    const workType = cleanString(
      body.workType ??
        body.work_type,
      50
    );

    const categories = cleanCategories(
      body.categories ??
        body.selectedCategories
    );

    const packageCodeRaw = cleanString(
      body.packageCode ??
        body.package_code,
      50
    ) as PackageCode;

    /**
     * --------------------------------------------------------
     * VALIDAR PLAN
     * --------------------------------------------------------
     *
     * NUNCA aceptamos el precio enviado por el navegador.
     */
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

    /**
     * --------------------------------------------------------
     * VALIDACIONES
     * --------------------------------------------------------
     */
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
      workType !== "non_stagionale" &&
      workType !== "stagionale"
    ) {
      return res.status(400).json({
        ok: false,
        error: "Selecciona un tipo de trabajo válido.",
      });
    }

    if (!categories.length) {
      return res.status(400).json({
        ok: false,
        error: "Selecciona al menos una categoría profesional.",
      });
    }

    /**
     * El paquete de una sola categoría permite exactamente una.
     */
    if (
      packageCodeRaw === "single_category" &&
      categories.length !== 1
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "El paquete de una sola categoría requiere exactamente una categoría.",
      });
    }

    /**
     * --------------------------------------------------------
     * REFERENCIA INTERNA
     * --------------------------------------------------------
     */
    const reference =
      `FLUSSI-LAVORO-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

    /**
     * --------------------------------------------------------
     * METADATA
     * --------------------------------------------------------
     *
     * Stripe metadata tiene límites de tamaño.
     * Guardamos solo los datos necesarios para identificar
     * la compra en el webhook.
     */
    const metadata: Record<string, string> = {
      product: FLUSSI_LAVORO_PRODUCT,
      service: "flussi_lavoro",
      reference,

      client_name: firstName.slice(0, 100),
      client_surname: lastName.slice(0, 150),
      email: email.slice(0, 300),
      phone: phone.slice(0, 40),

      work_type: workType,

      categories: categories
        .join(",")
        .slice(0, 490),

      package_code: plan.code,
      package_name: plan.name,
      package_amount_cents: String(plan.amount),
      duration_days: String(plan.durationDays),
    };

    /**
     * --------------------------------------------------------
     * CREAR STRIPE CHECKOUT
     * --------------------------------------------------------
     */
    const baseUrl = getBaseUrl();

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        payment_method_types: [
          "card",
        ],

        customer_email: email,

        client_reference_id: reference,

        line_items: [
          {
            price_data: {
              currency:
                FLUSSI_LAVORO_CURRENCY,

              unit_amount:
                plan.amount,

              product_data: {
                name:
                  `Decreto Flussi Lavoro — ${plan.name}`,

                description:
                  `Servicio de ofertas de trabajo Decreto Flussi. ${plan.name}. Duración: ${plan.durationDays} días.`,
              },
            },

            quantity: 1,
          },
        ],

        /**
         * ----------------------------------------------------
         * RETURN URLS
         * ----------------------------------------------------
         */
        success_url:
          `${baseUrl}/decreto-flussi-2027?payment=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${baseUrl}/decreto-flussi-2027?payment=cancelled`,

        /**
         * ----------------------------------------------------
         * METADATA
         * ----------------------------------------------------
         */
        metadata,

        payment_intent_data: {
          metadata,
        },

        billing_address_collection:
          "auto",

        allow_promotion_codes:
          false,

        submit_type: "pay",
      });

    console.log(
      "✅ FLUSSI LAVORO CHECKOUT CREATED",
      {
        sessionId: session.id,
        reference,
        email,
        packageCode: plan.code,
        amount: plan.amount,
        categories,
        workType,
      }
    );

    /**
     * --------------------------------------------------------
     * RESPUESTA AL FRONTEND
     * --------------------------------------------------------
     */
    return res.status(200).json({
      ok: true,

      session_id:
        session.id,

      checkout_url:
        session.url,

      checkoutUrl:
        session.url,

      url:
        session.url,

      reference,

      product:
        FLUSSI_LAVORO_PRODUCT,

      packageCode:
        plan.code,

      packageName:
        plan.name,

      amount:
        plan.amount,

      currency:
        FLUSSI_LAVORO_CURRENCY,

      durationDays:
        plan.durationDays,

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
