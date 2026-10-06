import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import Stripe from "stripe";
import crypto from "crypto";

/**
 * ============================================================
 * GESTORIACITAIA
 * CREATE STRIPE CHECKOUT — DECRETO FLUSSI
 * ============================================================
 *
 * ARCHIVO:
 *
 * api/create-checkout-flussi.ts
 *
 * ============================================================
 *
 * FLUJO NUEVO
 *
 * DOCUMENTOS
 *     ↓
 * CREATE CHECKOUT
 *     ↓
 * GENERAR REFERENCIA
 *     ↓
 * PREPARAR DOCUMENTOS TEMPORALES
 *     ↓
 * STRIPE
 *     ↓
 * PAGO CONFIRMADO
 *     ↓
 * WEBHOOK
 *     ↓
 * ANÁLISIS DOCUMENTAL
 *     ↓
 * PDF
 *     ↓
 * EMAIL
 *
 * ============================================================
 *
 * IMPORTANTE
 *
 * Este servicio es EXCLUSIVAMENTE DOCUMENTAL.
 *
 * NO existe:
 *
 * ❌ búsqueda solo por nombre
 * ❌ búsqueda solo por persona
 * ❌ búsqueda de empleador sin documento
 *
 * El documento es la base del análisis.
 *
 * ============================================================
 *
 * Durante las pruebas:
 *
 * 0,50 €
 *
 * ============================================================
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
        }
      )
    : null;

/**
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const FLUSSI_PRICE_CENTS =
  Number(
    process.env.FLUSSI_PRICE_CENTS ||
      "50"
  );

const FLUSSI_CURRENCY =
  "eur";

const FLUSSI_PRODUCT =
  "decreto_flussi";

const FLUSSI_SERVICE =
  "verificacion_decreto_flussi";

const MAX_DOCUMENTS =
  5;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

/**
 * ============================================================
 * MODO DE PRUEBA
 * ============================================================
 *
 * Puedes configurar en Vercel:
 *
 * FLUSSI_TEST_EMAIL
 * FLUSSI_TEST_SECRET
 *
 * Si no quieres bypass de Stripe:
 *
 * FLUSSI_TEST_EMAIL vacío.
 *
 * ============================================================
 */

const FLUSSI_TEST_EMAIL =
  (
    process.env.FLUSSI_TEST_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();

const FLUSSI_TEST_SECRET =
  process.env.FLUSSI_TEST_SECRET ||
  "";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function cleanString(
  value: unknown,
  maxLength = 500
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(
      0,
      maxLength
    );
}

function cleanEmail(
  value: unknown
): string {
  return cleanString(
    value,
    320
  ).toLowerCase();
}

function cleanPhone(
  value: unknown
): string {
  return cleanString(
    value,
    50
  );
}

function cleanCountry(
  value: unknown
): string {
  return cleanString(
    value,
    100
  );
}

function isValidEmail(
  email: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

/**
 * ============================================================
 * BOOLEAN
 * ============================================================
 */

function toBoolean(
  value: unknown
): boolean {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
}

/**
 * ============================================================
 * REFERENCIA
 * ============================================================
 *
 * Ejemplo:
 *
 * FLUSSI-1760000000000-A8K2PZ
 *
 * Esta referencia identifica TODOS los documentos de una
 * solicitud.
 * ============================================================
 */

function createReference(): string {
  const timestamp =
    Date.now();

  const random =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  return `FLUSSI-${timestamp}-${random}`;
}

/**
 * ============================================================
 * TOKEN DE PRUEBA
 * ============================================================
 */

function createTestToken(
  email: string,
  reference: string
): string {
  if (!FLUSSI_TEST_SECRET) {
    throw new Error(
      "FLUSSI_TEST_SECRET no está configurado."
    );
  }

  const payload =
    Buffer.from(
      JSON.stringify({
        email,
        reference,
        created_at:
          Date.now(),
      })
    ).toString(
      "base64url"
    );

  const signature =
    crypto
      .createHmac(
        "sha256",
        FLUSSI_TEST_SECRET
      )
      .update(payload)
      .digest("hex");

  return `FLUSSI_TEST_${payload}.${signature}`;
}

/**
 * ============================================================
 * NORMALIZAR DOCUMENTOS
 * ============================================================
 */

type IncomingDocument = {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  size?: unknown;
};

function normalizeDocuments(
  value: unknown
): IncomingDocument[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return null;
        }

        const document =
          item as Record<
            string,
            unknown
          >;

        return {
          id:
            document.id,
          name:
            document.name,
          type:
            document.type,
          size:
            document.size,
        };
      }
    )
    .filter(
      (
        item
      ): item is IncomingDocument =>
        item !== null
    );
}

/**
 * ============================================================
 * VALIDAR DOCUMENTOS
 * ============================================================
 */

function validateDocuments(
  documents: IncomingDocument[]
): string | null {
  if (
    documents.length ===
    0
  ) {
    return (
      "Debes seleccionar al menos un documento para realizar la verificación."
    );
  }

  if (
    documents.length >
    MAX_DOCUMENTS
  ) {
    return (
      `Puedes seleccionar un máximo de ${MAX_DOCUMENTS} documentos.`
    );
  }

  const allowedTypes =
    new Set([
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);

  for (
    const document of documents
  ) {
    const name =
      cleanString(
        document.name,
        255
      );

    const type =
      cleanString(
        document.type,
        100
      ).toLowerCase();

    const size =
      Number(
        document.size || 0
      );

    if (!name) {
      return (
        "Uno de los documentos no tiene nombre."
      );
    }

    if (
      !allowedTypes.has(
        type
      )
    ) {
      return (
        `El archivo "${name}" no tiene un formato permitido. Usa PDF, JPG, PNG o WEBP.`
      );
    }

    if (
      !Number.isFinite(
        size
      ) ||
      size <= 0
    ) {
      return (
        `El archivo "${name}" no tiene un tamaño válido.`
      );
    }

    if (
      size >
      MAX_FILE_SIZE
    ) {
      return (
        `El archivo "${name}" supera el límite de 10 MB.`
      );
    }
  }

  return null;
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
   * ==========================================================
   * SOLO POST
   * ==========================================================
   */

  if (
    req.method !==
    "POST"
  ) {
    return res.status(405).json({
      ok: false,
      error:
        "Método no permitido.",
    });
  }

  try {
    /**
     * ========================================================
     * BODY
     * ========================================================
     */

    const body =
      req.body || {};

    /**
     * ========================================================
     * DATOS CLIENTE
     * ========================================================
     */

    const clientName =
      cleanString(
        body.client_name ??
          body.clientName ??
          body.nombre ??
          body.fullName,
        100
      );

    const clientSurname =
      cleanString(
        body.client_surname ??
          body.clientSurname ??
          body.apellidos ??
          body.surname,
        150
      );

    const email =
      cleanEmail(
        body.email ??
          body.gmail
      );

    const whatsapp =
      cleanPhone(
        body.whatsapp ??
          body.phone ??
          body.telefono
      );

    const country =
      cleanCountry(
        body.country ??
          body.pais
      );

    /**
     * ========================================================
     * DOCUMENTOS
     * ========================================================
     *
     * Aceptamos:
     *
     * document_files
     * documents
     * documentos
     * files
     * uploadedFiles
     *
     * El frontend actual utiliza document_files.
     * ========================================================
     */

    let documents =
      normalizeDocuments(
        body.document_files
      );

    if (
      documents.length ===
      0
    ) {
      documents =
        normalizeDocuments(
          body.documents
        );
    }

    if (
      documents.length ===
      0
    ) {
      documents =
        normalizeDocuments(
          body.documentos
        );
    }

    if (
      documents.length ===
      0
    ) {
      documents =
        normalizeDocuments(
          body.files
        );
    }

    if (
      documents.length ===
      0
    ) {
      documents =
        normalizeDocuments(
          body.uploadedFiles
        );
    }

    /**
     * ========================================================
     * VALIDAR DOCUMENTOS
     * ========================================================
     */

    const documentError =
      validateDocuments(
        documents
      );

    if (
      documentError
    ) {
      return res.status(400).json({
        ok: false,
        error:
          documentError,
      });
    }

    /**
     * ========================================================
     * VALIDAR CLIENTE
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

    if (
      !isValidEmail(
        email
      )
    ) {
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
     * SERVICIO DOCUMENTAL
     * ========================================================
     *
     * Ya NO utilizamos:
     *
     * buscarSoloPersona
     * searchPersonOnly
     *
     * Aunque el frontend antiguo lo mande, aquí se ignora.
     * ========================================================
     */

    const searchPersonOnly =
      false;

    /**
     * ========================================================
     * TIPO DE DOCUMENTO
     * ========================================================
     *
     * IMPORTANTE:
     *
     * El usuario NO necesita saber exactamente qué documento
     * tiene.
     *
     * Puede subir:
     *
     * - contrato
     * - Nulla Osta
     * - carta
     * - documento de Prefettura
     * - comunicación
     * - recibo
     * - documento del empleador
     * - captura
     * - PDF
     * - foto
     *
     * La IA lo identificará.
     * ========================================================
     */

    const documentType =
      cleanString(
        body.document_type ??
          body.documentType ??
          body.tipo_documento ??
          body.tipoDocumento,
        100
      ) ||
      "auto";

    /**
     * ========================================================
     * REFERENCIA
     * ========================================================
     */

    const reference =
      createReference();

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
      baseUrl.replace(
        /\/+$/,
        ""
      );

    /**
     * ========================================================
     * DATOS EMPLEADOR
     * ========================================================
     *
     * Se mantienen por compatibilidad con versiones antiguas.
     *
     * NO son necesarios para iniciar la verificación.
     *
     * La IA deberá extraer los datos desde los documentos.
     * ========================================================
     */

    const employerName =
      cleanString(
        body.employer_name ??
          body.employerName ??
          body.empleadorNombre,
        200
      );

    const employerCity =
      cleanString(
        body.employer_city ??
          body.employerCity ??
          body.empleadorCiudad,
        120
      );

    const employerBirthDate =
      cleanString(
        body.employer_birth_date ??
          body.employerBirthDate ??
          body.empleadorFechaNacimiento,
        30
      );

    /**
     * ========================================================
     * METADATA DE DOCUMENTOS
     * ========================================================
     *
     * MUY IMPORTANTE:
     *
     * Stripe no recibe el contenido de los archivos.
     *
     * Solo recibe:
     *
     * - referencia
     * - nombre
     * - tipo
     * - tamaño
     *
     * El frontend deberá colocar posteriormente los archivos
     * reales en el almacenamiento asociado a esta referencia.
     * ========================================================
     */

    const documentMetadata =
      documents.map(
        (
          document
        ) => ({
          id:
            cleanString(
              document.id,
              200
            ),

          name:
            cleanString(
              document.name,
              255
            ),

          type:
            cleanString(
              document.type,
              100
            ),

          size:
            Number(
              document.size || 0
            ),
        })
      );

    /**
     * ========================================================
     * MODO PRUEBA
     * ========================================================
     *
     * Solo se activa si:
     *
     * FLUSSI_TEST_EMAIL
     *
     * coincide con el email.
     * ========================================================
     */

    const isFlussiTestUser =
      Boolean(
        FLUSSI_TEST_EMAIL &&
          email ===
            FLUSSI_TEST_EMAIL
      );

    /**
     * ========================================================
     * DATOS COMUNES
     * ========================================================
     */

    const metadata: Record<
      string,
      string
    > = {
      product:
        FLUSSI_PRODUCT,

      service:
        FLUSSI_SERVICE,

      reference:
        reference,

      client_name:
        clientName,

      client_surname:
        clientSurname,

      email:
        email,

      whatsapp:
        whatsapp,

      country:
        country,

      document_type:
        documentType,

      document_count:
        String(
          documents.length
        ),

      document_reference:
        reference,

      document_storage_bucket:
        "documentos-flussi-privado",

      document_storage_folder:
        `flussi-temp/${reference}`,

      search_person_only:
        "false",

      employer_name:
        employerName,

      employer_city:
        employerCity,

      employer_birth_date:
        employerBirthDate,
    };

    /**
     * ========================================================
     * DOCUMENTOS JSON
     * ========================================================
     *
     * Stripe metadata tiene límites de tamaño.
     *
     * Por eso NO metemos todo el JSON en Stripe.
     *
     * Solo enviamos los datos básicos.
     * ========================================================
     */

    /**
     * ========================================================
     * MODO PRUEBA
     * ========================================================
     */

    if (
      isFlussiTestUser
    ) {
      console.log(
        "🧪 FLUSSI TEST USER",
        {
          email,
          reference,
          documentCount:
            documents.length,
        }
      );

      const testSessionId =
        createTestToken(
          email,
          reference
        );

      return res.status(200).json({
        ok:
          true,

        test_mode:
          true,

        paid:
          true,

        session_id:
          testSessionId,

        checkout_url:
          null,

        checkoutUrl:
          null,

        url:
          null,

        reference,

        amount:
          FLUSSI_PRICE_CENTS,

        currency:
          FLUSSI_CURRENCY,

        product:
          FLUSSI_PRODUCT,

        service:
          FLUSSI_SERVICE,

        searchPersonOnly:
          false,

        document_only:
          true,

        document_count:
          documents.length,

        document_reference:
          reference,

        document_storage_bucket:
          "documentos-flussi-privado",

        document_storage_folder:
          `flussi-temp/${reference}`,

        documents:
          documentMetadata,

        customer_email:
          email,

        customer_name:
          `${clientName} ${clientSurname}`.trim(),

        metadata,

        message:
          "Modo prueba activado. El análisis documental puede continuar sin cobrar Stripe.",
      });
    }

    /**
     * ========================================================
     * STRIPE DISPONIBLE
     * ========================================================
     */

    if (!stripe) {
      console.error(
        "❌ STRIPE_SECRET_KEY NO CONFIGURADA"
      );

      return res.status(500).json({
        ok:
          false,

        error:
          "Stripe no está configurado correctamente en el servidor.",
      });
    }

    /**
     * ========================================================
     * CREAR CHECKOUT
     * ========================================================
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
                      FLUSSI_CURRENCY,

                    product_data:
                      {
                        name:
                          "Verificación documental Decreto Flussi",

                        description:
                          "Análisis profesional de documentos relacionados con Decreto Flussi, contratación y documentación italiana.",
                      },

                    unit_amount:
                      FLUSSI_PRICE_CENTS,
                  },

                quantity:
                  1,
              },
            ],

          /**
           * ==================================================
           * URL DE ÉXITO
           * ==================================================
           */

          success_url:
            `${normalizedBaseUrl}/verificar-decreto-flussi?payment=success&session_id={CHECKOUT_SESSION_ID}&reference=${encodeURIComponent(
              reference
            )}`,

          /**
           * ==================================================
           * URL CANCELACIÓN
           * ==================================================
           */

          cancel_url:
            `${normalizedBaseUrl}/verificar-decreto-flussi?payment=cancelled&reference=${encodeURIComponent(
              reference
            )}`,

          /**
           * ==================================================
           * METADATA
           * ==================================================
           */

          metadata,

          /**
           * ==================================================
           * PAYMENT INTENT
           * ==================================================
           */

          payment_intent_data:
            {
              metadata,

              receipt_email:
                email,
            },

          billing_address_collection:
            "auto",

          allow_promotion_codes:
            false,

          submit_type:
            "pay",
        }
      );

    /**
     * ========================================================
     * LOG
     * ========================================================
     */

    console.log(
      "================================================"
    );

    console.log(
      "🇮🇹 FLUSSI CHECKOUT CREADO"
    );

    console.log(
      "Session:",
      session.id
    );

    console.log(
      "Reference:",
      reference
    );

    console.log(
      "Email:",
      email
    );

    console.log(
      "Documentos:",
      documents.length
    );

    console.log(
      "Tipo:",
      documentType
    );

    console.log(
      "Modo:",
      "DOCUMENT ONLY"
    );

    console.log(
      "Precio:",
      FLUSSI_PRICE_CENTS
    );

    console.log(
      "Moneda:",
      FLUSSI_CURRENCY
    );

    console.log(
      "================================================"
    );

    /**
     * ========================================================
     * RESPUESTA
     * ========================================================
     */

    return res.status(200).json({
      ok:
        true,

      session_id:
        session.id,

      checkout_url:
        session.url,

      checkoutUrl:
        session.url,

      url:
        session.url,

      reference,

      amount:
        FLUSSI_PRICE_CENTS,

      currency:
        FLUSSI_CURRENCY,

      product:
        FLUSSI_PRODUCT,

      service:
        FLUSSI_SERVICE,

      paid:
        false,

      test_mode:
        false,

      searchPersonOnly:
        false,

      document_only:
        true,

      document_count:
        documents.length,

      document_reference:
        reference,

      document_storage_bucket:
        "documentos-flussi-privado",

      document_storage_folder:
        `flussi-temp/${reference}`,

      documents:
        documentMetadata,

      message:
        "Checkout de Stripe creado correctamente. Guarda la referencia y sube los documentos asociados antes de continuar.",
    });
  } catch (
    error: any
  ) {
    console.error(
      "❌ CREATE FLUSSI CHECKOUT ERROR:",
      error
    );

    return res.status(500).json({
      ok:
        false,

      error:
        error?.message ||
        "No se pudo crear el pago de Stripe.",
    });
  }
}
