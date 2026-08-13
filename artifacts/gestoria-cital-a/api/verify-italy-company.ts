import type { VercelRequest, VercelResponse } from "@vercel/node";

type RiskLevel = "low" | "medium" | "high";

type CompanyVerification = {
  company_found: boolean | null;

  company_name: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;

  address: string | null;
  city: string | null;
  province: string | null;

  legal_form: string | null;
  activity: string | null;
  ateco: string | null;
  status: string | null;

  name_match: boolean | null;
  partita_iva_match: boolean | null;
  codice_fiscale_match: boolean | null;
  address_match: boolean | null;
  activity_match: boolean | null;

  risk_level: RiskLevel;

  warnings: string[];

  source: string;
  source_url: string | null;

  verification_note: string;
};

type RequestBody = {
  company_name?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  address?: string;
  city?: string;
  province?: string;
  activity?: string;
  job_position?: string;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const result = value.trim();

  return result ? result : null;
}

function normalize(value: string | null): string {
  if (!value) return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeVat(value: string | null): string {
  if (!value) return "";

  return value
    .toUpperCase()
    .replace(/[^0-9]/g, "");
}

function normalizeFiscalCode(value: string | null): string {
  if (!value) return "";

  return value
    .toUpperCase()
    .replace(/\s/g, "");
}

function similarity(
  a: string | null,
  b: string | null
): number {
  const aa = normalize(a);
  const bb = normalize(b);

  if (!aa || !bb) return 0;

  if (aa === bb) return 1;

  if (aa.includes(bb) || bb.includes(aa)) {
    return 0.85;
  }

  const wordsA = aa.match(/.{1,4}/g) || [];
  const wordsB = new Set(bb.match(/.{1,4}/g) || []);

  if (!wordsA.length || !wordsB.size) return 0;

  const matches = wordsA.filter((x) =>
    wordsB.has(x)
  ).length;

  return matches / Math.max(wordsA.length, wordsB.size);
}

function calculateRisk(
  companyFound: boolean | null,
  nameMatch: boolean | null,
  vatMatch: boolean | null,
  fiscalMatch: boolean | null,
  addressMatch: boolean | null,
  activityMatch: boolean | null
): RiskLevel {
  if (companyFound === false) {
    return "high";
  }

  if (
    vatMatch === false ||
    fiscalMatch === false
  ) {
    return "high";
  }

  if (nameMatch === false) {
    return "high";
  }

  if (
    addressMatch === false ||
    activityMatch === false
  ) {
    return "medium";
  }

  if (
    companyFound === true &&
    (nameMatch === true ||
      vatMatch === true ||
      fiscalMatch === true)
  ) {
    return "low";
  }

  return "medium";
}

/**
 * Optional official Registro Imprese API.
 *
 * IMPORTANT:
 * The official InfoCamere/Registro Imprese API
 * requires an authorized service/credential.
 *
 * Configure:
 *
 * REGISTRO_IMPRESE_API_URL
 * REGISTRO_IMPRESE_API_KEY
 *
 * when the official API access is available.
 */
async function queryOfficialRegistroImprese(
  body: RequestBody
): Promise<{
  configured: boolean;
  found: boolean | null;
  data: any | null;
  error: string | null;
}> {
  const apiUrl =
    process.env.REGISTRO_IMPRESE_API_URL;

  const apiKey =
    process.env.REGISTRO_IMPRESE_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      configured: false,
      found: null,
      data: null,
      error: null,
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
        company_name:
          body.company_name || null,

        partita_iva:
          body.partita_iva || null,

        codice_fiscale:
          body.codice_fiscale || null,

        address:
          body.address || null,

        city:
          body.city || null,

        province:
          body.province || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        configured: true,
        found: null,
        data: null,
        error:
          data?.message ||
          data?.error ||
          `HTTP ${response.status}`,
      };
    }

    /*
     * We accept several common response shapes.
     * The exact mapping can be adapted once
     * InfoCamere provides the customer's API schema.
     */

    const company =
      data?.company ||
      data?.impresa ||
      data?.result ||
      data?.data ||
      null;

    if (!company) {
      return {
        configured: true,
        found: false,
        data: null,
        error: null,
      };
    }

    return {
      configured: true,
      found: true,
      data: company,
      error: null,
    };
  } catch (error: any) {
    console.error(
      "REGISTRO IMPRESE API ERROR:",
      error
    );

    return {
      configured: true,
      found: null,
      data: null,
      error:
        error?.message ||
        "Registro Imprese request failed",
    };
  }
}

function mapCompanyData(data: any) {
  return {
    company_name:
      cleanString(
        data?.company_name ||
          data?.denominazione ||
          data?.nome_impresa
      ),

    partita_iva:
      cleanString(
        data?.partita_iva ||
          data?.partitaIVA ||
          data?.piva
      ),

    codice_fiscale:
      cleanString(
        data?.codice_fiscale ||
          data?.codiceFiscale ||
          data?.cf
      ),

    address:
      cleanString(
        data?.address ||
          data?.indirizzo ||
          data?.sede_legale
      ),

    city:
      cleanString(
        data?.city ||
          data?.comune
      ),

    province:
      cleanString(
        data?.province ||
          data?.provincia
      ),

    legal_form:
      cleanString(
        data?.legal_form ||
          data?.forma_giuridica
      ),

    activity:
      cleanString(
        data?.activity ||
          data?.attivita ||
          data?.descrizione_attivita
      ),

    ateco:
      cleanString(
        data?.ateco ||
          data?.codice_ateco
      ),

    status:
      cleanString(
        data?.status ||
          data?.stato_impresa
      ),
  };
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

    const companyName =
      cleanString(body.company_name);

    const partitaIva =
      cleanString(body.partita_iva);

    const codiceFiscale =
      cleanString(body.codice_fiscale);

    const address =
      cleanString(body.address);

    const city =
      cleanString(body.city);

    const province =
      cleanString(body.province);

    const activity =
      cleanString(body.activity);

    const jobPosition =
      cleanString(body.job_position);

    /*
     * We need at least one strong identifier.
     */
    if (
      !companyName &&
      !partitaIva &&
      !codiceFiscale
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Falta company_name, partita_iva o codice_fiscale",
      });
    }

    /*
     * First: official Registro Imprese
     */
    const official =
      await queryOfficialRegistroImprese(
        body
      );

    /*
     * If official API is not configured,
     * NEVER pretend that the company was verified.
     */
    if (!official.configured) {
      const publicSearchUrl =
        "https://www.registroimprese.it/";

      return res.status(200).json({
        ok: true,

        verified: false,

        company_found: null,

        company: {
          company_name: companyName,
          partita_iva: partitaIva,
          codice_fiscale: codiceFiscale,
          address,
          city,
          province,
          activity,
          job_position: jobPosition,
        },

        risk_level: "medium",

        warnings: [
          "La API oficial de Registro Imprese todavía no está conectada.",
          "No se debe afirmar que la empresa existe oficialmente hasta realizar la consulta oficial.",
        ],

        source:
          "Registro Imprese / InfoCamere",

        source_url:
          publicSearchUrl,

        verification_note:
          "La empresa debe verificarse mediante el Registro Imprese oficial. El sistema ha recibido correctamente los datos, pero todavía no dispone de acceso automático a la base oficial.",
      });
    }

    /*
     * API configured but failed.
     */
    if (official.error) {
      return res.status(200).json({
        ok: true,

        verified: false,

        company_found: null,

        company: {
          company_name: companyName,
          partita_iva: partitaIva,
          codice_fiscale: codiceFiscale,
          address,
          city,
          province,
          activity,
          job_position: jobPosition,
        },

        risk_level: "medium",

        warnings: [
          "No se pudo completar la consulta oficial de Registro Imprese.",
          official.error,
        ],

        source:
          "Registro Imprese / InfoCamere",

        source_url:
          "https://www.registroimprese.it/",

        verification_note:
          "La consulta oficial falló. No se debe interpretar este resultado como prueba de que la empresa sea falsa.",
      });
    }

    /*
     * Company not found.
     */
    if (
      official.found === false ||
      !official.data
    ) {
      return res.status(200).json({
        ok: true,

        verified: true,

        company_found: false,

        company: {
          company_name: null,
          partita_iva: null,
          codice_fiscale: null,
          address: null,
          city: null,
          province: null,
          legal_form: null,
          activity: null,
          ateco: null,
          status: null,
        },

        comparison: {
          name_match: false,
          partita_iva_match: false,
          codice_fiscale_match: false,
          address_match: false,
          activity_match: false,
        },

        risk_level: "high",

        warnings: [
          "No se ha encontrado una empresa coincidente en la consulta oficial.",
          "Este resultado debe revisarse antes de concluir que existe fraude.",
        ],

        source:
          "Registro Imprese / InfoCamere",

        source_url:
          "https://www.registroimprese.it/",

        verification_note:
          "No se encontró una coincidencia suficiente con los datos proporcionados.",
      });
    }

    /*
     * Map official data.
     */
    const company =
      mapCompanyData(official.data);

    /*
     * Compare document data with official data.
     */
    const nameSimilarity =
      similarity(
        companyName,
        company.company_name
      );

    const addressSimilarity =
      similarity(
        address,
        company.address
      );

    const activitySimilarity =
      similarity(
        activity,
        company.activity
      );

    const nameMatch =
      companyName && company.company_name
        ? nameSimilarity >= 0.70
        : null;

    const vatMatch =
      partitaIva && company.partita_iva
        ? normalizeVat(partitaIva) ===
          normalizeVat(company.partita_iva)
        : null;

    const fiscalMatch =
      codiceFiscale &&
      company.codice_fiscale
        ? normalizeFiscalCode(
            codiceFiscale
          ) ===
          normalizeFiscalCode(
            company.codice_fiscale
          )
        : null;

    const addressMatch =
      address && company.address
        ? addressSimilarity >= 0.60
        : null;

    const activityMatch =
      activity && company.activity
        ? activitySimilarity >= 0.35
        : null;

    const risk =
      calculateRisk(
        true,
        nameMatch,
        vatMatch,
        fiscalMatch,
        addressMatch,
        activityMatch
      );

    const warnings: string[] = [];

    if (nameMatch === false) {
      warnings.push(
        "El nombre de la empresa no coincide suficientemente con el Registro Imprese."
      );
    }

    if (vatMatch === false) {
      warnings.push(
        "La Partita IVA no coincide con el Registro Imprese."
      );
    }

    if (fiscalMatch === false) {
      warnings.push(
        "El Codice Fiscale no coincide con el Registro Imprese."
      );
    }

    if (addressMatch === false) {
      warnings.push(
        "La dirección no coincide suficientemente con los datos oficiales."
      );
    }

    if (activityMatch === false) {
      warnings.push(
        "La actividad declarada en el documento no coincide claramente con la actividad registrada."
      );
    }

    if (
      company.status &&
      normalize(company.status).includes("cess")
    ) {
      warnings.push(
        "La empresa aparece con un estado que puede indicar cese o baja."
      );
    }

    /*
     * If a restaurant is mentioned in the contract,
     * the company verification only proves the legal
     * company record. It does NOT prove that a specific
     * restaurant location is operating at this moment.
     */
    warnings.push(
      "La existencia de la empresa no demuestra por sí sola que haya presentado una solicitud de Nulla Osta para el trabajador."
    );

    return res.status(200).json({
      ok: true,

      verified: true,

      company_found: true,

      company,

      comparison: {
        name_match: nameMatch,
        partita_iva_match: vatMatch,
        codice_fiscale_match:
          fiscalMatch,
        address_match: addressMatch,
        activity_match: activityMatch,

        name_similarity:
          Number(nameSimilarity.toFixed(2)),

        address_similarity:
          Number(
            addressSimilarity.toFixed(2)
          ),

        activity_similarity:
          Number(
            activitySimilarity.toFixed(2)
          ),
      },

      risk_level: risk,

      warnings,

      source:
        "Registro Imprese / InfoCamere",

      source_url:
        "https://www.registroimprese.it/",

      verification_note:
        "La empresa ha sido contrastada con la fuente oficial configurada. Esta comprobación no confirma por sí sola la autenticidad de un contrato ni la existencia de una solicitud concreta de Nulla Osta.",
    });
  } catch (error: any) {
    console.error(
      "VERIFY ITALY COMPANY ERROR:",
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
