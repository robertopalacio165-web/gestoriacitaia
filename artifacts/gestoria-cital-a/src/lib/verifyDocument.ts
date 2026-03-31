type VerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "needs_review";

type VerifyDocumentResult = {
  status: VerificationStatus;
  notes: string;
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MIN_FILE_SIZE_BYTES = 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"];

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function looksLikeImage(mime: string, ext: string) {
  return mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext);
}

function looksLikePdf(mime: string, ext: string) {
  return mime === "application/pdf" || ext === "pdf";
}

export async function verifyDocument(
  file: File,
  type: string
): Promise<VerifyDocumentResult> {
  const notes: string[] = [];
  let status: VerificationStatus = "verified";

  if (!file) {
    return {
      status: "rejected",
      notes: "No se ha seleccionado ningún archivo",
    };
  }

  const ext = getExtension(file.name);
  const mime = (file.type || "").toLowerCase();
  const normalizedType = (type || "general").toLowerCase();

  if (file.size <= 0) {
    return {
      status: "rejected",
      notes: "El archivo está vacío",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      status: "rejected",
      notes: "El archivo supera el límite de 15 MB",
    };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(mime)) {
    return {
      status: "rejected",
      notes: "Formato no permitido. Usa PDF, JPG, PNG o WEBP",
    };
  }

  if (file.size < MIN_FILE_SIZE_BYTES) {
    status = "needs_review";
    notes.push("Archivo muy pequeño");
  }

  if (
    normalizedType === "passport" ||
    normalizedType === "dni_nie" ||
    normalizedType === "empadronamiento" ||
    normalizedType === "fotografias" ||
    normalizedType === "pruebas_espana" ||
    normalizedType === "tasa_pagada" ||
    normalizedType === "formulario_oficial" ||
    normalizedType === "general"
  ) {
    if (!looksLikePdf(mime, ext) && !looksLikeImage(mime, ext)) {
      status = "needs_review";
      notes.push("El archivo no parece PDF ni imagen estándar");
    }
  }

  if (normalizedType === "fotografias" && !looksLikeImage(mime, ext)) {
    status = "needs_review";
    notes.push("Para fotografías se recomienda JPG o PNG");
  }

  if (
    (normalizedType === "formulario_oficial" ||
      normalizedType === "tasa_pagada" ||
      normalizedType === "empadronamiento") &&
    !looksLikePdf(mime, ext)
  ) {
    status = "needs_review";
    notes.push("Para este documento se recomienda PDF");
  }

  if (!file.name || file.name.trim().length < 3) {
    status = "needs_review";
    notes.push("Nombre de archivo poco claro");
  }

  return {
    status,
    notes: notes.join(", "),
  };
}
