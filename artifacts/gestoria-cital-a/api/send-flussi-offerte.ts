import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

/* ============================================================
   GESTORIACITAIA — DECRETO FLUSSI 2027
   EMAIL PROFESIONAL GMAIL
   DESKTOP + MOBILE
   ============================================================ */

type FlussiOffertaEmail = {
  jobTitle: string;
  category?: string;
  companyName?: string;
  publicationDate?: string;
  salary?: string;
  city?: string;
  province?: string;
  address?: string;
  phone?: string;
  email?: string;
  contractType?: string;
  workType?: string;
  offerUrl?: string;
  details?: string;
  detailsDarija?: string;
};

type FlussiOfferteEmailData = {
  offers: FlussiOffertaEmail[];
  logoUrl?: string;
  recipientName?: string;
};

/* ============================================================
   HELPERS
   ============================================================ */

const emailEsc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const emailValue = (value: unknown): string => {
  const v = String(value ?? "").trim();
  return v || "";
};

const normalise = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const clean = (value: unknown, max = 500): string =>
  String(value ?? "")
    .trim()
    .slice(0, max);

/* ============================================================
   FLAGS
   ============================================================ */

const IT_FLAG =
  '<span style="display:inline-block;width:34px;height:23px;vertical-align:middle;border-radius:3px;background:linear-gradient(to right,#009246 0%,#009246 33.333%,#ffffff 33.333%,#ffffff 66.666%,#ce2b37 66.666%,#ce2b37 100%);border:1px solid #38505e;"></span>';

const MA_FLAG =
  '<span style="display:inline-block;width:34px;height:23px;vertical-align:middle;border-radius:3px;background:#c1272d;color:#006233;text-align:center;line-height:23px;font-size:14px;font-family:Arial;">★</span>';

/* ============================================================
   DARIJA CATEGORY
   ============================================================ */

function categoryDarija(category: string): string {
  const key = category.toLowerCase().trim();

  const map: Record<string, string> = {
    agriculture: "الفلاحة",
    agricoltura: "الفلاحة",
    "assistenza familiare": "المساعدة العائلية",
    family_assistance: "المساعدة العائلية",
    badante: "المساعدة العائلية",
    colf: "العمل المنزلي",
    domestico: "العمل المنزلي",
    domestic: "العمل المنزلي",
    pulizia: "النظافة",
    cleaning: "النظافة",
    ristorazione: "المطاعم",
    restaurant: "المطاعم",
    hotel: "الفنادق",
    fabbrica: "المصانع",
    factory: "المصانع",
    costruzione: "البناء",
    construction: "البناء",
    delivery: "التوصيل",
    caregiving: "رعاية الأشخاص",
  };

  return map[key] || category;
}

/* ============================================================
   CAMPO ITALIANO
   ============================================================ */

function fieldIT(
  icon: string,
  label: string,
  value: string,
  color: string,
): string {
  return `
<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="border-collapse:separate;margin:0 0 5px;"
>
<tr>

<td
  width="34"
  style="width:34px;padding:0 4px 0 0;vertical-align:middle;"
>
<div
  style="
    width:28px;
    height:28px;
    line-height:28px;
    text-align:center;
    background:#102b3e;
    border:1px solid #214b63;
    border-radius:8px;
    font-size:15px;
  "
>
${icon}
</div>
</td>

<td
  style="
    background:#071e2e;
    border:1px solid #214b63;
    border-radius:8px;
    padding:5px 7px;
    text-align:left;
    vertical-align:middle;
  "
>

<div
  style="
    font-size:9px;
    font-weight:800;
    color:${color};
    line-height:11px;
  "
>
${emailEsc(label)}
</div>

<div
  style="
    font-size:10px;
    color:#ffffff;
    line-height:14px;
    word-break:break-word;
  "
>
${emailEsc(value || "—")}
</div>

</td>

</tr>
</table>
`;
}

/* ============================================================
   CAMPO DARIJA
   ============================================================ */

function fieldAR(
  icon: string,
  label: string,
  value: string,
  color: string,
): string {
  return `
<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="border-collapse:separate;margin:0 0 5px;"
>
<tr>

<td
  dir="rtl"
  style="
    background:#071e2e;
    border:1px solid #214b63;
    border-radius:8px;
    padding:5px 7px;
    text-align:right;
    vertical-align:middle;
  "
>

<div
  style="
    font-size:9px;
    font-weight:800;
    color:${color};
    line-height:11px;
  "
>
${emailEsc(label)}
</div>

<div
  style="
    font-size:10px;
    color:#ffffff;
    line-height:14px;
    word-break:break-word;
  "
>
${emailEsc(value || "—")}
</div>

</td>

<td
  width="34"
  style="
    width:34px;
    padding:0 0 0 4px;
    vertical-align:middle;
  "
>

<div
  style="
    width:28px;
    height:28px;
    line-height:28px;
    text-align:center;
    background:#102b3e;
    border:1px solid #214b63;
    border-radius:8px;
    font-size:15px;
  "
>
${icon}
</div>

</td>

</tr>
</table>
`;
}

/* ============================================================
   EMAIL PRINCIPAL
   ============================================================ */

function buildFlussiOfferteEmail(
  data: FlussiOfferteEmailData,
): string {
  const offers = data.offers || [];
  const count = offers.length;

  const greeting =
    emailValue(data.recipientName) || "Ciao";

  const cards = offers.length
    ? offers
        .map((offer, index) => {
          const category =
            emailValue(offer.category) || "Offerta di lavoro";

          const categoryAR = categoryDarija(category);

          const title =
            emailValue(offer.jobTitle) || "Offerta di lavoro";

          const city = emailValue(offer.city) || "—";
          const province = emailValue(offer.province) || "—";
          const address = emailValue(offer.address) || "—";
          const phone = emailValue(offer.phone) || "—";
          const ido = emailValue(offer.email) || "—";

          const fullDetails =
            emailValue(offer.details) ||
            "Dettagli completi disponibili nell'offerta.";

          const detailsAR =
            emailValue(offer.detailsDarija) ||
            "تفاصيل الخدمة كاملة كاينة حسب المعطيات المتوفرة فالعرض.";

          return `

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    border-collapse:separate;
    background:#061522;
    border:1px solid #1d4b63;
    border-radius:14px;
    margin:0 0 14px;
  "
>

<tr>

<td style="padding:11px;">

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>

<tr>

<td
  width="50%"
  valign="top"
  style="padding-right:5px;"
>

<div
  style="
    display:inline-block;
    background:#07543f;
    color:#45efad;
    border-radius:14px;
    padding:4px 8px;
    font-size:9px;
    font-weight:900;
  "
>
✓ OFFERTA ${String(index + 1).padStart(2, "0")}
</div>

<div
  style="
    margin-top:7px;
    font-size:15px;
    font-weight:900;
    color:#ffffff;
    line-height:19px;
  "
>
${emailEsc(title)}
</div>

<div
  style="
    margin-top:2px;
    font-size:9px;
    color:#9fb2bf;
  "
>
${emailEsc(category)}
</div>

</td>

<td
  width="50%"
  dir="rtl"
  valign="top"
  align="right"
  style="padding-left:5px;"
>

<div
  style="
    display:inline-block;
    background:#07543f;
    color:#45efad;
    border-radius:14px;
    padding:4px 8px;
    font-size:9px;
    font-weight:900;
  "
>
✓ عرض متوفر
</div>

<div
  style="
    margin-top:7px;
    font-size:15px;
    font-weight:900;
    color:#ffffff;
    line-height:19px;
  "
>
${emailEsc(title)}
</div>

<div
  style="
    margin-top:2px;
    font-size:9px;
    color:#9fb2bf;
  "
>
${emailEsc(categoryAR)}
</div>

</td>

</tr>

</table>

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="margin-top:8px;"
>

<tr>

<td
  class="offer-col"
  width="50%"
  valign="top"
  style="padding-right:4px;"
>

${fieldIT("📍", "Città", city, "#35bfff")}

${fieldIT("🏢", "Provincia", province, "#9d7cff")}

${fieldIT("💼", "Categoria", category, "#23e69a")}

${fieldIT("👤", "Posizione", title, "#ff8a21")}

${fieldIT("📌", "Indirizzo", address, "#ff667a")}

${fieldIT("📞", "Responsabile", phone, "#23e69a")}

${fieldIT("✉️", "IDO", ido, "#a77cff")}

</td>

<td
  class="offer-col"
  width="50%"
  valign="top"
  style="padding-left:4px;"
>

${fieldAR("📍", "المدينة", city, "#35bfff")}

${fieldAR("🏢", "الإقليم", province, "#9d7cff")}

${fieldAR("💼", "الفئة", categoryAR, "#23e69a")}

${fieldAR("👤", "العمل", title, "#ff8a21")}

${fieldAR("📌", "العنوان", address, "#ff667a")}

${fieldAR("📞", "رقم المسؤول", phone, "#23e69a")}

${fieldAR("✉️", "الإيميل", ido, "#a77cff")}

</td>

</tr>

</table>

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="margin-top:7px;"
>

<tr>

<td
  class="detail-col"
  width="50%"
  valign="top"
  style="padding-right:4px;"
>

<div
  style="
    background:#211f04;
    border:1px solid #d1ad22;
    border-radius:11px;
    padding:10px;
    min-height:92px;
  "
>

<div
  style="
    font-size:11px;
    font-weight:900;
    color:#ffd429;
    margin-bottom:6px;
  "
>
📋 Dettagli completi dell'offerta
</div>

<div
  style="
    font-size:9px;
    line-height:15px;
    color:#ffffff;
    word-break:break-word;
  "
>
${emailEsc(fullDetails)}
</div>

</div>

</td>

<td
  class="detail-col"
  width="50%"
  valign="top"
  dir="rtl"
  style="padding-left:4px;"
>

<div
  style="
    background:#211f04;
    border:1px solid #d1ad22;
    border-radius:11px;
    padding:10px;
    min-height:92px;
    text-align:right;
  "
>

<div
  style="
    font-size:11px;
    font-weight:900;
    color:#ffd429;
    margin-bottom:6px;
  "
>
📋 تفاصيل الخدمة كاملة
</div>

<div
  style="
    font-size:9px;
    line-height:15px;
    color:#ffffff;
    word-break:break-word;
  "
>
${emailEsc(detailsAR)}
</div>

</div>

</td>

</tr>

</table>

</td>

</tr>

</table>

`;
        })
        .join("")
    : `
<div
  style="
    padding:30px;
    text-align:center;
    color:#ffffff;
  "
>
Nessuna nuova offerta disponibile al momento.
</div>
`;

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
Nuove offerte di lavoro — Decreto Flussi 2027
</title>

<style>

@media only screen and (max-width:620px){

  .email-wrap{
    width:100%!important;
    max-width:100%!important;
    border-radius:0!important;
  }

  .outer-pad{
    padding:0!important;
  }

  .mobile-pad{
    padding-left:10px!important;
    padding-right:10px!important;
  }

  .mobile-stack-cell{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    padding-left:0!important;
    padding-right:0!important;
  }

  .offer-col{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    padding-left:0!important;
    padding-right:0!important;
  }

  .detail-col{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    padding-left:0!important;
    padding-right:0!important;
    margin-bottom:7px!important;
  }

  .header-title{
    font-size:22px!important;
    line-height:26px!important;
  }

}

</style>

</head>

<body
  style="
    margin:0;
    padding:0;
    background:#edf1f5;
    font-family:Arial,Helvetica,sans-serif;
  "
>

<center
  class="outer-pad"
  style="
    width:100%;
    padding:18px 8px;
    background:#edf1f5;
  "
>

<table
  class="email-wrap"
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    max-width:620px;
    width:100%;
    background:#031522;
    border:1px solid #16435c;
    border-radius:18px;
    overflow:hidden;
    color:#ffffff;
  "
>

<tr>

<td
  style="
    padding:17px 16px 13px;
    border-bottom:1px solid #16435c;
  "
>

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>

<tr>

<td
  width="55%"
  valign="top"
>

<div
  style="
    font-size:20px;
    font-weight:900;
    color:#ffffff;
    line-height:23px;
  "
>
gestoria<span style="color:#ffd429;">cita</span><span style="color:#24e29a;">ia</span>
</div>

<div
  style="
    margin-top:3px;
    font-size:8px;
    font-weight:900;
    color:#ffd429;
    letter-spacing:1.3px;
  "
>
DECRETO FLUSSI 2027
</div>

<div
  style="
    margin-top:6px;
    font-size:9px;
    color:#9fb2bf;
  "
>
${IT_FLAG} &nbsp; ${MA_FLAG}
</div>

</td>

<td
  width="45%"
  valign="top"
  align="right"
>

<div
  style="
    font-size:9px;
    color:#9fb2bf;
  "
>
Nuove offerte
</div>

<div
  style="
    margin-top:2px;
    font-size:28px;
    font-weight:900;
    color:#ffd429;
    line-height:30px;
  "
>
${count}
</div>

<div
  style="
    font-size:8px;
    color:#9fb2bf;
  "
>
offerte disponibili
</div>

</td>

</tr>

</table>

</td>

</tr>

<tr>

<td
  class="mobile-pad"
  style="
    padding:16px;
  "
>

<div
  style="
    font-size:16px;
    font-weight:900;
    color:#ffffff;
    margin-bottom:4px;
  "
>
Ciao ${emailEsc(greeting)} 👋
</div>

<div
  dir="rtl"
  style="
    text-align:right;
    font-size:14px;
    font-weight:800;
    color:#ffffff;
    line-height:22px;
    margin-bottom:14px;
  "
>
سلام ${emailEsc(greeting)} 👋
كاينين ${count} عروض خدمة جديدة فإيطاليا مرتبطة بـ Decreto Flussi.
</div>

<div
  style="
    font-size:11px;
    line-height:18px;
    color:#b9c9d3;
    margin-bottom:15px;
  "
>
Abbiamo selezionato le offerte disponibili con tutti i dettagli conosciuti.
</div>

${cards}

</td>

</tr>

<tr>

<td
  style="
    padding:14px 16px 18px;
    border-top:1px solid #16435c;
  "
>

<div
  style="
    font-size:9px;
    color:#718794;
    line-height:15px;
    text-align:center;
  "
>
GestoriaCitaIA — Servizio informativo sulle opportunità di lavoro collegate al Decreto Flussi.
</div>

<div
  dir="rtl"
  style="
    margin-top:4px;
    font-size:9px;
    color:#718794;
    line-height:15px;
    text-align:center;
  "
>
GestoriaCitaIA — خدمة معلوماتية حول فرص العمل المرتبطة بـ Decreto Flussi.
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
   SUPABASE
   ============================================================ */

function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing",
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    key,
  };
}

async function supabaseRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const {
    url,
    key,
  } = getSupabaseConfig();

  const headers = new Headers(
    options.headers || {},
  );

  headers.set(
    "apikey",
    key,
  );

  headers.set(
    "Authorization",
    `Bearer ${key}`,
  );

  headers.set(
    "Content-Type",
    "application/json",
  );

  return fetch(
    `${url}/rest/v1/${path}`,
    {
      ...options,
      headers,
    },
  );
}

/* ============================================================
   SMTP
   ============================================================ */

function createTransporter() {
  const host =
    process.env.SMTP_HOST ||
    "smtp.gmail.com";

  const port =
    Number(
      process.env.SMTP_PORT || "465",
    );

  const secure =
    process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  const user =
    process.env.SMTP_USER;

  const pass =
    process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      "SMTP_USER / SMTP_PASS missing",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/* ============================================================
   TYPES
   ============================================================ */

type ClientRow = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  plan: number;
  gender_target: "Mujer" | "Hombre" | "Ambos";
  active: boolean;
  last_sent_at?: string | null;
  next_send_at?: string | null;
  send_count?: number;
  created_at?: string;
  updated_at?: string;
};

type OfferRow = {
  id: string;
  job_title?: string | null;
  category?: string | null;
  category_code?: string | null;
  company_name?: string | null;
  publication_date?: string | null;
  salary?: string | null;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  source_url?: string | null;
  contract_type?: string | null;
  work_type?: string | null;
  is_active?: boolean;
  status?: string | null;
  gender_target?: string | null;
  flussi_related?: boolean;
  created_at?: string | null;
  [key: string]: any;
};

/* ============================================================
   GET CLIENTS — NUEVA TABLA
   ============================================================ */

async function getClients(
  filters: {
    emails?: string[];
    gender?: "Mujer" | "Hombre" | "Ambos";
    plan?: number;
    limit?: number;
  } = {},
): Promise<ClientRow[]> {
  const params = new URLSearchParams();

  params.set(
    "select",
    "id,email,first_name,last_name,plan,gender_target,active,last_sent_at,next_send_at,send_count,created_at,updated_at",
  );

  params.set(
    "active",
    "eq.true",
  );

  if (filters.gender) {
    params.set(
      "gender_target",
      `eq.${filters.gender}`,
    );
  }

  if (filters.plan !== undefined) {
    params.set(
      "plan",
      `eq.${filters.plan}`,
    );
  }

  if (
    filters.emails &&
    filters.emails.length
  ) {
    const encodedEmails =
      filters.emails
        .map(
          (email) =>
            `"${email
              .replace(/"/g, '\\"')
              .trim()}"`,
        )
        .join(",");

    params.set(
      "email",
      `in.(${encodedEmails})`,
    );
  }

  params.set(
    "order",
    "created_at.asc",
  );

  if (
    filters.limit &&
    filters.limit > 0
  ) {
    params.set(
      "limit",
      String(
        Math.min(
          filters.limit,
          500,
        ),
      ),
    );
  }

  const response =
    await supabaseRequest(
      `flussi_email_clients?${params.toString()}`,
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase flussi_email_clients failed: ${response.status} ${responseText}`,
    );
  }

  const rows =
    JSON.parse(responseText);

  return (
    Array.isArray(rows)
      ? rows
      : []
  ).filter(
    (row) =>
      row.email &&
      row.active === true,
  );
}

/* ============================================================
   GET OFFERS — TODAS LAS OFERTAS FLUSSI
   ============================================================ */

async function getAllOffers(): Promise<OfferRow[]> {
  const params = new URLSearchParams();

  params.set(
    "select",
    "*",
  );

  params.set(
    "flussi_related",
    "eq.true",
  );

  params.set(
    "order",
    "created_at.asc",
  );

  const response =
    await supabaseRequest(
      `flussi_offerte?${params.toString()}`,
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase flussi_offerte failed: ${response.status} ${responseText}`,
    );
  }

  const rows =
    JSON.parse(responseText);

  return (
    Array.isArray(rows)
      ? rows
      : []
  ).filter(
    (row) =>
      row.is_active !== false &&
      normalise(row.status) !== "inactive",
  );
}

/* ============================================================
   GET OFFERS BY IDS — TEST GMAIL
   ============================================================ */

async function getOffersByIds(
  offerIds: string[],
): Promise<OfferRow[]> {
  const ids =
    offerIds
      .map(
        (id) =>
          clean(id, 100),
      )
      .filter(Boolean);

  if (!ids.length) {
    return [];
  }

  const encoded =
    ids
      .map(
        (id) =>
          `"${id.replace(/"/g, '\\"')}"`,
      )
      .join(",");

  const response =
    await supabaseRequest(
      `flussi_offerte?select=*&id=in.(${encoded})`,
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase flussi_offerte failed: ${response.status} ${responseText}`,
    );
  }

  const rows =
    JSON.parse(responseText);

  return (
    Array.isArray(rows)
      ? rows
      : []
  ).filter(
    (row) =>
      row.is_active !== false &&
      normalise(row.status) !== "inactive",
  );
}

/* ============================================================
   GENDER MATCH
   ============================================================ */

function genderMatches(
  clientGender:
    | "Mujer"
    | "Hombre"
    | "Ambos",
  offerGender: unknown,
): boolean {
  if (
    clientGender ===
    "Ambos"
  ) {
    return true;
  }

  return (
    normalise(offerGender) ===
    normalise(clientGender)
  );
}

/* ============================================================
   NEW OFFER FILTER
   ============================================================ */

function isNewForClient(
  offer: OfferRow,
  client: ClientRow,
): boolean {
  if (!client.last_sent_at) {
    return true;
  }

  if (!offer.created_at) {
    return false;
  }

  return (
    new Date(
      offer.created_at,
    ).getTime() >
    new Date(
      client.last_sent_at,
    ).getTime()
  );
}

/* ============================================================
   DELIVERED
   ============================================================ */

async function getAlreadyDelivered(
  offerIds: string[],
  emails: string[],
): Promise<Set<string>> {
  if (
    !offerIds.length ||
    !emails.length
  ) {
    return new Set<string>();
  }

  const encodedOffers =
    offerIds
      .map(
        (id) =>
          `"${id.replace(/"/g, '\\"')}"`,
      )
      .join(",");

  const encodedEmails =
    emails
      .map(
        (email) =>
          `"${email.replace(/"/g, '\\"')}"`,
      )
      .join(",");

  const response =
    await supabaseRequest(
      `flussi_deliveries?select=offer_id,email,status&offer_id=in.(${encodedOffers})&email=in.(${encodedEmails})&status=eq.sent`,
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase flussi_deliveries failed: ${response.status} ${responseText}`,
    );
  }

  const rows =
    JSON.parse(responseText);

  const delivered =
    new Set<string>();

  for (
    const row of
      Array.isArray(rows)
        ? rows
        : []
  ) {
    if (
      row.offer_id &&
      row.email
    ) {
      delivered.add(
        `${row.offer_id}::${normalise(
          row.email,
        )}`,
      );
    }
  }

  return delivered;
}

/* ============================================================
   CONVERT OFFER
   ============================================================ */

function toEmailOffer(
  row: OfferRow,
) {
  const pick = (
    ...keys: string[]
  ): string => {
    for (
      const key of keys
    ) {
      const value =
        emailValue(
          row[key],
        );

      if (value) {
        return value;
      }
    }

    return "";
  };

  const parts: string[] = [];

  const add = (
    label: string,
    ...keys: string[]
  ) => {
    const value =
      pick(...keys);

    if (value) {
      parts.push(
        `${label}: ${value}`,
      );
    }
  };

  add(
    "Contratto",
    "contract_type",
    "contract",
    "contratto",
  );

  add(
    "Tipo",
    "work_type",
    "employment_type",
    "tipo_contratto",
  );

  add(
    "Orario",
    "hours",
    "weekly_hours",
    "hours_per_week",
    "orario",
  );

  add(
    "Stipendio",
    "salary",
    "stipendio",
    "retribuzione",
    "ral",
  );

  add(
    "Posti disponibili",
    "workers",
    "number_of_workers",
    "positions",
    "posti",
  );

  add(
    "Data di inizio",
    "start_date",
    "startDate",
    "data_inizio",
  );

  add(
    "Scadenza",
    "deadline",
    "expiration_date",
    "expiry_date",
    "data_scadenza",
  );

  add(
    "Esperienza",
    "experience",
    "experience_required",
    "required_experience",
    "esperienza",
  );

  add(
    "Titolo di studio",
    "education",
    "education_required",
    "qualification",
    "titolo_studio",
  );

  add(
    "Lingue",
    "languages",
    "language_requirements",
    "lingue",
  );

  add(
    "Patente",
    "driving_license",
    "license",
    "patente",
  );

  add(
    "Requisiti",
    "requirements",
    "requirements_text",
    "requisiti",
  );

  add(
    "Mansioni",
    "description",
    "job_description",
    "offer_description",
    "duties",
    "tasks",
    "mansioni",
  );

  add(
    "Orari e riposo",
    "schedule",
    "working_hours",
    "work_schedule",
    "orari",
  );

  const rawDetails =
    pick(
      "details",
      "offer_details",
      "details_text",
      "full_description",
      "description_full",
    );

  if (
    rawDetails &&
    !parts.some(
      (part) =>
        part.includes(
          rawDetails,
        ),
    )
  ) {
    parts.push(
      rawDetails,
    );
  }

  const details =
    parts.length
      ? parts.join(" · ")
      : "Dettagli completi disponibili nell'offerta.";

  const detailsDarija =
    pick(
      "details_darija",
      "darija_details",
      "details_ar",
      "description_darija",
    ) ||
    "تفاصيل الخدمة كاملة كاينة حسب المعطيات المتوفرة فالعرض.";

  return {
    jobTitle:
      row.job_title ||
      row.title ||
      "Offerta di lavoro",

    category:
      row.category ||
      row.category_code ||
      "Offerta di lavoro",

    companyName:
      row.company_name ||
      row.employer ||
      row.employer_name ||
      "",

    publicationDate:
      row.publication_date ||
      row.published_at ||
      row.date ||
      "",

    salary:
      pick(
        "salary",
        "stipendio",
        "retribuzione",
        "ral",
      ),

    city:
      row.city ||
      row.comune ||
      row.municipality ||
      "",

    province:
      row.province ||
      "",

    address:
      row.address ||
      row.work_address ||
      row.indirizzo ||
      "",

    phone:
      row.phone ||
      row.employer_phone ||
      row.responsible_phone ||
      "",

    email:
      row.email ||
      row.employer_email ||
      row.ido_email ||
      "",

    contractType:
      row.contract_type ||
      row.contract ||
      row.contratto ||
      "",

    workType:
      row.work_type ||
      row.employment_type ||
      "",

    offerUrl:
      row.source_url ||
      row.offer_url ||
      row.url ||
      "",

    details:
      details.slice(0, 7000),

    detailsDarija:
      detailsDarija.slice(0, 5000),
  };
}
/* ============================================================
   UPDATE CLIENT AFTER SUCCESS
   ============================================================ */

async function updateClientAfterSuccess(
  client: ClientRow,
): Promise<void> {
  const now =
    new Date().toISOString();

  const nextSend =
    new Date(
      Date.now() +
        10 *
          24 *
          60 *
          60 *
          1000,
    ).toISOString();

  const currentCount =
    Number(
      client.send_count || 0,
    );

  const response =
    await supabaseRequest(
      `flussi_email_clients?id=eq.${encodeURIComponent(
        client.id,
      )}`,
      {
        method: "PATCH",

        headers: {
          Prefer:
            "return=minimal",
        },

        body:
          JSON.stringify({
            last_sent_at:
              now,

            next_send_at:
              nextSend,

            send_count:
              currentCount + 1,

            updated_at:
              now,
          }),
      },
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Could not update client ${client.email}: ${response.status} ${responseText}`,
    );
  }
}


/* ============================================================
   SAVE DELIVERY
   ============================================================ */

async function saveDelivery(
  offer: OfferRow,
  email: string,
  status: "sent" | "error",
  errorMessage?: string | null,
): Promise<void> {
  const response =
    await supabaseRequest(
      "flussi_deliveries",
      {
        method: "POST",

        headers: {
          Prefer:
            "return=minimal",
        },

        body:
          JSON.stringify({
            offer_id:
              offer.id,

            email,

            delivery_type:
              "offer_bulletin",

            status,

            sent_at:
              status === "sent"
                ? new Date().toISOString()
                : null,

            error_message:
              errorMessage
                ? errorMessage.slice(
                    0,
                    1000,
                  )
                : null,
          }),
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    console.error(
      "Delivery record failed:",
      text,
    );
  }
}


/* ============================================================
   VALIDATE CLIENT PLAN / GENDER
   ============================================================ */

function validateClientSelection(
  gender:
    | "Mujer"
    | "Hombre"
    | "Ambos"
    | undefined,
  plan:
    | number
    | undefined,
): void {
  if (
    gender ===
      "Mujer" &&
    plan !== 14.99
  ) {
    throw new Error(
      "Mujer debe utilizar el plan 14.99",
    );
  }

  if (
    gender ===
      "Hombre" &&
    plan !== 24.99
  ) {
    throw new Error(
      "Hombre debe utilizar el plan 24.99",
    );
  }

  if (
    plan !== undefined &&
    plan !== 14.99 &&
    plan !== 24.99
  ) {
    throw new Error(
      "Plan inválido. Debe ser 14.99 o 24.99",
    );
  }
}


/* ============================================================
   FILTER OFFERS FOR CLIENT
   ============================================================ */

function getOffersForClient(
  offers: OfferRow[],
  client: ClientRow,
  delivered: Set<string>,
): OfferRow[] {
  return offers.filter(
    (offer) => {
      /*
       * PRIMERO:
       * Mujer / Hombre / Ambos
       */

      if (
        !genderMatches(
          client.gender_target,
          offer.gender_target,
        )
      ) {
        return false;
      }

      /*
       * SEGUNDO:
       * Solo ofertas nuevas después del último envío.
       *
       * Si nunca recibió nada:
       * todas las ofertas correspondientes.
       */

      if (
        !isNewForClient(
          offer,
          client,
        )
      ) {
        return false;
      }

      /*
       * TERCERO:
       * Protección adicional contra duplicados.
       */

      const key =
        `${offer.id}::${normalise(
          client.email,
        )}`;

      if (
        delivered.has(key)
      ) {
        return false;
      }

      return true;
    },
  );
}


/* ============================================================
   CREATE PREVIEW
   ============================================================ */

function buildPreview(
  matches: Map<
    string,
    {
      client: ClientRow;
      offers: OfferRow[];
    }
  >,
) {
  return Array.from(
    matches.values(),
  ).map(
    (item) => ({
      email:
        item.client.email,

      name:
        `${item.client.first_name || ""} ${
          item.client.last_name || ""
        }`.trim(),

      plan:
        item.client.plan,

      gender:
        item.client.gender_target,

      lastSentAt:
        item.client.last_sent_at,

      offers:
        item.offers.length,

      offerIds:
        item.offers.map(
          (offer) =>
            offer.id,
        ),

      offerTitles:
        item.offers.map(
          (offer) =>
            offer.job_title ||
            "Offerta di lavoro",
        ),
    }),
  );
}


/* ============================================================
   GET HEADER
   ============================================================ */

function getHeaderValue(
  req: VercelRequest,
  name: string,
): string {
  const value =
    req.headers[name];

  if (
    Array.isArray(value)
  ) {
    return value[0] || "";
  }

  return value || "";
}


/* ============================================================
   HANDLER
   ============================================================ */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (
    req.method !==
    "POST"
  ) {
    return res.status(405).json({
      error:
        "Method not allowed",

      method:
        req.method,
    });
  }

  try {

    /* ========================================================
       SECURITY
       ======================================================== */

    const internalSecret =
      process.env
        .FLUSSI_LAVORO_INTERNAL_SECRET;

    if (
      internalSecret
    ) {
      const providedSecret =
        getHeaderValue(
          req,
          "x-flussi-lavoro-secret",
        );

      if (
        providedSecret !==
        internalSecret
      ) {
        return res.status(401).json({
          error:
            "Unauthorized",
        });
      }
    }


    /* ========================================================
       BODY
       ======================================================== */

    const body =
      req.body &&
      typeof req.body ===
        "object"
        ? req.body
        : {};

    const action =
      emailValue(
        body.action,
      ) || "send";

    const dryRun =
      body.dryRun === true;

    const testEmail =
      emailValue(
        body.testEmail,
      );

    const gender =
      body.gender ===
        "Mujer" ||
      body.gender ===
        "Hombre" ||
      body.gender ===
        "Ambos"
        ? body.gender
        : undefined;

    const plan =
      body.plan !==
        undefined
        ? Number(
            body.plan,
          )
        : undefined;

    const limit =
      body.limit !==
        undefined
        ? Math.max(
            1,
            Math.min(
              Number(
                body.limit,
              ),
              500,
            ),
          )
        : undefined;

    const emails =
      Array.isArray(
        body.emails,
      )
        ? body.emails
            .map(
              (
                email: unknown,
              ) =>
                emailValue(
                  email,
                ),
            )
            .filter(Boolean)
        : [];


    /* ========================================================
       VALIDATE ACTION
       ======================================================== */

    const allowedActions =
      new Set([
        "send",
        "test",
        "clients",
        "status",
      ]);

    if (
      !allowedActions.has(
        action,
      )
    ) {
      return res.status(400).json({
        ok: false,

        error:
          "Invalid action",

        allowedActions:
          Array.from(
            allowedActions,
          ),
      });
    }


    /* ========================================================
       ACTION: CLIENTS
       ======================================================== */

    if (
      action ===
      "clients"
    ) {
      const clients =
        await getClients({
          gender,
          plan,
          limit,
        });

      return res.status(200).json({
        ok: true,

        action:

          "clients",

        total:
          clients.length,

        clients:
          clients.map(
            (client) => ({
              id:
                client.id,

              email:
                client.email,

              name:
                `${client.first_name || ""} ${
                  client.last_name || ""
                }`.trim(),

              plan:
                client.plan,

              gender:
                client.gender_target,

              active:
                client.active,

              lastSentAt:
                client.last_sent_at,

              nextSendAt:
                client.next_send_at,

              sendCount:
                client.send_count || 0,

              createdAt:
                client.created_at,
            }),
          ),
      });
    }


    /* ========================================================
       ACTION: STATUS
       ======================================================== */

    if (
      action ===
      "status"
    ) {
      if (
        !emails.length
      ) {
        return res.status(400).json({
          ok: false,

          error:
            "emails is required for status",
        });
      }

      const clients =
        await getClients({
          emails,
        });

      return res.status(200).json({
        ok: true,

        action:
          "status",

        total:
          clients.length,

        clients,
      });
    }


    /* ========================================================
       TEST GMAIL
       ======================================================== */

    if (
      action ===
      "test"
    ) {
      if (
        !testEmail
      ) {
        return res.status(400).json({
          ok: false,

          error:
            "testEmail is required",
        });
      }

      validateClientSelection(
        gender,
        plan,
      );

      let offers =
        await getAllOffers();

      /*
       * TEST:
       * se viene specificato gender,
       * rispettiamo Mujer/Hombre/Ambos.
       */

      if (
        gender
      ) {
        offers =
          offers.filter(
            (offer) =>
              genderMatches(
                gender,
                offer.gender_target,
              ),
          );
      }

      /*
       * limitOffers permette:
       *
       * 10 offerte
       * 20 offerte
       * 49 offerte
       */

      const limitOffers =
        body.limitOffers !==
        undefined
          ? Math.max(
              1,
              Math.min(
                Number(
                  body.limitOffers,
                ),
                50,
              ),
            )
          : undefined;

      if (
        limitOffers
      ) {
        offers =
          offers.slice(
            0,
            limitOffers,
          );
      }

      if (
        !offers.length
      ) {
        return res.status(404).json({
          ok: false,

          error:
            "No offers found for test",
        });
      }

      const transporter =
        createTransporter();

      const from =
        process.env
          .FROM_EMAIL ||
        process.env
          .SMTP_USER;

      if (
        !from
      ) {
        throw new Error(
          "FROM_EMAIL / SMTP_USER missing",
        );
      }

      if (
        dryRun
      ) {
        return res.status(200).json({
          ok: true,

          action:
            "test",

          dryRun:
            true,

          testEmail,

          gender,

          selectedOffers:
            offers.length,

          offers:
            offers.map(
              (offer) => ({
                id:
                  offer.id,

                jobTitle:
                  offer.job_title,

                city:
                  offer.city,

                province:
                  offer.province,

                gender:
                  offer.gender_target,
              }),
            ),

          message:
            "Test Gmail pronto. Nessuna email inviata.",
        });
      }

      await transporter.verify();

      const html =
        buildFlussiOfferteEmail({
          recipientName:
            "Roberto",

          offers:
            offers.map(
              toEmailOffer,
            ),
        });

      const info =
        await transporter.sendMail({
          from:
            `"GestoriaCitaIA" <${from}>`,

          to:
            testEmail,

          subject:
            "🇮🇹 🇲🇦 Nuove offerte di lavoro — Decreto Flussi 2027",

          text:
            "Nuove offerte di lavoro — Decreto Flussi 2027\n\n" +
            `${offers.length} nuove offerte sono disponibili.`,

          html,
        });

      return res.status(200).json({
        ok: true,

        action:
          "test",

        dryRun:
          false,

        testEmail,

        gender,

        selectedOffers:
          offers.length,

        sent:
          1,

        failed:
          0,

        messageId:
          info.messageId,

        message:
          "Test Gmail inviato correttamente.",
      });
    }


    /* ========================================================
       ACTION: SEND
       ======================================================== */

    if (
      action ===
      "send"
    ) {

      /*
       * Se gender è Mujer:
       * plan deve essere 14.99
       *
       * Se gender è Hombre:
       * plan deve essere 24.99
       *
       * Ambos:
       * tutti i 49 indipendentemente dal plan.
       */

      validateClientSelection(
        gender,
        plan,
      );


      /* ======================================================
         GET CLIENTS
         ====================================================== */

      const clients =
        await getClients({
          emails:
            emails.length
              ? emails
              : undefined,

          gender,

          plan,

          limit,
        });


      /* ======================================================
         GET ALL OFFERS
         ====================================================== */

      const allOffers =
        await getAllOffers();


      if (
        !allOffers.length
      ) {
        return res.status(404).json({
          ok: false,

          error:
            "No Flussi offers found",
        });
      }


      /* ======================================================
         DELIVERED
         ====================================================== */

      const delivered =
        await getAlreadyDelivered(
          allOffers.map(
            (offer) =>
              offer.id,
          ),

          clients.map(
            (client) =>
              client.email,
          ),
        );


      /* ======================================================
         MATCHES
         ====================================================== */

      const matches =
        new Map<
          string,
          {
            client: ClientRow;
            offers: OfferRow[];
          }
        >();


      for (
        const client of
          clients
      ) {
        const matched =
          getOffersForClient(
            allOffers,
            client,
            delivered,
          );

        if (
          matched.length
        ) {
          matches.set(
            normalise(
              client.email,
            ),
            {
              client,

              offers:
                matched,
            },
          );
        }
      }


      /* ======================================================
         PREVIEW
         ====================================================== */

      const preview =
        buildPreview(
          matches,
        );


      /* ======================================================
         DRY RUN
         ====================================================== */

      if (
        dryRun
      ) {
        return res.status(200).json({
          ok: true,

          action:
            "send",

          dryRun:
            true,

          requestedGender:
            gender || null,

          requestedPlan:
            plan || null,

          selectedClients:
            clients.length,

          recipientsMatched:
            matches.size,

          totalOffersSelected:
            Array.from(
              matches.values(),
            ).reduce(
              (
                total,
                item,
              ) =>
                total +
                item.offers.length,
              0,
            ),

          recipients:
            preview,

          message:
            "Dry run completato. Nessuna email inviata.",
        });
      }


      /* ======================================================
         NO NEW OFFERS
         ====================================================== */

      if (
        !matches.size
      ) {
        return res.status(200).json({
          ok: true,

          action:
            "send",

          dryRun:
            false,

          selectedClients:
            clients.length,

          recipientsMatched:
            0,

          sent:
            0,

          failed:
            0,

          message:
            "Nessuna nuova offerta da inviare ai clienti selezionati.",
        });
      }


      /* ======================================================
         SMTP
         ====================================================== */

      const transporter =
        createTransporter();

      const from =
        process.env
          .FROM_EMAIL ||
        process.env
          .SMTP_USER;

      if (
        !from
      ) {
        throw new Error(
          "FROM_EMAIL / SMTP_USER missing",
        );
      }

      await transporter.verify();


      let sent =
        0;

      let failed =
        0;

      let offersSent =
        0;

      const results:
        Array<
          Record<
            string,
            unknown
          >
        > = [];


      /* ======================================================
         SEND
         ====================================================== */

      for (
        const item of
          matches.values()
      ) {

        const emailOffers =
          item.offers.map(
            toEmailOffer,
          );

        const html =
          buildFlussiOfferteEmail({
            recipientName:
              item.client.first_name,

            offers:
              emailOffers,
          });

        const subject =
          "🇮🇹 🇲🇦 Nuove offerte di lavoro — Decreto Flussi 2027";


        try {

          const info =
            await transporter.sendMail({
              from:
                `"GestoriaCitaIA" <${from}>`,

              to:
                item.client.email,

              subject,

              text:
                "Nuove offerte di lavoro — Decreto Flussi 2027\n\n" +
                `${item.offers.length} nuove offerte sono disponibili.\n` +
                "Controlla la tua email per i dettagli.",

              html,
            });


          /* ==================================================
             SAVE DELIVERIES
             ================================================== */

          for (
            const offer of
              item.offers
          ) {
            await saveDelivery(
              offer,

              item.client.email,

              "sent",
            );
          }


          /* ==================================================
             UPDATE CLIENT HISTORY
             ================================================== */

          await updateClientAfterSuccess(
            item.client,
          );


          sent += 1;

          offersSent +=
            item.offers.length;


          results.push({
            email:
              item.client.email,

            name:
              `${item.client.first_name || ""} ${
                item.client.last_name || ""
              }`.trim(),

            gender:
              item.client.gender_target,

            plan:
              item.client.plan,

            offers:
              item.offers.length,

            messageId:
              info.messageId,

            status:
              "sent",

            lastSentAt:
              new Date().toISOString(),
          });

        } catch (
          error
        ) {

          failed += 1;

          const message =
            error instanceof Error
              ? error.message
              : String(
                  error,
                );


          /* ================================================
             SAVE ERROR
             ================================================ */

          for (
            const offer of
              item.offers
          ) {
            try {
              await saveDelivery(
                offer,

                item.client.email,

                "error",

                message,
              );
            } catch (
              deliveryError
            ) {
              console.error(
                "Could not save delivery error:",
                deliveryError,
              );
            }
          }


          /*
           * IMPORTANT:
           *
           * NON aggiorniamo last_sent_at
           * se l'email è fallita.
           *
           * Così al prossimo invio
           * queste offerte restano disponibili.
           */

          results.push({
            email:
              item.client.email,

            name:
              `${item.client.first_name || ""} ${
                item.client.last_name || ""
              }`.trim(),

            gender:
              item.client.gender_target,

            plan:
              item.client.plan,

            offers:
              item.offers.length,

            status:
              "error",

            error:
              message,
          });
        }
      }


      /* ======================================================
         RESPONSE
         ====================================================== */

      return res.status(200).json({
        ok: true,

        action:
          "send",

        dryRun:
          false,

        requestedGender:
          gender || null,

        requestedPlan:
          plan || null,

        selectedClients:
          clients.length,

        recipientsMatched:
          matches.size,

        totalOffersSent:
          offersSent,

        sent,

        failed,

        results,
      });
    }


    return res.status(400).json({
      ok: false,

      error:
        "Unsupported action",
    });

  } catch (
    error
  ) {

    console.error(
      "send-flussi-offerte:",
      error,
    );

    return res.status(500).json({
      ok: false,

      error:
        "Could not process Flussi offers",

      message:
        error instanceof Error
          ? error.message
          : String(
              error,
            ),
    });
  }
}
