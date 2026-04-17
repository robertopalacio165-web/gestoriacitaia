export type VerifyDocumentLang = "darija" | "es" | "en";

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
  image_quality: {
    blurred: boolean;
    cropped: boolean;
    dark: boolean;
    glare: boolean;
    low_resolution: boolean;
    multiple_documents: boolean;
  };
  summary: string;
};

type VerifyParams = {
  file: File;
  expectedDocumentType?: string;
  lang?: VerifyDocumentLang;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer el archivo"));
        return;
      }

      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Archivo en formato no válido"));
        return;
      }

      resolve(result.slice(commaIndex + 1));
    };

    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });
}

export async function verifyDocument({
  file,
  expectedDocumentType = "auto",
  lang = "es",
}: VerifyParams): Promise<VerifyDocumentResult> {
  const base64 = await fileToBase64(file);

  const res = await fetch("/api/verify-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileBase64: base64,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      expectedDocumentType,
      lang,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Error verificando documento");
  }

  if (!data?.ok || !data?.result) {
    throw new Error("Respuesta inválida del verificador");
  }

  return data.result as VerifyDocumentResult;
}

export function getDocumentLabel(type?: string): string {
  const v = (type || "").toLowerCase().trim();

  if (v === "passport") return "Pasaporte";
  if (v === "nie") return "NIE";
  if (v === "tie") return "TIE";
  if (v === "empadronamiento") return "Empadronamiento";
  if (v === "criminal_record") return "Antecedentes penales";
  if (v === "official_form") return "Formulario oficial";
  if (v === "photo") return "Foto";
  return "Documento";
}
