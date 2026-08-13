import type { VercelRequest, VercelResponse } from "@vercel/node";

type FlussiDocumentType =
  | "nulla_osta"
  | "decreto_flussi"
  | "application_receipt"
  | "prefecture_communication"
  | "ministry_communication"
  | "work_authorization"
  | "unknown";

type VerificationStatus =
  | "coherent"
  | "review"
  | "inconsistent"
  | "not_confirmed";

type RiskLevel = "low" | "medium" | "high";

type RequestBody = {
  document_type?: string;
  worker_name?: string;
  employer_name?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  nulla_osta_number?: string;
  application_number?: string;
  protocol_number?: string;
  file_name?: string;
  document_text?: string;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const valueClean = value.trim();

  return valueClean || null;
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(value: string | null): string {
  if (!value) return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIdentifier(
  value: string | null
): string {
  if (!value) return "";

  return value
    .toUpperCase()
    .replace(/[\s\-./]/g, "");
}

function normalizeDocumentType(
  value: unknown
): FlussiDocumentType {
  if (typeof value !== "string") {
    return "unknown";
  }

  const v = normalize(value);

  if (
    v.includes("nulla osta") ||
    v.includes("nullaosta")
  ) {
    return "nulla_osta";
  }

  if (
    v.includes("decreto flussi") ||
    v.includes("decretoflussi")
  ) {
    return "decreto_flussi";
  }

  if (
    v.includes("ricevuta") ||
    v.includes("resguardo") ||
    v.includes("application receipt")
  ) {
    return "application_receipt";
  }

  if (
    v.includes("prefettura") ||
    v.includes("prefecture")
  ) {
    return "prefecture_communication";
  }

  if (
    v.includes("ministero") ||
    v.includes("minister")
  ) {
    return "ministry_communication";
  }

  if (
    v.includes("autorizzazione al lavoro") ||
    v.includes("work authorization")
  ) {
    return "work_authorization";
  }

  return "unknown";
}

function calculateRisk(
  status: VerificationStatus,
  suspiciousCount: number,
  inconsistencyCount: number
): RiskLevel {
  if (status === "inconsistent") {
    return "high";
  }

  if (
    suspiciousCount >= 2 ||
    inconsistencyCount >= 2
  ) {
    return "high";
  }

  if (
    status === "review" ||
    status === "not_confirmed" ||
    suspiciousCount > 0 ||
    inconsistencyCount > 0
  ) {
    return "medium";
  }

  return "low";
}

function calculateScore(
  status: VerificationStatus,
  suspiciousCount: number,
  inconsistencyCount: number
): number {
  let score = 100;

  if (status === "not_confirmed") {
    score -= 20;
  }

  if (status === "review") {
    score -= 15;
  }

  if (status === "inconsistent") {
    score -= 45;
  }

  score -= Math.min(
    suspiciousCount * 15,
    40
  );

  score -= Math.min(
    inconsistencyCount * 15,
    45
  );

  return Math.max(0, score);
}

/**
 * This function intentionally does NOT claim
 * that a Nulla Osta exists officially.
 *
 * To confirm a real application, an official
 * government source or authorized service is
 * required.
 */
async function verifyOfficialFlussi(
  body: RequestBody
): Promise<{
  configured: boolean;
  confirmed: boolean | null;
  message: string;
}> {
  const apiUrl =
    process.env.ITALY_FLUSSI_OFFICIAL_API_URL;

  const apiKey =
    process.env.ITALY_FLUSSI_OFFICIAL_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      configured: false,
      confirmed: null,
      message:
        "No hay conexión oficial configurada para comprobar esta práctica.",
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        worker_name:
          body.worker_name || null,

        employer_name:
          body.employer_name || null,

        partita_iva:
          body.partita_iva || null,

        codice_fiscale:
          body.codice_fiscale || null,

        nulla_osta_number:
          body.nulla_osta_number || null,

        application_number:
          body.application_number || null,

        protocol_number:
          body.protocol_number || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        configured: true,
        confirmed: null,
        message:
          data?.message ||
          data?.error ||
          `Error HTTP ${response.status}`,
      };
    }

    if (data?.confirmed === true) {
      return {
        configured: true,
        confirmed: true,
        message:
          "La práctica ha sido confirmada por la fuente oficial configurada.",
      };
    }

    if (data?.confirmed === false) {
      return {
        configured: true,
        confirmed: false,
        message:
          "La fuente oficial no ha confirmado la práctica con los datos proporcionados.",
      };
    }

    return {
      configured: true,
      confirmed: null,
      message:
        "La fuente oficial no devolvió una confirmación concluyente.",
    };
  } catch (error: any) {
    console.error(
      "OFFICIAL FLUSSI ERROR:",
      error
    );

    return {
      configured: true,
      confirmed: null,
      message:
        error?.message ||
        "No se pudo consultar la fuente oficial.",
    };
  }
}

function buildSystemPrompt(): string {
  return `
You are SARA, specialist in Italian Decreto Flussi
and Nulla Osta document analysis for GestoriaCitaIA.

Analyze information supplied about ONE document.

Possible documents:

- Nulla Osta
- Decreto Flussi
- application receipt
- Prefettura communication
- Ministry communication
- work authorization
- related immigration/work document

IMPORTANT:

You are performing DOCUMENT ANALYSIS.

You are NOT allowed to say that a Nulla Osta
is officially authentic simply because:

- it has a logo
- it has a stamp
- it has a signature
- it has a QR code
- it looks professional
- the PDF looks official.

Official existence must only be confirmed when
an actual official verification source confirms it.

Never invent:

- protocol numbers
- application numbers
- Nulla Osta numbers
- dates
- employer information
- worker information
- Prefettura information.

If information is not visible or supplied,
return null.

Check:

1. Document type.

2. Worker name.

3. Employer name.

4. Partita IVA.

5. Codice Fiscale.

6. Nulla Osta number.

7. Application number.

8. Protocol number.

9. Application date.

10. Issue date.

11. Expiry date.

12. Prefettura.

13. Immigration office.

14. Any visible official references.

15. Internal consistency.

16. Worker/employer consistency.

17. Date consistency.

18. Suspicious elements.

19. Missing information.

20. Whether the document requires official verification.

Look for possible warning signs:

- inconsistent names
- inconsistent company data
- different Partita IVA
- different Codice Fiscale
- impossible dates
- duplicated text
- strange formatting
- suspicious editing
- missing pages
- cropped sections
- unreadable numbers
- contradictory information
- unusual document structure.

Do NOT accuse a person of fraud unless the
evidence is strong.

Use:

"coherent"
when the document appears internally coherent.

"review"
when additional verification is required.

"inconsistent"
when important information conflicts.

"not_confirmed"
when official existence cannot be established.

Return ONLY JSON.

Use exactly this structure:

{
  "document_type": "nulla_osta",
  "document_title": null,

  "worker": {
    "full_name": null,
    "nationality": null,
    "passport_number": null,
    "date_of_birth": null
  },

  "employer": {
    "company_name": null,
    "partita_iva": null,
    "codice_fiscale": null
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

  "analysis": {
    "document_readable": true,
    "document_complete": true,
    "internal_consistency": true,
    "worker_data_consistent": true,
    "employer_data_consistent": true,
    "dates_consistent": true,

    "suspicious_elements": [],
    "inconsistencies": [],
    "missing_information": []
  },

  "requires_official_verification": true,

  "summary": "",

  "recommended_action": ""
}

Do not add markdown.
Do not add explanations outside JSON.
`;
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
    const body =
      (req.body || {}) as RequestBody;

    const workerName =
      cleanString(body.worker_name);

    const employerName =
      cleanString(body.employer_name);

    const partitaIva =
      cleanString(body.partita_iva);

    const codiceFiscale =
      cleanString(body.codice_fiscale);

    const nullaOstaNumber =
      cleanString(body.nulla_osta_number);

    const applicationNumber =
      cleanString(body.application_number);

    const protocolNumber =
      cleanString(body.protocol_number);

    const fileName =
      cleanString(body.file_name);

    const documentText =
      cleanString(body.document_text);

    if (!documentText) {
      return res.status(400).json({
        ok: false,
        error:
          "Falta document_text",
      });
    }

    const openAiKey =
      process.env.OPENAI_API_KEY;

    if (!openAiKey) {
      return res.status(500).json({
        ok: false,
        error:
          "Missing OPENAI_API_KEY",
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${openAiKey}`,
          "Content-Type":
            "application/json",
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

              content: [
                {
                  type: "input_text",

                  text: `
Analyze this Italian Decreto Flussi /
Nulla Osta related document.

File:
${fileName || "document"}

Known worker:
${workerName || "unknown"}

Known employer:
${employerName || "unknown"}

Known Partita IVA:
${partitaIva || "unknown"}

Known Codice Fiscale:
${codiceFiscale || "unknown"}

Known Nulla Osta number:
${nullaOstaNumber || "unknown"}

Known application number:
${applicationNumber || "unknown"}

Known protocol number:
${protocolNumber || "unknown"}

DOCUMENT TEXT:

${documentText}
`,
                },
              ],
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

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "OPENAI FLUSSI ERROR:",
        data
      );

      return res.status(500).json({
        ok: false,
        error:
          data?.error?.message ||
          "OpenAI Flussi analysis failed",
      });
    }

    const outputText =
      data?.output_text ||
      data?.output
        ?.flatMap(
          (item: any) =>
            item?.content || []
        )
        ?.map(
          (item: any) =>
            item?.text || ""
        )
        ?.join("") ||
      "";

    if (!outputText) {
      return res.status(500).json({
        ok: false,
        error:
          "Empty AI response",
      });
    }

    let aiResult: any;

    try {
      aiResult =
        JSON.parse(outputText);
    } catch {
      console.error(
        "FLUSSI JSON ERROR:",
        outputText
      );

      return res.status(500).json({
        ok: false,
        error:
          "AI returned invalid JSON",
      });
    }

    const documentType =
      normalizeDocumentType(
        aiResult?.document_type
      );

    const suspiciousElements =
      cleanArray(
        aiResult?.analysis
          ?.suspicious_elements
      );

    const inconsistencies =
      cleanArray(
        aiResult?.analysis
          ?.inconsistencies
      );

    const missingInformation =
      cleanArray(
        aiResult?.analysis
          ?.missing_information
      );

    const internalConsistency =
      aiResult?.analysis
          ?.internal_consistency !== false;

    const workerConsistency =
      aiResult?.analysis
          ?.worker_data_consistent !== false;

    const employerConsistency =
      aiResult?.analysis
          ?.employer_data_consistent !== false;

    const datesConsistency =
      aiResult?.analysis
          ?.dates_consistent !== false;

    let status: VerificationStatus =
      "not_confirmed";

    if (
      inconsistencies.length >= 2 ||
      !internalConsistency ||
      !workerConsistency ||
      !employerConsistency ||
      !datesConsistency
    ) {
      status = "inconsistent";
    } else if (
      suspiciousElements.length > 0 ||
      missingInformation.length > 0
    ) {
      status = "review";
    } else {
      status = "not_confirmed";
    }

    /*
     * Now perform official verification
     * ONLY if an authorized official service
     * has been configured.
     */
    const official =
      await verifyOfficialFlussi({
        worker_name:
          cleanString(
            aiResult?.worker?.full_name
          ) || workerName || undefined,

        employer_name:
          cleanString(
            aiResult?.employer?.company_name
          ) || employerName || undefined,

        partita_iva:
          cleanString(
            aiResult?.employer?.partita_iva
          ) || partitaIva || undefined,

        codice_fiscale:
          cleanString(
            aiResult?.employer?.codice_fiscale
          ) || codiceFiscale || undefined,

        nulla_osta_number:
          cleanString(
            aiResult?.flussi
              ?.nulla_osta_number
          ) ||
          nullaOstaNumber ||
          undefined,

        application_number:
          cleanString(
            aiResult?.flussi
              ?.application_number
          ) ||
          applicationNumber ||
          undefined,

        protocol_number:
          cleanString(
            aiResult?.flussi
              ?.protocol_number
          ) ||
          protocolNumber ||
          undefined,
      });

    /*
     * Official confirmation changes the
     * result from "not confirmed" to
     * "coherent" only if the document itself
     * is also internally consistent.
     */
    if (
      official.confirmed === true &&
      status !== "inconsistent"
    ) {
      status = "coherent";
    }

    if (
      official.confirmed === false
    ) {
      status = "review";
    }

    const risk =
      calculateRisk(
        status,
        suspiciousElements.length,
        inconsistencies.length
      );

    const score =
      calculateScore(
        status,
        suspiciousElements.length,
        inconsistencies.length
      );

    let recommendedAction =
      cleanString(
        aiResult?.recommended_action
      ) ||
      "Revisar el documento y realizar las comprobaciones oficiales disponibles.";

    if (
      official.confirmed === true
    ) {
      recommendedAction =
        "La fuente oficial configurada ha confirmado la práctica. Revisar igualmente que todos los datos del trabajador y empleador coincidan.";
    }

    if (
      official.confirmed === false
    ) {
      recommendedAction =
        "No continuar basándose únicamente en este documento. La fuente oficial configurada no confirmó la práctica.";
    }

    if (
      status === "inconsistent"
    ) {
      recommendedAction =
        "No considerar el documento como fiable hasta aclarar las inconsistencias detectadas.";
    }

    return res.status(200).json({
      ok: true,

      document_type: documentType,

      status,

      risk_level: risk,

      verification_score: score,

      worker: {
        full_name:
          cleanString(
            aiResult?.worker
              ?.full_name
          ),

        nationality:
          cleanString(
            aiResult?.worker
              ?.nationality
          ),

        passport_number:
          cleanString(
            aiResult?.worker
              ?.passport_number
          ),

        date_of_birth:
          cleanString(
            aiResult?.worker
              ?.date_of_birth
          ),
      },

      employer: {
        company_name:
          cleanString(
            aiResult?.employer
              ?.company_name
          ),

        partita_iva:
          cleanString(
            aiResult?.employer
              ?.partita_iva
          ),

        codice_fiscale:
          cleanString(
            aiResult?.employer
              ?.codice_fiscale
          ),
      },

      flussi: {
        nulla_osta_number:
          cleanString(
            aiResult?.flussi
              ?.nulla_osta_number
          ),

        application_number:
          cleanString(
            aiResult?.flussi
              ?.application_number
          ),

        protocol_number:
          cleanString(
            aiResult?.flussi
              ?.protocol_number
          ),

        application_date:
          cleanString(
            aiResult?.flussi
              ?.application_date
          ),

        issue_date:
          cleanString(
            aiResult?.flussi
              ?.issue_date
          ),

        expiry_date:
          cleanString(
            aiResult?.flussi
              ?.expiry_date
          ),

        prefecture:
          cleanString(
            aiResult?.flussi
              ?.prefecture
          ),

        immigration_office:
          cleanString(
            aiResult?.flussi
              ?.immigration_office
          ),
      },

      analysis: {
        document_readable:
          aiResult?.analysis
            ?.document_readable !== false,

        document_complete:
          aiResult?.analysis
            ?.document_complete !== false,

        internal_consistency:
          internalConsistency,

        worker_data_consistent:
          workerConsistency,

        employer_data_consistent:
          employerConsistency,

        dates_consistent:
          datesConsistency,

        suspicious_elements:
          suspiciousElements,

        inconsistencies:
          inconsistencies,

        missing_information:
          missingInformation,
      },

      official_verification: {
        configured:
          official.configured,

        confirmed:
          official.confirmed,

        message:
          official.message,

        source:
          "Official Italian authority / authorized service",
      },

      requires_official_verification:
        official.confirmed !== true,

      summary:
        cleanString(
          aiResult?.summary
        ) ||
        "Documento analizado por Sara.",

      recommended_action:
        recommendedAction,

      important_warning:
        "El análisis visual y documental no demuestra por sí solo la autenticidad oficial de un Nulla Osta. La confirmación oficial requiere una fuente oficial o un servicio autorizado.",
    });
  } catch (error: any) {
    console.error(
      "VERIFY ITALY FLUSSI ERROR:",
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
