import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * GESTORIACITAIA
 * STRIPE WEBHOOK — VERIFICACIÓN DECRETO FLUSSI
 * ============================================================
 *
 * ARCHIVO:
 *   api/stripe-webhook-flussi.ts
 *
 * FLUJO NUEVO:
 *
 * DOCUMENTOS
 *    ↓
 * /api/create-checkout-flussi
 *    ↓
 * /api/upload-flussi-documents
 *    ↓
 * STORAGE TEMPORAL
 *    ↓
 * STRIPE CHECKOUT
 *    ↓
 * checkout.session.completed
 *    ↓
 * ESTE WEBHOOK
 *    ↓
 * COMPROBAR PAGO
 *    ↓
 * BUSCAR DOCUMENTOS POR REFERENCIA
 *    ↓
 * FLUSSI_REPORT_URL
 *    ↓
 * ANÁLISIS DOCUMENTAL
 *    ↓
 * PDF + EMAIL
 *
 * IMPORTANTE:
 * - Stripe NO guarda los documentos.
 * - Los documentos están en Supabase Storage.
 * - La referencia FLUSSI-... conecta el pago con los archivos.
 * - No existe búsqueda por nombre/persona.
 * - El cliente no necesita indicar el tipo de documento.
 * - Este webhook NO envía el email final; lo hace el generador del informe.
 * ============================================================
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

// ============================================================
// STRIPE
// ============================================================

const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "";

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

// ============================================================
// SUPABASE ADMIN
// ============================================================

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

// ============================================================
// CONFIGURACIÓN FLUSSI
// ============================================================

const DOCUMENT_BUCKET =
  "documentos-flussi-privado";

const TEMP_FOLDER =
  "flussi-temp";

const MAX_DOCUMENTS = 5;

const EXPECTED_CURRENCY = "eur";

// En pruebas: 0,50 € = 50 céntimos.
// Cuando cambies el precio en create-checkout-flussi.ts,
// cambia también FLUSSI_EXPECTED_AMOUNT_CENTS en Vercel.
const EXPECTED_AMOUNT_CENTS = Number(
  process.env.FLUSSI_EXPECTED_AMOUNT_CENTS || "50"
);

// ============================================================
// RAW BODY
// ============================================================

async function readRawBody(
  req: VercelRequest
): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk)
      );
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

// ============================================================
// HELPERS
// ============================================================

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanEmail(value: unknown): string {
  return clean(value).toLowerCase();
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isValidFlussiReference(
  value: string
): boolean {
  return /^FLUSSI-[A-Za-z0-9_-]+$/.test(value);
}

function getSignature(
  req: VercelRequest
): string | null {
  const value = req.headers["stripe-signature"];

  if (!value || Array.isArray(value)) {
    return null;
  }

  return value;
}

// ============================================================
// RECUPERAR DOCUMENTOS DE SUPABASE
// ============================================================

async function getTemporaryDocuments(
  reference: string
) {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase Admin no está configurado. Falta SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const folder = `${TEMP_FOLDER}/${reference}`;

  console.log("📁 Buscando documentos:", {
    bucket: DOCUMENT_BUCKET,
    folder,
  });

  const { data, error } =
    await supabaseAdmin.storage
      .from(DOCUMENT_BUCKET)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

  if (error) {
    throw new Error(
      `Error listando documentos temporales: ${error.message}`
    );
  }

  const files = (data || [])
    .filter((item) => {
      // Supabase puede devolver entradas de carpeta.
      // En nuestro flujo solamente aceptamos objetos con nombre.
      return Boolean(item.name);
    })
    .map((item) => {
      const path = `${folder}/${item.name}`;

      return {
        name: item.name,
        path,
        id: item.id || null,
        size: item.metadata?.size
          ? Number(item.metadata.size)
          : null,
        mimetype:
          item.metadata?.mimetype ||
          item.metadata?.contentType ||
          null,
        created_at: item.created_at || null,
        updated_at: item.updated_at || null,
      };
    });

  return {
    bucket: DOCUMENT_BUCKET,
    folder,
    files,
  };
}

// ============================================================
// TRIGGER DEL INFORME
// ============================================================

async function triggerFlussiReport(params: {
  email: string;
  name: string;
  country: string;
  whatsapp: string;
  reference: string;
  session: Stripe.Checkout.Session;
  metadata: Stripe.Metadata;
  documents: {
    bucket: string;
    folder: string;
    files: Array<{
      name: string;
      path: string;
      id: string | null;
      size: number | null;
      mimetype: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>;
  };
}) {
  const reportUrl = clean(
    process.env.FLUSSI_REPORT_URL
  );

  if (!reportUrl) {
    throw new Error(
      "FLUSSI_REPORT_URL no está configurada en Vercel."
    );
  }

  const metadata = params.metadata;

  const documentType =
    clean(metadata.document_type) ||
    "Documento identificado automáticamente por IA";

  const payload = {
    source: "stripe-webhook-flussi",

    service: "verificacion_decreto_flussi",

    reference: params.reference,

    document_only: true,

    searchPersonOnly: false,

    payment: {
      paid: true,
      sessionId: params.session.id,
      paymentStatus: params.session.payment_status,
      amountTotal: params.session.amount_total,
      currency: params.session.currency,
      paymentConfirmedAt: new Date().toISOString(),
    },

    client: {
      name: params.name,
      email: params.email,
      country: params.country,
      whatsapp: params.whatsapp,
    },

    documents: {
      reference: params.reference,
      type: documentType,
      count: params.documents.files.length,
      declaredCount: safeNumber(
        metadata.document_count
      ),
      status: "paid_ready_for_analysis",
      storageBucket: params.documents.bucket,
      temporaryFolder: params.documents.folder,
      finalFolder: `flussi/${params.reference}`,
      files: params.documents.files,
    },

    employer: {
      name: clean(metadata.employer_name),
      city: clean(metadata.employer_city),
      birthDate: clean(
        metadata.employer_birth_date
      ),
    },

    flussiMetadata: {
      product: clean(metadata.product),
      service: clean(metadata.service),
      reference:
        clean(metadata.reference) ||
        params.reference,
      client_name: clean(metadata.client_name),
      client_surname: clean(
        metadata.client_surname
      ),
      email:
        clean(metadata.email) || params.email,
      whatsapp: clean(metadata.whatsapp),
      country: clean(metadata.country),
      employer_name: clean(
        metadata.employer_name
      ),
      employer_city: clean(
        metadata.employer_city
      ),
      employer_birth_date: clean(
        metadata.employer_birth_date
      ),
      document_type: documentType,
      document_count: String(
        params.documents.files.length
      ),
      document_reference: params.reference,
    },

    analysisRequest: {
      mode: "document_only",
      identifyDocumentAutomatically: true,
      analyzeDocuments: true,
      compareDocuments: true,
      extractVisibleInformation: true,
      detectInconsistencies: true,
      detectSuspiciousElements: true,
      detectPossibleFraudIndicators: true,
      neverClaimOfficialAuthenticity: true,
      requireOfficialVerificationWhenNecessary: true,
      generateProfessionalReport: true,
      generatePdf: true,
      sendEmail: true,
    },
  };

  console.log("📤 Enviando solicitud a FLUSSI_REPORT_URL:", {
    reference: params.reference,
    documentCount: params.documents.files.length,
    reportUrl,
  });

  const response = await fetch(reportUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.FLUSSI_REPORT_SECRET
        ? {
            "x-flussi-report-secret":
              process.env.FLUSSI_REPORT_SECRET,
          }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `FLUSSI_REPORT_URL respondió ${response.status}: ${responseText.slice(
        0,
        1500
      )}`
    );
  }

  console.log(
    "✅ FLUSSI REPORT TRIGGERED:",
    responseText.slice(0, 1500)
  );

  return {
    triggered: true,
    response: responseText,
  };
}

// ============================================================
// WEBHOOK PRINCIPAL
// ============================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  if (!stripe) {
    return res.status(500).json({
      ok: false,
      error:
        "STRIPE_SECRET_KEY no está configurada en Vercel.",
    });
  }

  const webhookSecret = clean(
    process.env.FLUSSI_STRIPE_WEBHOOK_SECRET
  );

  if (!webhookSecret) {
    return res.status(500).json({
      ok: false,
      error:
        "FLUSSI_STRIPE_WEBHOOK_SECRET no está configurada en Vercel.",
    });
  }

  try {
    // ========================================================
    // 1. LEER BODY RAW
    // ========================================================

    const rawBody = await readRawBody(req);

    // ========================================================
    // 2. VALIDAR FIRMA STRIPE
    // ========================================================

    const signature = getSignature(req);

    if (!signature) {
      return res.status(400).json({
        ok: false,
        error: "Missing Stripe signature.",
      });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (error: any) {
      console.error(
        "❌ FIRMA STRIPE INVÁLIDA:",
        error?.message || error
      );

      return res.status(400).json({
        ok: false,
        error: `Webhook Error: ${
          error?.message || "Invalid signature"
        }`,
      });
    }

    console.log("📥 FLUSSI WEBHOOK:", {
      type: event.type,
      eventId: event.id,
    });

    // ========================================================
    // 3. SOLO CHECKOUT COMPLETED
    // ========================================================

    if (
      event.type !== "checkout.session.completed"
    ) {
      return res.status(200).json({
        ok: true,
        received: true,
        ignored: true,
        event: event.type,
      });
    }

    const session =
      event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata || {};

    // ========================================================
    // 4. SOLO DECRETO FLUSSI
    // ========================================================

    if (
      metadata.service !==
      "verificacion_decreto_flussi"
    ) {
      console.log(
        "↩️ IGNORADO: no es verificacion_decreto_flussi",
        metadata.service
      );

      return res.status(200).json({
        ok: true,
        received: true,
        ignored: true,
        reason: "NOT_FLUSSI",
        service: metadata.service || null,
      });
    }

    if (
      clean(metadata.product) &&
      clean(metadata.product) !== "decreto_flussi"
    ) {
      return res.status(200).json({
        ok: true,
        received: true,
        ignored: true,
        reason: "NOT_FLUSSI_PRODUCT",
        product: clean(metadata.product),
      });
    }

    // ========================================================
    // 5. PAGO CONFIRMADO
    // ========================================================

    if (session.payment_status !== "paid") {
      console.warn(
        "⚠️ FLUSSI: payment_status no es paid:",
        session.payment_status
      );

      return res.status(200).json({
        ok: true,
        received: true,
        ignored: true,
        reason: "PAYMENT_NOT_CONFIRMED",
        payment_status: session.payment_status,
      });
    }

    // ========================================================
    // 6. IMPORTE
    // ========================================================

    if (
      typeof session.amount_total === "number" &&
      session.amount_total !== EXPECTED_AMOUNT_CENTS
    ) {
      console.error("❌ IMPORTE FLUSSI INESPERADO:", {
        recibido: session.amount_total,
        esperado: EXPECTED_AMOUNT_CENTS,
      });

      return res.status(400).json({
        ok: false,
        error:
          "Importe de pago Flussi inesperado.",
        amount_total: session.amount_total,
        expected_amount: EXPECTED_AMOUNT_CENTS,
      });
    }

    // ========================================================
    // 7. MONEDA
    // ========================================================

    if (
      session.currency &&
      session.currency.toLowerCase() !==
        EXPECTED_CURRENCY
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Moneda de pago Flussi inesperada.",
        currency: session.currency,
      });
    }

    // ========================================================
    // 8. DATOS CLIENTE
    // ========================================================

    const email =
      cleanEmail(metadata.email) ||
      cleanEmail(
        session.customer_details?.email
      ) ||
      cleanEmail(session.customer_email);

    if (!email) {
      console.error(
        "❌ FLUSSI: pago sin email:",
        session.id
      );

      return res.status(400).json({
        ok: false,
        error:
          "Pago recibido pero no se encontró el email del cliente.",
      });
    }

    const metadataName = clean(
      metadata.client_name
    );

    const metadataSurname = clean(
      metadata.client_surname
    );

    const name =
      `${metadataName} ${metadataSurname}`.trim() ||
      clean(session.customer_details?.name);

    const country = clean(metadata.country);
    const whatsapp = clean(metadata.whatsapp);

    // ========================================================
    // 9. REFERENCIA
    // ========================================================

    const reference =
      clean(metadata.document_reference) ||
      clean(metadata.reference) ||
      clean(session.client_reference_id);

    if (!reference) {
      console.error(
        "❌ FLUSSI: pago sin referencia documental",
        session.id
      );

      return res.status(400).json({
        ok: false,
        error:
          "El pago se recibió pero no existe referencia documental.",
      });
    }

    if (!isValidFlussiReference(reference)) {
      console.error(
        "❌ FLUSSI: referencia inválida:",
        reference
      );

      return res.status(400).json({
        ok: false,
        error: "Referencia Flussi inválida.",
        reference,
      });
    }

    // ========================================================
    // 10. DOCUMENTOS DECLARADOS
    // ========================================================

    const declaredDocumentCount = safeNumber(
      metadata.document_count
    );

    if (
      declaredDocumentCount > MAX_DOCUMENTS
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Se ha superado el máximo de 5 documentos.",
        reference,
        document_count:
          declaredDocumentCount,
      });
    }

    // ========================================================
    // 11. BUSCAR DOCUMENTOS REALES EN STORAGE
    // ========================================================

    const documents =
      await getTemporaryDocuments(reference);

    const actualDocumentCount =
      documents.files.length;

    if (actualDocumentCount < 1) {
      console.error(
        "❌ FLUSSI: pago recibido pero no hay documentos en Storage:",
        {
          reference,
          folder: documents.folder,
          declaredDocumentCount,
        }
      );

      // 500 es intencionado: Stripe podrá reintentar.
      // El frontend ya subió los archivos antes de abrir Stripe.
      return res.status(500).json({
        ok: false,
        error:
          "Pago recibido pero los documentos todavía no están disponibles en Storage.",
        payment_received: true,
        reference,
        storage_bucket: documents.bucket,
        storage_folder: documents.folder,
        document_count: 0,
      });
    }

    if (
      actualDocumentCount > MAX_DOCUMENTS
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Storage contiene más de 5 documentos para esta referencia.",
        reference,
        document_count: actualDocumentCount,
      });
    }

    if (
      declaredDocumentCount > 0 &&
      declaredDocumentCount !== actualDocumentCount
    ) {
      console.warn(
        "⚠️ FLUSSI: número declarado y real de documentos diferente:",
        {
          reference,
          declared: declaredDocumentCount,
          actual: actualDocumentCount,
        }
      );
    }

    // ========================================================
    // 12. LOG
    // ========================================================

    console.log("================================================");
    console.log("🇮🇹 DECRETO FLUSSI — PAGO CONFIRMADO");
    console.log("Session:", session.id);
    console.log("Event:", event.id);
    console.log("Email:", email);
    console.log("Nombre:", name);
    console.log("Referencia:", reference);
    console.log("Documentos reales:", actualDocumentCount);
    console.log("Storage:", documents.bucket);
    console.log("Folder:", documents.folder);
    console.log("Amount:", session.amount_total);
    console.log("Currency:", session.currency);
    console.log("Payment:", session.payment_status);
    console.log("📄 MODO: DOCUMENT ONLY");
    console.log("🔎 BÚSQUEDA POR NOMBRE: DESACTIVADA");
    console.log("================================================");

    // ========================================================
    // 13. GENERAR INFORME
    // ========================================================

    let reportResult: unknown;

    try {
      reportResult =
        await triggerFlussiReport({
          email,
          name,
          country,
          whatsapp,
          reference,
          session,
          metadata,
          documents,
        });
    } catch (reportError: any) {
      console.error(
        "❌ ERROR GENERANDO INFORME FLUSSI:",
        reportError?.message || reportError
      );

      // 500 para que Stripe pueda reintentar el webhook.
      return res.status(500).json({
        ok: false,
        error:
          reportError?.message ||
          "Error generando informe Flussi.",
        payment_received: true,
        reference,
        document_count: actualDocumentCount,
      });
    }

    // ========================================================
    // 14. RESPUESTA FINAL
    // ========================================================

    return res.status(200).json({
      ok: true,
      received: true,
      processed: true,
      product: "decreto_flussi",
      service: "verificacion_decreto_flussi",
      event_id: event.id,
      session_id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      reference,
      email,
      document_count: actualDocumentCount,
      document_mode: "document_only",
      storage_bucket: documents.bucket,
      storage_folder: documents.folder,
      document_paths: documents.files.map(
        (file) => file.path
      ),
      report: reportResult,
    });
  } catch (error: any) {
    console.error(
      "❌ FLUSSI WEBHOOK ERROR:",
      error?.message || error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Internal webhook error",
    });
  }
}
