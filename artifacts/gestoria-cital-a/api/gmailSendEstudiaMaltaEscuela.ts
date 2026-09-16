import chromium from "@sparticuz/chromium";
import {
  chromium as playwrightChromium,
} from "playwright-core";
import nodemailer from "nodemailer";

type SchoolData = Record<string, unknown>;

// ============================================================
// EMAIL ESCUELA
// ============================================================

const SCHOOL_EMAIL =
  process.env.ESTUDIA_MALTA_SCHOOL_EMAIL ||
  "gestoriacitaia@gmail.com";

// ============================================================
// LOGO GESTORIACITAIA
// ============================================================

const LOGO_URL =
  process.env.GESTORIA_LOGO_URL ||
  `${
    process.env.NEXT_PUBLIC_URL ||
    "https://gestoriacitaia.com"
  }/images/gestoriacitaia-logo.png`;

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value: unknown = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanFileName(value: unknown) {
  return String(value || "Cliente")
    .trim()
    .replace(/[^a-zA-Z0-9À-ÿ _-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Cliente";
}

function displayValue(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function labelFor(key: string) {
  const labels: Record<string, string> = {
    fullName: "Nombre y apellidos",
    dateOfBirth: "Fecha de nacimiento",
    placeOfBirth: "Lugar de nacimiento",
    nationality: "Nacionalidad",
    passportNumber: "Número de pasaporte",
    passportExpiry: "Caducidad del pasaporte",
    address: "Dirección",
    whatsapp: "WhatsApp / Teléfono",
    email: "Email del cliente",

    hasBac: "Tiene Bachillerato",
    bacYear: "Año del Bachillerato",
    lastDiploma: "Último diploma",
    otherDiplomas: "Otros diplomas",
    otherDiplomasDetails:
      "Detalles de otros diplomas",

    isWorking: "Está trabajando",
    company: "Empresa",
    jobTitle: "Puesto de trabajo",
    isStudent: "Es estudiante",

    hasFinancialSponsor:
      "Tiene patrocinador económico",

    sponsorName:
      "Nombre del patrocinador",

    sponsorRelation:
      "Relación con el patrocinador",

    sponsorProfession:
      "Profesión del patrocinador",

    sponsorIncome:
      "Ingresos del patrocinador",

    sponsorCountry:
      "País del patrocinador",

    previouslyAppliedVisa:
      "Ha solicitado un visado anteriormente",

    previousVisaCountry:
      "País del visado anterior",

    previousVisaType:
      "Tipo de visado anterior",

    previousVisaDate:
      "Fecha del visado anterior",

    visaRefused:
      "Visado rechazado",

    refusalCountry:
      "País del rechazo",

    refusalDate:
      "Fecha del rechazo",

    refusalReason:
      "Motivo del rechazo",

    previouslyObtainedVisa:
      "Ha obtenido un visado anteriormente",

    previousObtainedVisaDetails:
      "Detalles del visado obtenido anteriormente",

    nivelIngles:
      "Nivel de inglés",

    otrosIdiomas:
      "Otros idiomas",

    profesion:
      "Profesión",

    anosExperiencia:
      "Años de experiencia",

    estudios:
      "Estudios",

    carnetConducir:
      "Carnet de conducir",

    tieneCv:
      "Tiene CV",

    puestoBusca:
      "Puesto que busca",

    disponibilidadViajar:
      "Disponibilidad para viajar",

    fechaDisponible:
      "Fecha disponible",

    countryOfResidence:
      "País de residencia",

    paisResidencia:
      "País de residencia",

    plan:
      "Plan",

    pdfUrl:
      "PDF del formulario",
  };

  return (
    labels[key] ||
    key
      .replace(
        /([a-z])([A-Z])/g,
        "$1 $2"
      )
      .replace(/_/g, " ")
      .replace(/^./, (m) =>
        m.toUpperCase()
      )
  );
}

function shouldIncludeField(
  key: string,
  value: unknown
) {
  const internal = new Set([
    "stripe_session_id",
    "stripe_customer_id",
    "stripeSessionId",
    "stripeCustomerId",
    "paid",
    "test",
    "service",
    "userId",
  ]);

  if (internal.has(key)) {
    return false;
  }

  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  );
}

function getRows(data: SchoolData) {
  return Object.entries(data)
    .filter(([key, value]) =>
      shouldIncludeField(key, value)
    )
    .map(([key, value]) => ({
      key,
      label: labelFor(key),
      value: displayValue(value),
    }));
}

// ============================================================
// HTML DEL EMAIL DE LA ESCUELA
// ============================================================

function buildSchoolEmailHtml(
  data: SchoolData
) {
  const rows = getRows(data);

  const tableRows =
    rows
      .map(
        (row) => `
<tr>

<td style="
padding:9px 10px;
border-bottom:1px solid #e5e7eb;
background:#f8fafc;
font-weight:700;
color:#475467;
width:38%;
">

${escapeHtml(row.label)}

</td>

<td style="
padding:9px 10px;
border-bottom:1px solid #e5e7eb;
color:#111827;
word-break:break-word;
">

${escapeHtml(row.value)}

</td>

</tr>
`
      )
      .join("");

  const name =
    escapeHtml(
      data.fullName ||
      data.name ||
      "Cliente"
    );

  return `
<!doctype html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>
Solicitud Estudios Malta 2027
</title>

</head>

<body style="
margin:0;
padding:24px;
background:#eef2f7;
font-family:Arial,Helvetica,sans-serif;
color:#172033;
">

<table
width="100%"
cellpadding="0"
cellspacing="0"
>

<tr>

<td align="center">

<table
width="720"
cellpadding="0"
cellspacing="0"
style="
max-width:720px;
width:100%;
background:#fff;
border-radius:16px;
overflow:hidden;
"
>

<!-- HEADER -->

<tr>

<td style="
background:#07111f;
padding:25px;
text-align:center;
border-bottom:4px solid #20d46b;
">

<img
src="${escapeHtml(LOGO_URL)}"
alt="GestoriaCitaIA"
style="
width:250px;
max-width:90%;
height:auto;
"
>

<h1 style="
color:#fff;
font-size:22px;
margin:16px 0 4px;
">

Nueva solicitud — Estudios Malta 2027 🇲🇹

</h1>

<p style="
color:#c4ccd8;
margin:0;
font-size:13px;
">

Datos completos enviados por el formulario

</p>

</td>

</tr>

<!-- DATOS -->

<tr>

<td style="padding:28px;">

<p style="
font-size:16px;
margin:0 0 18px;
">

<strong>Cliente:</strong>
${name}

</p>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #dfe6ef;
border-collapse:collapse;
"
>

${tableRows}

</table>

</td>

</tr>

<!-- FOOTER -->

<tr>

<td style="
background:#07111f;
padding:15px;
text-align:center;
color:#aeb9c8;
font-size:11px;
">

<strong style="color:#fff;">
GestoriaCitaIA
</strong>

<br>

Estudios en Malta 2027

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`;
}

// ============================================================
// PDF ESCUELA — UNA SOLA HOJA A4
// ============================================================

function buildSchoolPdfHtml(
  data: SchoolData
) {
  const rows = getRows(data);

  const tableRows =
    rows
      .map(
        (row) => `
<tr>

<td class="label">
${escapeHtml(row.label)}
</td>

<td class="val">
${escapeHtml(row.value)}
</td>

</tr>
`
      )
      .join("");

  return `
<!doctype html>

<html lang="es">

<head>

<meta charset="UTF-8">

<style>

@page{
size:A4;
margin:0;
}

*{
box-sizing:border-box;
}

html,
body{
margin:0;
padding:0;
width:210mm;
height:297mm;
}

body{
font-family:Arial,Helvetica,sans-serif;
background:#fff;
color:#172033;
}

.page{
width:210mm;
height:297mm;
overflow:hidden;
position:relative;
background:#fff;
}

.header{
height:36mm;
background:#07111f;
color:#fff;
padding:5mm 9mm 3mm;
text-align:center;
border-bottom:1.5mm solid #20d46b;
}

.logo{
width:60mm;
height:11mm;
object-fit:contain;
display:block;
margin:0 auto 1mm;
}

h1{
font-size:14pt;
margin:1mm 0;
font-weight:800;
}

.sub{
font-size:7.5pt;
color:#c4ccd8;
}

.content{
padding:4mm 8mm 13mm;
}

.title{
font-size:10pt;
font-weight:800;
margin:0 0 2.5mm;
}

.table{
width:100%;
border-collapse:collapse;
table-layout:fixed;
}

.table td{
border:1px solid #dfe6ef;
padding:1.15mm 1.8mm;
vertical-align:top;
line-height:1.15;
word-break:break-word;
}

.label{
width:34%;
background:#f3f6fa;
color:#475467;
font-size:6.4pt;
font-weight:700;
}

.val{
width:66%;
font-size:6.6pt;
color:#111827;
}

.footer{
position:absolute;
left:0;
right:0;
bottom:0;
height:9mm;
background:#07111f;
color:#aeb9c8;
text-align:center;
padding:1.6mm;
font-size:5.8pt;
line-height:1.25;
}

.footer strong{
color:#fff;
font-size:7pt;
}

</style>

</head>

<body>

<div class="page">

<header class="header">

<img
class="logo"
src="${escapeHtml(LOGO_URL)}"
>

<h1>
Solicitud de Estudios en Malta 2027 🇲🇹
</h1>

<div class="sub">
Ficha completa del candidato
</div>

</header>

<main class="content">

<p class="title">
Datos completos del formulario
</p>

<table class="table">

${tableRows}

</table>

</main>

<footer class="footer">

<strong>
GestoriaCitaIA
</strong>

<br>

Estudios en Malta 2027

</footer>

</div>

</body>

</html>
`;
}

// ============================================================
// CREAR PDF A4
// ============================================================

async function createSchoolOnePagePdf(
  data: SchoolData
) {
  const browser =
    await playwrightChromium.launch({
      args: chromium.args,

      executablePath:
        await chromium.executablePath(),

      headless: true,
    });

  try {

    const page =
      await browser.newPage({

        viewport: {
          width: 794,
          height: 1123,
        },

        deviceScaleFactor: 1,

      });

    await page.setContent(
      buildSchoolPdfHtml(data),
      {
        waitUntil: "networkidle",
      }
    );

    await page.emulateMedia({
      media: "screen",
    });

    const pdfBuffer =
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

        pageRanges: "1",

        scale: 1,

      });

    if (
      !pdfBuffer ||
      pdfBuffer.length < 10000
    ) {
      throw new Error(
        "El PDF de la escuela no es válido."
      );
    }

    return pdfBuffer;

  } finally {

    await browser.close();

  }
}

// ============================================================
// FUNCIÓN PÚBLICA
// ============================================================

export async function sendEstudiaMaltaEscuelaEmail(
  formData: SchoolData
) {

  const data = {
    ...formData,
  };

  const fullName =
    String(
      data.fullName ??
      data.name ??
      "Cliente"
    ).trim();

  const email =
    String(
      data.email ?? ""
    )
      .trim()
      .toLowerCase();

  const whatsapp =
    String(
      data.whatsapp ?? ""
    ).trim();

  if (!fullName) {
    throw new Error(
      "No se ha recibido el nombre del cliente."
    );
  }

  if (!process.env.GMAIL_USER) {
    throw new Error(
      "GMAIL_USER no está configurado."
    );
  }

  if (!process.env.GMAIL_PASS) {
    throw new Error(
      "GMAIL_PASS no está configurado."
    );
  }

  console.log(
    "========================================="
  );

  console.log(
    "🏫 GMAIL ESCUELA — ESTUDIOS MALTA 2027"
  );

  console.log(
    "========================================="
  );

  console.log(
    "Cliente:",
    fullName
  );

  console.log(
    "Email cliente:",
    email
  );

  console.log(
    "WhatsApp:",
    whatsapp
  );

  console.log(
    "Destino escuela:",
    SCHOOL_EMAIL
  );

  console.log(
    "Campos:",
    getRows(data).length
  );

  // ==========================================================
  // PDF
  // ==========================================================

  const pdfBuffer =
    await createSchoolOnePagePdf(
      data
    );

  const pdfFileName =
    `GestoriaCitaIA-Estudios-Malta-2027-ESCUELA-${cleanFileName(fullName)}.pdf`;

  // ==========================================================
  // GMAIL SMTP
  // ==========================================================

  const transporter =
    nodemailer.createTransport({

      host: "smtp.gmail.com",

      port: 587,

      secure: false,

      requireTLS: true,

      auth: {

        user:
          process.env.GMAIL_USER,

        pass:
          process.env.GMAIL_PASS,

      },

      connectionTimeout: 15000,

      greetingTimeout: 15000,

      socketTimeout: 20000,

    });

  await transporter.verify();

  // ==========================================================
  // ENVIAR A ESCUELA
  // ==========================================================

  const info =
    await transporter.sendMail({

      from:
        `"GestoriaCitaIA" <${process.env.GMAIL_USER}>`,

      to:
        SCHOOL_EMAIL,

      subject:
        `🇲🇹 Nueva solicitud Estudios Malta 2027 · ${fullName}`,

      html:
        buildSchoolEmailHtml(data),

      attachments: [

        {

          filename:
            pdfFileName,

          content:
            pdfBuffer,

          contentType:
            "application/pdf",

          contentDisposition:
            "attachment",

        },

      ],

    });

  console.log(
    "✅ EMAIL ESCUELA + PDF ENVIADOS"
  );

  console.log(
    "Message ID:",
    info.messageId
  );

  console.log(
    "Destino:",
    SCHOOL_EMAIL
  );

  console.log(
    "PDF: 1 página A4"
  );

  console.log(
    "========================================="
  );

  return {

    messageId:
      info.messageId,

    schoolEmail:
      SCHOOL_EMAIL,

    pdfFileName,

    pdfPages: 1,

    fields:
      getRows(data).length,

  };
}
