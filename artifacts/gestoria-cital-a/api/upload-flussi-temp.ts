import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "flussi-temp";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const supabase =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    : null;

function clean(value: unknown, max = 200): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, max);
}

function getExtension(fileName: string, mimeType: string): string {
  const originalExtension =
    fileName.includes(".")
      ? fileName.substring(fileName.lastIndexOf(".")).toLowerCase()
      : "";

  if (originalExtension === ".pdf") return ".pdf";
  if (originalExtension === ".jpg") return ".jpg";
  if (originalExtension === ".jpeg") return ".jpeg";
  if (originalExtension === ".png") return ".png";
  if (originalExtension === ".webp") return ".webp";

  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";

  return ".jpg";
}

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

  try {
    const {
      session_id,
      file_name,
      file_type,
      file_size,
    } = req.body || {};

    if (
      typeof session_id !== "string" ||
      !session_id.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error: "Falta session_id.",
      });
    }

    if (
      typeof file_name !== "string" ||
      !file_name.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error: "Falta el nombre del archivo.",
      });
    }

    if (
      typeof file_type !== "string" ||
      !ALLOWED_TYPES.includes(file_type)
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Tipo de archivo no permitido. Solo PDF, JPG, PNG o WebP.",
      });
    }

    const numericSize = Number(file_size);

    if (
      !Number.isFinite(numericSize) ||
      numericSize <= 0
    ) {
      return res.status(400).json({
        ok: false,
        error: "Tamaño de archivo no válido.",
      });
    }

    if (numericSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        ok: false,
        error:
          "El archivo supera el límite máximo de 10 MB.",
      });
    }

    /*
     * No usamos directamente el nombre enviado por el cliente.
     * Generamos una ruta segura y única.
     */

    const safeSessionId = clean(session_id, 120);

    const originalName = clean(
      file_name,
      150
    );

    const extension = getExtension(
      originalName,
      file_type
    );

    const uniqueId =
      `${Date.now()}-${crypto.randomUUID()}`;

    const storagePath =
      `${safeSessionId}/${uniqueId}${extension}`;

    /*
     * Creamos una URL firmada de subida.
     *
     * El navegador podrá utilizarla para subir directamente
     * el archivo al bucket privado flussi-temp.
     */

    const { data, error } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(
          storagePath
        );

    if (error || !data) {
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

    console.log(
      "✅ Signed upload URL creada:",
      {
        session_id: safeSessionId,
        path: storagePath,
        file_name: originalName,
        file_type,
        file_size: numericSize,
      }
    );

    return res.status(200).json({
      ok: true,

      bucket: BUCKET,

      path: storagePath,

      token: data.token,

      signed_url: data.signedUrl || null,

      file_name: originalName,

      file_type,

      file_size: numericSize,

      session_id: safeSessionId,

      message:
        "Archivo preparado para subida segura.",
    });
  } catch (error: any) {
    console.error(
      "❌ upload-flussi-temp error:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Error interno del servidor.",
    });
  }
}
