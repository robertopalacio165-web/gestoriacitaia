import type { VercelRequest, VercelResponse } from "@vercel/node";

type DocumentType =
  | "employment_contract"
  | "nulla_osta"
  | "decreto_flussi"
  | "application_receipt"
  | "employer_document"
  | "hiring_letter"
  | "ministry_communication"
  | "work_related_document"
  | "identity_document"
  | "other"
  | "unknown";

type RiskLevel = "low" | "medium" | "high";

type VerificationResult = {
  status: "valid" | "review" | "invalid";

  document_type: DocumentType;
  document_title: string | null;

  country: string;

  worker: {
    full_name: string | null;
    nationality: string | null;
    passport_number: string | null;
    date_of_birth: string | null;
  };

  employer: {
    company_name: string | null;
    partita_iva: string | null;
    codice_fiscale: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    job_position: string | null;
    sector: string | null;
  };

  flussi: {
    nulla_osta_number: string | null;
    application_number: string | null;
    protocol_number: string | null;
    application_date: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    prefecture: string | null;
    immigration_office: string | null;
  };

  contract: {
    salary: string | null;
    working_hours: string | null;
    contract_type: string | null;
    start_date: string | null;
    workplace: string | null;
  };

  document_analysis: {
    readable: boolean;
    complete: boolean;
    suspicious_elements: string[];
    inconsistencies: string[];
    missing_information: string[];
    visible_signatures: boolean;
    visible_stamp: boolean;
    visible_qr_or_barcode: boolean;
  };

  risk_level: RiskLevel;
  verification_score: number;

  important_warning: string;

  summary: string;
  recommended_action: string;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const result = value.trim();

  return result.length > 0 ? result : null;
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDocumentType(value: unknown): DocumentType {
  if (typeof value !== "string") return "unknown";

  const v = value.toLowerCase().trim();

  if (
    v.includes("contratto") ||
    v.includes("contract") ||
    v.includes("contrat")
  ) {
    return "employment_contract";
  }

  if (
    v.includes("nulla osta") ||
    v.includes("nulla_osta")
  ) {
    return "nulla_osta";
  }

  if (
    v.includes("decreto flussi") ||
    v.includes("decreto_flussi") ||
    v.includes("flussi")
  ) {
    return "decreto_flussi";
  }

  if (
    v.includes("ricevuta") ||
    v.includes("receipt") ||
    v.includes("resguardo") ||
    v.includes("ricezione")
  ) {
    return "application_receipt";
  }

  if (
    v.includes("datore") ||
    v.includes("employer") ||
    v.includes("azienda") ||
    v.includes("company") ||
    v.includes("impresa")
  ) {
    return "employer_document";
  }

  if (
    v.includes("lettera") ||
    v.includes("hiring") ||
    v.includes("assunzione") ||
    v.includes("contratación")
  ) {
    return "hiring_letter";
  }

  if (
    v.includes("ministero") ||
    v.includes("minister") ||
    v.includes("prefettura") ||
    v.includes("prefettura")
  ) {
    return "ministry_communication";
  }

  if (
    v.includes("passport") ||
    v.includes("passaporto") ||
    v.includes("identità") ||
    v.includes("identity")
  ) {
    return "identity_document";
  }

  if (
    v.includes("work") ||
    v.includes("lavoro") ||
    v.includes("employment")
  ) {
    return "work_related_document";
  }

  if (v === "other") return "other";

  return "unknown";
}

function calculateRisk(
  result: Omit<VerificationResult, "risk_level" | "verification_score">
): {
  risk: RiskLevel;
  score: number;
} {
  let score = 100;

  if (!result.document_analysis.readable) {
    score -= 40;
  }

  if (!result.document_analysis.complete) {
    score -= 15;
  }

  score -= Math.min(
    result.document_analysis.suspicious_elements.length * 15,
    45
  );

  score -= Math.min(
    result.document_analysis.inconsistencies.length * 10,
    30
  );

  score -= Math.min(
    result.document_analysis.missing_information.length * 5,
    20
  );

  if (result.document_type === "unknown") {
    score -= 15;
  }

  if (score < 0) score = 0;

  let risk: RiskLevel = "low";

  if (score < 50) {
    risk = "high";
  } else if (score < 80) {
    risk = "medium";
  }

  return {
    risk,
    score,
  };
}

function buildSystemPrompt(): string {
  return `
You are SARA, an AI document verification specialist for
GestoriaCitaIA Italia.

Your task is to analyze ONE document related to:

- Italian employment contracts
- Decreto Flussi
- Nulla Osta
- immigration/work applications
- employer documents
- hiring letters
- Ministry communications
- application receipts
- other documents related to employment or Decreto Flussi in Italy.

The client may upload:

- PDF
- JPG
- JPEG
- PNG
- photograph of a document
- screenshot of a document

IMPORTANT:

1. NEVER invent information.
2. NEVER say that a document is officially authentic only because it visually looks official.
3. NEVER claim that a Nulla Osta exists in a government database unless the system has actually checked an official source.
4. If something cannot be verified from the document, return null.
5. Clearly distinguish:
   - information visible in the document
   - inconsistencies
   - suspicious signs
   - information that still requires official verification.
6. Identify automatically what type of document has been uploaded.
7. Extract all important visible information.
8. Compare information inside the document.
9. Detect contradictions.
10. Detect suspicious visual or textual elements.
11. Do not accuse anyone of fraud unless there is strong evidence.
12. Use "suspicious" or "requires verification" when appropriate.

DOCUMENT TYPES:

employment_contract
nulla_osta
decreto_flussi
application_receipt
employer_document
hiring_letter
ministry_communication
work_related_document
identity_document
other
unknown

ITALIAN EMPLOYER INFORMATION:

Look for:

- company name
- employer name
- Partita IVA
- Codice Fiscale
- address
- city
- province
- sector
- job position
- workplace

WORKER INFORMATION:

Look for:

- full name
- nationality
- passport number
- date of birth

NULLA OSTA / FLUSSI:

Look for:

- Nulla Osta number
- application number
- protocol number
- application date
- issue date
- expiry date
- Prefettura
- Immigration Office
- other visible official references

CONTRACT:

Look for:

- salary
- working hours
- contract type
- start date
- workplace
- job position

VISUAL CHECK:

Look for visible:

- signatures
- official stamps
- QR codes
- barcodes
- inconsistent fonts
- strange spacing
- duplicated text
- manipulated-looking areas
- suspicious edits
- cropped sections
- unreadable sections

IMPORTANT:

A visible stamp, signature, QR code or logo DOES NOT prove authenticity.

The result must be JSON only.

Return EXACTLY this structure:

{
  "document_type": "employment_contract",
  "document_title": null,
  "country": "Italy",

  "worker": {
    "full_name": null,
    "nationality": null,
    "passport_number": null,
    "date_of_birth": null
  },

  "employer": {
    "company_name": null,
    "partita_iva": null,
    "codice_fiscale": null,
    "address": null,
    "city": null,
    "province": null,
    "job_position": null,
    "sector": null
  },

  "flussi": {
    "nulla_osta_number": null,
    "application_number": null,
    "protocol_number": null,
    "application_date": null,
    "issue_date": null,
    "expiry_date": null,
    "prefecture": null,
    "immigration_office": null
  },

  "contract": {
    "salary": null,
    "working_hours": null,
    "contract_type": null,
    "start_date": null,
    "workplace": null
  },

  "document_analysis": {
    "readable": true,
    "complete": true,
    "suspicious_elements": [],
    "inconsistencies": [],
    "missing_information": [],
    "visible_signatures": false,
    "visible_stamp": false,
    "visible_qr_or_barcode": false
  },

  "summary": "",
  "recommended_action": ""
}

Do not add markdown.
Do not add explanations outside JSON.
`;
}

function getInputType(mimeType: string): "image" | "pdf" {
  return mimeType === "application/pdf" ? "pdf" : "image";
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

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing OPENAI_API_KEY",
      });
    }

    const {
      fileBase64,
      fileName,
      mimeType,
    } = req.body || {};

    if (!fileBase64) {
      return res.status(400).json({
        ok: false,
        error: "Missing fileBase64",
      });
    }

    const safeMimeType =
      typeof mimeType === "string" && mimeType.trim()
        ? mimeType.trim().toLowerCase()
        : "image/jpeg";

    const safeFileName =
      typeof fileName === "string" && fileName.trim()
        ? fileName.trim()
        : "document";

    const inputType = getInputType(safeMimeType);

    const dataUrl =
      `data:${safeMimeType};base64,${fileBase64}`;

    const userText = `
Analyze this Italian employment / Decreto Flussi document.

File name:
${safeFileName}

Mime type:
${safeMimeType}

Identify the document automatically.

Return ONLY the requested JSON.
`;

    /*
     * We use the current Responses API format.
     * The uploaded document is provided as an image or PDF data URL.
     */

    const content =
      inputType === "pdf"
        ? [
            {
              type: "input_text",
              text: userText,
            },
            {
              type: "input_file",
              filename: safeFileName,
              file_data: dataUrl,
            },
          ]
        : [
            {
              type: "input_text",
              text: userText,
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "high",
            },
          ];

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5.6",
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: buildSystemPrompt(),
                },
              ],
            },
            {
              role: "user",
              content,
            },
          ],
          text: {
            format: {
              type: "json_object",
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OPENAI ERROR:", data);

      return res.status(500).json({
        ok: false,
        error:
          data?.error?.message ||
          "OpenAI document analysis failed",
      });
    }

    const outputText =
      data?.output_text ||
      data?.output
        ?.flatMap((item: any) => item?.content || [])
        ?.map((item: any) => item?.text || "")
        ?.join("") ||
      "";

    if (!outputText) {
      return res.status(500).json({
        ok: false,
        error: "Empty AI response",
      });
    }

    let rawResult: any;

    try {
      rawResult = JSON.parse(outputText);
    } catch (error) {
      console.error("JSON PARSE ERROR:", outputText);

      return res.status(500).json({
        ok: false,
        error: "AI returned invalid JSON",
      });
    }

    const documentType = normalizeDocumentType(
      rawResult?.document_type
    );

    const baseResult = {
      status: "review" as const,

      document_type: documentType,

      document_title:
        cleanString(rawResult?.document_title),

      country: "Italy",

      worker: {
        full_name: cleanString(
          rawResult?.worker?.full_name
        ),
        nationality: cleanString(
          rawResult?.worker?.nationality
        ),
        passport_number: cleanString(
          rawResult?.worker?.passport_number
        ),
        date_of_birth: cleanString(
          rawResult?.worker?.date_of_birth
        ),
      },

      employer: {
        company_name: cleanString(
          rawResult?.employer?.company_name
        ),
        partita_iva: cleanString(
          rawResult?.employer?.partita_iva
        ),
        codice_fiscale: cleanString(
          rawResult?.employer?.codice_fiscale
        ),
        address: cleanString(
          rawResult?.employer?.address
        ),
        city: cleanString(
          rawResult?.employer?.city
        ),
        province: cleanString(
          rawResult?.employer?.province
        ),
        job_position: cleanString(
          rawResult?.employer?.job_position
        ),
        sector: cleanString(
          rawResult?.employer?.sector
        ),
      },

      flussi: {
        nulla_osta_number: cleanString(
          rawResult?.flussi?.nulla_osta_number
        ),
        application_number: cleanString(
          rawResult?.flussi?.application_number
        ),
        protocol_number: cleanString(
          rawResult?.flussi?.protocol_number
        ),
        application_date: cleanString(
          rawResult?.flussi?.application_date
        ),
        issue_date: cleanString(
          rawResult?.flussi?.issue_date
        ),
        expiry_date: cleanString(
          rawResult?.flussi?.expiry_date
        ),
        prefecture: cleanString(
          rawResult?.flussi?.prefecture
        ),
        immigration_office: cleanString(
          rawResult?.flussi?.immigration_office
        ),
      },

      contract: {
        salary: cleanString(
          rawResult?.contract?.salary
        ),
        working_hours: cleanString(
          rawResult?.contract?.working_hours
        ),
        contract_type: cleanString(
          rawResult?.contract?.contract_type
        ),
        start_date: cleanString(
          rawResult?.contract?.start_date
        ),
        workplace: cleanString(
          rawResult?.contract?.workplace
        ),
      },

      document_analysis: {
        readable:
          typeof rawResult?.document_analysis?.readable ===
          "boolean"
            ? rawResult.document_analysis.readable
            : true,

        complete:
          typeof rawResult?.document_analysis?.complete ===
          "boolean"
            ? rawResult.document_analysis.complete
            : true,

        suspicious_elements: cleanArray(
          rawResult?.document_analysis
            ?.suspicious_elements
        ),

        inconsistencies: cleanArray(
          rawResult?.document_analysis?.inconsistencies
        ),

        missing_information: cleanArray(
          rawResult?.document_analysis
            ?.missing_information
        ),

        visible_signatures:
          rawResult?.document_analysis
            ?.visible_signatures === true,

        visible_stamp:
          rawResult?.document_analysis
            ?.visible_stamp === true,

        visible_qr_or_barcode:
          rawResult?.document_analysis
            ?.visible_qr_or_barcode === true,
      },

      summary:
        cleanString(rawResult?.summary) ||
        "Documento analizado por Sara.",

      recommended_action:
        cleanString(rawResult?.recommended_action) ||
        "Requiere revisión adicional.",
    };

    const risk = calculateRisk(baseResult);

    const finalResult: VerificationResult = {
      ...baseResult,

      status:
        risk.risk === "high"
          ? "review"
          : risk.score >= 80
            ? "valid"
            : "review",

      risk_level: risk.risk,

      verification_score: risk.score,

      important_warning:
        "El análisis documental no demuestra por sí solo que un documento o Nulla Osta sea oficialmente auténtico. La autenticidad oficial debe confirmarse mediante la fuente competente cuando sea posible.",
    };

    return res.status(200).json({
      ok: true,
      file_name: safeFileName,
      mime_type: safeMimeType,
      result: finalResult,
    });
  } catch (error: any) {
    console.error(
      "VERIFY ITALY DOCUMENT ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Internal server error",
    });
  }
}
