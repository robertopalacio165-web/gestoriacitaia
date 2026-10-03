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

  /* DETALLES COMPLETOS */
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

  const key =
    category
      .toLowerCase()
      .trim();

  const map: Record<string, string> = {

    agriculture:
      "الفلاحة",

    agricoltura:
      "الفلاحة",

    "assistenza familiare":
      "المساعدة العائلية",

    family_assistance:
      "المساعدة العائلية",

    badante:
      "المساعدة العائلية",

    colf:
      "العمل المنزلي",

    domestico:
      "العمل المنزلي",

    domestic:
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

    fabbrica:
      "المصانع",

    factory:
      "المصانع",

    costruzione:
      "البناء",

    construction:
      "البناء",

    delivery:
      "التوصيل",

    caregiving:
      "رعاية الأشخاص",
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

  const offers =
    data.offers || [];

  const greeting =
    emailValue(
      data.recipientName,
    ) || "Ciao";


  /* ==========================================================
     CARDS
     ========================================================== */

  const cards =
    offers.length

      ? offers
          .map(
            (
              offer,
              index,
            ) => {

              const category =
                emailValue(
                  offer.category,
                ) ||
                "Offerta di lavoro";

              const categoryAR =
                categoryDarija(
                  category,
                );

              const title =
                emailValue(
                  offer.jobTitle,
                ) ||
                "Offerta di lavoro";

              const city =
                emailValue(
                  offer.city,
                ) || "—";

              const province =
                emailValue(
                  offer.province,
                ) || "—";

              const address =
                emailValue(
                  offer.address,
                ) || "—";

              const phone =
                emailValue(
                  offer.phone,
                ) || "—";

              const ido =
                emailValue(
                  offer.email,
                ) || "—";


              /*
               * IMPORTANTISSIMO:
               * QUESTO È IL QUADRO GIALLO COMPLETO.
               */

              const fullDetails =
                emailValue(
                  offer.details,
                ) ||
                "Dettagli completi disponibili nell'offerta.";


              const detailsAR =
                emailValue(
                  offer.detailsDarija,
                ) ||
                "تفاصيل العرض بالدارجة غادي تبان منين تكون الترجمة متوفرة.";


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

<!-- ========================================================
     OFFER TITLE
     ======================================================== -->

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
✓ OFFERTA ${String(
                index + 1,
              ).padStart(
                2,
                "0",
              )}
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


<!-- ========================================================
     INFORMATION FIELDS
     ======================================================== -->

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

${fieldIT(
  "📍",
  "Città",
  city,
  "#35bfff",
)}

${fieldIT(
  "🏢",
  "Provincia",
  province,
  "#9d7cff",
)}

${fieldIT(
  "💼",
  "Categoria",
  category,
  "#23e69a",
)}

${fieldIT(
  "👤",
  "Posizione",
  title,
  "#ff8a21",
)}

${fieldIT(
  "📌",
  "Indirizzo",
  address,
  "#ff667a",
)}

${fieldIT(
  "📞",
  "Responsabile",
  phone,
  "#23e69a",
)}

${fieldIT(
  "✉️",
  "IDO",
  ido,
  "#a77cff",
)}

</td>


<td
  class="offer-col"
  width="50%"
  valign="top"
  style="padding-left:4px;"
>

${fieldAR(
  "📍",
  "المدينة",
  city,
  "#35bfff",
)}

${fieldAR(
  "🏢",
  "الإقليم",
  province,
  "#9d7cff",
)}

${fieldAR(
  "💼",
  "الفئة",
  categoryAR,
  "#23e69a",
)}

${fieldAR(
  "👤",
  "العمل",
  title,
  "#ff8a21",
)}

${fieldAR(
  "📌",
  "العنوان",
  address,
  "#ff667a",
)}

${fieldAR(
  "📞",
  "رقم المسؤول",
  phone,
  "#23e69a",
)}

${fieldAR(
  "✉️",
  "الإيميل",
  ido,
  "#a77cff",
)}

</td>

</tr>

</table>


<!-- ========================================================
     YELLOW DETAILS — FULL JOB INFORMATION
     ======================================================== -->

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
${emailEsc(
                fullDetails,
              )}
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
${emailEsc(
                detailsAR,
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
            },
          )
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


  /* ==========================================================
     COMPLETE EMAIL
     ========================================================== */

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


<!-- ==========================================================
     MAIN CONTAINER
     ========================================================== -->

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


<!-- ==========================================================
     HEADER
     ========================================================== -->

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
Offerte di lavoro verificate
</div>

</td>


<td
  width="45%"
  align="right"
  valign="top"
>

<div
  style="
    display:inline-block;
    background:#0a2b3b;
    border:1px solid #24536a;
    border-radius:10px;
    padding:7px 8px;
    text-align:center;
  "
>

<div
  style="
    font-size:8px;
    color:#9fb2bf;
    font-weight:800;
  "
>
ITALIA
</div>

<div
  style="
    margin-top:4px;
  "
>
${IT_FLAG}
</div>

</div>

<div
  style="
    display:inline-block;
    margin-left:4px;
    background:#0a2b3b;
    border:1px solid #24536a;
    border-radius:10px;
    padding:7px 8px;
    text-align:center;
  "
>

<div
  style="
    font-size:8px;
    color:#9fb2bf;
    font-weight:800;
  "
>
MAROCCO
</div>

<div
  style="
    margin-top:4px;
  "
>
${MA_FLAG}
</div>

</div>

</td>

</tr>

</table>

</td>

</tr>


<!-- ==========================================================
     GREETING
     ========================================================== -->

<tr>

<td
  class="mobile-pad"
  style="
    padding:16px;
    border-bottom:1px solid #12384d;
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
  width="50%"
  valign="top"
  style="padding-right:6px;"
>

<div
  style="
    font-size:12px;
    font-weight:900;
    color:#ffffff;
  "
>
${emailEsc(greeting)}
</div>

<div
  style="
    margin-top:6px;
    font-size:10px;
    line-height:16px;
    color:#c8d5dc;
  "
>
Abbiamo raccolto nuove offerte di lavoro collegate al Decreto Flussi.
Controlla i dettagli qui sotto e verifica sempre le informazioni con la fonte ufficiale.
</div>

</td>


<td
  width="50%"
  valign="top"
  dir="rtl"
  align="right"
  style="padding-left:6px;"
>

<div
  style="
    font-size:12px;
    font-weight:900;
    color:#ffffff;
  "
>
مرحبا
</div>

<div
  style="
    margin-top:6px;
    font-size:10px;
    line-height:16px;
    color:#c8d5dc;
  "
>
جمعنا ليك عروض عمل جديدة مرتبطة بـ Decreto Flussi.
شوف التفاصيل لتحت وتأكد ديما من المعلومات مع المصدر الرسمي.
</div>

</td>

</tr>

</table>

</td>

</tr>


<!-- ==========================================================
     OFFERS
     ========================================================== -->

<tr>

<td
  class="mobile-pad"
  style="padding:14px 16px 4px;"
>

${cards}

</td>

</tr>


<!-- ==========================================================
     FOOTER
     ========================================================== -->

<tr>

<td
  style="
    padding:16px;
    border-top:1px solid #16435c;
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
  style="
    background:#071e2e;
    border:1px solid #214b63;
    border-radius:12px;
    padding:12px;
  "
>

<div
  style="
    font-size:10px;
    font-weight:900;
    color:#ffd429;
    margin-bottom:6px;
  "
>
⚠️ AVVISO IMPORTANTE
</div>

<div
  style="
    font-size:9px;
    line-height:15px;
    color:#d7e2e8;
  "
>
GestoriaCitaIA è un servizio informativo che ricerca e presenta offerte di lavoro collegate al Decreto Flussi in Italia. Non garantisce l'assunzione, il contratto di lavoro, il rilascio del nulla osta o del visto e non agisce come intermediario tra lavoratore e datore di lavoro. Le informazioni devono essere verificate direttamente con il datore di lavoro o con gli enti competenti.
</div>

<div
  dir="rtl"
  style="
    margin-top:10px;
    font-size:10px;
    font-weight:900;
    color:#ffd429;
    margin-bottom:6px;
    text-align:right;
  "
>
⚠️ تنبيه مهم
</div>

<div
  dir="rtl"
  style="
    font-size:9px;
    line-height:17px;
    color:#d7e2e8;
    text-align:right;
  "
>
GestoriaCitaIA غير خدمة معلوماتية كتبحث وكتعرض عروض العمل المرتبطة بـ Decreto Flussi فإيطاليا. الموقع ما كيضمنش الحصول على عقد العمل، وما كيضمنش nulla osta أو الفيزا، وما كيخدمش كوسيط بين العامل والمشغّل. المعلومات خاصها تتأكد مباشرة مع المشغّل أو الجهات المختصة.
</div>

</td>

</tr>

</table>

<div
  style="
    margin-top:10px;
    text-align:center;
    font-size:8px;
    color:#718794;
    line-height:13px;
  "
>
GestoriaCitaIA · Informazione sul lavoro e Decreto Flussi
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
   DATABASE TYPES
   ============================================================ */

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


/* ============================================================
   ENV
   ============================================================ */

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const FLUSSI_LAVORO_SECRET =
  process.env.FLUSSI_LAVORO_SECRET ||
  "";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  "";

const OPENAI_DARIJA_MODEL =
  process.env.OPENAI_DARIJA_MODEL ||
  "gpt-4.1-mini";


/* ============================================================
   SUPABASE HELPERS
   ============================================================ */

function requireEnv(): void {

  const missing: string[] = [];

  if (!SUPABASE_URL) {
    missing.push("SUPABASE_URL");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    missing.push(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (!FLUSSI_LAVORO_SECRET) {
    missing.push(
      "FLUSSI_LAVORO_SECRET",
    );
  }

  if (!missing.length) {
    return;
  }

  throw new Error(
    `Missing environment variables: ${missing.join(", ")}`,
  );
}


async function supabaseFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {

  requireEnv();

  const headers = new Headers(
    init.headers || {},
  );

  headers.set(
    "apikey",
    SUPABASE_SERVICE_ROLE_KEY,
  );

  headers.set(
    "Authorization",
    `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  );

  headers.set(
    "Content-Type",
    "application/json",
  );

  return fetch(
    `${SUPABASE_URL}${path}`,
    {
      ...init,
      headers,
    },
  );
}


async function getFlussiOffers(
  gender?: string,
  limit?: number,
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
    ].join(","),
  );

  params.set(
    "order",
    "created_at.desc",
  );

  params.set(
    "limit",
    String(
      Math.min(
        Number(limit || 50),
        50,
      ),
    ),
  );

  const response =
    await supabaseFetch(
      `/rest/v1/flussi_offerte?${params.toString()}`,
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase offers error ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  const rows =
    JSON.parse(text);

  let offers: OfferRow[] =
    Array.isArray(rows)
      ? rows
      : [];

  /*
   * Il piano commerciale usa tutte le offerte Flussi presenti in tabella.
   * Non filtriamo is_active/status qui: la selezione Mujer/Hombre/Ambos
   * deve corrispondere al catalogo completo presente in flussi_offerte.
   */

  if (gender) {
    const normalizedGender =
      String(gender)
        .trim()
        .toLowerCase();

    if (
      normalizedGender ===
      "mujer"
    ) {
      offers =
        offers.filter(
          (offer) =>
            String(
              offer.gender_target ||
              "",
            )
              .trim()
              .toLowerCase() ===
            "mujer",
        );
    }

    if (
      normalizedGender ===
      "hombre"
    ) {
      offers =
        offers.filter(
          (offer) =>
            String(
              offer.gender_target ||
              "",
            )
              .trim()
              .toLowerCase() ===
            "hombre",
        );
    }

    /*
     * "Ambos" = tutto il catalogo.
     */
  }

  if (
    Number.isFinite(
      Number(limit),
    )
  ) {
    offers =
      offers.slice(
        0,
        Math.min(
          Number(limit),
          50,
        ),
      );
  }

  return offers;
}


function toEmailOffer(
  offer: OfferRow,
): FlussiOffertaEmail {

  return {
    jobTitle:
      emailValue(
        offer.job_title,
      ) ||
      "Offerta di lavoro",

    category:
      emailValue(
        offer.category,
      ) ||
      "Offerta di lavoro",

    companyName:
      emailValue(
        offer.company_name,
      ),

    publicationDate:
      emailValue(
        offer.publication_date,
      ),

    salary:
      "",

    city:
      emailValue(
        offer.city,
      ),

    province:
      emailValue(
        offer.province,
      ),

    address:
      emailValue(
        offer.address,
      ) ||
      "Indirizzo preciso non indicato nell'offerta.",

    phone:
      emailValue(
        offer.phone,
      ) ||
      emailValue(
        offer.cpi_responsible_phone,
      ),

    email:
      emailValue(
        offer.email,
      ) ||
      emailValue(
        offer.cpi_email,
      ),

    contractType:
      emailValue(
        offer.contract_type,
      ),

    workType:
      emailValue(
        offer.work_type,
      ),

    offerUrl:
      emailValue(
        offer.source_url,
      ),

    details:
      emailValue(
        offer.offer_details,
      ) ||
      "Dettagli completi disponibili nell'offerta.",

    detailsDarija:
      emailValue(
        offer.details_darija,
      ),
  };
}


/* ============================================================
   OPENAI — TRADUZIONE DARIJA REALE
   ============================================================ */

async function translateOfferToDarija(
  title: string,
  details: string,
): Promise<string> {

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY missing",
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

        body: JSON.stringify({
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
                    `
You are a professional Moroccan Darija translator.

Translate the job offer below from Italian into natural Moroccan Darija written in Arabic script.

IMPORTANT RULES:
- Preserve EVERY factual detail.
- Do not invent information.
- Do not remove salary, dates, hours, contract, requirements, experience, address, phone, email, qualifications, duties, application instructions or legal references.
- Keep company names, place names, email addresses, phone numbers, URLs and official Italian terms exactly as written when appropriate.
- Keep "Decreto Flussi", "nulla osta", CPI, CCNL and similar official terms unchanged.
- Use Moroccan Darija, not Modern Standard Arabic.
- Make the text understandable for Moroccan workers.
- Do not summarize.
- Do not add explanations.
- Return ONLY the translated Darija text.

Job title:
${title}

Full offer details:
${details}
                    `.trim(),
                },
              ],
            },
          ],
        }),
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI translation error ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  const data =
    JSON.parse(text);

  const outputText =
    String(
      data?.output_text ||
      "",
    ).trim();

  if (!outputText) {
    throw new Error(
      "OpenAI returned empty Darija translation",
    );
  }

  return outputText;
}


async function prepareEmailOffers(
  offers: OfferRow[],
): Promise<FlussiOffertaEmail[]> {

  const converted =
    offers.map(
      toEmailOffer,
    );

  /*
   * Traducción concurrente limitada.
   * Las traducciones nuevas se guardan en Supabase
   * para no volver a pagar/procesar la misma oferta.
   */

  const result:
    FlussiOffertaEmail[] =
    new Array(
      converted.length,
    );

  let cursor = 0;

  async function worker(): Promise<void> {

    while (true) {

      const index =
        cursor++;

      if (
        index >=
        converted.length
      ) {
        return;
      }

      const item =
        converted[index];

      if (
        item.detailsDarija
      ) {
        result[index] =
          item;
        continue;
      }

      const translated =
        await translateOfferToDarija(
          item.jobTitle,
          item.details ||
            "",
        );

      item.detailsDarija =
        translated;

      const sourceOffer =
        offers[index];

      if (
        sourceOffer?.id &&
        translated
      ) {

        const patch =
          await supabaseFetch(
            `/rest/v1/flussi_offerte?id=eq.${encodeURIComponent(
              sourceOffer.id,
            )}`,
            {
              method: "PATCH",

              body:
                JSON.stringify({
                  details_darija:
                    translated,
                }),
            },
          );

        if (!patch.ok) {
          const patchText =
            await patch.text();

          throw new Error(
            `Supabase Darija update error ${patch.status}: ${patchText.slice(0, 500)}`,
          );
        }
      }

      result[index] =
        item;
    }
  }

  const concurrency =
    Math.min(
      4,
      Math.max(
        1,
        converted.length,
      ),
    );

  await Promise.all(
    Array.from(
      {
        length:
          concurrency,
      },
      () =>
        worker(),
    ),
  );

  return result;
}


/* ============================================================
   GMAIL
   ============================================================ */

function requireGmailEnv(): {
  user: string;
  pass: string;
} {

  const user =
    process.env.GMAIL_USER ||
    "";

  const pass =
    process.env.GMAIL_APP_PASSWORD ||
    "";

  if (
    !user ||
    !pass
  ) {
    throw new Error(
      "GMAIL_USER / GMAIL_APP_PASSWORD missing",
    );
  }

  return {
    user,
    pass,
  };
}


function createTransporter() {

  const {
    user,
    pass,
  } =
    requireGmailEnv();

  return nodemailer.createTransport({
    service: "gmail",

    auth: {
      user,
      pass,
    },
  });
}


async function sendGmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {

  const {
    user,
  } =
    requireGmailEnv();

  const transporter =
    createTransporter();

  await transporter.sendMail({
    from:
      `"GestoriaCitaIA" <${user}>`,

    to,

    subject,

    html,
  });
}


/* ============================================================
   CLIENTS
   ============================================================ */

type FlussiEmailClient = {
  id: string;
  email: string;
  plan: number;
  gender_target:
    | "Mujer"
    | "Hombre"
    | "Ambos";
  active: boolean;
  last_sent_at:
    | string
    | null;
  next_send_at:
    | string
    | null;
  send_count: number;
  created_at: string;
  updated_at: string;
};


/* ============================================================
   HTTP / SECURITY
   ============================================================ */

function checkSecret(
  req: VercelRequest,
): void {

  const received =
    String(
      req.headers[
        "x-flussi-lavoro-secret"
      ] ||
      "",
    );

  if (
    !FLUSSI_LAVORO_SECRET ||
    received !==
      FLUSSI_LAVORO_SECRET
  ) {
    throw new Error(
      "Unauthorized",
    );
  }
}


function parseBody(
  req: VercelRequest,
): Record<string, any> {

  if (
    req.body &&
    typeof req.body ===
      "object"
  ) {
    return req.body;
  }

  if (
    typeof req.body ===
    "string"
  ) {
    try {
      return JSON.parse(
        req.body,
      );
    } catch {
      return {};
    }
  }

  return {};
}


function normalizeEmail(
  value: unknown,
): string {

  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}


function normalizeGender(
  value: unknown,
): "Mujer" | "Hombre" | "Ambos" {

  const gender =
    String(
      value ?? "",
    )
      .trim()
      .toLowerCase();

  if (
    gender ===
    "hombre"
  ) {
    return "Hombre";
  }

  if (
    gender ===
    "ambos"
  ) {
    return "Ambos";
  }

  return "Mujer";
}


function normalizePlan(
  value: unknown,
): number {

  const plan =
    Number(value);

  if (
    Math.abs(
      plan - 24.99,
    ) < 0.001
  ) {
    return 24.99;
  }

  return 14.99;
}


/* ============================================================
   CLIENT SUPABASE
   ============================================================ */

async function getClients(
  emails?: string[],
): Promise<FlussiEmailClient[]> {

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
    ].join(","),
  );

  params.set(
    "active",
    "eq.true",
  );

  params.set(
    "order",
    "created_at.asc",
  );

  if (
    emails &&
    emails.length
  ) {
    params.set(
      "email",
      `in.(${emails
        .map(
          (email) =>
            `"${normalizeEmail(
              email,
            )}"`,
        )
        .join(",")})`,
    );
  }

  const response =
    await supabaseFetch(
      `/rest/v1/flussi_email_clients?${params.toString()}`,
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase clients error ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  const rows =
    JSON.parse(text);

  return Array.isArray(
    rows,
  )
    ? rows
    : [];
}


async function updateClientAfterSend(
  client: FlussiEmailClient,
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
          1000,
    );

  const response =
    await supabaseFetch(
      `/rest/v1/flussi_email_clients?id=eq.${encodeURIComponent(
        client.id,
      )}`,
      {
        method: "PATCH",

        body:
          JSON.stringify({
            last_sent_at:
              now.toISOString(),

            next_send_at:
              next.toISOString(),

            send_count:
              Number(
                client.send_count ||
                  0,
              ) + 1,

            updated_at:
              now.toISOString(),
          }),
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Supabase client update error ${response.status}: ${text.slice(0, 500)}`,
    );
  }
}
    const value =
      emailValue(
        offer.category,
      );

    const category =
      value ||
      "Offerta di lavoro";

    const title =
      emailValue(
        offer.jobTitle,
      ) ||
      "Offerta di lavoro";

    const city =
      emailValue(
        offer.city,
      ) ||
      "—";

    const province =
      emailValue(
        offer.province,
      ) ||
      "—";

    const address =
      emailValue(
        offer.address,
      ) ||
      "Indirizzo preciso non indicato nell'offerta.";

    const phone =
      emailValue(
        offer.phone,
      ) ||
      "—";

    const ido =
      emailValue(
        offer.email,
      ) ||
      "—";

    const fullDetails =
      emailValue(
        offer.details,
      ) ||
      "Dettagli completi disponibili nell'offerta.";

    const detailsAR =
      emailValue(
        offer.detailsDarija,
      ) ||
      "تفاصيل العرض كاملة غادي تلقاها هنا منين تكون الترجمة متوفرة.";

    return {
      jobTitle: title,
      category,
      city,
      province,
      address,
      phone,
      email: ido,
      details: fullDetails,
      detailsDarija: detailsAR,
      offerUrl:
        emailValue(
          offer.offerUrl,
        ),
    };
  });


  /* ==========================================================
     HEADER
     ========================================================== */

  const greeting =
    emailValue(
      data.recipientName,
    ) ||
    "Ciao";


  /* ==========================================================
     EMAIL HTML
     ========================================================== */

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


<!-- ==========================================================
     HEADER
     ========================================================== -->

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
Servizio informativo e ricerca offerte di lavoro
</div>

</td>

<td
  width="45%"
  align="right"
  valign="top"
>

<div
  style="
    font-size:25px;
    line-height:29px;
  "
>
🇮🇹 🇲🇦
</div>

<div
  dir="rtl"
  style="
    margin-top:4px;
    font-size:9px;
    color:#ffd429;
    font-weight:800;
  "
>
إيطاليا · المغرب
</div>

</td>

</tr>

</table>

</td>

</tr>


<!-- ==========================================================
     TITLE
     ========================================================== -->

<tr>

<td
  class="mobile-pad"
  style="
    padding:16px 16px 7px;
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
  class="mobile-stack-cell"
>

<div
  class="header-title"
  style="
    margin-top:8px;
    font-size:23px;
    font-weight:900;
    line-height:27px;
    color:#ffffff;
  "
>
Nuove offerte di
<span style="color:#ffd429;">
lavoro
</span>
</div>

<div
  style="
    margin-top:3px;
    font-size:9px;
    color:#b8c8d1;
  "
>
Nell'ambito del Decreto Flussi 2027
</div>

</td>


<td
  width="45%"
  dir="rtl"
  align="right"
  valign="bottom"
  class="mobile-stack-cell"
  style="padding-top:8px;"
>

<div
  style="
    font-size:19px;
    font-weight:900;
    line-height:23px;
    color:#ffffff;
  "
>
عروض عمل
<span style="color:#ffd429;">
جديدة
</span>
</div>

<div
  style="
    margin-top:3px;
    font-size:9px;
    color:#b8c8d1;
  "
>
في إطار ديكريتو فلوسي 2027
</div>

</td>

</tr>

</table>

</td>

</tr>


<!-- ==========================================================
     GREETING
     ========================================================== -->

<tr>

<td
  class="mobile-pad"
  style="
    padding:7px 16px 12px;
  "
>

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background:#071e2e;
    border:1px solid #214b63;
    border-radius:12px;
  "
>

<tr>

<td
  style="
    padding:11px 12px;
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
  width="50%"
  valign="top"
  style="padding-right:6px;"
>

<div
  style="
    font-size:12px;
    font-weight:900;
    color:#ffffff;
  "
>
Ciao ${emailEsc(greeting)} 👋
</div>

<div
  style="
    margin-top:4px;
    font-size:9px;
    line-height:14px;
    color:#c9d6de;
  "
>
Abbiamo raccolto nuove offerte di lavoro collegate al Decreto Flussi.
Controlla i dettagli qui sotto e verifica sempre le informazioni con la fonte ufficiale.
</div>

</td>


<td
  width="50%"
  dir="rtl"
  valign="top"
  align="right"
  style="padding-left:6px;"
>

<div
  style="
    font-size:12px;
    font-weight:900;
    color:#ffffff;
  "
>
مرحبا ${emailEsc(greeting)} 👋
</div>

<div
  style="
    margin-top:4px;
    font-size:9px;
    line-height:14px;
    color:#c9d6de;
  "
>
جمعنا ليك عروض عمل جديدة مرتبطة بـ Decreto Flussi.
شوف التفاصيل لتحت وتأكد ديما من المعلومات مع المصدر الرسمي.
</div>

</td>

</tr>

</table>

</td>

</tr>

</table>

</td>

</tr>


<!-- ==========================================================
     OFFERS
     ========================================================== -->

<tr>

<td
  class="mobile-pad"
  style="
    padding:0 10px 2px;
  "
>

${cards}

</td>

</tr>


<!-- ==========================================================
     IMPORTANT NOTICE
     ========================================================== -->

<tr>

<td
  class="mobile-pad"
  style="
    padding:0 16px 14px;
  "
>

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background:#211f04;
    border:1px solid #d1ad22;
    border-radius:13px;
  "
>

<tr>

<td
  style="
    padding:12px;
  "
>

<div
  style="
    font-size:12px;
    font-weight:900;
    color:#ffd429;
  "
>
⚠️ AVVISO IMPORTANTE
</div>

<div
  style="
    margin-top:5px;
    font-size:9px;
    line-height:14px;
    color:#ffffff;
  "
>
GestoriaCitaIA è un servizio informativo che ricerca e presenta
offerte di lavoro collegate al Decreto Flussi in Italia.
Non garantisce l'assunzione, il contratto di lavoro, il rilascio
del nulla osta o del visto e non agisce come intermediario tra
lavoratore e datore di lavoro. Le informazioni devono essere
verificate direttamente con il datore di lavoro o con gli enti competenti.
</div>

<div
  dir="rtl"
  style="
    margin-top:7px;
    font-size:9px;
    line-height:16px;
    color:#ffffff;
  "
>
⚠️ تنبيه مهم<br><br>
GestoriaCitaIA غير خدمة معلوماتية كتبحث وكتعرض عروض العمل المرتبطة بـ Decreto Flussi فإيطاليا.
الموقع ما كيضمنش الحصول على عقد العمل، وما كيضمنش nulla osta أو الفيزا، وما كيخدمش كوسيط بين العامل والمشغّل.
المعلومات خاصها تتأكد مباشرة مع المشغّل أو الجهات المختصة.
</div>

</td>

</tr>

</table>

</td>

</tr>


<!-- ==========================================================
     FOOTER
     ========================================================== -->

<tr>

<td
  style="
    padding:15px 16px 17px;
    text-align:center;
    border-top:1px solid #16435c;
  "
>

<div
  style="
    font-size:20px;
    font-weight:900;
    color:#ffffff;
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
    letter-spacing:1.2px;
  "
>
DECRETO FLUSSI 2027
</div>

<div
  style="
    margin-top:6px;
    font-size:8px;
    color:#708895;
  "
>
🇮🇹 Italia · 🇲🇦 Marocco · gestoriacitaia.com
</div>

<div
  style="
    margin-top:4px;
    font-size:7px;
    color:#526a77;
  "
>
© 2027 GestoriaCitaIA · Privacy · Termini · Contatti
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
   DARIJA TRANSLATION / PREPARATION
   ============================================================ */

async function prepareDarijaTranslations(
  offers: OfferRow[],
): Promise<FlussiOffertaEmail[]> {

  const prepared =
    offers.map(
      (offer) =>
        toEmailOffer(
          offer,
        ),
    );

  let cursor = 0;

  async function processNext(): Promise<void> {

    while (true) {

      const index =
        cursor++;

      if (
        index >=
        prepared.length
      ) {
        return;
      }

      const offer =
        prepared[index];

      if (
        offer.detailsDarija &&
        offer.detailsDarija.trim()
      ) {
        continue;
      }

      const source =
        offers[index];

      if (
        !source ||
        !source.id
      ) {
        continue;
      }

      const translated =
        await translateOfferToDarija(
          offer.jobTitle,
          offer.details ||
            "",
        );

      offer.detailsDarija =
        translated;

      const response =
        await supabaseRequest(
          `flussi_offerte?id=eq.${encodeURIComponent(
            source.id,
          )}`,
          {
            method: "PATCH",

            body:
              JSON.stringify({
                details_darija:
                  translated,
              }),
          },
        );

      if (!response.ok) {

        const errorText =
          await response.text();

        throw new Error(
          `Error guardando Darija ${response.status}: ${errorText.slice(
            0,
            500,
          )}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length:
          Math.min(
            4,
            Math.max(
              1,
              prepared.length,
            ),
          ),
    },
    () =>
      processNext(),
  );

  return prepared;
}


/* ============================================================
   FILTER OFFERS
   ============================================================ */

function filterOffersByGender(
  offers: OfferRow[],
  gender?: string,
): OfferRow[] {

  const normalized =
    normalise(
      gender,
    );

  if (
    !normalized ||
    normalized ===
      "ambos"
  ) {
    return offers;
  }

  if (
    normalized ===
    "mujer"
  ) {
    return offers.filter(
      (offer) =>
        normalise(
          offer.gender_target,
        ) ===
        "mujer",
    );
  }

  if (
    normalized ===
    "hombre"
  ) {
    return offers.filter(
      (offer) =>
        normalise(
          offer.gender_target,
        ) ===
        "hombre",
    );
  }

  return offers;
}


/* ============================================================
   GET OFFERS
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
    ].join(","),
  );

  params.set(
    "order",
    "created_at.desc",
  );

  params.set(
    "limit",
    String(
      Math.min(
        Math.max(
          Number(
            limitOffers,
          ) || 50,
          1,
        ),
        50,
      ),
    ),
  );

  const response =
    await supabaseRequest(
      `flussi_offerte?${params.toString()}`,
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Error obteniendo ofertas ${response.status}: ${body.slice(
        0,
        500,
      )}`,
    );
  }

  const rows =
    JSON.parse(body);

  const offers =
    Array.isArray(rows)
      ? rows
      : [];

  return filterOffersByGender(
    offers,
    gender,
  );
}


/* ============================================================
   GET CLIENTS
   ============================================================ */

async function fetchClients(
  emails?: string[],
): Promise<FlussiEmailClient[]> {

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
    ].join(","),
  );

  params.set(
    "active",
    "eq.true",
  );

  params.set(
    "order",
    "created_at.asc",
  );

  if (
    emails &&
    emails.length
  ) {

    const normalizedEmails =
      emails
        .map(
          normalizeEmail,
        )
        .filter(Boolean);

    if (
      normalizedEmails.length
    ) {
      params.set(
        "email",
        `in.(${normalizedEmails
          .map(
            (email) =>
              `"${email}"`,
          )
          .join(",")})`,
      );
    }
  }

  const response =
    await supabaseRequest(
      `flussi_email_clients?${params.toString()}`,
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Error obteniendo clientes ${response.status}: ${body.slice(
        0,
        500,
      )}`,
    );
  }

  const rows =
    JSON.parse(body);

  return Array.isArray(rows)
    ? rows
    : [];
}


/* ============================================================
   PLAN / GENDER VALIDATION
   ============================================================ */

function validatePlanGender(
  gender: string,
  plan: number,
): void {

  if (
    gender ===
      "Mujer" &&
    Math.abs(
      plan - 14.99,
    ) > 0.001
  ) {
    throw new Error(
      "Plan Mujer debe ser 14.99 €",
    );
  }

  if (
    gender ===
      "Hombre" &&
    Math.abs(
      plan - 24.99,
    ) > 0.001
  ) {
    throw new Error(
      "Plan Hombre debe ser 24.99 €",
    );
  }
}


/* ============================================================
   LAST SENT FILTER
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
    new Date(
      lastSentAt,
    ).getTime();

  if (
    Number.isNaN(last)
  ) {
    return offers;
  }

  return offers.filter(
    (offer) => {

      const created =
        new Date(
          offer.created_at ||
            "",
        ).getTime();

      if (
        Number.isNaN(
          created,
        )
      ) {
        return false;
      }

      return created > last;
    },
  );
}


/* ============================================================
   UPDATE CLIENT HISTORY
   ============================================================ */

async function markClientSent(
  client: FlussiEmailClient,
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
          1000,
    );

  const sendCount =
    Number(
      client.send_count ||
        0,
    ) + 1;

  const response =
    await supabaseRequest(
      `flussi_email_clients?id=eq.${encodeURIComponent(
        client.id,
      )}`,
      {
        method: "PATCH",

        body:
          JSON.stringify({
            last_sent_at:
              now.toISOString(),

            next_send_at:
              next.toISOString(),

            send_count:
              sendCount,

            updated_at:
              now.toISOString(),
          }),
      },
    );

  if (!response.ok) {

    const body =
      await response.text();

    throw new Error(
      `Error actualizando cliente ${response.status}: ${body.slice(
        0,
        500,
      )}`,
    );
  }
}


/* ============================================================
   UPSERT CLIENT
   ============================================================ */

async function upsertClient(
  email: string,
  gender: "Mujer" | "Hombre" | "Ambos",
  plan: number,
): Promise<void> {

  const normalizedEmail =
    normalizeEmail(
      email,
    );

  if (
    !normalizedEmail
  ) {
    throw new Error(
      "Email obligatorio",
    );
  }

  const response =
    await supabaseRequest(
      "flussi_email_clients?on_conflict=email",
      {
        method: "POST",

        headers: {
          Prefer:
            "resolution=merge-duplicates,return=minimal",
        },

        body:
          JSON.stringify({
            email:
              normalizedEmail,

            gender_target:
              gender,

            plan,

            active:
              true,

            updated_at:
              new Date().toISOString(),
          }),
      },
    );

  if (!response.ok) {

    const body =
      await response.text();

    throw new Error(
      `Error guardando cliente ${response.status}: ${body.slice(
        0,
        500,
      )}`,
    );
  }
}


/* ============================================================
   SUBJECT
   ============================================================ */

function buildSubject(
  gender?: string,
): string {

  if (
    gender ===
    "Mujer"
  ) {
    return "🇮🇹 Nuove offerte Decreto Flussi — Piano Donna";
  }

  if (
    gender ===
    "Hombre"
  ) {
    return "🇮🇹 Nuove offerte Decreto Flussi — Piano Uomo";
  }

  return "🇮🇹 Nuove offerte di lavoro — Decreto Flussi 2027";
}


/* ============================================================
   SEND TO CLIENT
   ============================================================ */

async function sendOffersToClient(
  client: FlussiEmailClient,
  offers: OfferRow[],
): Promise<void> {

  if (
    !offers.length
  ) {
    return;
  }

  const prepared =
    await prepareDarijaTranslations(
      offers,
    );

  const html =
    buildFlussiOfferteEmail({
      offers:
        prepared,

      recipientName:
        client.email,
    });

  const transporter =
    createTransporter();

  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "GestoriaCitaIA";

  await transporter.sendMail({

    from:

      `"GestoriaCitaIA" <${from}>`,

    to:
      client.email,

    subject:
      buildSubject(
        client.gender_target,
      ),

    html,
  });
}


/* ============================================================
   TEST EMAIL
   ============================================================ */

async function sendTestEmail(
  testEmail: string,
  gender: string,
  plan: number,
  limitOffers = 50,
): Promise<Record<string, any>> {

  validatePlanGender(
    gender,
    plan,
  );

  const offers =
    await fetchOffers(
      gender,
      limitOffers,
    );

  const prepared =
    await prepareDarijaTranslations(
      offers,
    );

  const html =
    buildFlussiOfferteEmail({
      offers:
        prepared,

      recipientName:
        testEmail,
    });

  const transporter =
    createTransporter();

  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "GestoriaCitaIA";

  await transporter.sendMail({

    from:
      `"GestoriaCitaIA" <${from}>`,

    to:
      testEmail,

    subject:
      `[TEST] ${buildSubject(
        gender,
      )}`,

    html,
  });

  return {
    ok:
      true,

    testEmail,

    selectedOffers:
      offers.length,

    sent:
      1,

    failed:
      0,

    message:
      "Test Gmail inviato correttamente.",
  };
}


/* ============================================================
   MAIN SEND
   ============================================================ */

async function executeSend(
  options: {
    emails?: string[];
    gender?: string;
    plan?: number;
    limitOffers?: number;
    dryRun?: boolean;
  },
): Promise<Record<string, any>> {

  const gender =
    normalizeGender(
      options.gender,
    );

  const plan =
    normalizePlan(
      options.plan,
    );

  validatePlanGender(
    gender,
    plan,
  );

  const clients =
    await fetchClients(
      options.emails,
    );

  const selectedClients =
    clients.filter(
      (client) => {

        if (
          options.emails &&
          options.emails.length
        ) {
          const requested =
            new Set(
              options.emails.map(
                normalizeEmail,
              ),
            );

          if (
            !requested.has(
              normalizeEmail(
                client.email,
              ),
            )
          ) {
            return false;
          }
        }

        if (
          gender !==
          "Ambos" &&
          client.gender_target !==
            gender
        ) {
          return false;
        }

        if (
          Math.abs(
            Number(
              client.plan,
            ) -
              plan,
          ) >
          0.001
        ) {
          return false;
        }

        return true;
      },
    );

  const allOffers =
    await fetchOffers(
      gender,
      options.limitOffers ||
        50,
    );

  let sent = 0;

  let failed = 0;

  const errors: any[] = [];

  const details: any[] = [];

  for (
    const client
    of selectedClients
  ) {

    try {

      const offers =
        filterNewOffers(
          allOffers,
          client.last_sent_at,
        );

      details.push({
        email:
          client.email,

        gender:
          client.gender_target,

        plan:
          client.plan,

        availableOffers:
          offers.length,

        lastSentAt:
          client.last_sent_at,

        dryRun:
          Boolean(
            options.dryRun,
          ),
      });

      if (
        options.dryRun
      ) {
        continue;
      }

      if (
        !offers.length
      ) {
        continue;
      }

      await sendOffersToClient(
        client,
        offers,
      );

      await markClientSent(
        client,
      );

      sent++;

    } catch (
      error
    ) {

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
      Boolean(
        options.dryRun,
      ),

    gender,

    plan,

    selectedOffers:
      allOffers.length,

    activeClients:
      clients.length,

    recipientsMatched:
      selectedClients.length,

    sent,

    failed,

    errors,

    details,
  };
} 
/* ============================================================
   HTTP HANDLER
   ============================================================ */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {

  /*
   * Solo POST.
   */

  if (
    req.method !==
    "POST"
  ) {
    res.status(405).json({
      ok:
        false,

      error:
        "Method not allowed",
    });

    return;
  }


  try {

    /*
     * Seguridad:
     * el endpoint solo acepta llamadas con
     * x-flussi-lavoro-secret correcto.
     */

    checkSecret(
      req,
    );


    /*
     * Body.
     */

    const body =
      parseBody(
        req,
      );


    /*
     * Acción.
     *
     * test  = manda un email de prueba
     * send  = manda a clientes
     * add   = registra cliente
     * status = consulta clientes
     */

    const action =
      String(
        body.action ||
        "send",
      )
        .trim()
        .toLowerCase();


    /* ========================================================
       TEST
       ======================================================== */

    if (
      action ===
      "test"
    ) {

      const testEmail =
        normalizeEmail(
          body.testEmail,
        );

      if (
        !testEmail
      ) {
        res.status(400).json({
          ok:
            false,

          error:
            "testEmail obligatorio",
        });

        return;
      }

      const gender =
        normalizeGender(
          body.gender,
        );

      const plan =
        normalizePlan(
          body.plan,
        );

      const limitOffers =
        Number(
          body.limitOffers ||
          body.limit ||
          50,
        );

      const result =
        await sendTestEmail(
          testEmail,
          gender,
          plan,
          limitOffers,
        );

      res.status(200).json(
        result,
      );

      return;
    }


    /* ========================================================
       ADD CLIENT
       ======================================================== */

    if (
      action ===
      "add"
    ) {

      const email =
        normalizeEmail(
          body.email,
        );

      if (
        !email
      ) {
        res.status(400).json({
          ok:
            false,

          error:
            "email obligatorio",
        });

        return;
      }

      const gender =
        normalizeGender(
          body.gender,
        );

      const plan =
        normalizePlan(
          body.plan,
        );

      /*
       * Para Ambos no obligamos un plan concreto.
       * Si llega sin plan, se conserva 14.99 como valor técnico.
       */

      if (
        gender !==
        "Ambos"
      ) {
        validatePlanGender(
          gender,
          plan,
        );
      }

      await upsertClient(
        email,
        gender,
        plan,
      );

      res.status(200).json({
        ok:
          true,

        action:
          "add",

        email,

        gender,

        plan,

        message:
          "Cliente registrado correctamente.",
      });

      return;
    }


    /* ========================================================
       STATUS
       ======================================================== */

    if (
      action ===
      "status"
    ) {

      const emails =
        Array.isArray(
          body.emails,
        )
          ? body.emails
          : body.email
            ? [
                body.email,
              ]
            : undefined;

      const clients =
        await fetchClients(
          emails,
        );

      res.status(200).json({
        ok:
          true,

        clients,
      });

      return;
    }


    /* ========================================================
       SEND
       ======================================================== */

    if (
      action ===
      "send"
    ) {

      const emails =
        Array.isArray(
          body.emails,
        )
          ? body.emails
              .map(
                normalizeEmail,
              )
              .filter(Boolean)
          : body.email
            ? [
                normalizeEmail(
                  body.email,
                ),
              ]
            : undefined;


      const gender =
        body.gender
          ? normalizeGender(
              body.gender,
            )
          : undefined;


      const plan =
        body.plan !==
        undefined
          ? normalizePlan(
              body.plan,
            )
          : undefined;


      /*
       * Si se especifica género y plan,
       * se valida la combinación.
       */

      if (
        gender &&
        plan !==
          undefined &&
        gender !==
          "Ambos"
      ) {

        validatePlanGender(
          gender,
          plan,
        );
      }


      const limitOffers =
        Number(
          body.limitOffers ||
          body.limit ||
          50,
        );


      const dryRun =
        Boolean(
          body.dryRun,
        );


      const result =
        await executeSend({
          emails,

          gender,

          plan,

          limitOffers,

          dryRun,
        });


      res.status(
        result.failed
          ? 207
          : 200,
      ).json(
        result,
      );

      return;
    }


    /* ========================================================
       UNKNOWN ACTION
       ======================================================== */

    res.status(400).json({
      ok:
        false,

      error:
        `Acción no válida: ${action}`,

      allowed:
        [
          "test",
          "send",
          "add",
          "status",
        ],
    });

  } catch (
    error
  ) {

    const message =
      error instanceof Error
        ? error.message
        : String(error);


    /*
     * No mostramos secretos ni valores sensibles.
     */

    if (
      message ===
      "Unauthorized"
    ) {

      res.status(401).json({
        ok:
          false,

        error:
          "Unauthorized",
      });

      return;
    }


    console.error(
      "send-flussi-offerte error:",
      error,
    );


    res.status(500).json({
      ok:
        false,

      error:
        message,
    });
  }
}


/* ============================================================
   UTILIDADES
   ============================================================ */

function normalise(
  value: unknown,
): string {

  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}


/* ============================================================
   SUPABASE REQUEST
   ============================================================ */

async function supabaseRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {

  requireEnv();

  const headers =
    new Headers(
      options.headers ||
        {},
    );

  headers.set(
    "apikey",
    SUPABASE_SERVICE_ROLE_KEY,
  );

  headers.set(
    "Authorization",
    `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  );

  headers.set(
    "Content-Type",
    "application/json",
  );

  return fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,

      headers,
    },
  );
}
