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

  const count =
    offers.length;

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
  style="
    display:inline-block;
    background:#07543f;
    color:#45efad;
    border-radius:16px;
    padding:5px 9px;
    font-size:8px;
    font-weight:900;
  "
>
✓ ${count} OFFERTE DISPONIBILI
</div>


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
Abbiamo trovato
<b style="color:#45efad;">
${count} nuove offerte
</b>
disponibili.
Controlla i dettagli qui sotto.
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
لقينا ليك
<b style="color:#45efad;">
${count} عروض عمل جديدة
</b>
شوف التفاصيل لتحت.
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
     HOW TO APPLY
     ========================================================== -->

<tr>

<td
  class="mobile-pad"
  style="
    padding:3px 16px 14px;
  "
>

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background:#06352f;
    border:1px solid #17cfa0;
    border-radius:14px;
  "
>

<tr>

<td
  style="
    padding:13px;
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
    font-size:13px;
    font-weight:900;
    color:#45efad;
  "
>
📩 Come candidarsi
</div>

<div
  style="
    margin-top:4px;
    font-size:9px;
    line-height:14px;
    color:#ffffff;
  "
>
Rispondi a questa email indicando il numero dell'offerta che ti interessa.
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
    font-size:13px;
    font-weight:900;
    color:#45efad;
  "
>
📩 طريقة التقديم
</div>

<div
  style="
    margin-top:4px;
    font-size:9px;
    line-height:14px;
    color:#ffffff;
  "
>
جاوبنا على هاد الإيميل ورسل لينا رقم العرض اللي مهتم بيه.
</div>

</td>

</tr>

</table>


<div
  style="
    text-align:center;
    margin-top:10px;
  "
>

<span
  style="
    display:inline-block;
    background:#20df91;
    color:#032019;
    border-radius:20px;
    padding:8px 17px;
    font-size:10px;
    font-weight:900;
  "
>
MI INTERESSA QUESTA OFFERTA →
</span>

</div>

</td>

</tr>

</table>

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
⚠ Informazione importante
</div>

<div
  style="
    margin-top:5px;
    font-size:9px;
    line-height:14px;
    color:#ffffff;
  "
>
GestoriaCitaIA non è un'agenzia di lavoro e non garantisce
l'ottenimento di un contratto, nulla osta, visto o permesso
di soggiorno.
Le offerte vengono ricercate da fonti pubbliche.
</div>

<div
  dir="rtl"
  style="
    margin-top:7px;
    font-size:9px;
    line-height:14px;
    color:#ffffff;
  "
>
ملاحظة مهمة:
GestoriaCitaIA ماشي وكالة توظيف وما كتضمنش العقد
ولا nulla osta ولا الفيزا ولا الإقامة.
العروض كنقلبو عليها من مصادر عمومية.
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
   CONFIG
   ============================================================ */

export const config = {
  api: {
    bodyParser: true,
  },
};


/* ============================================================
   BASIC HELPERS
   ============================================================ */

const clean = (
  value: unknown,
  max = 2000,
): string =>
  String(value ?? "")
    .trim()
    .slice(0, max);


const normalise = (
  value: unknown,
): string =>
  clean(value)
    .toLowerCase()
    .trim();


/* ============================================================
   SUPABASE
   ============================================================ */

const supabaseUrl =
  clean(
    process.env.SUPABASE_URL,
  );

const serviceKey =
  clean(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );


async function supabaseRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {

  if (
    !supabaseUrl ||
    !serviceKey
  ) {
    throw new Error(
      "Supabase configuration missing",
    );
  }

  return fetch(
    `${supabaseUrl}/rest/v1/${path}`,
    {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        apikey:
          serviceKey,

        Authorization:
          `Bearer ${serviceKey}`,

        ...(options.headers || {}),
      },
    },
  );
}


/* ============================================================
   SMTP
   ============================================================ */

function createTransporter() {

  const host =
    process.env.SMTP_HOST;

  const user =
    process.env.SMTP_USER;

  const pass =
    process.env.SMTP_PASS;

  if (
    !host ||
    !user ||
    !pass
  ) {
    throw new Error(
      "SMTP configuration missing",
    );
  }

  const port =
    Number(
      process.env.SMTP_PORT ||
      587,
    );

  return nodemailer.createTransport({
    host,
    port,
    secure:
      port === 465,

    auth: {
      user,
      pass,
    },
  });
}


/* ============================================================
   CLIENT
   ============================================================ */

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


/* ============================================================
   OFFER
   ============================================================ */

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

  [key: string]: any;
};


/* ============================================================
   ARRAY VALUES
   ============================================================ */

function listValues(
  value: unknown,
): string[] {

  if (
    Array.isArray(
      value,
    )
  ) {

    return value
      .map(
        normalise,
      )
      .filter(Boolean);
  }

  return String(
    value ?? "",
  )
    .split(",")
    .map(
      normalise,
    )
    .filter(Boolean);
}


/* ============================================================
   WORK TYPE MATCH
   ============================================================ */

function workTypeMatches(
  clientType: string,
  offerType: string,
): boolean {

  const client =
    normalise(
      clientType,
    );

  const offer =
    normalise(
      offerType,
    );

  if (
    !offer ||
    client === offer
  ) {
    return true;
  }

  const nonSeasonal =
    new Set([
      "non_stagionale",
      "non-stagionale",
      "non estazionale",
      "non_estazionale",
      "no_estacional",
      "no-estacional",
    ]);

  const seasonal =
    new Set([
      "stagionale",
      "estacional",
      "estazionale",
    ]);

  if (
    nonSeasonal.has(
      client,
    ) &&
    nonSeasonal.has(
      offer,
    )
  ) {
    return true;
  }

  if (
    seasonal.has(
      client,
    ) &&
    seasonal.has(
      offer,
    )
  ) {
    return true;
  }

  return false;
}


/* ============================================================
   CATEGORY MATCH
   ============================================================ */

function categoryMatches(
  client: Client,
  offer: OfferRow,
): boolean {

  const offerCode =
    normalise(
      offer.category_code,
    );

  const offerName =
    normalise(
      offer.category,
    );

  const wanted =
    client.source_table ===
    "flussi_lavoro_24_99"

      ? listValues(
          client.category,
        )

      : listValues(
          client.categories,
        );

  if (
    !offerCode &&
    !offerName
  ) {
    return true;
  }

  return wanted.some(
    (
      item,
    ) => {

      if (!item) {
        return false;
      }

      return (
        item === offerCode ||
        item === offerName ||

        (
          !!offerCode &&
          item.includes(
            offerCode,
          )
        ) ||

        (
          !!offerName &&
          item.includes(
            offerName,
          )
        ) ||

        (
          !!offerCode &&
          offerCode.includes(
            item,
          )
        ) ||

        (
          !!offerName &&
          offerName.includes(
            item,
          )
        )
      );
    },
  );
}


/* ============================================================
   CLIENT ACTIVE
   ============================================================ */

function isClientActive(
  row: Record<string, any>,
  table: string,
): boolean {

  if (
    normalise(
      row.payment_status,
    ) !== "paid"
  ) {
    return false;
  }

  if (
    table ===
    "flussi_lavoro_9_99"
  ) {
    return true;
  }

  if (
    !row.expires_at
  ) {
    return false;
  }

  return (
    new Date(
      row.expires_at,
    ).getTime()
    >= Date.now()
  );
}


/* ============================================================
   ACTIVE CLIENTS
   ============================================================ */

async function getActiveClients():
  Promise<Client[]> {

  const tables = [
    "flussi_lavoro_9_99",
    "flussi_lavoro_19_99",
    "flussi_lavoro_24_99",
  ];

  const all: Client[] = [];

  for (
    const table of tables
  ) {

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
          select,
        )}&payment_status=eq.paid`,
      );

    const responseText =
      await response.text();

    if (
      !response.ok
    ) {

      throw new Error(
        `Supabase ${table} failed: ${response.status} ${responseText}`,
      );
    }

    const rows =
      JSON.parse(
        responseText,
      );

    for (
      const row of
        Array.isArray(
          rows,
        )
          ? rows
          : []
    ) {

      if (
        !row.email ||
        !isClientActive(
          row,
          table,
        )
      ) {
        continue;
      }

      all.push({

        id:
          row.id,

        first_name:
          row.first_name ||
          "",

        last_name:
          row.last_name ||
          "",

        email:
          row.email,

        phone:
          row.phone ||
          null,

        work_type:
          row.work_type ||
          "non_stagionale",

        categories:
          row.categories ||
          null,

        category:
          row.category ||
          null,

        source_table:
          table,

        active:
          true,
      });
    }
  }

  return all;
}


/* ============================================================
   GET OFFERS
   ============================================================ */

async function getOffers(
  offerIds: string[],
): Promise<OfferRow[]> {

  const ids =
    offerIds
      .map(
        (id) =>
          clean(
            id,
            100,
          ),
      )
      .filter(Boolean);

  if (
    !ids.length
  ) {
    return [];
  }

  const encoded =
    ids
      .map(
        (id) =>
          `"${id.replace(
            /"/g,
            '\\"',
          )}"`,
      )
      .join(",");

  /*
   * SELECT *
   *
   * Così prendiamo anche:
   * description
   * requirements
   * hours
   * experience
   * education
   * languages
   * schedule
   * ecc.
   */

  const select =
    "*";

  const response =
    await supabaseRequest(
      `flussi_offerte?select=${select}&id=in.(${encoded})`,
    );

  const responseText =
    await response.text();

  if (
    !response.ok
  ) {

    throw new Error(
      `Supabase flussi_offerte failed: ${response.status} ${responseText}`,
    );
  }

  const rows =
    JSON.parse(
      responseText,
    );

  return (
    Array.isArray(
      rows,
    )
      ? rows
      : []
  ).filter(
    (
      row,
    ) =>
      row.is_active !== false &&
      normalise(
        row.status,
      ) !== "inactive",
  );
}


/* ============================================================
   DELIVERED
   ============================================================ */

async function getAlreadyDelivered(
  offerIds: string[],
): Promise<Set<string>> {

  if (
    !offerIds.length
  ) {
    return new Set<string>();
  }

  const encoded =
    offerIds
      .map(
        (id) =>
          `"${id.replace(
            /"/g,
            '\\"',
          )}"`,
      )
      .join(",");

  const response =
    await supabaseRequest(
      `flussi_deliveries?select=offer_id,email,status&offer_id=in.(${encoded})&status=eq.sent`,
    );

  const responseText =
    await response.text();

  if (
    !response.ok
  ) {

    throw new Error(
      `Supabase flussi_deliveries failed: ${response.status} ${responseText}`,
    );
  }

  const rows =
    JSON.parse(
      responseText,
    );

  const delivered =
    new Set<string>();

  for (
    const row of
      Array.isArray(
        rows,
      )
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

      if (
        value
      ) {
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
      pick(
        ...keys,
      );

    if (
      value
    ) {

      parts.push(
        `${label}: ${value}`,
      );
    }
  };


  /*
   * TODO LO QUE EXISTA EN SUPABASE
   * SE INTENTA METER EN EL CUADRO AMARILLO.
   */

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
      (
        part,
      ) =>
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

      ? parts.join(
          " · ",
        )

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

      details.slice(
        0,
        7000,
      ),

    detailsDarija:

      detailsDarija.slice(
        0,
        5000,
      ),
  };
}


/* ============================================================
   HEADER
   ============================================================ */

function getHeaderValue(
  req: VercelRequest,
  name: string,
): string {

  const value =
    req.headers[name];

  if (
    Array.isArray(
      value,
    )
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

    return res.status(
      405,
    ).json({

      error:
        "Method not allowed",

      method:
        req.method,
    });
  }


  try {


    /* ========================================================
       SECRET
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

        return res.status(
          401,
        ).json({

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


    const offerIds =
      Array.isArray(
        body.offerIds,
      )

        ? body.offerIds
            .map(
              (
                id: unknown,
              ) =>
                clean(
                  id,
                  100,
                ),
            )
            .filter(Boolean)

        : [];


    const dryRun =
      body.dryRun === true;


    /*
     * TEST EMAIL
     *
     * Esempio:
     *
     * "testEmail":
     * "robertopalacio165@gmail.com"
     *
     * In questo caso NON fa matching clienti.
     * Manda direttamente a quel Gmail.
     */

    const testEmail =
      emailValue(
        body.testEmail,
      );


    if (
      !offerIds.length
    ) {

      return res.status(
        400,
      ).json({

        error:
          "offerIds is required",

        example: {

          dryRun:
            true,

          testEmail:
            "robertopalacio165@gmail.com",

          offerIds: [
            "UUID-DE-LA-OFERTA",
          ],

        },

      });
    }


    if (
      offerIds.length >
      50
    ) {

      return res.status(
        400,
      ).json({

        error:
          "Maximum 50 offers per bulletin",

      });
    }


    /* ========================================================
       GET OFFERS
       ======================================================== */

    const offers =
      await getOffers(
        offerIds,
      );


    if (
      !offers.length
    ) {

      return res.status(
        404,
      ).json({

        error:
          "No active offers found",

        requestedOfferIds:
          offerIds,

      });
    }


    /* ========================================================
       DIRECT GMAIL TEST
       ======================================================== */

    if (
      testEmail
    ) {

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

        return res.status(
          200,
        ).json({

          ok:
            true,

          dryRun:
            true,

          testEmail,

          selectedOffers:
            offers.length,

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


      return res.status(
        200,
      ).json({

        ok:
          true,

        dryRun:
          false,

        testEmail,

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
       ACTIVE CLIENTS
       ======================================================== */

    const clients =
      await getActiveClients();


    /* ========================================================
       DELIVERED
       ======================================================== */

    const delivered =
      await getAlreadyDelivered(
        offers.map(
          (
            offer,
          ) =>
            offer.id,
        ),
      );


    /* ========================================================
       MATCHES
       ======================================================== */

    const matches =
      new Map<
        string,
        {
          client: Client;
          offers: OfferRow[];
        }
      >();


    for (
      const client of
        clients
    ) {

      const matched =
        offers.filter(
          (
            offer,
          ) => {

            if (
              !workTypeMatches(
                client.work_type,
                offer.work_type ||
                  "",
              )
            ) {

              return false;
            }


            if (
              !categoryMatches(
                client,
                offer,
              )
            ) {

              return false;
            }


            const key =
              `${offer.id}::${normalise(
                client.email,
              )}`;


            return !delivered.has(
              key,
            );
          },
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


    /* ========================================================
       PREVIEW
       ======================================================== */

    const preview =
      Array.from(
        matches.values(),
      ).map(
        (
          item,
        ) => ({

          email:
            item.client.email,

          name:
            `${item.client.first_name} ${item.client.last_name}`
              .trim(),

          offers:
            item.offers.length,

          offerIds:
            item.offers.map(
              (
                offer,
              ) =>
                offer.id,
            ),

          sourceTable:
            item.client
              .source_table,

          workType:
            item.client
              .work_type,

          categories:

            item.client
              .source_table ===
            "flussi_lavoro_24_99"

              ? item.client.category

              : item.client.categories,

        }),
      );


    /* ========================================================
       DRY RUN
       ======================================================== */

    if (
      dryRun
    ) {

      return res.status(
        200,
      ).json({

        ok:
          true,

        dryRun:
          true,

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


    /* ========================================================
       NO MATCH
       ======================================================== */

    if (
      !matches.size
    ) {

      return res.status(
        200,
      ).json({

        ok:
          true,

        dryRun:
          false,

        sent:
          0,

        failed:
          0,

        message:
          "No active client matches the selected offers.",

        selectedOffers:
          offers.length,

        activeClients:
          clients.length,

      });
    }


    /* ========================================================
       SMTP
       ======================================================== */

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


    const results:
      Array<
        Record<
          string,
          unknown
        >
      > = [];


    /* ========================================================
       SEND TO CLIENTS
       ======================================================== */

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


        const now =
          new Date()
            .toISOString();


        /* ----------------------------------------------------
           SAVE DELIVERY
           ---------------------------------------------------- */

        for (
          const offer of
            item.offers
        ) {

          const delivery =
            await supabaseRequest(
              "flussi_deliveries",
              {

                method:
                  "POST",

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

              },
            );


          if (
            !delivery.ok
          ) {

            console.error(
              "Delivery record failed:",
              await delivery.text(),
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


      } catch (
        error
      ) {

        failed++;


        const message =
          error instanceof Error
            ? error.message
            : String(
                error,
              );


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


        /* ----------------------------------------------------
           SAVE ERROR
           ---------------------------------------------------- */

        for (
          const offer of
            item.offers
        ) {

          try {

            await supabaseRequest(
              "flussi_deliveries",
              {

                method:
                  "POST",

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
                        1000,
                      ),

                  }),

              },
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
      }
    }


    /* ========================================================
       RESPONSE
       ======================================================== */

    return res.status(
      200,
    ).json({

      ok:
        true,

      dryRun:
        false,

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


  } catch (
    error
  ) {

    console.error(
      "send-flussi-offerte:",
      error,
    );


    return res.status(
      500,
    ).json({

      ok:
        false,

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
