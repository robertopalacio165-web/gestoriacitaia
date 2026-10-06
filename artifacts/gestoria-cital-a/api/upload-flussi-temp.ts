// ============================================================
// GESTORIACITAIA
// API: upload-flussi-documents.ts
//
// OBJETIVO:
// - Recibir la referencia FLUSSI creada por Stripe Checkout
// - Validar los documentos seleccionados
// - Crear URLs firmadas de subida en Supabase Storage
// - NO exponer nunca la Service Role Key al navegador
//
// FLUJO:
// 1. Frontend selecciona documentos
// 2. create-checkout-flussi crea FLUSSI-XXXX
// 3. Frontend llama a este endpoint
// 4. Este endpoint genera URLs firmadas
// 5. Frontend sube los archivos directamente a Supabase
// 6. Stripe recibe el pago
// 7. Webhook recupera los documentos mediante reference
// 8. IA analiza los documentos
// 9. Se genera PDF + email
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const BUCKET = "documentos-flussi-privado";
const TEMP_FOLDER = "flussi-temp";

const MAX_DOCUMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// ============================================================
// SUPABASE SERVER CLIENT
//
// MUY IMPORTANTE:
// La SERVICE ROLE KEY solamente existe en el servidor.
// Nunca se envía al frontend.
// ============================================================

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!supabaseUrl) {
  console.error(
    "❌ FLUSSI UPLOAD: Falta SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!supabaseServiceRoleKey) {
  console.error(
    "❌ FLUSSI UPLOAD: Falta SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

// ============================================================
// TIPOS
// ============================================================

type DocumentInput = {
  id?: string;
  name?: string;
  type?: string;
  size?: number;
};

type UploadResponseFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  token: string;
};

// ============================================================
// HELPERS
// ============================================================

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

function safeFileName(
  name: string
): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const extensionIndex = cleaned.lastIndexOf(".");

  let base =
    extensionIndex > 0
      ? cleaned.slice(0, extensionIndex)
      : cleaned;

  let extension =
    extensionIndex > 0
      ? cleaned.slice(extensionIndex + 1)
      : "";

  base = base
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

  extension = extension
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toLowerCase();

  if (!base) {
    base = "documento";
  }

  return extension
    ? `${base}.${extension}`
    : base;
}

function safeDocumentId(
  value: unknown
): string {
  const id = cleanString(value, 100);

  if (!id) {
    return (
      `${Date.now()}-` +
      Math.random()
        .toString(36)
        .slice(2, 12)
    );
  }

  return id
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 80);
}

function isValidReference(
  reference: string
): boolean {
  return /^FLUSSI-[A-Za-z0-9_-]{8,120}$/.test(
    reference
  );
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ==========================================================
  // SOLO POST
  // ==========================================================

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  // ==========================================================
  // COMPROBAR SUPABASE
  // ==========================================================

  if (!supabaseAdmin) {
    console.error(
      "❌ FLUSSI UPLOAD: Supabase Admin no está configurado."
    );

    return res.status(500).json({
      ok: false,
      error:
        "El servidor no está configurado correctamente para recibir documentos.",
    });
  }

  try {
    // ========================================================
    // BODY
    // ========================================================

    const body =
      typeof req.body === "object" && req.body
        ? req.body
        : {};

    const reference = cleanString(
      body.reference ??
        body.document_reference ??
        body.documentReference,
      150
    );

    // ========================================================
    // REFERENCIA OBLIGATORIA
    // ========================================================

    if (!reference) {
      return res.status(400).json({
        ok: false,
        error:
          "Falta la referencia del proceso.",
      });
    }

    // ========================================================
    // VALIDAR REFERENCIA
    //
    // Esto evita que alguien intente crear rutas arbitrarias
    // dentro de Supabase Storage.
    // ========================================================

    if (!isValidReference(reference)) {
      return res.status(400).json({
        ok: false,
        error:
          "La referencia del proceso no es válida.",
      });
    }

    // ========================================================
    // DOCUMENTOS
    // ========================================================

    const documentsRaw =
      body.documents ??
      body.document_files ??
      body.files ??
      body.documentos;

    if (!Array.isArray(documentsRaw)) {
      return res.status(400).json({
        ok: false,
        error:
          "No se recibió la lista de documentos.",
      });
    }

    // ========================================================
    // MÁXIMO 5 DOCUMENTOS
    // ========================================================

    if (
      documentsRaw.length === 0
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Debes seleccionar al menos un documento.",
      });
    }

    if (
      documentsRaw.length >
      MAX_DOCUMENTS
    ) {
      return res.status(400).json({
        ok: false,
        error:
          `Puedes subir un máximo de ${MAX_DOCUMENTS} documentos.`,
      });
    }

    // ========================================================
    // CREAR URLs FIRMADAS
    // ========================================================

    const uploadedFiles: UploadResponseFile[] =
      [];

    for (
      let index = 0;
      index < documentsRaw.length;
      index++
    ) {
      const document =
        documentsRaw[index] as DocumentInput;

      const id =
        safeDocumentId(
          document?.id
        );

      const name =
        cleanString(
          document?.name,
          255
        );

      const type =
        cleanString(
          document?.type,
          100
        ).toLowerCase();

      const size =
        Number(
          document?.size
        );

      // ======================================================
      // NOMBRE
      // ======================================================

      if (!name) {
        return res.status(400).json({
          ok: false,
          error:
            `El documento número ${
              index + 1
            } no tiene nombre.`,
        });
      }

      // ======================================================
      // TIPO
      // ======================================================

      if (
        !ALLOWED_TYPES.has(type)
      ) {
        return res.status(400).json({
          ok: false,
          error:
            `El archivo "${name}" no tiene un formato permitido. Solo PDF, JPG, PNG o WEBP.`,
        });
      }

      // ======================================================
      // TAMAÑO
      // ======================================================

      if (
        !Number.isFinite(size) ||
        size <= 0
      ) {
        return res.status(400).json({
          ok: false,
          error:
            `No se pudo comprobar el tamaño de "${name}".`,
        });
      }

      if (
        size > MAX_FILE_SIZE
      ) {
        return res.status(400).json({
          ok: false,
          error:
            `El archivo "${name}" supera el límite de 10 MB.`,
        });
      }

      // ======================================================
      // NOMBRE SEGURO
      // ======================================================

      const cleanName =
        safeFileName(name);

      // ======================================================
      // NOMBRE ÚNICO
      //
      // No usamos directamente el nombre original porque
      // podría existir otro documento con el mismo nombre.
      // ======================================================

      const randomPart =
        Math.random()
          .toString(36)
          .slice(2, 12);

      const timestamp =
        Date.now();

      const storagePath =
        `${TEMP_FOLDER}/${reference}/${timestamp}-${randomPart}-${id}-${cleanName}`;

      // ======================================================
      // CREAR SIGNED UPLOAD URL
      // ======================================================

      const {
        data,
        error,
      } =
        await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUploadUrl(
            storagePath
          );

      if (error) {
        console.error(
          "❌ FLUSSI UPLOAD: Error creando URL firmada:",
          {
            reference,
            name,
            error:
              error.message,
          }
        );

        return res.status(500).json({
          ok: false,
          error:
            `No se pudo preparar la subida de "${name}".`,
        });
      }

      if (
        !data?.token
      ) {
        console.error(
          "❌ FLUSSI UPLOAD: Supabase no devolvió token.",
          {
            reference,
            name,
            storagePath,
          }
        );

        return res.status(500).json({
          ok: false,
          error:
            `No se pudo generar la autorización para "${name}".`,
        });
      }

      uploadedFiles.push({
        id,
        name,
        type,
        size,
        path: storagePath,
        token: data.token,
      });
    }

    // ========================================================
    // RESPUESTA
    // ========================================================

    console.log(
      "✅ FLUSSI UPLOAD: URLs firmadas creadas",
      {
        reference,
        bucket: BUCKET,
        folder:
          `${TEMP_FOLDER}/${reference}`,
        documentCount:
          uploadedFiles.length,
        documents:
          uploadedFiles.map(
            (file) => ({
              id: file.id,
              name: file.name,
              type: file.type,
              size: file.size,
              path: file.path,
            })
          ),
      }
    );

    // ========================================================
    // IMPORTANTE:
    // No devolvemos signedUrl pública.
    //
    // El frontend utilizará:
    //
    // supabase.storage
    //   .from(BUCKET)
    //   .uploadToSignedUrl(
    //      path,
    //      token,
    //      file
    //   )
    //
    // El token solamente sirve para esa subida.
    // ========================================================

    return res.status(200).json({
      ok: true,

      reference,

      bucket: BUCKET,

      folder:
        `${TEMP_FOLDER}/${reference}`,

      document_only: true,

      document_count:
        uploadedFiles.length,

      files:
        uploadedFiles,
    });
  } catch (error: any) {
    console.error(
      "❌ FLUSSI UPLOAD: Error inesperado:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Error interno preparando la subida de documentos.",
    });
  }
}
