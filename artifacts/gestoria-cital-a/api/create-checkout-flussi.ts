import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * DECRETO FLUSSI - CREATE STRIPE CHECKOUT
 * ============================================================
 *
 * IMPORTANTE:
 *
 * - Este endpoint SOLO crea el Checkout de Stripe.
 * - NO guarda documentos en Supabase.
 * - NO guarda datos del cliente en Supabase.
 * - NO confía en el navegador para confirmar el pago.
 * - La confirmación real se hará posteriormente mediante Stripe.
 *
 * Precio:
 * 21,99 EUR
 * ============================================================
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(
    "⚠️ STRIPE_SECRET_KEY no está configurada."
  );
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

/**
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const FLUSSI_PRICE_CENTS = 2199;
const FLUSSI_CURRENCY = "eur";

const FLUSSI_PRODUCT = "decreto_flussi";

const MAX_DOCUMENTS = 5;

/**
 * ============================================================
 * HELPERS
 * ============================================================
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

function cleanEmail(value: unknown): string {
  return cleanString(value, 320).toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanPhone(value: unknown): string {
  return cleanString(value, 40);
}

function cleanCountry(value: unknown): string {
  return cleanString(value, 100);
}

function cleanDocumentType(value: unknown): string {
  const allowed = [
    "Contrato de trabajo (Decreto Flussi)",
    "Nulla Osta",
    "Otro / No sé qué es",
  ];

  const valueClean = cleanString(value, 100);

  return allowed.includes(valueClean)
    ? valueClean
    : "";
}

/**
 * ============================================================
 * HANDLER
 * ============================================================
 */

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

  /**
   * ----------------------------------------------------------
   * STRIPE CONFIG
   * ----------------------------------------------------------
   */

  if (!stripe) {
    return res.status(500).json({
      ok: false,
      error:
        "Stripe no está configurado correctamente en el servidor.",
    });
  }

  try {
    /**
     * ========================================================
     * LEER DATOS DEL FORMULARIO
     * ========================================================
     */

    const body = req.body || {};

    /**
     * --------------------------------------------------------
     * DATOS DEL CLIENTE
     * --------------------------------------------------------
     */

    const clientName = cleanString(
      body.client_name ??
        body.clientName ??
        body.nombre,
      100
    );

    const clientSurname = cleanString(
      body.client_surname ??
        body.clientSurname ??
        body.apellidos,
      150
    );

    const email = cleanEmail(
      body.email ??
        body.gmail
    );

    const whatsapp = cleanPhone(
      body.whatsapp ??
        body.phone ??
        body.telefono
    );

    const country = cleanCountry(
      body.country ??
        body.pais
    );

    /**
     * --------------------------------------------------------
     * PERSONA / EMPLEADOR
     * --------------------------------------------------------
     */

    const employerName = cleanString(
      body.employer_name ??
        body.employerName ??
        body.nombre_empleador ??
        body.person_name,
      200
    );

    const employerCity = cleanString(
      body.employer_city ??
        body.employerCity ??
        body.ciudad_italia ??
        body.city,
      120
    );

    const employerBirthDate = cleanString(
      body.employer_birth_date ??
        body.employerBirthDate ??
        body.fecha_nacimiento_empleador,
      30
    );

    /**
     * --------------------------------------------------------
     * TIPO DE SERVICIO
     * --------------------------------------------------------
     */

    const documentType = cleanDocumentType(
      body.document_type ??
        body.documentType ??
        body.tipo_documento
    );

    /**
     * --------------------------------------------------------
     * SOLO BÚSQUEDA DE PERSONA
     * --------------------------------------------------------
     *
     * true:
     * El cliente no tiene documento y quiere investigar
     * solamente a la persona.
     *
     * false:
     * El cliente tiene documento para analizar.
     * --------------------------------------------------------
     */

    const searchPersonOnly =
      body.search_person_only === true ||
      body.searchPersonOnly === true ||
      body.search_person_only === "true" ||
      body.searchPersonOnly === "true";

    /**
     * --------------------------------------------------------
     * ARCHIVOS
     * --------------------------------------------------------
     *
     * IMPORTANTE:
     *
     * Este endpoint NO recibe ni guarda los archivos.
     *
     * Solo recibimos información básica sobre ellos para
     * conservarla en metadata de Stripe.
     *
     * El archivo real se procesará después de confirmar
     * correctamente el pago.
     * --------------------------------------------------------
     */

    let documentCount = 0;

    if (Array.isArray(body.document_files)) {
      documentCount = body.document_files.length;
    } else if (Array.isArray(body.documents)) {
      documentCount = body.documents.length;
    } else if (Array.isArray(body.files)) {
      documentCount = body.files.length;
    }

    if (documentCount > MAX_DOCUMENTS) {
      return res.status(400).json({
        ok: false,
        error:
          `Puedes seleccionar un máximo de ${MAX_DOCUMENTS} documentos.`,
      });
    }

    /**
     * ========================================================
     * VALIDACIONES
     * ========================================================
     */

    if (!clientName) {
      return res.status(400).json({
        ok: false,
        error: "El nombre del cliente es obligatorio.",
      });
    }

    if (!clientSurname) {
      return res.status(400).json({
        ok: false,
        error: "Los apellidos del cliente son obligatorios.",
      });
    }

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "El Gmail es obligatorio.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        ok: false,
        error: "El Gmail introducido no es válido.",
      });
    }

    if (!whatsapp) {
      return res.status(400).json({
        ok: false,
        error: "El WhatsApp es obligatorio.",
      });
    }

    if (!country) {
      return res.status(400).json({
        ok: false,
        error: "El país es obligatorio.",
      });
    }

    /**
     * El nombre de la persona/empleador es obligatorio
     * tanto para una búsqueda como para una verificación.
     */

    if (!employerName) {
      return res.status(400).json({
        ok: false,
        error:
          "El nombre y apellidos de la persona o empleador son obligatorios.",
      });
    }

    /**
     * Si NO es búsqueda solamente de persona,
     * exigimos tipo de documento.
     */

    if (!searchPersonOnly && !documentType) {
      return res.status(400).json({
        ok: false,
        error:
          "Selecciona el tipo de documento que quieres verificar.",
      });
    }

    /**
     * Si el cliente ha seleccionado documento,
     * debe haber al menos un archivo.
     *
     * IMPORTANTE:
     * No recibimos el PDF aquí.
     * Solo comprobamos que el frontend indique que existe.
     */

    if (!searchPersonOnly && documentCount === 0) {
      return res.status(400).json({
        ok: false,
        error:
          "Debes seleccionar al menos un documento para realizar la verificación.",
      });
    }

    /**
     * ========================================================
     * URL DE LA WEB
     * ========================================================
     */

    const baseUrl =
      process.env.NEXT_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://gestoriacitaia.com";

    const normalizedBaseUrl =
      baseUrl.replace(/\/+$/, "");

    /**
     * ========================================================
     * METADATA DE STRIPE
     * ========================================================
     *
     * Stripe limita el tamaño de metadata.
     * Por eso guardamos solamente datos pequeños.
     *
     * El documento NO se mete en metadata.
     * ========================================================
     */

    const metadata: Record<string, string> = {
      product: FLUSSI_PRODUCT,

      service: "verificacion_decreto_flussi",

      client_name: clientName.slice(0, 100),

      client_surname:
        clientSurname.slice(0, 150),

      email: email.slice(0, 300),

      whatsapp:
        whatsapp.slice(0, 40),

      country:
        country.slice(0, 100),

      employer_name:
        employerName.slice(0, 200),

      employer_city:
        employerCity.slice(0, 120),

      employer_birth_date:
        employerBirthDate.slice(0, 30),

      search_person_only:
        searchPersonOnly ? "true" : "false",

      document_type:
        documentType.slice(0, 100),

      document_count:
        String(documentCount),
    };

    /**
     * ========================================================
     * CREAR CHECKOUT STRIPE
     * ========================================================
     */

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        payment_method_types: [
          "card",
        ],

        /**
         * Email del cliente mostrado por Stripe.
         */

        customer_email: email,

        /**
         * Identificador interno.
         */

        client_reference_id:
          `FLUSSI-${Date.now()}`,

        /**
         * Producto.
         */

        line_items: [
          {
            price_data: {
              currency:
                FLUSSI_CURRENCY,

              product_data: {
                name:
                  "Verificación de Contrato y Decreto Flussi",

                description:
                  "Análisis documental, comprobación de datos empresariales y generación de informe de verificación.",
              },

              unit_amount:
                FLUSSI_PRICE_CENTS,
            },

            quantity: 1,
          },
        ],

        /**
         * URLs.
         */

        success_url:
          `${normalizedBaseUrl}/verificar-decreto-flussi?payment=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${normalizedBaseUrl}/verificar-decreto-flussi?payment=cancelled`,

        /**
         * Metadata.
         */

        metadata,

        /**
         * Datos adicionales de metadata también en PaymentIntent.
         * Esto nos permite recuperar la información desde el
         * webhook aunque posteriormente trabajemos con el
         * PaymentIntent.
         */

        payment_intent_data: {
          metadata,
        },

        /**
         * Stripe Checkout.
         */

        billing_address_collection:
          "auto",

        allow_promotion_codes:
          false,

        submit_type:
          "pay",
      });

    /**
     * ========================================================
     * RESPUESTA
     * ========================================================
     */

    console.log(
      "✅ FLUSSI STRIPE CHECKOUT CREATED:",
      {
        sessionId: session.id,
        email,
        employerName,
        documentType,
        searchPersonOnly,
      }
    );

    return res.status(200).json({
      ok: true,

      session_id:
        session.id,

      checkout_url:
        session.url,

      amount:
        FLUSSI_PRICE_CENTS,

      currency:
        FLUSSI_CURRENCY,

      product:
        FLUSSI_PRODUCT,

      paid:
        false,

      message:
        "Checkout de Stripe creado correctamente. El pago todavía no está confirmado.",
    });
  } catch (error: any) {
    console.error(
      "❌ CREATE FLUSSI CHECKOUT ERROR:",
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
