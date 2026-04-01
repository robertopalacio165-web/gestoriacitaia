type VerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "needs_review";

type VerifyDocumentResult = {
  status: VerificationStatus;
  notes: string;
  detected_file_kind: "pdf" | "image" | "unknown";
  detected_document_kind:
    | "official_document"
    | "photo"
    | "supporting_document"
    | "unknown";
  match_quality: "good" | "review" | "bad";
  match_reason: string;
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

function detectFileKind(
  mime: string,
  ext: string
): "pdf" | "image" | "unknown" {
  if (looksLikePdf(mime, ext)) return "pdf";
  if (looksLikeImage(mime, ext)) return "image";
  return "unknown";
}

function detectDocumentKind(
  normalizedType: string
): "official_document" | "photo" | "supporting_document" | "unknown" {
  if (
    normalizedType === "passport" ||
    normalizedType === "dni_nie" ||
    normalizedType === "empadronamiento" ||
    normalizedType === "formulario_oficial" ||
    normalizedType === "tasa_pagada"
  ) {
    return "official_document";
  }

  if (normalizedType === "fotografias") {
    return "photo";
  }

  if (normalizedType === "pruebas_espana" || normalizedType === "general") {
    return "supporting_document";
  }

  return "unknown";
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
      detected_file_kind: "unknown",
      detected_document_kind: "unknown",
      match_quality: "bad",
      match_reason: "No hay archivo",
    };
  }

  const ext = getExtension(file.name);
  const mime = (file.type || "").toLowerCase();
  const normalizedType = (type || "general").toLowerCase();

  const detected_file_kind = detectFileKind(mime, ext);
  const detected_document_kind = detectDocumentKind(normalizedType);

  if (file.size <= 0) {
    return {
      status: "rejected",
      notes: "El archivo está vacío",
      detected_file_kind,
      detected_document_kind,
      match_quality: "bad",
      match_reason: "Archivo vacío",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      status: "rejected",
      notes: "El archivo supera el límite de 15 MB",
      detected_file_kind,
      detected_document_kind,
      match_quality: "bad",
      match_reason: "Archivo demasiado grande",
    };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(mime)) {
    return {
      status: "rejected",
      notes: "Formato no permitido. Usa PDF, JPG, PNG o WEBP",
      detected_file_kind,
      detected_document_kind,
      match_quality: "bad",
      match_reason: "Formato no permitido",
    };
  }

  if (file.size < MIN_FILE_SIZE_BYTES) {
    status = "needs_review";
    notes.push("Archivo muy pequeño");
  }

  let match_quality: "good" | "review" | "bad" = "good";
  let match_reason = "Formato correcto para este tipo de documento";

  if (normalizedType === "fotografias") {
    if (detected_file_kind !== "image") {
      status = "needs_review";
      notes.push("Para fotografías se recomienda JPG o PNG");
      match_quality = "review";
      match_reason = "La fotografía debería subirse como imagen";
    } else {
      match_quality = "good";
      match_reason = "Fotografía subida como imagen";
    }
  }

  if (
    normalizedType === "formulario_oficial" ||
    normalizedType === "tasa_pagada" ||
    normalizedType === "empadronamiento"
  ) {
    if (detected_file_kind !== "pdf") {
      status = "needs_review";
      notes.push("Para este documento se recomienda PDF");
      match_quality = "review";
      match_reason = "Para este documento se recomienda PDF";
    } else {
      match_quality = "good";
      match_reason = "Documento oficial subido en PDF";
    }
  }

  if (
    normalizedType === "passport" ||
    normalizedType === "dni_nie"
  ) {
    if (detected_file_kind === "pdf" || detected_file_kind === "image") {
      match_quality = "good";
      match_reason = "Documento válido como PDF o imagen";
    } else {
      status = "needs_review";
      match_quality = "review";
      match_reason = "Formato poco habitual para este documento";
    }
  }

  if (normalizedType === "general" || normalizedType === "pruebas_espana") {
    if (detected_file_kind === "pdf" || detected_file_kind === "image") {
      match_quality = "good";
      match_reason = "Documento de apoyo con formato correcto";
    } else {
      status = "needs_review";
      match_quality = "review";
      match_reason = "Documento de apoyo con formato dudoso";
    }
  }

  if (!file.name || file.name.trim().length < 3) {
    status = "needs_review";
    notes.push("Nombre de archivo poco claro");
    if (match_quality === "good") {
      match_quality = "review";
      match_reason = "Nombre de archivo poco claro";
    }
  }

  return {
    status,
    notes: notes.join(", "),
    detected_file_kind,
    detected_document_kind,
    match_quality,
    match_reason,
  };
}
