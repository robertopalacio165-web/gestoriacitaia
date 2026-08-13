import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

const FLUSSI_PRICE = 2199;
const FLUSSI_CURRENCY = "eur";

function cleanString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function limitMetadata(
  value: unknown,
  max = 450
): string {
  const text = cleanString(value);

  if (!text) return "";

  return text.substring(0, max);
}

function getBaseUrl(req: VercelRequest): string {
  /*
   * Preferimos una URL configurada en Vercel.
   */
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configuredUrl) {
    return configuredUrl.startsWith("http")
      ? configuredUrl
      : `https://${configuredUrl}`;
  }

  /*
   * Fallback para Vercel.
   */
  const host =
    req.headers["x-forwarded-host"] ||
    req.headers.host;

  const protocol =
    req.headers["x-forwarded-proto"] ||
    "https";

  if (host) {
    return `${protocol}://${host}`;
  }

  /*
   * Último fallback.
   */
  return "https://gestoriacitaia.com";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /*
   * ============================================================
   * SOLO POST
   * ============================================================
   */

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  /*
   * ============================================================
   * STRIPE CONFIGURATION
   * ============================================================
   */

  if (!stripe) {
    console.error(
      "STRIPE_SECRET_KEY no está configurada."
    );

    return res.status(500).json({
      ok: false,
      error:
        "Stripe no está configurado correctamente en el servidor.",
    });
  }

  try {
    /*
     * ============================================================
     * DATOS DEL FORMULARIO
     * ============================================================
     */

    const body = req.body || {};

    const userId =
      cleanString(body.userId);

    const fullName =
      cleanString(body.fullName);

    const apellidos =
      cleanString(body.apellidos);

    const phone =
      cleanString(body.phone);

    const email =
      cleanString(body.email);

    const pais =
      cleanString(body.pais);

    const tipoDocumento =
      cleanString(body.tipoDocumento);

    const documentos =
      cleanString(body.documentos);

    const preferredOffice =
      cleanString(body.preferredOffice) ||
      "+39";

    /*
     * ============================================================
     * VALIDACIÓN
     * ============================================================
     */

    if (!fullName) {
      return res.status(400).json({
        ok: false,
        error: "El nombre es obligatorio.",
      });
    }

    if (!apellidos) {
      return res.status(400).json({
        ok: false,
        error:
          "Los apellidos son obligatorios.",
      });
    }

    if (!phone) {
      return res.status(400).json({
        ok: false,
        error:
          "El WhatsApp es obligatorio.",
      });
    }

    if (!email) {
      return res.status(400).json({
        ok: false,
        error:
          "El Gmail/email es obligatorio.",
      });
    }

    if (!pais) {
      return res.status(400).json({
        ok: false,
        error:
          "El país es obligatorio.",
      });
    }

    if (!tipoDocumento) {
      return res.status(400).json({
        ok: false,
        error:
          "El tipo de documento es obligatorio.",
      });
    }

    /*
     * IMPORTANTE:
     *
     * documentosPaths NO se recibe ni se guarda.
     *
     * Los archivos todavía están en IndexedDB
     * del navegador.
     *
     * Solamente recibimos los nombres de los archivos.
     */

    /*
     * ============================================================
     * URLS
     * ============================================================
     */

    const baseUrl =
      getBaseUrl(req);

    const successUrl =
      `${baseUrl}/verificar-decreto-flussi?success=true&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      `${baseUrl}/verificar-decreto-flussi?canceled=true`;

    /*
     * ============================================================
     * METADATA DE STRIPE
     * ============================================================
     *
     * IMPORTANTE:
     *
     * Stripe permite metadata limitada.
     * No guardamos documentos ni contenido sensible aquí.
     *
     * Solamente identificadores y datos necesarios
     * para recuperar el proceso después del pago.
     * ============================================================
     */

    const metadata: Record<string, string> = {
      product:
        "decreto_flussi",

      service:
        "verificacion_decreto_flussi",

      version:
        "italy-v1",

      userId:
        limitMetadata(userId),

      fullName:
        limitMetadata(fullName),

      apellidos:
        limitMetadata(apellidos),

      phone:
        limitMetadata(phone),

      email:
        limitMetadata(email),

      pais:
        limitMetadata(pais),

      tipoDocumento:
        limitMetadata(tipoDocumento),

      documentos:
        limitMetadata(documentos),

      preferredOffice:
        limitMetadata(preferredOffice),
    };

    /*
     * ============================================================
     * CREAR CHECKOUT STRIPE
     * ============================================================
     */

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        /*
         * PRECIO FIJO:
         *
         * 21,99 €
         *
         * El cliente no puede modificarlo.
         */

        line_items: [
          {
            price_data: {
              currency:
                FLUSSI_CURRENCY,

              product_data: {
                name:
                  "Verificación de Contrato y Decreto Flussi — Italia",

                description:
                  "Análisis de contrato, Nulla Osta o documentación relacionada con Decreto Flussi mediante IA y verificación de empresa italiana.",
              },

              unit_amount:
                FLUSSI_PRICE,
            },

            quantity: 1,
          },
        ],

        /*
         * Email del cliente.
         */
        customer_email:
          email,

        /*
         * Metadata.
         */
        metadata,

        /*
         * También la ponemos en payment_intent
         * para conservarla asociada al pago.
         */
        payment_intent_data: {
          metadata,
          description:
            "Verificación de Contrato y Decreto Flussi — Italia",
        },

        /*
         * URLs.
         *
         * Stripe sustituirá:
         *
         * {CHECKOUT_SESSION_ID}
         *
         * por el ID real.
         */

        success_url:
          successUrl,

        cancel_url:
          cancelUrl,

        /*
         * Idioma de Checkout.
         *
         * Stripe mostrará automáticamente
         * la interfaz apropiada cuando sea posible.
         */

        locale: "auto",

        /*
         * Permitir códigos promocionales
         * si en el futuro los necesitamos.
         */
        allow_promotion_codes: true,
      });

    /*
     * ============================================================
     * COMPROBAR QUE STRIPE DEVOLVIÓ URL
     * ============================================================
     */

    if (!session.url) {
      console.error(
        "Stripe no devolvió checkout URL:",
        session.id
      );

      return res.status(500).json({
        ok: false,
        error:
          "Stripe no devolvió la URL de pago.",
      });
    }

    /*
     * ============================================================
     * LOG SERVIDOR
     * ============================================================
     *
     * NO imprimimos documentos ni datos sensibles.
     */

    console.log(
      "✅ FLUSSI CHECKOUT CREATED",
      {
        sessionId:
          session.id,

        userId:
          userId || null,

        email:
          email,

        amount:
          FLUSSI_PRICE,

        currency:
          FLUSSI_CURRENCY,

        product:
          "decreto_flussi",
      }
    );

    /*
     * ============================================================
     * RESPUESTA
     * ============================================================
     */

    return res.status(200).json({
      ok: true,

      url:
        session.url,

      session_id:
        session.id,

      amount:
        FLUSSI_PRICE,

      currency:
        FLUSSI_CURRENCY,

      product:
        "decreto_flussi",

      message:
        "Checkout Stripe creado correctamente.",
    });
  } catch (error: any) {
    console.error(
      "❌ CREATE FLUSSI CHECKOUT ERROR:",
      error
    );

    /*
     * Errores específicos de Stripe.
     */

    if (
      error?.type ===
      "StripeInvalidRequestError"
    ) {
      return res.status(400).json({
        ok: false,
        error:
          error?.message ||
          "Stripe rechazó los datos del checkout.",
      });
    }

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "No se pudo crear el pago con Stripe.",
    });
  }
}
