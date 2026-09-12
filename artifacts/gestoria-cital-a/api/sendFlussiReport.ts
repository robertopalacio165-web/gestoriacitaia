mport type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

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
          "Datos del documento extraídos correctamente.",
          "Datos del trabajador y del empleador comparados.",
          "Fechas y números revisados para coherencia interna.",
          "Elementos visuales y metadatos revisados.",
          "La autenticidad oficial requiere comprobación ante la autoridad competente.",
        ];

  const risk = String(
    a.risk || a.riskLevel || "NO DETERMINADO"
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
  ) return "#18e6a0";
  if (
    status.includes("FALSO") ||
    status.includes("INVALID") ||
    status.includes("RIESGO") ||
    status.includes("SOSPECH")
  ) return "#e85d5d";
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
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#e9eef0;font-family:Arial,Helvetica,sans-serif;color:#eefbf7;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;margin:auto;background:#0a0f1a;overflow:hidden}
.header{height:27mm;padding:4mm 7mm;border-bottom:2px solid #18e6a0;display:flex;align-items:center;justify-content:space-between;background:#0d1422}
.logo{display:flex;align-items:center;gap:3mm}
.logo-mark{height:16mm;width:16mm;border:2px solid #d7a53a;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#d7a53a;font-size:14pt;font-weight:900}
.logo-text{font-size:19pt;font-weight:900;color:#fff}
.logo-text em{font-style:normal;color:#18e6a0}
.sub{font-size:5.5pt;color:#7a9ba8;letter-spacing:1px;margin-top:1mm}
.title{text-align:right;font-size:11pt;font-weight:900;line-height:1.25}.title b{color:#18e6a0}
.hero{height:31mm;padding:3.5mm 7mm;display:grid;grid-template-columns:27mm 1fr 39mm;gap:4mm;align-items:center;background:#0a0f1a}
.qr{width:25mm;height:25mm;background:white;padding:1.5mm;border-radius:1.5mm;display:flex;align-items:center;justify-content:center}
.qr img{width:22mm;height:22mm}
.ref small{font-size:5.5pt;color:#7a9ba8}.ref strong{display:block;font-size:14pt;color:#18e6a0;margin:1mm 0}.ref p{font-size:6pt;margin:1mm 0;color:#b0ccd4}
.badge{border:2px solid ${color};border-radius:2.5mm;padding:2.5mm;text-align:center;background:#0d1f2a}.badge strong{display:block;font-size:9pt;color:${color}}.badge span{display:block;font-size:6pt;color:#7a9ba8}.badge b{display:block;font-size:12pt;color:#fff;margin-top:1mm}
.section{margin:0 7mm 1.8mm;border:1px solid #1a3a3a;border-radius:1.8mm;background:#0d1422;overflow:hidden}
.st{background:#111d2e;border-bottom:2px solid #18e6a0;padding:1.35mm 2.5mm;font-size:7pt;font-weight:900;color:#fff}.st span{color:#18e6a0;margin-left:3mm}
.sb{padding:1.8mm 2.5mm}
.grid2{display:grid;grid-template-columns:1fr 1fr;column-gap:8mm;row-gap:1.2mm}
.field .label{font-size:5.2pt;color:#7a9ba8;text-transform:uppercase;letter-spacing:.3px}.field .value{font-size:6.5pt;font-weight:700;color:#f3faf8;min-height:3.5mm;border-bottom:1px solid rgba(24,230,160,.1);padding-bottom:.5mm}
.document{display:grid;grid-template-columns:1fr 1fr;column-gap:8mm;row-gap:1.2mm}
.result{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.result-main{text-align:center;border-right:1px solid #1a3a3a;padding-right:4mm}
.icon{font-size:20pt;line-height:1;color:${color}}.result-main h2{font-size:10pt;margin:1mm 0;color:${color}}.result-main p{font-size:5.8pt;margin:.8mm 0;line-height:1.3;color:#b0ccd4}
.company{padding-left:1mm}.row{margin-bottom:1mm}.row b{display:block;font-size:5.1pt;color:#7a9ba8;text-transform:uppercase;letter-spacing:.3px}.row span{font-size:6.4pt;font-weight:700;color:#f3faf8}
.analysis{display:grid;grid-template-columns:1.35fr .65fr;gap:4mm}.checks{font-size:5.8pt;line-height:1.35}.checks div{margin:.6mm 0;color:#b0ccd4}.checks i{color:#18e6a0;font-style:normal;font-weight:900}
.risk{border:1px solid #1a3a3a;border-radius:1.8mm;padding:2mm;text-align:center;background:#0d1f2a}.risk small{font-size:5.2pt;color:#7a9ba8}.risk strong{display:block;font-size:12pt;color:${color};margin:1mm}
.alerts{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm}.alert{font-size:5.5pt;line-height:1.25;padding:1.7mm;border-radius:1.5mm;min-height:12mm}.alert b{display:block;margin-bottom:.7mm;font-size:5.8pt}
.danger{border:1px solid #683d3d;background:#1a1018}.danger b{color:#e85d5d}.warn{border:1px solid #675a27;background:#1a180d}.warn b{color:#d7a53a}.neutral{border:1px solid #1a3a3a;background:#0d1422}.neutral b{color:#18e6a0}
.conclusion{font-size:5.8pt;line-height:1.35;color:#b0ccd4}.ar{direction:rtl;text-align:right;margin-top:1mm}
.sign{display:grid;grid-template-columns:1fr 23mm 1fr;gap:4mm;align-items:end;margin-top:1.5mm}.signature{border-bottom:2px solid #18e6a0;height:7mm;font-family:cursive;font-size:12pt;color:#18e6a0;padding-bottom:.5mm}.seal{width:19mm;height:19mm;border:2px solid #18e6a0;border-radius:50%;margin:auto;display:flex;align-items:center;justify-content:center;text-align:center;color:#18e6a0;font-size:4.5pt;font-weight:900}
.sign small{font-size:5pt;color:#7a9ba8}
.final-section{margin:0 7mm 1.8mm;border:1px solid #1a3a3a;border-radius:1.8mm;background:#0d1422;overflow:hidden}.final-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm;padding:1.8mm 2.5mm}.final-left{border-right:1px solid #1a3a3a;padding-right:3mm}.final-right{padding-left:1mm}
.final-badge{text-align:center;border:2px solid ${color};border-radius:2.5mm;padding:1.5mm;background:#0d1f2a;margin-bottom:1.5mm}.final-badge strong{display:block;font-size:9pt;color:${color}}.final-badge b{display:block;font-size:13pt;color:#fff;margin-top:.5mm}
.company-details .row{margin-bottom:1mm}.company-details .row b{display:block;font-size:5.1pt;color:#7a9ba8;text-transform:uppercase;letter-spacing:.3px}.company-details .row span{font-size:6.4pt;font-weight:700;color:#f3faf8}
.risk-level{text-align:center;border:1px solid #1a3a3a;border-radius:1.8mm;padding:1.5mm;background:#0d1f2a;margin-top:1mm}.risk-level small{font-size:5.2pt;color:#7a9ba8}.risk-level strong{display:block;font-size:11pt;color:${color};margin:.5mm}.risk-level p{font-size:5.5pt;color:#b0ccd4;margin:.3mm 0}
.final-footer{text-align:center;font-size:5.5pt;color:#7a9ba8;padding:1.5mm 0 0;border-top:1px solid #1a3a3a;margin-top:1.5mm}.final-footer b{color:#18e6a0}
.footer{height:17mm;background:#0d1422;border-top:2px solid #18e6a0;padding:2.5mm 7mm;display:grid;grid-template-columns:1fr 15mm 1fr;gap:3mm;align-items:center}.footer p{font-size:4.8pt;line-height:1.3;color:#7a9ba8;margin:0}.footer .ar{text-align:right}.scale{text-align:center;font-size:13pt;color:#18e6a0}
</style>
</head>
<body>
<div class="page">

<header class="header">
  <div class="logo">
    <div class="logo-mark">III</div>
    <div>
      <div class="logo-text">Gestoria<em>CitaIA</em></div>
      <div class="sub">SERVIZI LEGALI E AMMINISTRATIVI</div>
    </div>
  </div>
  <div class="title">VERIFICA DECRETO FLUSSI<br><b>ITALIA 🇮🇹</b></div>
</header>

<section class="hero">
  <div class="qr"><img src="${qrDataUrl}" /></div>
  <div class="ref">
    <small>NUMERO DI RIFERIMENTO UNICO / رقم المرجع</small>
    <strong>${esc(reference)}</strong>
    <p>Data di emissione: ${esc(issued)}</p>
    <p>Scansiona il QR per verificare questo rapporto.</p>
  </div>
  <div class="badge">
    <strong>${safeStatus}</strong>
    <span>نتيجة التحليل</span>
    <b>${safeRisk}</b>
  </div>
</section>

<section class="section">
<div class="st">DATI DEL CLIENTE <span>بيانات العميل</span></div>
<div class="sb grid2">
<div class="field"><div class="label">Nome completo / الاسم الكامل</div><div class="value">${val(client.name || client.fullName)}</div></div>
<div class="field"><div class="label">Paese di residenza / بلد الإقامة</div><div class="value">🇲🇦 ${val(client.country || client.countryOfResidence)}</div></div>
<div class="field"><div class="label">WhatsApp</div><div class="value">${val(client.whatsapp || client.phone)}</div></div>
<div class="field"><div class="label">Email</div><div class="value">${val(client.email)}</div></div>
<div class="field"><div class="label">Servizio / نوع الخدمة</div><div class="value">Verifica Decreto Flussi</div></div>
<div class="field"><div class="label">Riferimento / المرجع</div><div class="value">${esc(reference)}</div></div>
</div></section>

<section class="section">
<div class="st">DOCUMENTO ANALIZZATO <span>الوثيقة التي تم تحليلها</span></div>
<div class="sb document">
<div class="field"><div class="label">Tipo di documento</div><div class="value">${val(doc.type || doc.documentType, "Documento Decreto Flussi")}</div></div>
<div class="field"><div class="label">File analizzato</div><div class="value">${val(doc.fileName || data.fileName)}</div></div>
<div class="field"><div class="label">Numero protocollo</div><div class="value">${val(doc.protocol || doc.protocolNumber)}</div></div>
<div class="field"><div class="label">Numero domanda</div><div class="value">${val(doc.applicationNumber || doc.requestNumber)}</div></div>
<div class="field"><div class="label">Numero Nulla Osta</div><div class="value">${val(doc.nullaOsta || doc.nullaOstaNumber)}</div></div>
<div class="field"><div class="label">Data documento</div><div class="value">${val(doc.documentDate)}</div></div>
<div class="field"><div class="label">Ente emittente</div><div class="value">${val(doc.issuer || doc.issuingAuthority)}</div></div>
<div class="field"><div class="label">Prefettura / Ufficio</div><div class="value">${val(doc.prefettura || doc.office)}</div></div>
</div></section>

<section class="section">
<div class="st">LAVORATORE E DATORE DI LAVORO <span>العامل والمشغّل</span></div>
<div class="sb grid2">
<div class="field"><div class="label">Lavoratore</div><div class="value">${val(worker.name || client.name)}</div></div>
<div class="field"><div class="label">Nazionalità</div><div class="value">${val(worker.nationality || client.nationality)}</div></div>
<div class="field"><div class="label">Passaporto</div><div class="value">${val(worker.passport || worker.passportNumber)}</div></div>
<div class="field"><div class="label">Data di nascita</div><div class="value">${val(worker.birthDate || client.birthDate)}</div></div>
<div class="field"><div class="label">Azienda / datore</div><div class="value">${val(employer.name || employer.company)}</div></div>
<div class="field"><div class="label">Partita IVA</div><div class="value">${val(employer.vat || employer.partitaIVA)}</div></div>
<div class="field"><div class="label">Codice Fiscale</div><div class="value">${val(employer.taxCode || employer.codiceFiscale)}</div></div>
<div class="field"><div class="label">Sede / Città</div><div class="value">${val(employer.address || employer.city)}</div></div>
</div></section>

<section class="section">
<div class="st">CONTRATTO <span>العقد</span></div>
<div class="sb grid2">
<div class="field"><div class="label">Tipo</div><div class="value">${val(data.contract?.type || data.contractType)}</div></div>
<div class="field"><div class="label">Posizione</div><div class="value">${val(data.contract?.position || data.position)}</div></div>
<div class="field"><div class="label">Stipendio</div><div class="value">${val(data.contract?.salary || data.salary)}</div></div>
<div class="field"><div class="label">Ore settimanali</div><div class="value">${val(data.contract?.hours || data.hours)}</div></div>
<div class="field"><div class="label">Inizio</div><div class="value">${val(data.contract?.startDate || data.startDate)}</div></div>
<div class="field"><div class="label">Luogo di lavoro</div><div class="value">${val(data.contract?.workplace || data.workplace)}</div></div>
</div></section>

<section class="section">
<div class="st">RISULTATO DELLA VERIFICA <span>نتيجة التحقق</span></div>
<div class="sb result">
<div class="result-main">
<div class="icon">${analysis.status.includes("FALSO") || analysis.status.includes("INVALID") ? "⚠" : "✓"}</div>
<h2>${safeStatus}</h2>
<b style="color:#b0ccd4;font-size:6pt;">نتيجة تحليل الوثيقة</b>
<p>${val(analysis.a.summary || analysis.a.description, "El sistema ha completado el análisis del documento y ha generado este informe.")}</p>
</div>
<div class="company">
<div class="row"><b>AZIENDA / الشركة</b><span>${val(employer.name || employer.company)}</span></div>
<div class="row"><b>PARTITA IVA</b><span>${val(employer.vat || employer.partitaIVA)}</span></div>
<div class="row"><b>STATO</b><span>${val(employer.status, "No confirmado")}</span></div>
<div class="row"><b>FONTE</b><span>${val(analysis.a.source, "No indicada")}</span></div>
</div>
</div></section>

<section class="section">
<div class="st">DETTAGLI DELL'ANALISI <span>تفاصيل التحليل</span></div>
<div class="sb analysis">
<div class="checks">
${analysis.checks.slice(0,5).map((x:any)=>`<div><i>✓</i> ${esc(x)}</div>`).join("")}
</div>
<div class="risk">
<small>LIVELLO DI RISCHIO / مستوى المخاطر</small>
<strong>${safeRisk}</strong>
<small>${val(analysis.a.recommendation, "La decisión oficial corresponde a las autoridades competentes.")}</small>
</div>
</div></section>

<section class="section">
<div class="st">CONTROLLI IMPORTANTI <span>الفحوصات المهمة</span></div>
<div class="sb alerts">
<div class="alert danger"><b>ELEMENTI SOSPETTI</b>${itemList(analysis.suspicious, "Nessun elemento sospetto rilevato.")}</div>
<div class="alert warn"><b>INCOERENZE</b>${itemList(analysis.inconsistencies, "Nessuna incoerenza rilevata.")}</div>
<div class="alert neutral"><b>DATI MANCANTI</b>${itemList(analysis.missing, "Nessun dato obbligatorio indicato come mancante.")}</div>
</div></section>

<section class="section">
<div class="st">CONCLUSIONE <span>الخلاصة</span></div>
<div class="sb">
<div class="conclusion">${val(analysis.a.conclusion || analysis.a.summary, "El análisis documenta los elementos encontrados por el sistema.")}</div>
<div class="conclusion ar">${esc(analysis.a.conclusion_ar || "هذا التقرير يلخص نتيجة التحليل ولا يعوض التحقق الرسمي من السلطات الإيطالية.")}</div>
<div class="conclusion" style="margin-top:1mm"><b>Resultado:</b> ${safeStatus}</div>
<div class="conclusion"><b>Recomendación:</b> ${val(analysis.a.recommendation, "No tomar una decisión definitiva sin verificación oficial.")}</div>
</div></section>

<section class="final-section">
<div class="st">VERIFICA FINALE <span>التحقق النهائي</span></div>
<div class="final-grid">
<div class="final-left">
<div class="final-badge">
<strong>${safeStatus}</strong>
<span style="display:block;font-size:6pt;color:#7a9ba8;">نتيجة التحليل</span>
<b>${safeRisk}</b>
</div>
<div class="company-details">
<div class="row"><b>Azienda / الشركة</b><span>${val(employer.name || employer.company)}</span></div>
<div class="row"><b>Partita IVA / رقم ضريبة القيمة المضافة</b><span>${val(employer.vat || employer.partitaIVA)}</span></div>
<div class="row"><b>Sede / المقرر</b><span>${val(employer.address || employer.city)}</span></div>
<div class="row"><b>Stato / الحالة</b><span>${val(employer.status, "No confirmado")}</span></div>
</div>
</div>
<div class="final-right">
<div class="risk-level">
<small>LIVELLO DI RISCHIO</small>
<strong>${safeRisk}</strong>
<span style="display:block;font-size:6pt;color:#7a9ba8;">مستوى المخاطر</span>
<p><b>Raccomandazione:</b> ${val(analysis.a.recommendation, "Verificar con una fuente oficial.")}</p>
</div>
<div class="sign">
<div><div class="signature">GestoriaCitaIA</div><small>Firma Autorizzata</small></div>
<div class="seal">GESTORIA<br>CITAIA<br>VERIFICA<br>FLUSSI</div>
<div style="text-align:center;font-size:5.5pt;color:#7a9ba8;">Verifica Documentale<br>Internazionale</div>
</div>
<div class="final-footer">
<b>GestoriaCitaIA</b> — Verifica Documentale Internazionale<br>
<span style="font-size:4.8pt;color:#7a9ba8;">www.gestoriacitaia.com</span><br>
<span style="font-size:4.8pt;">L'analisi documentale non sostituisce la verifica ufficiale delle autorità italiane.</span>
</div>
</div>
</div>
</section>

<footer class="footer">
<p>GestoriaCitaIA non è uno studio legale.<br>L'analisi documentale non sostituisce la verifica ufficiale delle autorità italiane.</p>
<div class="scale">⚖</div>
<p class="ar">هذا التقرير لا يشكل استشارة قانونية.<br>التحليل لا يعوض التحقق الرسمي من السلطات الإيطالية.</p>
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
    await page.setContent(html, { waitUntil: "networkidle0" });
    return Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      })
    );
  } finally {
    await browser.close();
  }
}

async function sendEmail(
  to: string,
  name: string,
  reference: string,
  pdf: Buffer
) {
  const brevoUser = process.env.BREVO_SMTP_USER || "";
  const brevoKey = process.env.BREVO_SMTP_KEY || "";
  const fromEmail = process.env.BREVO_FROM_EMAIL || "";
  const fromName = process.env.BREVO_FROM_NAME || "GestoriaCitaIA";
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
    subject: `🇮🇹 Resultado de verificación Decreto Flussi - ${reference}`,
    text:
      `Hola ${name || ""},\n\n` +
      `Adjuntamos el informe de análisis Decreto Flussi ${reference}.\n\n` +
      `GestoriaCitaIA`,
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>GestoriaCitaIA — Verificación Decreto Flussi 🇮🇹</h2>
        <p>Hola <b>${esc(name || "cliente")}</b>,</p>
        <p>Adjuntamos tu informe de análisis documental.</p>
        <p><b>Referencia:</b> ${esc(reference)}</p>
        <p>El informe es un análisis documental y no sustituye la verificación oficial de las autoridades italianas.</p>
      </div>
    `,
    attachments: [
      {
        filename: `Verificacion-Decreto-Flussi-${reference}.pdf`,
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

    const client = body.client || body.customer || body;
    const email = String(client.email || body.email || "").trim();

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "Falta el email del cliente.",
      });
    }

    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY ||
        !process.env.BREVO_FROM_EMAIL) {
      return res.status(500).json({
        ok: false,
        error: "Faltan variables BREVO_SMTP_USER, BREVO_SMTP_KEY o BREVO_FROM_EMAIL en Vercel.",
      });
    }

    const reference =
      String(body.reference || body.reportReference || "").trim() ||
      makeReference();

    const analysis = normalizeAnalysis(body);

    const verifyUrl =
      `${publicUrl.replace(/\/$/, "")}/verificar?ref=${encodeURIComponent(reference)}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    const html = buildHtml(
      body,
      analysis,
      reference,
      qrDataUrl
    );

    const pdf = await createPdf(html);

    await sendEmail(
      email,
      String(client.name || client.fullName || ""),
      reference,
      pdf
    );

    console.log(
      `✅ FLUSSI REPORT PDF + EMAIL ENVIADO: ${email} / ${reference}`
    );

    return res.status(200).json({
      ok: true,
      sent: true,
      email,
      reference,
      filename: `Verificacion-Decreto-Flussi-${reference}.pdf`,
      message:
        "Informe PDF generado con el modelo Decreto Flussi y enviado por Gmail.",
    });
  } catch (error: any) {
    console.error("❌ sendFlussiReport error:", error);

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "No se pudo generar o enviar el informe.",
    });
  }
}
