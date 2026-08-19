import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * DECRETO FLUSSI - CREATE STRIPE CHECKOUT
 * ============================================================
 *
 * FLUJO:
 *
 * FORMULARIO
 *    ↓
 * ARCHIVOS TEMPORALES (si existen)
 *    ↓
 * STRIPE CHECKOUT
 *    ↓
 * PAGO CONFIRMADO
 *    ↓
 * WEBHOOK
 *    ↓
 * SUPABASE
 *
 * IMPORTANTE:
 * Este endpoint NO guarda datos en Supabase.
 * La confirmación real del pago se hará mediante Stripe Webhook.
 * ============================================================
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

/**
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

/**
 * PRUEBA:
 * 1 = 0,01 €
 *
 * Cuando termines las pruebas:
 * 2199 = 21,99 €
 */
const FLUSSI_PRICE_CENTS = 1;

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
 * Convierte diferentes valores enviados por el frontend
 * a boolean de forma segura.
 */
function toBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
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
   * STRIPE
   * ----------------------------------------------------------
   */

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

  try {
    /**
     * ========================================================
     * BODY
     * ========================================================
     */

    const body = req.body || {};

    /**
     * ========================================================
     * DATOS DEL CLIENTE
     * ========================================================
     */

    const clientName = cleanString(
      body.client_name ??
        body.clientName ??
        body.nombre ??
        body.fullName,
      100
    );

    const clientSurname = cleanString(
      body.client_surname ??
        body.clientSurname ??
        body.apellidos ??
        body.surname,
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
     * ========================================================
     * PERSONA / EMPLEADOR
     * ========================================================
     *
     * Aceptamos tanto los nombres nuevos como los que utiliza
     * actualmente tu formulario.
     */

    const employerName = cleanString(
      body.employer_name ??
        body.employerName ??
        body.empleadorNombre ??
        body.nombre_empleador ??
        body.person_name ??
        body.nombrePersona,
      200
    );

    const employerCity = cleanString(
      body.employer_city ??
        body.employerCity ??
        body.empleadorCiudad ??
        body.ciudad_italia ??
        body.city,
      120
    );

    const employerBirthDate = cleanString(
      body.employer_birth_date ??
        body.employerBirthDate ??
        body.empleadorFechaNacimiento ??
        body.fecha_nacimiento_empleador,
      30
    );

    /**
     * ========================================================
     * TIPO DE DOCUMENTO
     * ========================================================
     */

    const documentType = cleanDocumentType(
      body.document_type ??
        body.documentType ??
        body.tipo_documento ??
        body.tipoDocumento
    );

    /**
     * ========================================================
     * BÚSQUEDA SOLO POR PERSONA
     * ========================================================
     *
     * Si es true:
     *
     * - NO necesita contrato
     * - NO necesita Nulla Osta
     * - NO necesita PDF
     *
     * Solo necesitamos los datos de la persona/empleador.
     */

    const searchPersonOnly = toBoolean(
      body.search_person_only ??
        body.searchPersonOnly ??
        body.buscarSoloPersona ??
        body.buscar_solo_persona
    );

    /**
     * ========================================================
     * DOCUMENTOS
     * ========================================================
     *
     * Aquí NO subimos los archivos a Supabase.
     *
     * Solamente comprobamos cuántos archivos seleccionó
     * el usuario.
     *
     * Los archivos reales deben estar en el bucket temporal
     * y pasarán al proceso definitivo después del pago.
     */

    let documentCount = 0;

    if (Array.isArray(body.document_files)) {
      documentCount = body.document_files.length;
    } else if (Array.isArray(body.documents)) {
      documentCount = body.documents.length;
    } else if (Array.isArray(body.documentos)) {
      documentCount = body.documentos.length;
    } else if (Array.isArray(body.files)) {
      documentCount = body.files.length;
    } else if (Array.isArray(body.uploadedFiles)) {
      documentCount = body.uploadedFiles.length;
    }

    /**
     * Máximo 5 documentos.
     */

    if (documentCount > MAX_DOCUMENTS) {
      return res.status(400).json({
        ok: false,
        error:
          `Puedes seleccionar un máximo de ${MAX_DOCUMENTS} documentos.`,
      });
    }

    /**
     * ========================================================
     * VALIDACIONES CLIENTE
     * ========================================================
     */

    if (!clientName) {
      return res.status(400).json({
        ok: false,
        error:
          "El nombre del cliente es obligatorio.",
      });
    }

    if (!clientSurname) {
      return res.status(400).json({
        ok: false,
        error:
          "Los apellidos del cliente son obligatorios.",
      });
    }

    if (!email) {
      return res.status(400).json({
        ok: false,
        error:
          "El Gmail es obligatorio.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        ok: false,
        error:
          "El Gmail introducido no es válido.",
      });
    }

    if (!whatsapp) {
      return res.status(400).json({
        ok: false,
        error:
          "El WhatsApp es obligatorio.",
      });
    }

    if (!country) {
      return res.status(400).json({
        ok: false,
        error:
          "El país es obligatorio.",
      });
    }

    /**
     * ========================================================
     * VALIDACIÓN PERSONA / EMPLEADOR
     * ========================================================
     */

    if (!employerName) {
      return res.status(400).json({
        ok: false,
        error:
          "El nombre y apellidos de la persona o empleador son obligatorios.",
      });
    }

    /**
     * ========================================================
     * VALIDACIÓN DOCUMENTO
     * ========================================================
     *
     * SOLO si NO estamos haciendo búsqueda por persona.
     */

    if (!searchPersonOnly && !documentType) {
      return res.status(400).json({
        ok: false,
        error:
          "Selecciona el tipo de documento que quieres verificar.",
      });
    }

    /**
     * Si hay documento que verificar,
     * debe existir al menos un archivo.
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
     * URL WEB
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
     * REFERENCIA INTERNA
     * ========================================================
     */

    const reference =
      `FLUSSI-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    /**
     * ========================================================
     * METADATA STRIPE
     * ========================================================
     */

    const metadata: Record<string, string> = {
      product:
        FLUSSI_PRODUCT,

      service:
        "verificacion_decreto_flussi",

      reference,

      client_name:
        clientName.slice(0, 100),

      client_surname:
        clientSurname.slice(0, 150),

      email:
        email.slice(0, 300),

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
        searchPersonOnly
          ? "true"
          : "false",

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

        customer_email:
          email,

        client_reference_id:
          reference,

        line_items: [
          {
            price_data: {
              currency:
                FLUSSI_CURRENCY,

              product_data: {
                name:
                  "Verificación de Contrato y Decreto Flussi",

                description:
                  searchPersonOnly
                    ? "Análisis de la persona o empleador relacionado con una posible contratación Decreto Flussi."
                    : "Análisis documental y comprobación de datos relacionados con Decreto Flussi.",
              },

              /**
               * 0,01 € durante las pruebas.
               */
              unit_amount:
                FLUSSI_PRICE_CENTS,
            },

            quantity: 1,
          },
        ],

        /**
         * ====================================================
         * RETURN URLS
         * ====================================================
         */

        success_url:
          `${normalizedBaseUrl}/verificar-decreto-flussi?payment=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${normalizedBaseUrl}/verificar-decreto-flussi?payment=cancelled`,

        /**
         * ====================================================
         * METADATA
         * ====================================================
         */

        metadata,

        payment_intent_data: {
          metadata,
        },

        billing_address_collection:
          "auto",

        allow_promotion_codes:
          false,

        submit_type:
          "pay",
      });

    /**
     * ========================================================
     * LOG
     * ========================================================
     */

    console.log(
      "✅ FLUSSI STRIPE CHECKOUT CREATED",
    );

    console.log({
      sessionId:
        session.id,

      reference,

      email,

      employerName,

      employerCity,

      employerBirthDate,

      documentType,

      documentCount,

      searchPersonOnly,

      amount:
        FLUSSI_PRICE_CENTS,

      currency:
        FLUSSI_CURRENCY,
    });

    /**
     * ========================================================
     * RESPUESTA
     * ========================================================
     */

    return res.status(200).json({
      ok: true,

      session_id:
        session.id,

      checkout_url:
        session.url,

      reference,

      amount:
        FLUSSI_PRICE_CENTS,

      currency:
        FLUSSI_CURRENCY,

      product:
        FLUSSI_PRODUCT,

      paid:
        false,

      searchPersonOnly,

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
