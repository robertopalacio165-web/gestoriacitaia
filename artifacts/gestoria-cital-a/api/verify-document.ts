import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

export type VerifyDocumentLang = "darija" | "es" | "en";

export type VerifyDocumentResult = {
  status: "valid" | "review" | "invalid";
  document_type: string | null;
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

type VerifyDocumentPayload = {
  imageBase64?: string;
  imageUrl?: string;
  expectedDocumentType?: string;
  lang?: VerifyDocumentLang;
};

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });
}

async function pdfToImageDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo crear canvas para convertir el PDF");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function fileToVerifiableDataUrl(file: File): Promise<string> {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  const isPdf = type === "application/pdf" || name.endsWith(".pdf");

  if (isPdf) {
    return pdfToImageDataUrl(file);
  }

  return fileToDataUrl(file);
}

export async function verifyDocument(params: {
  file?: File;
  imageBase64?: string;
  imageUrl?: string;
  expectedDocumentType?: string;
  lang?: VerifyDocumentLang;
}): Promise<VerifyDocumentResult> {
  const payload: VerifyDocumentPayload = {
    expectedDocumentType: params.expectedDocumentType || "auto",
    lang: params.lang || "es",
  };

  if (params.file) {
    const dataUrl = await fileToVerifiableDataUrl(params.file);
    const commaIndex = dataUrl.indexOf(",");
    payload.imageBase64 =
      commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  } else if (params.imageBase64) {
    payload.imageBase64 = params.imageBase64;
  } else if (params.imageUrl) {
    payload.imageUrl = params.imageUrl;
  } else {
    throw new Error("Falta file, imageBase64 o imageUrl");
  }

  const response = await fetch("/api/verify-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Error verificando documento");
  }

  if (!data?.result) {
    throw new Error("Respuesta inválida del verificador");
  }

  return data.result as VerifyDocumentResult;
}
