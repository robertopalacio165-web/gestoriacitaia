import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { createClient } from "@supabase/supabase-js";

type AnyData = Record<string, any>;

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const publicUrl =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://gestoriacitaia.com");

function esc(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function val(value: any, fallback = "No disponible"): string {
  const text = String(value ?? "").trim();
  return esc(text || fallback);
}

function makeReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "GF-IT-2026-";

  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

function normalizeAnalysis(body: AnyData) {
  const a = body.analysis || body.result || body.verification || {};

  const suspicious =
    Array.isArray(a.suspiciousElements)
      ? a.suspiciousElements
      : Array.isArray(a.suspicious_elements)
        ? a.suspicious_elements
        : [];

  const inconsistencies =
    Array.isArray(a.inconsistencies)
      ? a.inconsistencies
      : Array.isArray(a.incoherences)
        ? a.incoherences
        : [];

  const missing =
    Array.isArray(a.missingData)
      ? a.missingData
      : Array.isArray(a.missing_data)
        ? a.missing_data
        : [];

  const checks =
    Array.isArray(a.checks)
      ? a.checks
      : [
          `Documenti analizzati: ${Number(a.document_count || body.documents?.length || 0) || 1}.`,
          "Tipologia dei documenti identificata automaticamente dall'IA.",
          "Dati del lavoratore e del datore confrontati tra i documenti disponibili.",
          "Date, numeri di pratica e riferimenti confrontati per coerenza.",
          "L'autenticità ufficiale richiede una verifica presso la fonte competente.",
        ];

  const risk = String(
    a.risk || a.riskLevel || "NO DETERMINATO"
  ).toUpperCase();

  const status = String(
    a.status || a.result || "REQUIERE VERIFICACIÓN"
  ).toUpperCase();

  return {
    a,
    suspicious,
    inconsistencies,
    missing,
    checks,
    risk,
    status,
  };
}

function cleanString(value: any): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => (typeof x === "string" ? x.trim() : String(x ?? "").trim()))
    .filter(Boolean);
}

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL/VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const FLUSSI_BUCKET =
  process.env.FLUSSI_DOCUMENT_BUCKET ||
  "documentos-flussi-privado";

function isAllowedMime(mime: string): boolean {
  return [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ].includes(mime);
}

function safeMime(name: string, mime?: string): string {
  if (mime && isAllowedMime(mime)) return mime;

  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function listReferenceDocuments(
  reference: string,
  suppliedDocuments: any[] = []
) {
  const supabase = getSupabaseAdmin();

  const folder =
    suppliedDocuments.length > 0
      ? `flussi-temp/${reference}`
      : `flussi/${reference}`;

  const { data, error } = await supabase.storage
    .from(FLUSSI_BUCKET)
    .list(folder, {
      limit: 20,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    throw new Error(`No se pudieron listar los documentos: ${error.message}`);
  }

  const rows = (data || []).filter(
    (x: any) => x?.name && !String(x.name).startsWith(".")
  );

  // If the webhook supplied exact paths, use those first.
  const suppliedPaths = suppliedDocuments
    .map((x: any) => cleanString(x?.path))
    .filter(Boolean);

  if (suppliedPaths.length) {
    return suppliedPaths.slice(0, 5).map((path) => ({
      path,
      name: path.split("/").pop() || "documento",
      mimeType: safeMime(path.split("/").pop() || "documento"),
    }));
  }

  return rows.slice(0, 5).map((x: any) => ({
    path: `${folder}/${x.name}`,
    name: x.name,
    mimeType: safeMime(x.name, x.metadata?.mimetype),
  }));
}

async function downloadPrivateDocument(path: string, mimeType: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(FLUSSI_BUCKET)
    .download(path);

  if (error || !data) {
    throw new Error(
      `No se pudo descargar ${path}: ${error?.message || "archivo vacío"}`
    );
  }

  const buffer = Buffer.from(await data.arrayBuffer());

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error(`El archivo ${path} supera el límite de 10 MB.`);
  }

  return {
    buffer,
    mimeType: safeMime(path, mimeType),
  };
}

function dataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function outputTextFromOpenAI(data: any): string {
  return (
    data?.output_text ||
    data?.output
      ?.flatMap((item: any) => item?.content || [])
      ?.map((item: any) => item?.text || "")
      ?.join("") ||
    ""
  );
}

async function callOpenAIJson(
  content: any[],
  systemPrompt: string
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.FLUSSI_OPENAI_MODEL || "gpt-5.6",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
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
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OPENAI FLUSSI ERROR:", data);
    throw new Error(
      data?.error?.message || `OpenAI HTTP ${response.status}`
    );
  }

  const text = outputTextFromOpenAI(data);

  if (!text) {
    throw new Error("OpenAI devolvió una respuesta vacía.");
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error("OPENAI INVALID JSON:", text);
    throw new Error("OpenAI devolvió JSON inválido.");
  }
}

const DOCUMENT_SYSTEM_PROMPT = `
You are SARA, specialist in Italian Decreto Flussi document analysis for GestoriaCitaIA.

Analyze the supplied document visually and textually.

The user may provide:
- PDF
- JPG/JPEG
- PNG
- WEBP
- photo or screenshot of a document.

Identify the document type AUTOMATICALLY. Never ask the user to select it.

Possible types include:
employment_contract,
nulla_osta,
decreto_flussi,
application_receipt,
employer_document,
hiring_letter,
ministry_communication,
work_related_document,
identity_document,
other,
unknown.

Extract ONLY information actually visible in the document.

Check:
- worker name, nationality, passport and birth date when visible
- employer/company name
- Partita IVA
- Codice Fiscale
- Nulla Osta number
- application number
- protocol number
- dates
- Prefettura / office
- contract type, position, salary, hours, workplace
- visible signatures, stamps, QR/barcodes
- readability and completeness
- suspicious editing, cropping, duplicated text, strange formatting
- internal consistency.

IMPORTANT:
A professional appearance, logo, stamp, signature or QR code DOES NOT prove official authenticity.
Never claim official authenticity unless an actual official source has confirmed it.
Never invent missing values.

Return ONLY JSON:
{
  "document_type": "...",
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
    "codice_fiscale": null,
    "address": null,
    "city": null,
    "province": null,
    "job_position": null
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
    "internal_consistency": true,
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
`;

async function analyzeSingleDocument(
  file: { name: string; mimeType: string; buffer: Buffer }
) {
  const mime = safeMime(file.name, file.mimeType);
  const url = dataUrl(file.buffer, mime);

  const content =
    mime === "application/pdf"
      ? [
          {
            type: "input_text",
            text:
              `Analyze this Italian Decreto Flussi document.\n` +
              `File name: ${file.name}\n` +
              `Identify the document type automatically and return ONLY JSON.`,
          },
          {
            type: "input_file",
            filename: file.name,
            file_data: url,
          },
        ]
      : [
          {
            type: "input_text",
            text:
              `Analyze this Italian Decreto Flussi document.\n` +
              `File name: ${file.name}\n` +
              `Identify the document type automatically and return ONLY JSON.`,
          },
          {
            type: "input_image",
            image_url: url,
            detail: "high",
          },
        ];

  const result = await callOpenAIJson(content, DOCUMENT_SYSTEM_PROMPT);

  return {
    file_name: file.name,
    mime_type: mime,
    document_type: cleanString(result?.document_type) || "unknown",
    document_title: cleanString(result?.document_title),
    worker: result?.worker || {},
    employer: result?.employer || {},
    flussi: result?.flussi || {},
    contract: result?.contract || {},
    document_analysis: result?.document_analysis || {},
    summary: cleanString(result?.summary),
    recommended_action: cleanString(result?.recommended_action),
  };
}

const COMPARISON_SYSTEM_PROMPT = `
You are SARA, senior reviewer for GestoriaCitaIA.

You are given the structured analysis of several documents belonging to ONE Decreto Flussi case.

Compare ALL documents against each other.

Look specifically for:
- different worker names
- different passport numbers
- different dates of birth
- different employer names
- different Partita IVA
- different Codice Fiscale
- different Nulla Osta numbers
- different application/protocol numbers
- contradictory dates
- contract information that conflicts with other documents
- impossible or suspicious combinations
- missing information that prevents a reliable conclusion
- suspicious patterns that deserve manual review.

Do not accuse anyone of fraud without strong evidence.

The score is ONLY a DOCUMENT ANALYSIS / COHERENCE SCORE.
It is NOT a percentage probability that the document is authentic.

Scoring guidance:
100 = documents highly coherent, readable, no material contradiction detected.
90-99 = coherent with minor review points.
75-89 = some missing or suspicious points; manual review recommended.
50-74 = significant inconsistencies or concerns.
0-49 = severe contradictions or strong warning signs.

Official authenticity can only be confirmed by an actual official source. If no official source was consulted, explicitly say that official authenticity remains unconfirmed.

Return ONLY JSON:
{
  "status": "COHERENTE | REQUIERE REVISION | INCONSISTENTE",
  "verification_score": 0,
  "risk_level": "LOW | MEDIUM | HIGH",
  "document_count": 0,
  "checks": [],
  "suspicious_elements": [],
  "inconsistencies": [],
  "missing_data": [],
  "official_verification": {
    "configured": false,
    "confirmed": null,
    "source": null,
    "message": ""
  },
  "worker": {
    "name": null,
    "nationality": null,
    "passport": null,
    "birthDate": null
  },
  "employer": {
    "name": null,
    "vat": null,
    "taxCode": null,
    "address": null,
    "city": null,
    "status": "No confirmado"
  },
  "document": {
    "type": null,
    "fileName": null,
    "protocol": null,
    "applicationNumber": null,
    "nullaOsta": null,
    "documentDate": null,
    "issuer": null,
    "prefettura": null
  },
  "contract": {
    "type": null,
    "position": null,
    "salary": null,
    "hours": null,
    "startDate": null,
    "workplace": null
  },
  "summary": "",
  "conclusion": "",
  "conclusion_ar": "",
  "recommendation": ""
}
`;

async function compareDocuments(documentAnalyses: any[]) {
  const content = [
    {
      type: "input_text",
      text:
        "Compare these document analyses. Do not invent information.\n\n" +
        JSON.stringify(documentAnalyses, null, 2),
    },
  ];

  return callOpenAIJson(content, COMPARISON_SYSTEM_PROMPT);
}

function buildAggregateBody(
  body: AnyData,
  reference: string,
  documents: any[],
  comparison: any
) {
  const primary = documents[0] || {};

  const worker = {
    name:
      comparison?.worker?.name ||
      primary?.worker?.full_name ||
      null,
    nationality:
      comparison?.worker?.nationality ||
      primary?.worker?.nationality ||
      null,
    passport:
      comparison?.worker?.passport ||
      primary?.worker?.passport_number ||
      null,
    birthDate:
      comparison?.worker?.birthDate ||
      primary?.worker?.date_of_birth ||
      null,
  };

  const employer = {
    name:
      comparison?.employer?.name ||
      primary?.employer?.company_name ||
      null,
    vat:
      comparison?.employer?.vat ||
      primary?.employer?.partita_iva ||
      null,
    taxCode:
      comparison?.employer?.taxCode ||
      primary?.employer?.codice_fiscale ||
      null,
    address:
      comparison?.employer?.address ||
      primary?.employer?.address ||
      null,
    city:
      comparison?.employer?.city ||
      primary?.employer?.city ||
      null,
    status:
      comparison?.employer?.status ||
      "No confirmado",
  };

  const doc = {
    type:
      comparison?.document?.type ||
      primary?.document_type ||
      "Documento analizzato",
    fileName:
      comparison?.document?.fileName ||
      primary?.file_name ||
      null,
    protocol:
      comparison?.document?.protocol ||
      primary?.flussi?.protocol_number ||
      null,
    applicationNumber:
      comparison?.document?.applicationNumber ||
      primary?.flussi?.application_number ||
      null,
    nullaOsta:
      comparison?.document?.nullaOsta ||
      primary?.flussi?.nulla_osta_number ||
      null,
    documentDate:
      comparison?.document?.documentDate ||
      primary?.flussi?.issue_date ||
      null,
    issuer:
      comparison?.document?.issuer ||
      primary?.flussi?.immigration_office ||
      null,
    prefettura:
      comparison?.document?.prefettura ||
      primary?.flussi?.prefecture ||
      null,
  };

  const contract = {
    type:
      comparison?.contract?.type ||
      primary?.contract?.contract_type ||
      null,
    position:
      comparison?.contract?.position ||
      primary?.employer?.job_position ||
      null,
    salary:
      comparison?.contract?.salary ||
      primary?.contract?.salary ||
      null,
    hours:
      comparison?.contract?.hours ||
      primary?.contract?.working_hours ||
      null,
    startDate:
      comparison?.contract?.startDate ||
      primary?.contract?.start_date ||
      null,
    workplace:
      comparison?.contract?.workplace ||
      primary?.contract?.workplace ||
      null,
  };

  return {
    ...body,
    reference,
    client: body.client || body.customer || body,
    worker,
    employer,
    document: doc,
    contract,
    documents,
    analysis: {
      ...comparison,
      status:
        comparison?.status ||
        "REQUIERE VERIFICACIÓN",
      risk:
        comparison?.risk_level ||
        "MEDIUM",
      riskLevel:
        comparison?.risk_level ||
        "MEDIUM",
      verification_score:
        Number(comparison?.verification_score ?? 0),
      document_count: documents.length,
      checks: cleanArray(comparison?.checks),
      suspiciousElements: cleanArray(
        comparison?.suspicious_elements
      ),
      inconsistencies: cleanArray(
        comparison?.inconsistencies
      ),
      missingData: cleanArray(
        comparison?.missing_data
      ),
      summary:
        cleanString(comparison?.summary) ||
        "Análisis documental completado.",
      conclusion:
        cleanString(comparison?.conclusion) ||
        "La documentación ha sido analizada y comparada.",
      conclusion_ar:
        cleanString(comparison?.conclusion_ar) ||
        "تم تحليل الوثائق ومقارنتها. هذا التقرير لا يعوض التحقق الرسمي من السلطات الإيطالية.",
      recommendation:
        cleanString(comparison?.recommendation) ||
        "No tomar una decisión definitiva sin verificación oficial.",
      official_verification:
        comparison?.official_verification || {
          configured: false,
          confirmed: null,
          source: null,
          message:
            "No se ha configurado una comprobación oficial automática.",
        },
    },
  };
}

function itemList(items: any[], empty: string): string {
  if (!items.length) return empty;

  return items
    .slice(0, 5)
    .map((x) => `<div><i>•</i> ${esc(x)}</div>`)
    .join("");
}

function resultColor(status: string): string {
  if (
    status.includes("AUTENT") ||
    status.includes("VALID") ||
    status.includes("ENCONTR")
  ) {
    return "#18e6a0";
  }

  if (
    status.includes("FALSO") ||
    status.includes("INVALID") ||
    status.includes("RIESGO") ||
    status.includes("SOSPECH")
  ) {
    return "#e85d5d";
  }

  return "#d7a53a";
}

function buildHtml(
  data: AnyData,
  analysis: ReturnType<typeof normalizeAnalysis>,
  reference: string,
  qrDataUrl: string
): string {
  const client = data.client || data.customer || data;
  const doc = data.document || data.documentData || {};
  const worker = data.worker || data.employee || {};
  const employer = data.employer || data.company || {};

  const issued = new Date().toLocaleDateString("it-IT");
  const color = resultColor(analysis.status);

  const safeStatus = val(analysis.status);
  const safeRisk = val(analysis.risk);

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>GestoriaCitaIA - Verifica Decreto Flussi</title>

<style>
@page{size:A4;margin:0}

*{
  box-sizing:border-box
}

html,body{
  margin:0;
  padding:0;
  background:#e9eef0;
  font-family:Arial,Helvetica,sans-serif;
  color:#eefbf7;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact
}

.page{
  width:210mm;
  height:297mm;
  margin:auto;
  background:#0a0f1a;
  overflow:hidden
}

.header{
  height:27mm;
  padding:4mm 7mm;
  border-bottom:2px solid #18e6a0;
  display:flex;
  align-items:center;
  justify-content:space-between;
  background:#0d1422
}

.logo{
  display:flex;
  align-items:center;
  gap:3mm
}

.logo-mark{
  height:16mm;
  width:16mm;
  border:2px solid #d7a53a;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#d7a53a;
  font-size:14pt;
  font-weight:900
}

.logo-text{
  font-size:19pt;
  font-weight:900;
  color:#fff
}

.logo-text em{
  font-style:normal;
  color:#18e6a0
}

.sub{
  font-size:5.5pt;
  color:#7a9ba8;
  letter-spacing:1px;
  margin-top:1mm
}

.title{
  text-align:right;
  font-size:11pt;
  font-weight:900;
  line-height:1.25
}

.title b{
  color:#18e6a0
}

.hero{
  height:31mm;
  padding:3.5mm 7mm;
  display:grid;
  grid-template-columns:27mm 1fr 39mm;
  gap:4mm;
  align-items:center;
  background:#0a0f1a
}

.qr{
  width:25mm;
  height:25mm;
  background:white;
  padding:1.5mm;
  border-radius:1.5mm;
  display:flex;
  align-items:center;
  justify-content:center
}

.qr img{
  width:22mm;
  height:22mm
}

.ref small{
  font-size:5.5pt;
  color:#7a9ba8
}

.ref strong{
  display:block;
  font-size:14pt;
  color:#18e6a0;
  margin:1mm 0
}

.ref p{
  font-size:6pt;
  margin:1mm 0;
  color:#b0ccd4
}

.badge{
  border:2px solid ${color};
  border-radius:2.5mm;
  padding:2.5mm;
  text-align:center;
  background:#0d1f2a
}

.badge strong{
  display:block;
  font-size:9pt;
  color:${color}
}

.badge span{
  display:block;
  font-size:6pt;
  color:#7a9ba8
}

.badge b{
  display:block;
  font-size:12pt;
  color:#fff;
  margin-top:1mm
}

.section{
  margin:0 7mm 1.8mm;
  border:1px solid #1a3a3a;
  border-radius:1.8mm;
  background:#0d1422;
  overflow:hidden
}

.st{
  background:#111d2e;
  border-bottom:2px solid #18e6a0;
  padding:1.35mm 2.5mm;
  font-size:7pt;
  font-weight:900;
  color:#fff
}

.st span{
  color:#18e6a0;
  margin-left:3mm
}

.sb{
  padding:1.8mm 2.5mm
}

.grid2{
  display:grid;
  grid-template-columns:1fr 1fr;
  column-gap:8mm;
  row-gap:1.2mm
}

.field .label{
  font-size:5.2pt;
  color:#7a9ba8;
  text-transform:uppercase;
  letter-spacing:.3px
}

.field .value{
  font-size:6.5pt;
  font-weight:700;
  color:#f3faf8;
  min-height:3.5mm;
  border-bottom:1px solid rgba(24,230,160,.1);
  padding-bottom:.5mm
}

.document{
  display:grid;
  grid-template-columns:1fr 1fr;
  column-gap:8mm;
  row-gap:1.2mm
}

.result{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:4mm
}

.result-main{
  text-align:center;
  border-right:1px solid #1a3a3a;
  padding-right:4mm
}

.icon{
  font-size:20pt;
  line-height:1;
  color:${color}
}

.result-main h2{
  font-size:10pt;
  margin:1mm 0;
  color:${color}
}

.result-main p{
  font-size:5.8pt;
  margin:.8mm 0;
  line-height:1.3;
  color:#b0ccd4
}

.company{
  padding-left:1mm
}

.row{
  margin-bottom:1mm
}

.row b{
  display:block;
  font-size:5.1pt;
  color:#7a9ba8;
  text-transform:uppercase;
  letter-spacing:.3px
}

.row span{
  font-size:6.4pt;
  font-weight:700;
  color:#f3faf8
}

.analysis{
  display:grid;
  grid-template-columns:1.35fr .65fr;
  gap:4mm
}

.checks{
  font-size:5.8pt;
  line-height:1.35
}

.checks div{
  margin:.6mm 0;
  color:#b0ccd4
}

.checks i{
  color:#18e6a0;
  font-style:normal;
  font-weight:900
}

.risk{
  border:1px solid #1a3a3a;
  border-radius:1.8mm;
  padding:2mm;
  text-align:center;
  background:#0d1f2a
}

.risk small{
  font-size:5.2pt;
  color:#7a9ba8
}

.risk strong{
  display:block;
  font-size:12pt;
  color:${color};
  margin:1mm
}

.alerts{
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  gap:2mm
}

.alert{
  font-size:5.5pt;
  line-height:1.25;
  padding:1.7mm;
  border-radius:1.5mm;
  min-height:12mm
}

.alert b{
  display:block;
  margin-bottom:.7mm;
  font-size:5.8pt
}

.danger{
  border:1px solid #683d3d;
  background:#1a1018
}

.danger b{
  color:#e85d5d
}

.warn{
  border:1px solid #675a27;
  background:#1a180d
}

.warn b{
  color:#d7a53a
}

.neutral{
  border:1px solid #1a3a3a;
  background:#0d1422
}

.neutral b{
  color:#18e6a0
}

.conclusion{
  font-size:5.8pt;
  line-height:1.35;
  color:#b0ccd4
}

.ar{
  direction:rtl;
  text-align:right;
  margin-top:1mm
}

.sign{
  display:grid;
  grid-template-columns:1fr 23mm 1fr;
  gap:4mm;
  align-items:end;
  margin-top:1.5mm
}

.signature{
  border-bottom:2px solid #18e6a0;
  height:7mm;
  font-family:cursive;
  font-size:12pt;
  color:#18e6a0;
  padding-bottom:.5mm
}

.seal{
  width:19mm;
  height:19mm;
  border:2px solid #18e6a0;
  border-radius:50%;
  margin:auto;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  color:#18e6a0;
  font-size:4.5pt;
  font-weight:900
}

.sign small{
  font-size:5pt;
  color:#7a9ba8
}

.final-section{
  margin:0 7mm 1.8mm;
  border:1px solid #1a3a3a;
  border-radius:1.8mm;
  background:#0d1422;
  overflow:hidden
}

.final-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:3mm;
  padding:1.8mm 2.5mm
}

.final-left{
  border-right:1px solid #1a3a3a;
  padding-right:3mm
}

.final-right{
  padding-left:1mm
}

.final-badge{
  text-align:center;
  border:2px solid ${color};
  border-radius:2.5mm;
  padding:1.5mm;
  background:#0d1f2a;
  margin-bottom:1.5mm
}

.final-badge strong{
  display:block;
  font-size:9pt;
  color:${color}
}

.final-badge b{
  display:block;
  font-size:13pt;
  color:#fff;
  margin-top:.5mm
}

.company-details .row{
  margin-bottom:1mm
}

.company-details .row b{
  display:block;
  font-size:5.1pt;
  color:#7a9ba8;
  text-transform:uppercase;
  letter-spacing:.3px
}

.company-details .row span{
  font-size:6.4pt;
  font-weight:700;
  color:#f3faf8
}

.risk-level{
  text-align:center;
  border:1px solid #1a3a3a;
  border-radius:1.8mm;
  padding:1.5mm;
  background:#0d1f2a;
  margin-top:1mm
}

.risk-level small{
  font-size:5.2pt;
  color:#7a9ba8
}

.risk-level strong{
  display:block;
  font-size:11pt;
  color:${color};
  margin:.5mm
}

.risk-level p{
  font-size:5.5pt;
  color:#b0ccd4;
  margin:.3mm 0
}

.final-footer{
  text-align:center;
  font-size:5.5pt;
  color:#7a9ba8;
  padding:1.5mm 0 0;
  border-top:1px solid #1a3a3a;
  margin-top:1.5mm
}

.final-footer b{
  color:#18e6a0
}

.footer{
  height:17mm;
  background:#0d1422;
  border-top:2px solid #18e6a0;
  padding:2.5mm 7mm;
  display:grid;
  grid-template-columns:1fr 15mm 1fr;
  gap:3mm;
  align-items:center
}

.footer p{
  font-size:4.8pt;
  line-height:1.3;
  color:#7a9ba8;
  margin:0
}

.footer .ar{
  text-align:right
}

.scale{
  text-align:center;
  font-size:13pt;
  color:#18e6a0
}
</style>
</head>

<body>

<div class="page">

<header class="header">

  <div class="logo">

    <div class="logo-mark">III</div>

    <div>
      <div class="logo-text">
        Gestoria<em>CitaIA</em>
      </div>

      <div class="sub">
        SERVIZI LEGALI E AMMINISTRATIVI
      </div>
    </div>

  </div>

  <div class="title">
    VERIFICA DECRETO FLUSSI<br>
    <b>ITALIA 🇮🇹</b>
  </div>

</header>

<section class="hero">

  <div class="qr">
    <img src="${qrDataUrl}" />
  </div>

  <div class="ref">

    <small>
      NUMERO DI RIFERIMENTO UNICO / رقم المرجع
    </small>

    <strong>
      ${esc(reference)}
    </strong>

    <p>
      Data di emissione: ${esc(issued)}
    </p>

    <p>
      Scansiona il QR per verificare questo rapporto.
    </p>

  </div>

  <div class="badge">

    <strong>${safeStatus}</strong>

    <span>
      نتيجة التحليل
    </span>

    <b>
      ${safeRisk}
    </b>

  </div>

</section>

<section class="section">

  <div class="st">
    DATI DEL CLIENTE
    <span>بيانات العميل</span>
  </div>

  <div class="sb grid2">

    <div class="field">
      <div class="label">
        Nome completo / الاسم الكامل
      </div>

      <div class="value">
        ${val(client.name || client.fullName)}
      </div>
    </div>

    <div class="field">
      <div class="label">
        Paese di residenza / بلد الإقامة
      </div>

      <div class="value">
        🇲🇦 ${val(client.country || client.countryOfResidence)}
      </div>
    </div>

    <div class="field">
      <div class="label">
        WhatsApp
      </div>

      <div class="value">
        ${val(client.whatsapp || client.phone)}
      </div>
    </div>

    <div class="field">
      <div class="label">
        Email
      </div>

      <div class="value">
        ${val(client.email)}
      </div>
    </div>

    <div class="field">
      <div class="label">
        Servizio / نوع الخدمة
      </div>

      <div class="value">
        Verifica Decreto Flussi
      </div>
    </div>

    <div class="field">
      <div class="label">
        Riferimento / المرجع
      </div>

      <div class="value">
        ${esc(reference)}
      </div>
    </div>

  </div>

</section>

<section class="section">

  <div class="st">
    DOCUMENTO ANALIZZATO
    <span>الوثيقة التي تم تحليلها</span>
  </div>

  <div class="sb document">

    <div class="field">
      <div class="label">Tipo di documento</div>
      <div class="value">
        ${val(doc.type || doc.documentType, "Documento Decreto Flussi")}
      </div>
    </div>

    <div class="field">
      <div class="label">File analizzato</div>
      <div class="value">
        ${val(doc.fileName || data.fileName)}
      </div>
    </div>

    <div class="field">
      <div class="label">Numero protocollo</div>
      <div class="value">
        ${val(doc.protocol || doc.protocolNumber)}
      </div>
    </div>

    <div class="field">
      <div class="label">Numero domanda</div>
      <div class="value">
        ${val(doc.applicationNumber || doc.requestNumber)}
      </div>
    </div>

    <div class="field">
      <div class="label">Numero Nulla Osta</div>
      <div class="value">
        ${val(doc.nullaOsta || doc.nullaOstaNumber)}
      </div>
    </div>

    <div class="field">
      <div class="label">Data documento</div>
      <div class="value">
        ${val(doc.documentDate)}
      </div>
    </div>

    <div class="field">
      <div class="label">Ente emittente</div>
      <div class="value">
        ${val(doc.issuer || doc.issuingAuthority)}
      </div>
    </div>

    <div class="field">
      <div class="label">Prefettura / Ufficio</div>
      <div class="value">
        ${val(doc.prefettura || doc.office)}
      </div>
    </div>

  </div>

</section>

<section class="section">
  <div class="st">
    DOCUMENTI ANALIZZATI
    <span>الوثائق التي تم تحليلها</span>
  </div>
  <div class="sb">
    <div class="checks">
      ${(Array.isArray(data.documents) ? data.documents : [])
        .slice(0, 5)
        .map(
          (d: any, i: number) =>
            `<div><i>✓</i> ${esc(i + 1)}. ${esc(
              d.file_name || d.fileName || "Documento"
            )} — ${esc(
              d.document_type || d.type || "tipo identificato automaticamente"
            )}</div>`
        )
        .join("") ||
        `<div><i>✓</i> Documento analizzato automaticamente.</div>`}
    </div>
  </div>
</section>

<section class="section">

  <div class="st">
    LAVORATORE E DATORE DI LAVORO
    <span>العامل والمشغّل</span>
  </div>

  <div class="sb grid2">

    <div class="field">
      <div class="label">Lavoratore</div>
      <div class="value">
        ${val(worker.name || client.name)}
      </div>
    </div>

    <div class="field">
      <div class="label">Nazionalità</div>
      <div class="value">
        ${val(worker.nationality || client.nationality)}
      </div>
    </div>

    <div class="field">
      <div class="label">Passaporto</div>
      <div class="value">
        ${val(worker.passport || worker.passportNumber)}
      </div>
    </div>

    <div class="field">
      <div class="label">Data di nascita</div>
      <div class="value">
        ${val(worker.birthDate || client.birthDate)}
      </div>
    </div>

    <div class="field">
      <div class="label">Azienda / datore</div>
      <div class="value">
        ${val(employer.name || employer.company)}
      </div>
    </div>

    <div class="field">
      <div class="label">Partita IVA</div>
      <div class="value">
        ${val(employer.vat || employer.partitaIVA)}
      </div>
    </div>

    <div class="field">
      <div class="label">Codice Fiscale</div>
      <div class="value">
        ${val(employer.taxCode || employer.codiceFiscale)}
      </div>
    </div>

    <div class="field">
      <div class="label">Sede / Città</div>
      <div class="value">
        ${val(employer.address || employer.city)}
      </div>
    </div>

  </div>

</section>

<section class="section">

  <div class="st">
    CONTRATTO
    <span>العقد</span>
  </div>

  <div class="sb grid2">

    <div class="field">
      <div class="label">Tipo</div>
      <div class="value">
        ${val(data.contract?.type || data.contractType)}
      </div>
    </div>

    <div class="field">
      <div class="label">Posizione</div>
      <div class="value">
        ${val(data.contract?.position || data.position)}
      </div>
    </div>

    <div class="field">
      <div class="label">Stipendio</div>
      <div class="value">
        ${val(data.contract?.salary || data.salary)}
      </div>
    </div>

    <div class="field">
      <div class="label">Ore settimanali</div>
      <div class="value">
        ${val(data.contract?.hours || data.hours)}
      </div>
    </div>

    <div class="field">
      <div class="label">Inizio</div>
      <div class="value">
        ${val(data.contract?.startDate || data.startDate)}
      </div>
    </div>

    <div class="field">
      <div class="label">Luogo di lavoro</div>
      <div class="value">
        ${val(data.contract?.workplace || data.workplace)}
      </div>
    </div>

  </div>

</section>

<section class="section">

  <div class="st">
    RISULTATO DELLA VERIFICA
    <span>نتيجة التحقق</span>
  </div>

  <div class="sb result">

    <div class="result-main">

      <div class="icon">
        ${
          analysis.status.includes("FALSO") ||
          analysis.status.includes("INVALID")
            ? "⚠"
            : "✓"
        }
      </div>

      <h2>
        ${safeStatus}
      </h2>

      <b style="color:#b0ccd4;font-size:6pt;">
        نتيجة تحليل الوثيقة
      </b>

      <p>
        ${val(
          analysis.a.summary || analysis.a.description,
          "El sistema ha completado el análisis del documento y ha generado este informe."
        )}
      </p>

    </div>

    <div class="company">

      <div class="row">
        <b>AZIENDA / الشركة</b>
        <span>
          ${val(employer.name || employer.company)}
        </span>
      </div>

      <div class="row">
        <b>PARTITA IVA</b>
        <span>
          ${val(employer.vat || employer.partitaIVA)}
        </span>
      </div>

      <div class="row">
        <b>STATO</b>
        <span>
          ${val(employer.status, "No confirmado")}
        </span>
      </div>

      <div class="row">
        <b>FONTE</b>
        <span>
          ${val(analysis.a.source, "No indicada")}
        </span>
      </div>

    </div>

  </div>

</section>

<section class="section">

  <div class="st">
    DETTAGLI DELL'ANALISI
    <span>تفاصيل التحليل</span>
  </div>

  <div class="sb analysis">

    <div class="checks">

      ${analysis.checks
        .slice(0, 5)
        .map(
          (x: any) =>
            `<div><i>✓</i> ${esc(x)}</div>`
        )
        .join("")}

    </div>

    <div class="risk">

      <small>
        LIVELLO DI RISCHIO / مستوى المخاطر
      </small>

      <strong>
        ${safeRisk}
      </strong>

      <small>
        ${val(
          analysis.a.recommendation,
          "La decisione ufficiale corresponde alle autorità competenti."
        )}
      </small>

    </div>

  </div>

</section>

<section class="section">

  <div class="st">
    CONTROLLI IMPORTANTI
    <span>الفحوصات المهمة</span>
  </div>

  <div class="sb alerts">

    <div class="alert danger">

      <b>
        ELEMENTI SOSPETTI
      </b>

      ${itemList(
        analysis.suspicious,
        "Nessun elemento sospetto rilevato."
      )}

    </div>

    <div class="alert warn">

      <b>
        INCOERENZE
      </b>

      ${itemList(
        analysis.inconsistencies,
        "Nessuna incoerenza rilevata."
      )}

    </div>

    <div class="alert neutral">

      <b>
        DATI MANCANTI
      </b>

      ${itemList(
        analysis.missing,
        "Nessun dato obbligatorio indicato come mancante."
      )}

    </div>

  </div>

</section>

<section class="section">

  <div class="st">
    CONCLUSIONE
    <span>الخلاصة</span>
  </div>

  <div class="sb">

    <div class="conclusion">
      ${val(
        analysis.a.conclusion || analysis.a.summary,
        "El análisis documenta los elementos encontrados por el sistema."
      )}
    </div>

    <div class="conclusion ar">
      ${esc(
        analysis.a.conclusion_ar ||
          "هذا التقرير يلخص نتيجة التحليل ولا يعوض التحقق الرسمي من السلطات الإيطالية."
      )}
    </div>

    <div
      class="conclusion"
      style="margin-top:1mm"
    >
      <b>Resultado:</b>
      ${safeStatus}
    </div>

    <div class="conclusion">
      <b>Recomendación:</b>
      ${val(
        analysis.a.recommendation,
        "No tomar una decisión definitiva sin verificación oficial."
      )}
    </div>

  </div>

</section>

<section class="final-section">

  <div class="st">
    VERIFICA FINALE
    <span>التحقق النهائي</span>
  </div>

  <div class="final-grid">

    <div class="final-left">

      <div class="final-badge">

        <strong>
          ${safeStatus}
        </strong>

        <span
          style="display:block;font-size:6pt;color:#7a9ba8;"
        >
          نتيجة التحليل
        </span>

        <b>
          ${safeRisk}
        </b>

      </div>

      <div class="company-details">

        <div class="row">
          <b>Azienda / الشركة</b>
          <span>
            ${val(employer.name || employer.company)}
          </span>
        </div>

        <div class="row">
          <b>
            Partita IVA / رقم ضريبة القيمة المضافة
          </b>
          <span>
            ${val(employer.vat || employer.partitaIVA)}
          </span>
        </div>

        <div class="row">
          <b>Sede / المقرر</b>
          <span>
            ${val(employer.address || employer.city)}
          </span>
        </div>

        <div class="row">
          <b>Stato / الحالة</b>
          <span>
            ${val(employer.status, "No confirmado")}
          </span>
        </div>

      </div>

    </div>

    <div class="final-right">

      <div class="risk-level">

        <small>
          LIVELLO DI RISCHIO
        </small>

        <strong>
          ${safeRisk}
        </strong>

        <span
          style="display:block;font-size:6pt;color:#7a9ba8;"
        >
          مستوى المخاطر
        </span>

        <p>
          <b>Raccomandazione:</b>
          ${val(
            analysis.a.recommendation,
            "Verificar con una fuente oficial."
          )}
        </p>

      </div>

      <div class="sign">

        <div>
          <div class="signature">
            GestoriaCitaIA
          </div>

          <small>
            Firma Autorizzata
          </small>
        </div>

        <div class="seal">
          GESTORIA<br>
          CITAIA<br>
          VERIFICA<br>
          FLUSSI
        </div>

        <div
          style="text-align:center;font-size:5.5pt;color:#7a9ba8;"
        >
          Verifica Documentale<br>
          Internazionale
        </div>

      </div>

      <div class="final-footer">

        <b>
          GestoriaCitaIA
        </b>
        — Verifica Documentale Internazionale

        <br>

        <span
          style="font-size:4.8pt;color:#7a9ba8;"
        >
          www.gestoriacitaia.com
        </span>

        <br>

        <span style="font-size:4.8pt;">
          L'analisi documentale non sostituisce
          la verifica ufficiale delle autorità italiane.
        </span>

      </div>

    </div>

  </div>

</section>

<footer class="footer">

  <p>
    GestoriaCitaIA non è uno studio legale.<br>
    L'analisi documentale non sostituisce
    la verifica ufficiale delle autorità italiane.
  </p>

  <div class="scale">
    ⚖
  </div>

  <p class="ar">
    هذا التقرير لا يشكل استشارة قانونية.<br>
    التحليل لا يعوض التحقق الرسمي من السلطات الإيطالية.
  </p>

</footer>

</div>

</body>
</html>`;
}

async function createPdf(html: string): Promise<Buffer> {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    return Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      })
    );
  } finally {
    await browser.close();
  }
}

/* =========================================================
   EMAIL BREVO
   AHORA RECIBE EL MISMO HTML QUE SE USA PARA EL PDF
   ========================================================= */

async function sendEmail(
  to: string,
  name: string,
  reference: string,
  pdf: Buffer,
  reportHtml: string
) {
  const brevoUser = process.env.BREVO_SMTP_USER || "";
  const brevoKey = process.env.BREVO_SMTP_KEY || "";
  const fromEmail = process.env.BREVO_FROM_EMAIL || "";
  const fromName =
    process.env.BREVO_FROM_NAME || "GestoriaCitaIA";
  const replyTo = process.env.BREVO_REPLY_TO || "";

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: brevoUser,
      pass: brevoKey,
    },
  });

  await transporter.sendMail({
    from: `"${esc(fromName)}" <${fromEmail}>`,
    ...(replyTo ? { replyTo } : {}),
    to,

    subject:
      `🇮🇹🇲🇦 GestoriaCitaIA — Resultado de análisis documental ${reference}`,

    text:
      `Hola ${name || ""},\n\n` +
      `Tu informe de análisis documental Decreto Flussi ` +
      `${reference} ha sido generado automáticamente.\n\n` +
      `La puntuación corresponde al análisis de coherencia documental y no constituye una certificación oficial de autenticidad.\n\n` +
      `🇮🇹 Italia · 🇲🇦 Marruecos\n` +
      `GestoriaCitaIA`,

    /*
     * IMPORTANTE:
     * Este es EXACTAMENTE el mismo HTML usado
     * para generar el PDF.
     */
    html: reportHtml,

    attachments: [
      {
        filename:
          `Verificacion-Decreto-Flussi-${reference}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
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
    const body: AnyData = req.body || {};

    const reference = String(
      body.reference ||
        body.reportReference ||
        body.document_reference ||
        ""
    ).trim();

    if (!reference) {
      return res.status(400).json({
        ok: false,
        error: "Falta reference/document_reference.",
      });
    }

    if (!/^FLUSSI-[A-Za-z0-9-]+$/.test(reference)) {
      return res.status(400).json({
        ok: false,
        error: "Referencia FLUSSI no válida.",
      });
    }

    const client =
      body.client ||
      body.customer ||
      body;

    const email = String(
      client.email ||
        body.email ||
        ""
    ).trim();

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "Falta el email del cliente.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Falta OPENAI_API_KEY.",
      });
    }

    if (
      !process.env.BREVO_SMTP_USER ||
      !process.env.BREVO_SMTP_KEY ||
      !process.env.BREVO_FROM_EMAIL
    ) {
      return res.status(500).json({
        ok: false,
        error:
          "Faltan BREVO_SMTP_USER, BREVO_SMTP_KEY o BREVO_FROM_EMAIL en Vercel.",
      });
    }

    const suppliedDocuments = Array.isArray(body.documents)
      ? body.documents
      : Array.isArray(body.files)
        ? body.files
        : [];

    const fileRefs = await listReferenceDocuments(
      reference,
      suppliedDocuments
    );

    if (!fileRefs.length) {
      return res.status(400).json({
        ok: false,
        error:
          `No se encontraron documentos para ${reference} en ${FLUSSI_BUCKET}.`,
      });
    }

    if (fileRefs.length > 5) {
      return res.status(400).json({
        ok: false,
        error: "Máximo 5 documentos por verificación.",
      });
    }

    console.log(
      `🔎 FLUSSI DOCUMENT-ONLY: ${reference} — ${fileRefs.length} documentos`
    );

    const analyzedDocuments: any[] = [];

    for (const ref of fileRefs) {
      console.log(`📄 Analizando: ${ref.path}`);

      const downloaded = await downloadPrivateDocument(
        ref.path,
        ref.mimeType
      );

      const result = await analyzeSingleDocument({
        name: ref.name,
        mimeType: downloaded.mimeType,
        buffer: downloaded.buffer,
      });

      analyzedDocuments.push({
        ...result,
        storage_path: ref.path,
      });
    }

    console.log(
      `🤖 Comparando ${analyzedDocuments.length} documentos: ${reference}`
    );

    const comparison = await compareDocuments(
      analyzedDocuments
    );

    /*
     * Official verification:
     * only use an explicitly configured authorized endpoint.
     * Never pretend that visual AI analysis is official verification.
     */
    let officialVerification =
      comparison?.official_verification || {
        configured: false,
        confirmed: null,
        source: null,
        message:
          "No se ha configurado una comprobación oficial automática.",
      };

    const officialUrl =
      process.env.FLUSSI_OFFICIAL_VERIFY_URL || "";

    if (
      officialUrl &&
      (comparison?.document?.nullaOsta ||
        comparison?.document?.applicationNumber ||
        comparison?.document?.protocol)
    ) {
      try {
        const officialResponse = await fetch(
          officialUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(process.env.FLUSSI_OFFICIAL_VERIFY_SECRET
                ? {
                    Authorization:
                      `Bearer ${process.env.FLUSSI_OFFICIAL_VERIFY_SECRET}`,
                  }
                : {}),
            },
            body: JSON.stringify({
              reference,
              worker_name:
                comparison?.worker?.name || null,
              employer_name:
                comparison?.employer?.name || null,
              partita_iva:
                comparison?.employer?.vat || null,
              codice_fiscale:
                comparison?.employer?.taxCode || null,
              nulla_osta_number:
                comparison?.document?.nullaOsta || null,
              application_number:
                comparison?.document?.applicationNumber || null,
              protocol_number:
                comparison?.document?.protocol || null,
            }),
          }
        );

        const officialData = await officialResponse.json();

        officialVerification = {
          configured: true,
          confirmed:
            officialData?.confirmed === true
              ? true
              : officialData?.confirmed === false
                ? false
                : null,
          source:
            officialData?.source ||
            "Official Italian authority / authorized service",
          message:
            officialData?.message ||
            "La fuente oficial no devolvió una confirmación concluyente.",
        };
      } catch (officialError: any) {
        console.error(
          "OFFICIAL FLUSSI CHECK ERROR:",
          officialError
        );

        officialVerification = {
          configured: true,
          confirmed: null,
          source:
            "Official Italian authority / authorized service",
          message:
            officialError?.message ||
            "No se pudo consultar la fuente oficial.",
        };
      }
    }

    const finalComparison = {
      ...comparison,
      official_verification: officialVerification,
    };

    const aggregateBody = buildAggregateBody(
      body,
      reference,
      analyzedDocuments,
      finalComparison
    );

    const analysis = normalizeAnalysis(
      aggregateBody
    );

    const verifyUrl =
      `${publicUrl.replace(/\/$/, "")}` +
      `/verificar?ref=${encodeURIComponent(reference)}`;

    const qrDataUrl = await QRCode.toDataURL(
      verifyUrl,
      {
        width: 300,
        margin: 1,
        errorCorrectionLevel: "M",
      }
    );

    const html = buildHtml(
      aggregateBody,
      analysis,
      reference,
      qrDataUrl
    );

    const pdf = await createPdf(html);

    await sendEmail(
      email,
      String(
        client.name ||
          client.fullName ||
          "Cliente"
      ),
      reference,
      pdf,
      html
    );

    console.log(
      `✅ FLUSSI DOCUMENT-ONLY PDF + EMAIL ENVIADO: ${email} / ${reference}`
    );

    return res.status(200).json({
      ok: true,
      sent: true,
      reference,
      email,
      document_count:
        analyzedDocuments.length,
      documents: analyzedDocuments.map(
        (d) => ({
          file_name: d.file_name,
          document_type: d.document_type,
        })
      ),
      verification_score:
        Number(
          finalComparison?.verification_score ?? 0
        ),
      risk_level:
        finalComparison?.risk_level ||
        "MEDIUM",
      status:
        finalComparison?.status ||
        "REQUIERE REVISION",
      official_verification:
        officialVerification,
      filename:
        `Verificacion-Decreto-Flussi-${reference}.pdf`,
      message:
        "Documentos analizados, comparados, PDF generado y enviado por email.",
    });
  } catch (error: any) {
    console.error(
      "❌ sendFlussiReport DOCUMENT-ONLY ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "No se pudo analizar los documentos o enviar el informe.",
    });
  }
}

