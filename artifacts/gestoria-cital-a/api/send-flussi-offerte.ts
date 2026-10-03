
import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

/* ============================================================
   GESTORIACITAIA — SEND FLUSSI OFFERTE
   VERCEL API
   SMTP BREVO
   SUPABASE
   OPENAI DARIJA
   ============================================================ */


/* ============================================================
   TYPES
   ============================================================ */

type Gender = "Mujer" | "Hombre" | "Ambos";

type OfferRow = {
  id: string;
  offer_code?: string | null;
  job_title?: string | null;
  category?: string | null;
  flussi_related?: boolean | null;
  flussi_year?: number | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  zone?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_type?: string | null;
  email_valid?: boolean | null;
  publication_date?: string | null;
  expiration_date?: string | null;
  cpi?: string | null;
  pdf_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  source_type?: string | null;
  status?: string | null;
  company_name?: string | null;
  offer_details?: string | null;
  contract_type?: string | null;
  work_type?: string | null;
  flussi_verified?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  region?: string | null;
  cpi_responsible_phone?: string | null;
  cpi_email?: string | null;
  cpi_pec?: string | null;
  gender_target?: string | null;
  details_darija?: string | null;
};

type EmailOffer = {
  jobTitle: string;
  category: string;
  companyName: string;
  publicationDate: string;
  city: string;
  province: string;
  address: string;
  phone: string;
  email: string;
  contractType: string;
  workType: string;
  offerUrl: string;
  details: string;
  detailsDarija: string;
};

type Client = {
  id: string;
  email: string;
  plan: number;
  gender_target: Gender;
  active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  send_count: number;
  created_at: string;
  updated_at: string;
};


/* ============================================================
   ENVIRONMENT
   ============================================================ */

const SUPABASE_URL =
  process.env.SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FLUSSI_LAVORO_SECRET =
  process.env.FLUSSI_LAVORO_SECRET || "";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || "";

const OPENAI_DARIJA_MODEL =
  process.env.OPENAI_DARIJA_MODEL ||
  "gpt-4.1-mini";

const SMTP_HOST =
  process.env.SMTP_HOST || "";

const SMTP_PORT =
  Number(process.env.SMTP_PORT || 587);

const SMTP_USER =
  process.env.SMTP_USER || "";

const SMTP_PASS =
  process.env.SMTP_PASS || "";

const SMTP_FROM =
  process.env.SMTP_FROM ||
  process.env.FROM_EMAIL ||
  SMTP_USER;


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function emailEsc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function value(value: unknown): string {
  return String(value ?? "").trim();
}


function normalise(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


function normalizeEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function normalizeGender(value: unknown): Gender {
  const g = normalise(value);

  if (g === "hombre") {
    return "Hombre";
  }

  if (g === "ambos") {
    return "Ambos";
  }

  return "Mujer";
}


function normalizePlan(value: unknown): number {
  const n = Number(value);

  if (Math.abs(n - 24.99) < 0.001) {
    return 24.99;
  }

  return 14.99;
}


/* ============================================================
   ENV VALIDATION
   ============================================================ */

function requireEnvironment(): void {
  const missing: string[] = [];

  if (!SUPABASE_URL) {
    missing.push("SUPABASE_URL");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!FLUSSI_LAVORO_SECRET) {
    missing.push("FLUSSI_LAVORO_SECRET");
  }

  if (!missing.length) {
    return;
  }

  throw new Error(
    `Missing environment variables: ${missing.join(", ")}`
  );
}


function requireSmtpEnvironment(): void {
  const missing: string[] = [];

  if (!SMTP_HOST) {
    missing.push("SMTP_HOST");
  }

  if (!SMTP_USER) {
    missing.push("SMTP_USER");
  }

  if (!SMTP_PASS) {
    missing.push("SMTP_PASS");
  }

  if (!SMTP_FROM) {
    missing.push("SMTP_FROM");
  }

  if (!missing.length) {
    return;
  }

  throw new Error(
    `Missing SMTP environment variables: ${missing.join(", ")}`
  );
}


/* ============================================================
   SUPABASE
   ============================================================ */

async function supabaseRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {

  requireEnvironment();

  const headers = new Headers(
    init.headers || {}
  );

  headers.set(
    "apikey",
    SUPABASE_SERVICE_ROLE_KEY
  );

  headers.set(
    "Authorization",
    `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  );

  headers.set(
    "Content-Type",
    "application/json"
  );

  return fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...init,
      headers,
    }
  );
}


/* ============================================================
   BREVO SMTP
   ============================================================ */

function createTransporter() {

  requireSmtpEnvironment();

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}


async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {

  const transporter =
    createTransporter();

  await transporter.sendMail({
    from:
      `"GestoriaCitaIA" <${SMTP_FROM}>`,

    to,

    subject,

    html,
  });
}


/* ============================================================
   SECURITY
   ============================================================ */

function checkSecret(
  req: VercelRequest,
): void {

  const received =
    String(
      req.headers[
        "x-flussi-lavoro-secret"
      ] || ""
    );

  if (
    !FLUSSI_LAVORO_SECRET ||
    received !==
      FLUSSI_LAVORO_SECRET
  ) {
    throw new Error("Unauthorized");
  }
}


/* ============================================================
   BODY
   ============================================================ */

function parseBody(
  req: VercelRequest,
): Record<string, any> {

  if (
    req.body &&
    typeof req.body === "object"
  ) {
    return req.body;
  }

  if (
    typeof req.body === "string"
  ) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}


/* ============================================================
   SUPABASE OFFERS
   ============================================================ */

async function fetchOffers(
  gender?: string,
  limitOffers = 50,
): Promise<OfferRow[]> {

  const params =
    new URLSearchParams();

  params.set(
    "select",
    [
      "id",
      "offer_code",
      "job_title",
      "category",
      "flussi_related",
      "flussi_year",
      "province",
      "city",
      "address",
      "zone",
      "phone",
      "email",
      "contact_type",
      "email_valid",
      "publication_date",
      "expiration_date",
      "cpi",
      "pdf_url",
      "source_url",
      "source_name",
      "source_type",
      "status",
      "company_name",
      "offer_details",
      "contract_type",
      "work_type",
      "flussi_verified",
      "is_active",
      "created_at",
      "updated_at",
      "region",
      "cpi_responsible_phone",
      "cpi_email",
      "cpi_pec",
      "gender_target",
      "details_darija",
    ].join(",")
  );

  params.set(
    "order",
    "created_at.desc"
  );

  params.set(
    "limit",
    String(
      Math.min(
        Math.max(
          Number(limitOffers) || 1,
          1
        ),
        50
      )
    )
  );

  const response =
    await supabaseRequest(
      `flussi_offerte?${params.toString()}`
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase offers ${response.status}: ${body.slice(0, 1000)}`
    );
  }

  const rows =
    JSON.parse(body);

  const offers: OfferRow[] =
    Array.isArray(rows)
      ? rows
      : [];

  const normalized =
    normalise(gender);

  if (
    normalized === "mujer"
  ) {
    return offers.filter(
      offer =>
        normalise(
          offer.gender_target
        ) === "mujer"
    );
  }

  if (
    normalized === "hombre"
  ) {
    return offers.filter(
      offer =>
        normalise(
          offer.gender_target
        ) === "hombre"
    );
  }

  return offers;
}


/* ============================================================
   OFFER → EMAIL
   ============================================================ */

function toEmailOffer(
  offer: OfferRow,
): EmailOffer {

  return {
    jobTitle:
      value(offer.job_title) ||
      "Offerta di lavoro",

    category:
      value(offer.category) ||
      "Offerta di lavoro",

    companyName:
      value(offer.company_name),

    publicationDate:
      value(offer.publication_date),

    city:
      value(offer.city) ||
      "—",

    province:
      value(offer.province) ||
      "—",

    address:
      value(offer.address) ||
      "Indirizzo preciso non indicato nell'offerta.",

    phone:
      value(offer.phone) ||
      value(offer.cpi_responsible_phone) ||
      "—",

    email:
      value(offer.email) ||
      value(offer.cpi_email) ||
      "—",

    contractType:
      value(offer.contract_type),

    workType:
      value(offer.work_type),

    offerUrl:
      value(offer.source_url),

    details:
      value(offer.offer_details) ||
      "Dettagli completi disponibili nell'offerta.",

    detailsDarija:
      value(offer.details_darija),
  };
}


/* ============================================================
   OPENAI DARIJA
   ============================================================ */

async function translateToDarija(
  title: string,
  details: string,
): Promise<string> {

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY missing"
    );
  }

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${OPENAI_API_KEY}`,
        },

        body:
          JSON.stringify({
            model:
              OPENAI_DARIJA_MODEL,

            input: [
              {
                role: "system",

                content: [
                  {
                    type:
                      "input_text",

                    text:
`You are a professional Moroccan Darija translator.

Translate the Italian job offer into natural Moroccan Darija written in Arabic script.

RULES:
- Preserve every factual detail.
- Never invent information.
- Do not summarize.
- Keep names, cities, companies, phone numbers, emails, URLs and official terms.
- Keep Decreto Flussi, nulla osta, CPI and CCNL unchanged.
- Use Moroccan Darija, not Modern Standard Arabic.
- Return ONLY the translation.

JOB TITLE:
${title}

FULL DETAILS:
${details}`,
                  },
                ],
              },
            ],
          }),
      }
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI ${response.status}: ${body.slice(0, 1000)}`
    );
  }

  const data =
    JSON.parse(body);

  const result =
    String(
      data?.output_text || ""
    ).trim();

  if (!result) {
    throw new Error(
      "OpenAI returned empty translation"
    );
  }

  return result;
}


/* ============================================================
   PREPARE DARIJA
   ============================================================ */

async function prepareDarija(
  offers: OfferRow[],
): Promise<EmailOffer[]> {

  const result =
    offers.map(toEmailOffer);

  let cursor = 0;

  async function worker() {

    while (true) {

      const index =
        cursor++;

      if (
        index >= result.length
      ) {
        return;
      }

      const emailOffer =
        result[index];

      if (
        emailOffer.detailsDarija
      ) {
        continue;
      }

      const source =
        offers[index];

      const translated =
        await translateToDarija(
          emailOffer.jobTitle,
          emailOffer.details
        );

      emailOffer.detailsDarija =
        translated;

      if (
        source?.id
      ) {

        const patch =
          await supabaseRequest(
            `flussi_offerte?id=eq.${encodeURIComponent(source.id)}`,
            {
              method: "PATCH",

              body:
                JSON.stringify({
                  details_darija:
                    translated,
                }),
            }
          );

        if (!patch.ok) {

          const text =
            await patch.text();

          throw new Error(
            `Supabase Darija ${patch.status}: ${text.slice(0, 1000)}`
          );
        }
      }
    }
  }

  const concurrency =
    Math.min(
      3,
      Math.max(
        1,
        result.length
      )
    );

  await Promise.all(
    Array.from(
      {
        length:
          concurrency,
      },
      () => worker()
    )
  );

  return result;
}


/* ============================================================
   DARIJA CATEGORY
   ============================================================ */

function categoryDarija(
  category: string,
): string {

  const key =
    normalise(category);

  const map: Record<string,string> = {
    agriculture:
      "الفلاحة",

    agricoltura:
      "الفلاحة",

    badante:
      "المساعدة العائلية",

    colf:
      "العمل المنزلي",

    domestico:
      "العمل المنزلي",

    pulizia:
      "النظافة",

    cleaning:
      "النظافة",

    ristorazione:
      "المطاعم",

    restaurant:
      "المطاعم",

    hotel:
      "الفنادق",

    costruzione:
      "البناء",

    construction:
      "البناء",

    factory:
      "المصانع",

    fabbrica:
      "المصانع",
  };

  return (
    map[key] ||
    category
  );
}


/* ============================================================
   EMAIL FIELD
   ============================================================ */

function field(
  label: string,
  valueText: string,
  icon: string,
): string {

  return `
<div style="
  background:#071e2e;
  border:1px solid #214b63;
  border-radius:8px;
  padding:7px;
  margin-bottom:5px;
">
  <div style="
    color:#35bfff;
    font-size:9px;
    font-weight:800;
  ">
    ${icon} ${emailEsc(label)}
  </div>

  <div style="
    color:#ffffff;
    font-size:10px;
    line-height:14px;
    margin-top:2px;
    word-break:break-word;
  ">
    ${emailEsc(valueText || "—")}
  </div>
</div>
`;
}


/* ============================================================
   EMAIL HTML
   ============================================================ */

function buildEmail(
  offers: EmailOffer[],
  recipientName: string,
): string {

  const cards =
    offers.map(
      (offer, index) => {

        const categoryAR =
          categoryDarija(
            offer.category
          );

        return `
<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  style="
    background:#061522;
    border:1px solid #1d4b63;
    border-radius:14px;
    margin-bottom:14px;
  "
>
<tr>
<td style="padding:12px;">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
>
<tr>

<td width="50%" valign="top"
    style="padding-right:5px;">

<div style="
  display:inline-block;
  background:#07543f;
  color:#45efad;
  border-radius:14px;
  padding:4px 8px;
  font-size:9px;
  font-weight:900;
">
✓ OFFERTA ${String(index + 1).padStart(2,"0")}
</div>

<div style="
  margin-top:7px;
  color:#ffffff;
  font-size:15px;
  line-height:19px;
  font-weight:900;
">
${emailEsc(offer.jobTitle)}
</div>

<div style="
  color:#9fb2bf;
  font-size:9px;
  margin-top:3px;
">
${emailEsc(offer.category)}
</div>

</td>

<td width="50%" valign="top" dir="rtl"
    style="padding-left:5px;text-align:right;">

<div style="
  display:inline-block;
  background:#07543f;
  color:#45efad;
  border-radius:14px;
  padding:4px 8px;
  font-size:9px;
  font-weight:900;
">
✓ عرض متوفر
</div>

<div style="
  margin-top:7px;
  color:#ffffff;
  font-size:15px;
  line-height:19px;
  font-weight:900;
">
${emailEsc(offer.jobTitle)}
</div>

<div style="
  color:#9fb2bf;
  font-size:9px;
  margin-top:3px;
">
${emailEsc(categoryAR)}
</div>

</td>

</tr>
</table>


<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  style="margin-top:8px;"
>
<tr>

<td width="50%" valign="top"
    style="padding-right:4px;">

${field("Città", offer.city, "📍")}
${field("Provincia", offer.province, "🏢")}
${field("Categoria", offer.category, "💼")}
${field("Posizione", offer.jobTitle, "👤")}
${field("Indirizzo", offer.address, "📌")}
${field("Responsabile", offer.phone, "📞")}
${field("Email", offer.email, "✉️")}

</td>

<td width="50%" valign="top"
    dir="rtl"
    style="padding-left:4px;">

${field("المدينة", offer.city, "📍")}
${field("الإقليم", offer.province, "🏢")}
${field("الفئة", categoryAR, "💼")}
${field("العمل", offer.jobTitle, "👤")}
${field("العنوان", offer.address, "📌")}
${field("المسؤول", offer.phone, "📞")}
${field("الإيميل", offer.email, "✉️")}

</td>

</tr>
</table>


<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  style="margin-top:7px;"
>
<tr>

<td width="50%" valign="top"
    style="padding-right:4px;">

<div style="
  background:#211f04;
  border:1px solid #d1ad22;
  border-radius:11px;
  padding:10px;
">
<div style="
  color:#ffd429;
  font-size:11px;
  font-weight:900;
  margin-bottom:6px;
">
📋 Dettagli completi
</div>

<div style="
  color:#ffffff;
  font-size:9px;
  line-height:15px;
  word-break:break-word;
">
${emailEsc(offer.details)}
</div>
</div>

</td>

<td width="50%" valign="top"
    dir="rtl"
    style="padding-left:4px;">

<div style="
  background:#211f04;
  border:1px solid #d1ad22;
  border-radius:11px;
  padding:10px;
  text-align:right;
">
<div style="
  color:#ffd429;
  font-size:11px;
  font-weight:900;
  margin-bottom:6px;
">
📋 التفاصيل كاملة
</div>

<div style="
  color:#ffffff;
  font-size:9px;
  line-height:17px;
  word-break:break-word;
">
${emailEsc(
  offer.detailsDarija ||
  "الترجمة بالدارجة غير متوفرة حاليا."
)}
</div>
</div>

</td>

</tr>
</table>

</td>
</tr>
</table>
`;
      }
    )
    .join("");


  return `
<!doctype html>

<html lang="it">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>
Decreto Flussi 2027
</title>

<style>

@media only screen and (max-width:620px){

  .container{
    width:100%!important;
    border-radius:0!important;
  }

  .column{
    display:block!important;
    width:100%!important;
    padding:0!important;
  }

}

</style>

</head>

<body style="
  margin:0;
  padding:0;
  background:#edf1f5;
  font-family:Arial,Helvetica,sans-serif;
">

<center style="
  width:100%;
  padding:18px 8px;
  background:#edf1f5;
">

<table
  class="container"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  style="
    max-width:620px;
    background:#031522;
    border:1px solid #16435c;
    border-radius:18px;
    overflow:hidden;
  "
>

<tr>
<td style="
  padding:18px;
  border-bottom:1px solid #16435c;
">

<div style="
  font-size:21px;
  font-weight:900;
  color:#ffffff;
">
gestoria<span style="color:#ffd429;">cita</span><span style="color:#24e29a;">ia</span>
</div>

<div style="
  margin-top:4px;
  font-size:9px;
  color:#ffd429;
  font-weight:900;
  letter-spacing:1px;
">
DECRETO FLUSSI 2027
</div>

<div style="
  margin-top:8px;
  font-size:24px;
">
🇮🇹 🇲🇦
</div>

</td>
</tr>


<tr>
<td style="padding:16px;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td width="50%" valign="top"
    style="padding-right:6px;">

<div style="
  color:#ffffff;
  font-size:13px;
  font-weight:900;
">
Ciao ${emailEsc(recipientName)} 👋
</div>

<div style="
  color:#c9d6de;
  font-size:10px;
  line-height:15px;
  margin-top:5px;
">
Abbiamo raccolto nuove offerte di lavoro collegate al Decreto Flussi.
</div>

</td>

<td width="50%" valign="top"
    dir="rtl"
    style="padding-left:6px;text-align:right;">

<div style="
  color:#ffffff;
  font-size:13px;
  font-weight:900;
">
مرحبا ${emailEsc(recipientName)} 👋
</div>

<div style="
  color:#c9d6de;
  font-size:10px;
  line-height:17px;
  margin-top:5px;
">
جمعنا ليك عروض عمل جديدة مرتبطة بـ Decreto Flussi.
</div>

</td>

</tr>
</table>

</td>
</tr>


<tr>
<td style="padding:0 10px 8px;">

${cards}

</td>
</tr>


<tr>
<td style="padding:10px 16px 18px;">

<div style="
  background:#211f04;
  border:1px solid #d1ad22;
  border-radius:12px;
  padding:12px;
">

<div style="
  color:#ffd429;
  font-size:11px;
  font-weight:900;
">
⚠️ AVVISO IMPORTANTE
</div>

<div style="
  color:#ffffff;
  font-size:9px;
  line-height:15px;
  margin-top:5px;
">
GestoriaCitaIA è un servizio informativo.
Non garantisce l'assunzione, il contratto di lavoro,
il nulla osta o il visto.
Le informazioni devono essere verificate direttamente
con il datore di lavoro o gli enti competenti.
</div>

<div
  dir="rtl"
  style="
    color:#ffd429;
    font-size:11px;
    font-weight:900;
    margin-top:10px;
"
>
⚠️ تنبيه مهم
</div>

<div
  dir="rtl"
  style="
    color:#ffffff;
    font-size:9px;
    line-height:17px;
    margin-top:5px;
"
>
GestoriaCitaIA غير خدمة معلوماتية كتبحث وكتعرض عروض العمل المرتبطة بـ Decreto Flussi فإيطاليا.
المعلومات خاصها تتأكد مباشرة مع المشغّل أو الجهات المختصة.
</div>

</div>

</td>
</tr>


<tr>
<td style="
  padding:15px;
  text-align:center;
  border-top:1px solid #16435c;
">

<div style="
  color:#ffffff;
  font-size:18px;
  font-weight:900;
">
gestoria<span style="color:#ffd429;">cita</span><span style="color:#24e29a;">ia</span>
</div>

<div style="
  color:#718794;
  font-size:8px;
  margin-top:4px;
">
GestoriaCitaIA · Decreto Flussi 2027
</div>

</td>
</tr>

</table>

</center>

</body>
</html>
`;
}


/* ============================================================
   CLIENTS
   ============================================================ */

async function fetchClients(
  emails?: string[],
): Promise<Client[]> {

  const params =
    new URLSearchParams();

  params.set(
    "select",
    [
      "id",
      "email",
      "plan",
      "gender_target",
      "active",
      "last_sent_at",
      "next_send_at",
      "send_count",
      "created_at",
      "updated_at",
    ].join(",")
  );

  params.set(
    "active",
    "eq.true"
  );

  params.set(
    "order",
    "created_at.asc"
  );

  if (
    emails &&
    emails.length
  ) {

    const list =
      emails
        .map(normalizeEmail)
        .filter(Boolean);

    if (list.length) {

      params.set(
        "email",
        `in.(${list
          .map(
            e => `"${e}"`
          )
          .join(",")})`
      );
    }
  }

  const response =
    await supabaseRequest(
      `flussi_email_clients?${params.toString()}`
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase clients ${response.status}: ${body.slice(0,1000)}`
    );
  }

  const rows =
    JSON.parse(body);

  return Array.isArray(rows)
    ? rows
    : [];
}


/* ============================================================
   CLIENT UPDATE
   ============================================================ */

async function markClientSent(
  client: Client,
): Promise<void> {

  const now =
    new Date();

  const next =
    new Date(
      now.getTime() +
      10 *
      24 *
      60 *
      60 *
      1000
    );

  const response =
    await supabaseRequest(
      `flussi_email_clients?id=eq.${encodeURIComponent(client.id)}`,
      {
        method: "PATCH",

        body:
          JSON.stringify({
            last_sent_at:
              now.toISOString(),

            next_send_at:
              next.toISOString(),

            send_count:
              Number(client.send_count || 0) + 1,

            updated_at:
              now.toISOString(),
          }),
      }
    );

  if (!response.ok) {

    const body =
      await response.text();

    throw new Error(
      `Client update ${response.status}: ${body.slice(0,1000)}`
    );
  }
}


/* ============================================================
   NEW OFFERS ONLY
   ============================================================ */

function filterNewOffers(
  offers: OfferRow[],
  lastSentAt:
    | string
    | null
    | undefined,
): OfferRow[] {

  if (!lastSentAt) {
    return offers;
  }

  const last =
    new Date(lastSentAt)
      .getTime();

  if (
    Number.isNaN(last)
  ) {
    return offers;
  }

  return offers.filter(
    offer => {

      const created =
        new Date(
          offer.created_at || ""
        ).getTime();

      return (
        !Number.isNaN(created) &&
        created > last
      );
    }
  );
}


/* ============================================================
   PLAN VALIDATION
   ============================================================ */

function validatePlanGender(
  gender: Gender,
  plan: number,
): void {

  if (
    gender === "Mujer" &&
    Math.abs(plan - 14.99) > 0.001
  ) {
    throw new Error(
      "Plan Mujer debe ser 14.99 €"
    );
  }

  if (
    gender === "Hombre" &&
    Math.abs(plan - 24.99) > 0.001
  ) {
    throw new Error(
      "Plan Hombre debe ser 24.99 €"
    );
  }
}


/* ============================================================
   SUBJECT
   ============================================================ */

function buildSubject(
  gender: Gender,
): string {

  if (
    gender === "Mujer"
  ) {
    return "🇮🇹 Nuove offerte Decreto Flussi — Piano Donna";
  }

  if (
    gender === "Hombre"
  ) {
    return "🇮🇹 Nuove offerte Decreto Flussi — Piano Uomo";
  }

  return "🇮🇹 Nuove offerte di lavoro — Decreto Flussi 2027";
}


/* ============================================================
   TEST EMAIL
   ============================================================ */

async function sendTestEmail(
  testEmail: string,
  gender: Gender,
  plan: number,
  limitOffers: number,
) {

  validatePlanGender(
    gender,
    plan
  );

  const offers =
    await fetchOffers(
      gender,
      limitOffers
    );

  const prepared =
    await prepareDarija(
      offers
    );

  const html =
    buildEmail(
      prepared,
      testEmail
    );

  await sendEmail(
    testEmail,
    `[TEST] ${buildSubject(gender)}`,
    html
  );

  return {
    ok: true,
    action: "test",
    testEmail,
    gender,
    plan,
    selectedOffers:
      offers.length,
    sent: 1,
    failed: 0,
  };
}


/* ============================================================
   SEND CLIENTS
   ============================================================ */

async function executeSend(
  options: {
    emails?: string[];
    gender?: Gender;
    plan?: number;
    limitOffers?: number;
    dryRun?: boolean;
  }
) {

  const gender =
    options.gender ||
    "Mujer";

  const plan =
    options.plan ||
    14.99;

  validatePlanGender(
    gender,
    plan
  );

  const clients =
    await fetchClients(
      options.emails
    );

  const selected =
    clients.filter(
      client => {

        if (
          gender !== "Ambos" &&
          client.gender_target !== gender
        ) {
          return false;
        }

        if (
          Math.abs(
            Number(client.plan) -
            Number(plan)
          ) > 0.001
        ) {
          return false;
        }

        if (
          options.emails &&
          options.emails.length
        ) {

          const requested =
            options.emails.map(
              normalizeEmail
            );

          if (
            !requested.includes(
              normalizeEmail(client.email)
            )
          ) {
            return false;
          }
        }

        return true;
      }
    );

  const allOffers =
    await fetchOffers(
      gender,
      options.limitOffers || 50
    );

  let sent = 0;
  let failed = 0;

  const errors: any[] = [];

  for (
    const client of selected
  ) {

    try {

      const offers =
        filterNewOffers(
          allOffers,
          client.last_sent_at
        );

      if (
        !offers.length
      ) {
        continue;
      }

      if (
        options.dryRun
      ) {
        continue;
      }

      const prepared =
        await prepareDarija(
          offers
        );

      const html =
        buildEmail(
          prepared,
          client.email
        );

      await sendEmail(
        client.email,
        buildSubject(
          client.gender_target
        ),
        html
      );

      await markClientSent(
        client
      );

      sent++;

    } catch (error) {

      failed++;

      errors.push({
        email:
          client.email,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  return {
    ok:
      failed === 0,

    dryRun:
      Boolean(options.dryRun),

    gender,
    plan,

    selectedOffers:
      allOffers.length,

    activeClients:
      clients.length,

    recipientsMatched:
      selected.length,

    sent,
    failed,

    errors,
  };
}


/* ============================================================
   HANDLER
   ============================================================ */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {

  try {

    if (
      req.method !== "POST"
    ) {

      res.status(405).json({
        ok: false,
        error:
          "Method not allowed",
      });

      return;
    }


    checkSecret(req);


    const body =
      parseBody(req);


    const action =
      String(
        body.action ||
        "send"
      )
        .trim()
        .toLowerCase();


    /* ========================================================
       TEST
       ======================================================== */

    if (
      action === "test"
    ) {

      const testEmail =
        normalizeEmail(
          body.testEmail
        );

      if (!testEmail) {
        throw new Error(
          "testEmail is required"
        );
      }

      const gender =
        normalizeGender(
          body.gender
        );

      const plan =
        normalizePlan(
          body.plan
        );

      const limitOffers =
        Math.min(
          Math.max(
            Number(
              body.limitOffers
            ) || 1,
            1
          ),
          50
        );

      const result =
        await sendTestEmail(
          testEmail,
          gender,
          plan,
          limitOffers
        );

      res.status(200).json(
        result
      );

      return;
    }


    /* ========================================================
       SEND
       ======================================================== */

    if (
      action === "send"
    ) {

      const gender =
        normalizeGender(
          body.gender
        );

      const plan =
        normalizePlan(
          body.plan
        );

      const emails =
        Array.isArray(body.emails)
          ? body.emails
          : undefined;

      const result =
        await executeSend({
          emails,
          gender,
          plan,
          limitOffers:
            Number(
              body.limitOffers
            ) || 50,
          dryRun:
            Boolean(body.dryRun),
        });

      res.status(
        result.ok ? 200 : 207
      ).json(result);

      return;
    }


    /* ========================================================
       STATUS
       ======================================================== */

    if (
      action === "status"
    ) {

      const clients =
        await fetchClients();

      res.status(200).json({
        ok: true,
        clients: clients.map(
          client => ({
            email:
              client.email,

            plan:
              client.plan,

            gender:
              client.gender_target,

            active:
              client.active,

            last_sent_at:
              client.last_sent_at,

            next_send_at:
              client.next_send_at,

            send_count:
              client.send_count,
          })
        ),
      });

      return;
    }


    throw new Error(
      `Unknown action: ${action}`
    );

  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "FLUSSI API ERROR:",
      error
    );

    const status =
      message === "Unauthorized"
        ? 401
        : 500;

    res.status(status).json({
      ok: false,
      error: message,
    });
  }
}
