export type VerifyDocumentLang = "darija" | "es" | "en";

export type VerifyDocumentType =
  | "auto"
  | "passport"
  | "nie"
  | "tie"
  | "empadronamiento"
  | "criminal_record"
  | "photo"
  | "official_form"
  | "unknown";

export type VerifyDocumentRequest = {
  imageBase64?: string;
  imageUrl?: string;
  expectedDocumentType?: VerifyDocumentType | string;
  lang?: VerifyDocumentLang;
};

export type VerifyDocumentImageQuality = {
  blurred: boolean;
  cropped: boolean;
  dark: boolean;
  glare: boolean;
  low_resolution: boolean;
  multiple_documents: boolean;
};

export type VerifyDocumentResult = {
  status: "valid" | "review" | "invalid";
  document_type: VerifyDocumentType | string;
  expected_document_type: VerifyDocumentType | string | null;
  match_expected_type: boolean | null;
  country: string | null;
  full_name: string | null;
  document_number: string | null;
  nie: string | null;
  passport_number: string | null;
  birth_date: string | null;
  expiry_date: string | null;
  issue_date: string | null;
  nationality: string | null;
  sex: string | null;
  warnings: string[];
  visible_fields: string[];
  missing_or_unclear_fields: string[];
  image_quality: VerifyDocumentImageQuality;
  summary: string;
};

export type VerifyDocumentResponse = {
  ok: true;
  result: VerifyDocumentResult;
};

const ALLOWED_DOCUMENT_TYPES: VerifyDocumentType[] = [
  "auto",
  "passport",
  "nie",
  "tie",
  "empadronamiento",
  "criminal_record",
  "photo",
  "official_form",
  "unknown",
];

function normalizeDocumentType(value?: string | null): VerifyDocumentType | string {
  if (!value || typeof value !== "string") return "auto";

  const v = value.trim().toLowerCase();

  if (!v) return "auto";
  if (v === "pasaporte") return "passport";
  if (v === "passport") return "passport";
  if (v === "nie") return "nie";
  if (v === "tie") return "tie";
  if (v === "empadronamiento" || v === "padron" || v === "padrón") {
    return "empadronamiento";
  }
  if (
    v === "criminal_record" ||
    v === "antecedentes" ||
    v === "antecedentes_penales" ||
    v === "certificado_penales"
  ) {
    return "criminal_record";
  }
  if (v === "photo" || v === "foto" || v === "selfie") return "photo";
  if (v === "official_form" || v === "formulario" || v === "form") {
    return "official_form";
  }
  if (v === "unknown") return "unknown";
  if (v === "auto") return "auto";

  return v;
}

function normalizeLang(value?: string): VerifyDocumentLang {
  if (value === "darija" || value === "en" || value === "es") return value;
  return "es";
}

function ensureImageQuality(value: any): VerifyDocumentImageQuality {
  return {
    blurred: value?.blurred === true,
    cropped: value?.cropped === true,
    dark: value?.dark === true,
    glare: value?.glare === true,
    low_resolution: value?.low_resolution === true,
    multiple_documents: value?.multiple_documents === true,
  };
}

function ensureStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeVerifyDocumentResult(raw: any): VerifyDocumentResult {
  return {
    status:
      raw?.status === "valid" || raw?.status === "review" || raw?.status === "invalid"
        ? raw.status
        : "review",
    document_type: ensureStringOrNull(raw?.document_type) || "unknown",
    expected_document_type: ensureStringOrNull(raw?.expected_document_type),
    match_expected_type:
      typeof raw?.match_expected_type === "boolean" ? raw.match_expected_type : null,
    country: ensureStringOrNull(raw?.country),
    full_name: ensureStringOrNull(raw?.full_name),
    document_number: ensureStringOrNull(raw?.document_number),
    nie: ensureStringOrNull(raw?.nie),
    passport_number: ensureStringOrNull(raw?.passport_number),
    birth_date: ensureStringOrNull(raw?.birth_date),
    expiry_date: ensureStringOrNull(raw?.expiry_date),
    issue_date: ensureStringOrNull(raw?.issue_date),
    nationality: ensureStringOrNull(raw?.nationality),
    sex: ensureStringOrNull(raw?.sex),
    warnings: ensureStringArray(raw?.warnings),
    visible_fields: ensureStringArray(raw?.visible_fields),
    missing_or_unclear_fields: ensureStringArray(raw?.missing_or_unclear_fields),
    image_quality: ensureImageQuality(raw?.image_quality),
    summary: ensureStringOrNull(raw?.summary) || "",
  };
}

export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("No se pudo convertir el archivo"));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Error leyendo el archivo"));
    };

    reader.readAsDataURL(file);
  });
}

export async function verifyDocument(
  params: VerifyDocumentRequest
): Promise<VerifyDocumentResult> {
  const hasImageBase64 =
    typeof params.imageBase64 === "string" && params.imageBase64.trim().length > 0;

  const hasImageUrl =
    typeof params.imageUrl === "string" && params.imageUrl.trim().length > 0;

  if (!hasImageBase64 && !hasImageUrl) {
    throw new Error("Debes enviar imageBase64 o imageUrl");
  }

  const expectedType = normalizeDocumentType(params.expectedDocumentType);
  const lang = normalizeLang(params.lang);

  const payload: VerifyDocumentRequest = {
    expectedDocumentType: expectedType,
    lang,
  };

  if (hasImageBase64) {
    payload.imageBase64 = params.imageBase64!.trim();
  }

  if (hasImageUrl) {
    payload.imageUrl = params.imageUrl!.trim();
  }

  const response = await fetch("/api/verify-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta no válida");
  }

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "No se pudo verificar el documento");
  }

  return normalizeVerifyDocumentResult(data.result);
}

export function getDocumentLabel(documentType?: string | null): string {
  const type = normalizeDocumentType(documentType);

  switch (type) {
    case "passport":
      return "Pasaporte";
    case "nie":
      return "NIE";
    case "tie":
      return "TIE";
    case "empadronamiento":
      return "Empadronamiento";
    case "criminal_record":
      return "Antecedentes penales";
    case "photo":
      return "Foto";
    case "official_form":
      return "Formulario oficial";
    case "auto":
      return "Auto";
    default:
      return "Documento";
  }
}

export function isAllowedDocumentType(value?: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  return ALLOWED_DOCUMENT_TYPES.includes(
    normalizeDocumentType(value) as VerifyDocumentType
  );
}
