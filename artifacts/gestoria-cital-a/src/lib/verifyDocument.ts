export type VerifyDocumentLang = "darija" | "es" | "en";

export type VerifyDocumentRequest = {
  imageBase64: string;
  expectedDocumentType?: string;
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
  document_type: string;
  expected_document_type: string | null;
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

export async function verifyDocument(params: VerifyDocumentRequest): Promise<VerifyDocumentResult> {
  const response = await fetch("/api/verify-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageBase64: params.imageBase64,
      expectedDocumentType: params.expectedDocumentType || "auto",
      lang: params.lang || "es",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "No se pudo verificar el documento");
  }

  return data.result as VerifyDocumentResult;
}
