import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

/* ============================================================
   PLANTILLA EMAIL EMBEBIDA
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
};

type FlussiOfferteEmailData = {
  offers: FlussiOffertaEmail[];
  logoUrl?: string;
  recipientName?: string;
};

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

const IT_FLAG =
  '<span style="display:inline-block;width:34px;height:23px;vertical-align:middle;border:1px solid #425563;border-radius:2px;background:linear-gradient(to right,#009246 0%,#009246 33.333%,#ffffff 33.333%,#ffffff 66.666%,#ce2b37 66.666%,#ce2b37 100%);"></span>';

const MA_FLAG =
  '<span style="display:inline-block;width:34px;height:23px;vertical-align:middle;border:1px solid #425563;border-radius:2px;background:#c1272d;color:#006233;text-align:center;line-height:23px;font-size:15px;font-family:Arial,sans-serif;">★</span>';

function categoryDarija(category: string): string {
  const key = category.toLowerCase().trim();

  const map: Record<string, string> = {
    agriculture: "الفلاحة",
    agricoltura: "الفلاحة",
    family_assistance: "المساعدة العائلية",
    "assistenza familiare": "المساعدة العائلية",
    ristorazione: "المطاعم",
    restaurant: "المطاعم",
    pulizia: "النظافة",
    cleaning: "النظافة",
    hotel: "الفنادق",
    fabbrica: "المصانع",
    factory: "المصانع",
    costruzione: "البناء",
    construction: "البناء",
    reparto: "التوصيل",
    delivery: "التوصيل",
    domestico: "العمل المنزلي",
    domestic: "العمل المنزلي",
    caregiving: "رعاية الأشخاص",
    badante: "المساعدة العائلية",
    colf: "العمل المنزلي",
    "colf / badante": "العمل المنزلي / المساعدة العائلية",
  };

  return map[key] || category;
}

/* ============================================================
   EMAIL — CADA OFERTA EN SU PROPIO CUADRO
   ============================================================ */

function buildFlussiOfferteEmail(
  data: FlussiOfferteEmailData,
): string {

  const cards = data.offers.length
    ? data.offers
        .map((offer, index) => {

          const category =
            emailValue(offer.category) ||
            "Offerta di lavoro";

          const categoryAr =
            categoryDarija(category);

          const title =
            emailValue(offer.jobTitle) ||
            "Offerta di lavoro";

          const company =
            emailValue(offer.companyName) ||
            "Azienda non specificata";

          const date =
            emailValue(offer.publicationDate) ||
            "—";

          const salary =
            emailValue(offer.salary) ||
            "—";

          const city =
            emailValue(offer.city) ||
            "—";

          const province =
            emailValue(offer.province);

          const address =
            emailValue(offer.address) ||
            "—";

          const phone =
            emailValue(offer.phone) ||
            "—";

          const email =
            emailValue(offer.email) ||
            "—";

          const contract =
            emailValue(offer.contractType) ||
            "—";

          const workType =
            emailValue(offer.workType) ||
            "—";

          return `
<tr>
<td style="padding:7px 8px 9px;">

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  style="
    width:100%;
    border:1px solid #21495d;
    border-radius:15px;
    background:#071b27;
    overflow:hidden;
  "
>

<!-- =====================================================
     TITOLO OFFERTA
     ===================================================== -->

<tr>
<td
  style="
    padding:13px 15px;
    background:#0a2535;
    border-bottom:1px solid #21495d;
  "
>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td valign="middle">

<span
  style="
    display:inline-block;
    background:#087e64;
    color:#71f3c8;
    border-radius:14px;
    padding:5px 9px;
    font-size:9px;
    font-weight:900;
  "
>
  OFFERTA ${index + 1}
</span>

<div
  style="
    margin-top:7px;
    color:#ffffff;
    font-size:19px;
    line-height:22px;
    font-weight:900;
  "
>
  ${emailEsc(title)}
</div>

<div
  style="
    margin-top:4px;
    color:#aebfc9;
    font-size:11px;
  "
>
  ${emailEsc(company)}
</div>

</td>

<td
  width="35%"
  valign="middle"
  align="right"
  dir="rtl"
  style="
    color:#ffd21c;
    font-size:14px;
    font-weight:900;
  "
>
  ${emailEsc(categoryAr)}
</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     CIUDAD / PROVINCIA
     ===================================================== -->

<tr>
<td style="padding:12px 15px 5px;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td
  width="50%"
  valign="top"
  style="padding-right:8px;"
>

<div
  style="
    color:#38b9ff;
    font-size:10px;
    font-weight:900;
  "
>
  📍 CITTÀ
</div>

<div
  style="
    color:#ffffff;
    font-size:13px;
    margin-top:3px;
  "
>
  ${emailEsc(city)}
  ${
    province
      ? ` (${emailEsc(province)})`
      : ""
  }
</div>

</td>


<td
  width="50%"
  valign="top"
  dir="rtl"
  align="right"
  style="padding-left:8px;"
>

<div
  style="
    color:#38b9ff;
    font-size:10px;
    font-weight:900;
  "
>
  المدينة 📍
</div>

<div
  style="
    color:#ffffff;
    font-size:13px;
    margin-top:3px;
  "
>
  ${emailEsc(city)}
  ${
    province
      ? ` (${emailEsc(province)})`
      : ""
  }
</div>

</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     CATEGORIA / POSIZIONE
     ===================================================== -->

<tr>
<td style="padding:5px 15px;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td
  width="50%"
  valign="top"
  style="padding-right:8px;"
>

<div
  style="
    color:#19e49a;
    font-size:10px;
    font-weight:900;
  "
>
  💼 CATEGORIA
</div>

<div
  style="
    color:#ffffff;
    font-size:13px;
    margin-top:3px;
  "
>
  ${emailEsc(category)}
</div>

<div
  style="
    margin-top:8px;
    color:#ff8a20;
    font-size:10px;
    font-weight:900;
  "
>
  👤 POSIZIONE
</div>

<div
  style="
    color:#ffffff;
    font-size:13px;
    margin-top:3px;
  "
>
  ${emailEsc(title)}
</div>

</td>


<td
  width="50%"
  valign="top"
  dir="rtl"
  align="right"
  style="padding-left:8px;"
>

<div
  style="
    color:#19e49a;
    font-size:10px;
    font-weight:900;
  "
>
  الفئة 💼
</div>

<div
  style="
    color:#ffffff;
    font-size:13px;
    margin-top:3px;
  "
>
  ${emailEsc(categoryAr)}
</div>

<div
  style="
    margin-top:8px;
    color:#ff8a20;
    font-size:10px;
    font-weight:900;
  "
>
  العمل 👤
</div>

<div
  style="
    color:#ffffff;
    font-size:13px;
    margin-top:3px;
  "
>
  ${emailEsc(categoryAr)}
</div>

</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     INDIRIZZO
     ===================================================== -->

<tr>
<td style="padding:5px 15px;">

<div
  style="
    color:#ff6574;
    font-size:10px;
    font-weight:900;
  "
>
  📍 INDIRIZZO
</div>

<div
  style="
    color:#ffffff;
    font-size:12px;
    margin-top:3px;
  "
>
  ${emailEsc(address)}
</div>

</td>
</tr>


<!-- =====================================================
     DATA / STIPENDIO / CONTRATTO
     ===================================================== -->

<tr>
<td style="padding:7px 15px;">

<div
  style="
    height:1px;
    background:#21495d;
    margin-bottom:9px;
  "
></div>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td width="33%" valign="top">
<div
  style="
    color:#a78aff;
    font-size:10px;
    font-weight:900;
  "
>
  📅 DATA
</div>

<div
  style="
    color:#ffffff;
    font-size:12px;
    margin-top:3px;
  "
>
  ${emailEsc(date)}
</div>
</td>


<td width="34%" valign="top">
<div
  style="
    color:#ffd21c;
    font-size:10px;
    font-weight:900;
  "
>
  💰 STIPENDIO
</div>

<div
  style="
    color:#ffffff;
    font-size:12px;
    margin-top:3px;
  "
>
  ${emailEsc(salary)}
</div>
</td>


<td width="33%" valign="top">
<div
  style="
    color:#19e49a;
    font-size:10px;
    font-weight:900;
  "
>
  📄 CONTRATTO
</div>

<div
  style="
    color:#ffffff;
    font-size:12px;
    margin-top:3px;
  "
>
  ${emailEsc(contract)}
</div>
</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     TIPO / CONTATTI
     ===================================================== -->

<tr>
<td style="padding:5px 15px 12px;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td width="50%" valign="top" style="padding-right:8px;">

<div
  style="
    color:#19e49a;
    font-size:10px;
    font-weight:900;
  "
>
  ⏱ TIPO DI LAVORO
</div>

<div
  style="
    color:#ffffff;
    font-size:12px;
    margin-top:3px;
  "
>
  ${emailEsc(workType)}
</div>

<div
  style="
    margin-top:8px;
    color:#19e49a;
    font-size:10px;
    font-weight:900;
  "
>
  ☎ RESPONSABILE
</div>

<div
  style="
    color:#ffffff;
    font-size:12px;
    margin-top:3px;
  "
>
  ${emailEsc(phone)}
</div>

</td>


<td
  width="50%"
  valign="top"
  dir="rtl"
  align="right"
  style="padding-left:8px;"
>

<div
  style="
    color:#a78aff;
    font-size:10px;
    font-weight:900;
  "
>
  ✉ الإيميل
</div>

<div
  style="
    color:#ffffff;
    font-size:12px;
    margin-top:3px;
    direction:ltr;
  "
>
  ${emailEsc(email)}
</div>

</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     DETTAGLI — GIALLO
     ===================================================== -->

<tr>
<td
  style="
    padding:11px 15px;
    background:#3d2e04;
    border-top:1px solid #d8a900;
  "
>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td
  style="
    color:#ffd21c;
    font-size:11px;
    font-weight:900;
  "
>
  ${IT_FLAG}&nbsp;
  Dettagli dell'offerta
</td>

<td
  align="right"
  dir="rtl"
  style="
    color:#ffd21c;
    font-size:11px;
    font-weight:900;
  "
>
  ${MA_FLAG}&nbsp;
  تفاصيل العرض
</td>

</tr>
</table>

<div
  style="
    color:#fff4bf;
    font-size:10px;
    line-height:16px;
    margin-top:7px;
  "
>
  ${emailEsc(title)}
  · ${emailEsc(contract)}
  · ${emailEsc(workType)}
  · ${emailEsc(city)}
  ${
    province
      ? ` (${emailEsc(province)})`
      : ""
  }
  · ${emailEsc(address)}
</div>

</td>
</tr>

</table>

</td>
</tr>
`;
        })
        .join("")
    : `
<tr>
<td
  style="
    padding:30px;
    text-align:center;
    color:#d9e2ea;
  "
>
Nessuna nuova offerta disponibile al momento.
</td>
</tr>
`;

  return `<!doctype html>
<html lang="it">

<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>
Nuove offerte di lavoro — Decreto Flussi 2027
</title>
</head>

<body
style="
margin:0;
background:#020b12;
font-family:Arial,Helvetica,sans-serif;
"
>

<center
style="
width:100%;
padding:18px 6px;
background:#020b12;
"
>

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
max-width:1120px;
background:#06131d;
border:1px solid #24485b;
border-radius:22px;
overflow:hidden;
color:#fff;
"
>


<!-- =====================================================
     HEADER
     ===================================================== -->

<tr>
<td
style="
padding:22px 26px 18px;
border-bottom:1px solid #24485b;
"
>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td valign="top">

<div
style="
font-size:30px;
font-weight:900;
line-height:31px;
"
>
<span style="color:#fff;">gestoria</span>
<span style="color:#e7bf35;">cita</span>
<span style="color:#20df91;">ia</span>
</div>

<div
style="
color:#e7bf35;
font-size:10px;
font-weight:900;
letter-spacing:1.5px;
"
>
DECRETO FLUSSI 2027
</div>

<div
style="
margin-top:13px;
color:#d7e0e6;
font-size:12px;
"
>
Offerte di lavoro in Italia
</div>

</td>


<td
align="right"
valign="top"
>

<div>
${IT_FLAG}
&nbsp;&nbsp;
${MA_FLAG}
</div>

<div
dir="rtl"
style="
margin-top:12px;
color:#e7bf35;
font-size:13px;
font-weight:800;
"
>
عروض العمل فإيطاليا
</div>

</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     TITULO
     ===================================================== -->

<tr>
<td style="padding:22px 18px 8px;">

<div
style="
display:inline-block;
background:#064b3b;
color:#48edb2;
border-radius:18px;
padding:8px 14px;
font-size:11px;
font-weight:900;
"
>
✓ OFFERTE DISPONIBILI
</div>


<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td style="padding-top:16px;">

<div
style="
font-size:25px;
font-weight:900;
color:#fff;
"
>
${IT_FLAG}
&nbsp;&nbsp;
Nuove offerte di lavoro
</div>

<div
style="
margin-top:5px;
color:#c9d6de;
font-size:12px;
"
>
Abbiamo trovato offerte disponibili
nell'ambito del Decreto Flussi.
</div>

</td>


<td
align="right"
valign="bottom"
dir="rtl"
style="
padding-top:16px;
color:#e7bf35;
font-size:16px;
font-weight:900;
"
>
${MA_FLAG}
&nbsp;&nbsp;
عروض خدمة جداد
</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     OFERTAS — UNA DEBAJO DE OTRA
     ===================================================== -->

<tr>
<td
style="
padding:4px 10px 7px;
"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
>

${cards}

</table>

</td>
</tr>


<!-- =====================================================
     INFORMACION IMPORTANTE
     ===================================================== -->

<tr>
<td style="padding:8px 20px 22px;">

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #24485b;
border-radius:16px;
background:#071723;
"
>

<tr>
<td style="padding:17px 18px;">

<div
style="
color:#fff;
font-size:13px;
font-weight:900;
"
>
${IT_FLAG}
&nbsp;
Informazione importante
</div>

<div
style="
margin-top:7px;
color:#cbd8df;
font-size:11px;
line-height:18px;
"
>
GestoriaCitaIA non vende contratti di lavoro
e non garantisce l'ottenimento di un contratto,
nulla osta, visto o permesso di soggiorno.
Cerchiamo e inviamo offerte disponibili
nell'ambito del Decreto Flussi.
</div>

<div
dir="rtl"
style="
margin-top:8px;
color:#e7bf35;
font-size:11px;
line-height:18px;
"
>
${MA_FLAG}
&nbsp;
ملاحظة مهمة:
GestoriaCitaIA ما كتبيعش عقود العمل
وما كتضمنش ليك العقد ولا nulla osta
ولا الفيزا ولا الإقامة.
حنا كنقلبو ونصيفطو ليك عروض العمل
المتاحة فإطار Decreto Flussi.
</div>

</td>
</tr>

</table>

</td>
</tr>


<!-- =====================================================
     FOOTER
     ===================================================== -->

<tr>
<td
style="
padding:17px 20px 20px;
text-align:center;
border-top:1px solid #24485b;
"
>

<div
style="
font-size:21px;
font-weight:900;
"
>
<span style="color:#fff;">gestoria</span>
<span style="color:#e7bf35;">cita</span>
<span style="color:#20df91;">ia</span>
</div>

<div
style="
color:#e7bf35;
font-size:10px;
font-weight:900;
letter-spacing:1.4px;
margin-top:3px;
"
>
DECRETO FLUSSI 2027
</div>

<div
style="
margin-top:8px;
color:#7f96a5;
font-size:9px;
"
>
GestoriaCitaIA ·
Servizio informativo e di ricerca offerte
</div>

</td>
</tr>

</table>

</center>

</body>
</html>`;
}


/**
 * GESTORIACITAIA
 * DECRETO FLUSSI 2027 — ENVÍO MANUAL DE OFERTAS
 *
 * NO toca Flussi Verification.
 * NO usa Make.
 * NO tiene cron.
 * dryRun=true  -> no envía.
 * dryRun=false -> envío real.
 */

export const config = {
  api: {
    bodyParser: true,
  },
};

const clean = (value: unknown, max = 2000): string =>
  String(value ?? "").trim().slice(0, max);

const normalise = (value: unknown): string =>
  clean(value).toLowerCase().trim();

const supabaseUrl = clean(
  process.env.SUPABASE_URL
);

const serviceKey = clean(
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function supabaseRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Supabase configuration missing"
    );
  }

  return fetch(
    `${supabaseUrl}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization:
          `Bearer ${serviceKey}`,
        ...(options.headers || {}),
      },
    }
  );
}

function createTransporter() {

  const host =
    process.env.SMTP_HOST;

  const user =
    process.env.SMTP_USER;

  const pass =
    process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration missing"
    );
  }

  const port =
    Number(
      process.env.SMTP_PORT || 587
    );

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  work_type: string;
  categories?: string[] | null;
  category?: string | null;
  source_table: string;
  active: boolean;
};

type OfferRow = {
  id: string;
  job_title?: string | null;
  category?: string | null;
  category_code?: string | null;
  company_name?: string | null;
  publication_date?: string | null;
  published_at?: string | null;
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
};

function listValues(
  value: unknown
): string[] {

  if (Array.isArray(value)) {
    return value
      .map(normalise)
      .filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map(normalise)
    .filter(Boolean);
}

function workTypeMatches(
  clientType: string,
  offerType: string
): boolean {

  const client =
    normalise(clientType);

  const offer =
    normalise(offerType);

  if (!offer || client === offer) {
    return true;
  }

  const nonSeasonal = new Set([
    "non_stagionale",
    "non-stagionale",
    "non estazionale",
    "non_estazionale",
    "no_estacional",
    "no-estacional",
  ]);

  const seasonal = new Set([
    "stagionale",
    "estacional",
    "estazionale",
  ]);

  if (
    nonSeasonal.has(client) &&
    nonSeasonal.has(offer)
  ) {
    return true;
  }

  if (
    seasonal.has(client) &&
    seasonal.has(offer)
  ) {
    return true;
  }

  return false;
}

function categoryMatches(
  client: Client,
  offer: OfferRow
): boolean {

  const offerCode =
    normalise(offer.category_code);

  const offerName =
    normalise(offer.category);

  const wanted =
    client.source_table ===
    "flussi_lavoro_24_99"
      ? listValues(client.category)
      : listValues(client.categories);

  if (!offerCode && !offerName) {
    return true;
  }

  return wanted.some((item) => {

    if (!item) {
      return false;
    }

    return (
      item === offerCode ||
      item === offerName ||
      (!!offerCode &&
        item.includes(offerCode)) ||
      (!!offerName &&
        item.includes(offerName)) ||
      (!!offerCode &&
        offerCode.includes(item)) ||
      (!!offerName &&
        offerName.includes(item))
    );
  });
}

function isClientActive(
  row: Record<string, any>,
  table: string
): boolean {

  if (
    normalise(row.payment_status) !==
    "paid"
  ) {
    return false;
  }

  if (
    table ===
    "flussi_lavoro_9_99"
  ) {
    return true;
  }

  if (!row.expires_at) {
    return false;
  }

  return (
    new Date(
      row.expires_at
    ).getTime() >= Date.now()
  );
}

async function getActiveClients(): Promise<Client[]> {

  const tables = [
    "flussi_lavoro_9_99",
    "flussi_lavoro_19_99",
    "flussi_lavoro_24_99",
  ];

  const all: Client[] = [];

  for (const table of tables) {

    const select =
      table ===
      "flussi_lavoro_24_99"

        ? "id,first_name,last_name,email,phone,work_type,category,payment_status,expires_at"

        : table ===
          "flussi_lavoro_9_99"

          ? "id,first_name,last_name,email,phone,work_type,categories,payment_status"

          : "id,first_name,last_name,email,phone,work_type,categories,payment_status,starts_at,expires_at";

    const response =
      await supabaseRequest(
        `${table}?select=${encodeURIComponent(
          select
        )}&payment_status=eq.paid`
      );

    const responseText =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `Supabase ${table} failed: ${response.status} ${responseText}`
      );
    }

    const rows =
      JSON.parse(responseText);

    for (
      const row of
      Array.isArray(rows)
        ? rows
        : []
    ) {

      if (
        !row.email ||
        !isClientActive(
          row,
          table
        )
      ) {
        continue;
      }

      all.push({
        id: row.id,
        first_name:
          row.first_name || "",
        last_name:
          row.last_name || "",
        email: row.email,
        phone:
          row.phone || null,
        work_type:
          row.work_type ||
          "non_stagionale",
        categories:
          row.categories || null,
        category:
          row.category || null,
        source_table: table,
        active: true,
      });
    }
  }

  return all;
}

async function getOffers(
  offerIds: string[]
): Promise<OfferRow[]> {

  const ids =
    offerIds
      .map((id) =>
        clean(id, 100)
      )
      .filter(Boolean);

  if (!ids.length) {
    return [];
  }

  const encoded =
    ids
      .map(
        (id) =>
          `"${id.replace(
            /"/g,
            '\\"'
          )}"`
      )
      .join(",");

  const select = [
    "id",
    "job_title",
    "category",
    "category_code",
    "company_name",
    "publication_date",
    "published_at",
    "city",
    "province",
    "address",
    "phone",
    "email",
    "source_url",
    "contract_type",
    "work_type",
    "is_active",
    "status",
  ].join(",");

  const response =
    await supabaseRequest(
      `flussi_offerte?select=${select}&id=in.(${encoded})`
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase flussi_offerte failed: ${response.status} ${responseText}`
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
      normalise(row.status) !==
        "inactive"
  );
}

async function getAlreadyDelivered(
  offerIds: string[]
): Promise<Set<string>> {

  if (!offerIds.length) {
    return new Set<string>();
  }

  const encoded =
    offerIds
      .map(
        (id) =>
          `"${id.replace(
            /"/g,
            '\\"'
          )}"`
      )
      .join(",");

  const response =
    await supabaseRequest(
      `flussi_deliveries?select=offer_id,email,status&offer_id=in.(${encoded})&status=eq.sent`
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase flussi_deliveries failed: ${response.status} ${responseText}`
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
          row.email
        )}`
      );
    }
  }

  return delivered;
}

function toEmailOffer(
  row: OfferRow
) {

  return {
    jobTitle:
      row.job_title ||
      "Offerta di lavoro",

    category:
      row.category ||
      row.category_code ||
      "Offerta di lavoro",

    companyName:
      row.company_name ||
      "",

    publicationDate:
      row.publication_date ||
      row.published_at ||
      "",

    salary:
      "",

    city:
      row.city ||
      "",

    province:
      row.province ||
      "",

    address:
      row.address ||
      "",

    phone:
      row.phone ||
      "",

    email:
      row.email ||
      "",

    contractType:
      row.contract_type ||
      "",

    workType:
      row.work_type ||
      "",

    offerUrl:
      row.source_url ||
      "",
  };
}

function getHeaderValue(
  req: VercelRequest,
  name: string
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      method: req.method,
    });
  }

  try {

    const internalSecret =
      process.env
        .FLUSSI_LAVORO_INTERNAL_SECRET;

    if (internalSecret) {

      const providedSecret =
        getHeaderValue(
          req,
          "x-flussi-lavoro-secret"
        );

      if (
        providedSecret !==
        internalSecret
      ) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }
    }

    const body =
      req.body &&
      typeof req.body === "object"
        ? req.body
        : {};

    const offerIds =
      Array.isArray(
        body.offerIds
      )
        ? body.offerIds
            .map(
              (id: unknown) =>
                clean(id, 100)
            )
            .filter(Boolean)
        : [];

    const dryRun =
      body.dryRun === true;

    if (!offerIds.length) {
      return res.status(400).json({
        error:
          "offerIds is required",
        example: {
          dryRun: true,
          offerIds: [
            "UUID-DE-LA-OFERTA",
          ],
        },
      });
    }

    if (offerIds.length > 50) {
      return res.status(400).json({
        error:
          "Maximum 50 offers per bulletin",
      });
    }

    const offers =
      await getOffers(
        offerIds
      );

    if (!offers.length) {
      return res.status(404).json({
        error:
          "No active offers found",
        requestedOfferIds:
          offerIds,
      });
    }

    const clients =
      await getActiveClients();

    const delivered =
      await getAlreadyDelivered(
        offers.map(
          (offer) => offer.id
        )
      );

    const matches =
      new Map<
        string,
        {
          client: Client;
          offers: OfferRow[];
        }
      >();

    for (
      const client of clients
    ) {

      const matched =
        offers.filter(
          (offer) => {

            if (
              !workTypeMatches(
                client.work_type,
                offer.work_type ||
                  ""
              )
            ) {
              return false;
            }

            if (
              !categoryMatches(
                client,
                offer
              )
            ) {
              return false;
            }

            const key =
              `${offer.id}::${normalise(
                client.email
              )}`;

            return !delivered.has(
              key
            );
          }
        );

      if (matched.length) {
        matches.set(
          normalise(
            client.email
          ),
          {
            client,
            offers: matched,
          }
        );
      }
    }

    const preview =
      Array.from(
        matches.values()
      ).map(
        (item) => ({
          email:
            item.client.email,

          name:
            `${item.client.first_name} ${item.client.last_name}`
              .trim(),

          offers:
            item.offers.length,

          offerIds:
            item.offers.map(
              (offer) =>
                offer.id
            ),

          sourceTable:
            item.client.source_table,

          workType:
            item.client.work_type,

          categories:
            item.client.source_table ===
            "flussi_lavoro_24_99"
              ? item.client.category
              : item.client.categories,
        })
      );

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        message:
          "Prueba realizada. No se ha enviado ningún email.",
        selectedOffers:
          offers.length,
        activeClients:
          clients.length,
        recipientsMatched:
          matches.size,
        recipients:
          preview,
      });
    }

    if (!matches.size) {
      return res.status(200).json({
        ok: true,
        dryRun: false,
        sent: 0,
        failed: 0,
        message:
          "No active client matches the selected offers.",
        selectedOffers:
          offers.length,
        activeClients:
          clients.length,
      });
    }

    const transporter =
      createTransporter();

    const from =
      process.env.FROM_EMAIL ||
      process.env.SMTP_USER;

    if (!from) {
      throw new Error(
        "FROM_EMAIL / SMTP_USER missing"
      );
    }

    await transporter.verify();

    let sent = 0;
    let failed = 0;

    const results:
      Array<Record<string, unknown>> =
      [];

    for (
      const item of
      matches.values()
    ) {

      const emailOffers =
        item.offers.map(
          toEmailOffer
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

        const now =
          new Date().toISOString();

        for (
          const offer of
          item.offers
        ) {

          const delivery =
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

                    email:
                      item.client.email,

                    delivery_type:
                      "offer_bulletin",

                    status:
                      "sent",

                    sent_at:
                      now,

                    error_message:
                      null,
                  }),
              }
            );

          if (!delivery.ok) {
            console.error(
              "Delivery record failed:",
              await delivery.text()
            );
          }
        }

        sent++;

        results.push({
          email:
            item.client.email,

          offers:
            item.offers.length,

          messageId:
            info.messageId,

          status:
            "sent",
        });

      } catch (error) {

        failed++;

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        results.push({
          email:
            item.client.email,

          offers:
            item.offers.length,

          status:
            "error",

          error:
            message,
        });

        for (
          const offer of
          item.offers
        ) {

          try {

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

                    email:
                      item.client.email,

                    delivery_type:
                      "offer_bulletin",

                    status:
                      "error",

                    sent_at:
                      null,

                    error_message:
                      message.slice(
                        0,
                        1000
                      ),
                  }),
              }
            );

          } catch (
            deliveryError
          ) {

            console.error(
              "Could not save delivery error:",
              deliveryError
            );
          }
        }
      }
    }

    return res.status(200).json({
      ok: true,
      dryRun: false,
      selectedOffers:
        offers.length,
      activeClients:
        clients.length,
      recipientsMatched:
        matches.size,
      sent,
      failed,
      results,
    });

  } catch (error) {

    console.error(
      "send-flussi-offerte:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "Could not process Flussi offers",

      message:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}
