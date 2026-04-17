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

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("No se pudo leer el archivo"));
      }
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
  const imageBase64 = await fileToDataUrl(file);

  const res = await fetch("/api/verify-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageBase64,
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
