import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/*
============================================================
GESTORIACITAIA
DECRETO FLUSSI LAVORO
STRIPE CHECKOUT
============================================================

SOLO 2 PLANES:

1. all_offers
   - Precio REAL: 14,99 €
   - PRECIO TEMPORAL DE PRUEBA: 0,50 €

2. new_10_days
   - 24,99 €
   - Nuevas ofertas cada 10 días
   - Duración: 3 meses
   - 6 envíos

IMPORTANTE:

El precio enviado desde el navegador NO se utiliza.

El precio definitivo SIEMPRE sale de PLANS en el servidor.
============================================================
*/

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

const CURRENCY = "eur";

const PRODUCT = "decreto_flussi_lavoro";

/*
============================================================
PLANES
============================================================
*/

const PLANS = {
  all_offers: {
    code: "all_offers",

    name: "Tutte le offerte",

    nameEs: "Todas las ofertas",

    nameEn: "All job offers",

    nameMa: "جميع عروض العمل",

    /*
     * PRUEBA:
     * 0,50 €
     *
     * Cuando termines la prueba:
     * cambiar 50 -> 1499
     */
    amount: 50,

    realAmount: 1499,

    durationDays: 30,

    deliveries: 1,
  },

  new_10_days: {
    code: "new_10_days",

    name: "Nuove offerte ogni 10 giorni",

    nameEs: "Nuevas ofertas cada 10 días",

    nameEn: "New offers every 10 days",

    nameMa: "عروض جديدة كل 10 أيام",

    amount: 2499,

    realAmount: 2499,

    durationDays: 90,

    deliveries: 6,
  },
} as const;

type PackageCode = keyof typeof PLANS;

type GenderCode =
  | "male"
  | "both"
  | "female";

/*
============================================================
HELPERS
============================================================
*/

function cleanString(
  value: unknown,
  maxLength = 500,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function cleanEmail(
  value: unknown,
): string {
  return cleanString(
    value,
    320,
  ).toLowerCase();
}

function isValidEmail(
  email: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function cleanGender(
  value: unknown,
): GenderCode | "" {
  const gender = cleanString(
    value,
    20,
  );

  if (
    gender === "male" ||
    gender === "both" ||
    gender === "female"
  ) {
    return gender;
  }

  return "";
}

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://gestoriacitaia.com";

  return url.replace(/\/+$/, "");
}

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
  ----------------------------------------------------------
  SOLO POST
  ----------------------------------------------------------
  */

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  /*
  ----------------------------------------------------------
  STRIPE
  ----------------------------------------------------------
  */

  if (!stripe) {
    console.error(
      "STRIPE_SECRET_KEY no configurada.",
    );

    return res.status(500).json({
      ok: false,
      error:
        "Stripe no está configurado correctamente.",
    });
  }

  try {

    const body = req.body || {};

    /*
    --------------------------------------------------------
    CLIENTE
    --------------------------------------------------------
    */

    const firstName =
      cleanString(
        body.firstName ??
          body.client_name,
        100,
      );

    const lastName =
      cleanString(
        body.lastName ??
          body.client_surname,
        150,
      );

    const email =
      cleanEmail(
        body.email ??
          body.gmail,
      );

    const phone =
      cleanString(
        body.phone ??
          body.whatsapp ??
          body.telefono,
        40,
      );

    const gender =
      cleanGender(
        body.gender,
      );

    const packageCode =
      cleanString(
        body.packageCode ??
          body.package_code,
        50,
      ) as PackageCode;

    /*
    --------------------------------------------------------
    VALIDAR PLAN
    --------------------------------------------------------
    */

    if (
      !Object.prototype.hasOwnProperty.call(
        PLANS,
        packageCode,
      )
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "El paquete seleccionado no es válido.",
      });
    }

    const plan =
      PLANS[packageCode];

    /*
    --------------------------------------------------------
    VALIDAR NOMBRE
    --------------------------------------------------------
    */

    if (!firstName) {
      return res.status(400).json({
        ok: false,
        error:
          "El nombre es obligatorio.",
      });
    }

    /*
    --------------------------------------------------------
    VALIDAR APELLIDO
    --------------------------------------------------------
    */

    if (!lastName) {
      return res.status(400).json({
        ok: false,
        error:
          "Los apellidos son obligatorios.",
      });
    }

    /*
    --------------------------------------------------------
    VALIDAR EMAIL
    --------------------------------------------------------
    */

    if (
      !email ||
      !isValidEmail(email)
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Introduce un email válido.",
      });
    }

    /*
    --------------------------------------------------------
    VALIDAR TELÉFONO
    --------------------------------------------------------
    */

    const phoneDigits =
      phone.replace(
        /\D/g,
        "",
      );

    if (
      !phone ||
      phoneDigits.length < 8 ||
      phoneDigits.length > 15
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Introduce un teléfono válido.",
      });
    }

    /*
    --------------------------------------------------------
    VALIDAR GÉNERO
    --------------------------------------------------------
    */

    if (!gender) {
      return res.status(400).json({
        ok: false,
        error:
          "Selecciona Hombres, Ambos o Mujeres.",
      });
    }

    /*
    --------------------------------------------------------
    REFERENCIA
    --------------------------------------------------------
    */

    const reference =
      `FLUSSI-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

    /*
    --------------------------------------------------------
    METADATA STRIPE
    --------------------------------------------------------

    El webhook utilizará estos datos después
    de checkout.session.completed.
    */

    const metadata: Record<
      string,
      string
    > = {

      product:
        PRODUCT,

      service:
        "flussi_lavoro",

      reference,

      client_first_name:
        firstName,

      client_last_name:
        lastName,

      client_name:
        `${firstName} ${lastName}`,

      email,

      phone,

      gender,

      package_code:
        plan.code,

      package_name:
        plan.name,

      package_name_es:
        plan.nameEs,

      package_name_en:
        plan.nameEn,

      package_name_ma:
        plan.nameMa,

      package_amount_cents:
        String(
          plan.amount,
        ),

      real_amount_cents:
        String(
          plan.realAmount,
        ),

      duration_days:
        String(
          plan.durationDays,
        ),

      deliveries:
        String(
          plan.deliveries,
        ),
    };

    /*
    --------------------------------------------------------
    URLS
    --------------------------------------------------------
    */

    const baseUrl =
      getBaseUrl();

    /*
    --------------------------------------------------------
    STRIPE CHECKOUT
    --------------------------------------------------------
    */

    const session =
      await stripe.checkout.sessions.create(
        {

          mode:
            "payment",

          payment_method_types:
            [
              "card",
            ],

          customer_email:
            email,

          client_reference_id:
            reference,

          line_items:
            [
              {
                price_data:
                  {
                    currency:
                      CURRENCY,

                    /*
                     * IMPORTANTE:
                     *
                     * AQUÍ ESTÁ EL PRECIO REAL
                     * DEL SERVIDOR.
                     *
                     * PLAN 1 = 50 céntimos
                     * PLAN 2 = 24,99 €
                     */

                    unit_amount:
                      plan.amount,

                    product_data:
                      {
                        name:
                          `Decreto Flussi Lavoro — ${plan.name}`,

                        description:
                          plan.code ===
                          "all_offers"
                            ? "Servizio di ricerca e invio di offerte di lavoro Decreto Flussi."
                            : "Nuove offerte di lavoro ogni 10 giorni per 3 mesi.",
                      },
                  },

                quantity:
                  1,
              },
            ],

          /*
          ----------------------------------------------------
          SUCCESS
          ----------------------------------------------------
          */

          success_url:
            `${baseUrl}/decreto-flussi-2027?payment=success&session_id={CHECKOUT_SESSION_ID}`,

          /*
          ----------------------------------------------------
          CANCEL
          ----------------------------------------------------
          */

          cancel_url:
            `${baseUrl}/decreto-flussi-2027?payment=cancelled`,

          /*
          ----------------------------------------------------
          METADATA
          ----------------------------------------------------
          */

          metadata,

          payment_intent_data:
            {
              metadata,
            },

          billing_address_collection:
            "auto",

          allow_promotion_codes:
            false,

          submit_type:
            "pay",
        },
      );

    /*
    --------------------------------------------------------
    LOG
    --------------------------------------------------------
    */

    console.log(
      "FLUSSI CHECKOUT CREATED",
      {
        sessionId:
          session.id,

        reference,

        email,

        gender,

        packageCode:
          plan.code,

        amount:
          plan.amount,
      },
    );

    /*
    --------------------------------------------------------
    RESPONSE
    --------------------------------------------------------
    */

    return res.status(200).json({

      ok: true,

      session_id:
        session.id,

      url:
        session.url,

      checkout_url:
        session.url,

      checkoutUrl:
        session.url,

      reference,

      product:
        PRODUCT,

      packageCode:
        plan.code,

      packageName:
        plan.name,

      amount:
        plan.amount,

      currency:
        CURRENCY,

      durationDays:
        plan.durationDays,

      deliveries:
        plan.deliveries,

      gender,

      paid:
        false,

      message:
        "Checkout Stripe creado correctamente.",
    });

  } catch (
    error: any
  ) {

    console.error(
      "FLUSSI CHECKOUT ERROR:",
      error,
    );

    return res.status(500).json({

      ok: false,

      error:
        error?.message ||
        "No se pudo crear el pago de Stripe.",
    });
  }
}
