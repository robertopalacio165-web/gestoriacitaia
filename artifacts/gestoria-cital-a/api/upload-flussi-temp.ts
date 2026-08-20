import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * GESTORIACITAIA
 * DECRETO FLUSSI
 * UPLOAD TEMPORAL DE DOCUMENTOS
 * ============================================================
 *
 * FLUJO:
 *
 * FORMULARIO
 *    ↓
 * crear sesión Stripe
 *    ↓
 * PDF / FOTO
 *    ↓
 * bucket privado: flussi-temp
 *    ↓
 * cliente paga
 *    ↓
 * confirm-flussi-payment
 *    ↓
 * procesar documento
 *    ↓
 * análisis
 *
 * IMPORTANTE:
 *
 * - Este endpoint NO guarda documentos en una tabla definitiva.
 * - Este endpoint NO marca al cliente como pagado.
 * - El archivo se queda en el bucket temporal.
 * - El pago se comprueba posteriormente con Stripe.
 * ============================================================
 */

/**
 * ============================================================
 * ENV
 * ============================================================
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY;

/**
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const BUCKET =
  "flussi-temp";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_FILES =
  5;

const EXPECTED_PRODUCT =
  "decreto_flussi";

const EXPECTED_CURRENCY =
  "eur";

/**
 * Precio de prueba:
 *
 * 50 céntimos = 0,50 €
 *
 * IMPORTANTE:
 * Debe coincidir con create-checkout-flussi.ts
 */
const EXPECTED_AMOUNT =
  50;

/**
 * ============================================================
 * TIPOS PERMITIDOS
 * ============================================================
 */

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * ============================================================
 * CLIENTES
 * ============================================================
 */

const supabase =
  SUPABASE_URL &&
  SERVICE_ROLE_KEY
    ? createClient(
        SUPABASE_URL,
        SERVICE_ROLE_KEY
      )
    : null;

const stripe =
  STRIPE_SECRET_KEY
    ? new Stripe(
        STRIPE_SECRET_KEY
      )
    : null;

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function clean(
  value: unknown,
  max = 200
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .slice(0, max);
}

/**
 * ============================================================
 * EXTENSIÓN SEGURA
 * ============================================================
 */

function getExtension(
  fileName: string,
  mimeType: string
): string {

  const originalExtension =
    fileName.includes(".")
      ? fileName
          .substring(
            fileName.lastIndexOf(".")
          )
          .toLowerCase()
      : "";

  if (
    originalExtension === ".pdf"
  ) {
    return ".pdf";
  }

  if (
    originalExtension === ".jpg"
  ) {
    return ".jpg";
  }

  if (
    originalExtension === ".jpeg"
  ) {
    return ".jpeg";
  }

  if (
    originalExtension === ".png"
  ) {
    return ".png";
  }

  if (
    originalExtension === ".webp"
  ) {
    return ".webp";
  }

  if (
    mimeType ===
    "application/pdf"
  ) {
    return ".pdf";
  }

  if (
    mimeType ===
    "image/png"
  ) {
    return ".png";
  }

  if (
    mimeType ===
    "image/webp"
  ) {
    return ".webp";
  }

  return ".jpg";
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

  if (
    req.method !== "POST"
  ) {
    return res.status(405).json({
      ok: false,
      error:
        "Method not allowed",
    });
  }

  /**
   * ----------------------------------------------------------
   * SUPABASE
   * ----------------------------------------------------------
   */

  if (!supabase) {

    console.error(
      "❌ Supabase environment variables missing"
    );

    return res.status(500).json({
      ok: false,
      error:
        "Supabase no está configurado correctamente en el servidor.",
    });
  }

  /**
   * ----------------------------------------------------------
   * STRIPE
   * ----------------------------------------------------------
   */

  if (!stripe) {

    console.error(
      "❌ STRIPE_SECRET_KEY missing"
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

    const {
      session_id,
      file_name,
      file_type,
      file_size,
    } = req.body || {};

    /**
     * ========================================================
     * SESSION ID
     * ========================================================
     */

    if (
      typeof session_id !==
        "string" ||
      !session_id.trim()
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "Falta session_id de Stripe.",
      });
    }

    const safeSessionId =
      clean(
        session_id,
        120
      );

    /**
     * ========================================================
     * COMPROBAR SESIÓN REAL DE STRIPE
     * ========================================================
     *
     * IMPORTANTE:
     *
     * NO exigimos payment_status = paid.
     *
     * El archivo debe poder estar temporalmente
     * antes del pago.
     *
     * Pero sí comprobamos que la sesión:
     *
     * - existe
     * - pertenece a Decreto Flussi
     * - tiene el importe esperado
     * - usa EUR
     *
     * El pago real se comprobará después.
     * ========================================================
     */

    const session =
      await stripe.checkout.sessions.retrieve(
        safeSessionId
      );

    const metadata =
      session.metadata || {};

    /**
     * ========================================================
     * COMPROBAR PRODUCTO
     * ========================================================
     */

    if (
      metadata.product !==
      EXPECTED_PRODUCT
    ) {

      console.error(
        "❌ FLUSSI PRODUCT MISMATCH",
        {
          sessionId:
            safeSessionId,

          product:
            metadata.product ||
            null,
        }
      );

      return res.status(403).json({
        ok: false,
        error:
          "La sesión de Stripe no corresponde al servicio Decreto Flussi.",
      });
    }

    /**
     * ========================================================
     * COMPROBAR IMPORTE
     * ========================================================
     */

    const amountTotal =
      session.amount_total ??
      null;

    const currency =
      (
        session.currency ||
        ""
      ).toLowerCase();

    if (
      amountTotal !==
        EXPECTED_AMOUNT ||
      currency !==
        EXPECTED_CURRENCY
    ) {

      console.error(
        "❌ FLUSSI PAYMENT AMOUNT MISMATCH",
        {
          sessionId:
            safeSessionId,

          amountTotal,

          currency,
        }
      );

      return res.status(400).json({
        ok: false,
        error:
          "El importe de la sesión de Stripe no coincide con el precio configurado para la prueba.",
      });
    }

    /**
     * ========================================================
     * FILE NAME
     * ========================================================
     */

    if (
      typeof file_name !==
        "string" ||
      !file_name.trim()
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "Falta el nombre del archivo.",
      });
    }

    /**
     * ========================================================
     * FILE TYPE
     * ========================================================
     */

    if (
      typeof file_type !==
        "string" ||
      !ALLOWED_TYPES.includes(
        file_type
      )
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "Tipo de archivo no permitido. Solo PDF, JPG, PNG o WebP.",
      });
    }

    /**
     * ========================================================
     * FILE SIZE
     * ========================================================
     */

    const numericSize =
      Number(file_size);

    if (
      !Number.isFinite(
        numericSize
      ) ||
      numericSize <= 0
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "Tamaño de archivo no válido.",
      });
    }

    if (
      numericSize >
      MAX_FILE_SIZE
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "El archivo supera el límite máximo de 10 MB.",
      });
    }

    /**
     * ========================================================
     * NOMBRE SEGURO
     * ========================================================
     */

    const originalName =
      clean(
        file_name,
        150
      );

    const extension =
      getExtension(
        originalName,
        file_type
      );

    /**
     * ========================================================
     * ID ÚNICO
     * ========================================================
     */

    const uniqueId =
      `${Date.now()}-${crypto.randomUUID()}`;

    /**
     * ========================================================
     * RUTA TEMPORAL
     * ========================================================
     *
     * Ejemplo:
     *
     * flussi-temp/
     *   cs_test_xxxxx/
     *      123456-uuid.pdf
     *
     * El session_id separa cada solicitud.
     * ========================================================
     */

    const storagePath =
      `${safeSessionId}/${uniqueId}${extension}`;

    /**
     * ========================================================
     * CREAR SIGNED UPLOAD URL
     * ========================================================
     */

    const {
      data,
      error,
    } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(
          storagePath
        );

    if (
      error ||
      !data
    ) {

      console.error(
        "❌ Error creando signed upload URL:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          error?.message ||
          "No se pudo preparar la subida del archivo.",
      });
    }

    /**
     * ========================================================
     * LOG
     * ========================================================
     */

    console.log(
      "✅ FLUSSI TEMP FILE PREPARED",
      {
        session_id:
          safeSessionId,

        path:
          storagePath,

        file_name:
          originalName,

        file_type,

        file_size:
          numericSize,

        payment_status:
          session.payment_status,
      }
    );

    /**
     * ========================================================
     * RESPUESTA
     * ========================================================
     *
     * El frontend utilizará:
     *
     * - bucket
     * - path
     * - token
     * - signed_url
     *
     * para subir directamente el archivo.
     * ========================================================
     */

    return res.status(200).json({

      ok: true,

      bucket:
        BUCKET,

      path:
        storagePath,

      token:
        data.token,

      signed_url:
        data.signedUrl ||
        null,

      file_name:
        originalName,

      file_type,

      file_size:
        numericSize,

      session_id:
        safeSessionId,

      payment_status:
        session.payment_status,

      paid:
        session.payment_status ===
        "paid",

      message:
        "Archivo preparado correctamente para almacenamiento temporal.",
    });

  } catch (
    error: any
  ) {

    console.error(
      "❌ upload-flussi-temp error:",
      error
    );

    /**
     * Stripe session inexistente
     * o no accesible.
     */

    if (
      error?.type ===
      "StripeInvalidRequestError"
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "La sesión de Stripe no es válida o no existe.",
      });
    }

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Error interno del servidor.",
    });
  }
}
