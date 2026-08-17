import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "flussi-temp";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({
        error: "La petición debe ser multipart/form-data",
      });
    }

    /*
     * Vercel/Node no procesa multipart automáticamente.
     * Este endpoint recibirá el archivo como base64 desde el frontend.
     */

    const { fileName, fileType, fileBase64, sessionId } =
      req.body || {};

    if (!fileName || !fileBase64 || !sessionId) {
      return res.status(400).json({
        error: "Faltan fileName, fileBase64 o sessionId",
      });
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (fileType && !allowedTypes.includes(fileType)) {
      return res.status(400).json({
        error: "Tipo de archivo no permitido",
      });
    }

    const buffer = Buffer.from(fileBase64, "base64");

    if (!buffer.length) {
      return res.status(400).json({
        error: "El archivo está vacío",
      });
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: "El archivo supera el límite de 10 MB",
      });
    }

    const safeFileName = String(fileName)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 150);

    const extension =
      safeFileName.includes(".")
        ? safeFileName.substring(safeFileName.lastIndexOf("."))
        : fileType === "application/pdf"
        ? ".pdf"
        : ".jpg";

    const uniqueName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}${extension}`;

    const path = `${sessionId}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: fileType || "application/octet-stream",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("❌ Error subiendo archivo Flussi:", uploadError);

      return res.status(500).json({
        error: "No se pudo guardar temporalmente el archivo",
        details: uploadError.message,
      });
    }

    console.log(`✅ Archivo Flussi temporal guardado: ${path}`);

    return res.status(200).json({
      success: true,
      bucket: BUCKET,
      path,
      fileName: safeFileName,
      size: buffer.length,
      type: fileType || "application/octet-stream",
      sessionId,
    });
  } catch (error: any) {
    console.error("❌ upload-flussi-temp error:", error);

    return res.status(500).json({
      error: error?.message || "Error interno del servidor",
    });
  }
}
