cat > api/send-flussi-offerte.ts <<'EOF'
import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

/* ============================================================
   GESTORIA CITAIA — DECRETO FLUSSI 2027
   EMAIL PROFESIONAL BILINGÜE ITALIANO + DARIJA
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

/* ============================================================
   HELPERS
   ============================================================ */

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const val = (value: unknown): string =>
  String(value ?? "").trim();

const IT_FLAG = `
<span style="
display:inline-block;
width:34px;
height:23px;
border:1px solid #425563;
border-radius:3px;
vertical-align:middle;
background:linear-gradient(
to right,
#009246 0%,
#009246 33.33%,
#ffffff 33.33%,
#ffffff 66.66%,
#ce2b37 66.66%,
#ce2b37 100%
);
"></span>`;

const MA_FLAG = `
<span style="
display:inline-block;
width:34px;
height:23px;
border:1px solid #425563;
border-radius:3px;
vertical-align:middle;
background:#c1272d;
color:#08783f;
text-align:center;
line-height:23px;
font-size:15px;
font-family:Arial,sans-serif;
">★</span>`;

/* ============================================================
   DARIJA
   ============================================================ */

function categoryDarija(category: string): string {
  const key = category.toLowerCase().trim();

  const map: Record<string, string> = {
    agriculture: "الفلاحة",
    agricoltura: "الفلاحة",
    "family_assistance": "المساعدة العائلية",
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
    delivery: "التوصيل",
    reparto: "التوصيل",
    domestico: "العمل المنزلي",
    domestic: "العمل المنزلي",
    caregiving: "رعاية الأشخاص",
    badante: "المساعدة العائلية",
    colf: "العمل المنزلي",
    "colf / badante": "العمل المنزلي / المساعدة العائلية",
  };

  return map[key] || category || "عرض عمل";
}

function positionDarija(title: string): string {
  const key = title.toLowerCase().trim();

  if (
    /\bbadante\b|assistente familiare|assistenza alla persona/.test(
      key
    )
  ) {
    return "مساعدة عائلية / رعاية الأشخاص";
  }

  if (
    /\bcolf\b|collaboratore domestico|lavoratore domestico/.test(
      key
    )
  ) {
    return "خدام(ة) فالدار";
  }

  if (/\bbaby\s*sitter\b|babysitter/.test(key)) {
    return "مربية الأطفال";
  }

  if (/\bcuoco\b|\bcuoca\b|aiuto cuoco/.test(key)) {
    return "مساعد(ة) فالطبخ";
  }

  if (/\bcameriere\b|cameriera/.test(key)) {
    return "سيرڤور / خدام فالمطعم";
  }

  if (
    /\bmanovale\b|edile|muratore|costruzione/.test(
      key
    )
  ) {
    return "عامل فالبناء";
  }

  if (
    /\bautista\b|conducente|camionista|\bdriver\b/.test(
      key
    )
  ) {
    return "سائق";
  }

  if (
    /\bpulizie\b|addetto\/a pulizie|addetta alle pulizie/.test(
      key
    )
  ) {
    return "عامل(ة) فالنظافة";
  }

  if (
    /\bagricolt\w*\b|operaio agricolo/.test(
      key
    )
  ) {
    return "عامل فالفلاحة";
  }

  if (
    /\bfabbrica\b|operaio|produzione|metalmeccan/.test(
      key
    )
  ) {
    return "عامل فالمصنع / الإنتاج";
  }

  return title || "عرض عمل";
}

/* ============================================================
   EMAIL PROFESIONAL
   ============================================================ */

function buildFlussiOfferteEmail(
  data: FlussiOfferteEmailData
): string {

  const cards = data.offers.length
    ? data.offers.map((offer, index) => {

        const category =
          val(offer.category) ||
          "Offerta di lavoro";

        const categoryAr =
          categoryDarija(category);

        const title =
          val(offer.jobTitle) ||
          "Offerta di lavoro";

        const titleAr =
          positionDarija(title);

        const company =
          val(offer.companyName) ||
          "Azienda non specificata";

        const city =
          val(offer.city) ||
          "—";

        const province =
          val(offer.province);

        const address =
          val(offer.address) ||
          "—";

        const phone =
          val(offer.phone);

        const email =
          val(offer.email);

        const contract =
          val(offer.contractType) ||
          "—";

        const workType =
          val(offer.workType) ||
          "—";

        const salary =
          val(offer.salary) ||
          "—";

        const date =
          val(offer.publicationDate) ||
          "—";

        const source =
          val(offer.offerUrl);

        const phoneHtml =
          phone
            ? `<a href="tel:${esc(
                phone.replace(/[^+\d]/g, "")
              )}" style="color:#fff;text-decoration:none;">${esc(
                phone
              )}</a>`
            : "—";

        const emailHtml =
          email
            ? `<a href="mailto:${esc(
                email
              )}" style="color:#fff;text-decoration:none;direction:ltr;">${esc(
                email
              )}</a>`
            : "—";

        const titleHtml =
          source
            ? `<a href="${esc(
                source
              )}" style="color:#fff;text-decoration:none;">${esc(
                title
              )}</a>`
            : esc(title);

        const detailsIt = [
          contract !== "—"
            ? `Contratto: ${esc(contract)}`
            : "",
          workType !== "—"
            ? `Tipo di lavoro: ${esc(workType)}`
            : "",
          salary !== "—"
            ? `Retribuzione: ${esc(salary)}`
            : "",
          date !== "—"
            ? `Pubblicata: ${esc(date)}`
            : "",
          address !== "—"
            ? `Sede: ${esc(address)}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        const detailsAr = [
          contract !== "—"
            ? `الكونطرا: ${esc(contract)}`
            : "",
          workType !== "—"
            ? `نوع الخدمة: ${esc(workType)}`
            : "",
          salary !== "—"
            ? `السالير: ${esc(salary)}`
            : "",
          date !== "—"
            ? `تاريخ النشر: ${esc(date)}`
            : "",
          address !== "—"
            ? `المكان: ${esc(address)}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        return `
<tr>
<td style="padding:7px 7px 9px;">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
width:100%;
border:1px solid #19485e;
border-radius:16px;
background:#061824;
overflow:hidden;
"
>

<!-- =====================================================
     HEADER OFERTA
     ===================================================== -->

<tr>
<td style="
padding:14px 15px;
background:linear-gradient(180deg,#09283a,#071d2b);
border-bottom:1px solid #19485e;
">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
>
<tr>

<td valign="top" width="62%">

<span style="
display:inline-block;
background:#087e64;
color:#7effdf;
border-radius:14px;
padding:5px 10px;
font-size:9px;
font-weight:900;
">
OFFERTA ${index + 1}
</span>

<div style="
margin-top:7px;
color:#fff;
font-size:18px;
line-height:22px;
font-weight:900;
">
${titleHtml}
</div>

<div style="
margin-top:4px;
color:#9fb4c0;
font-size:10px;
">
${esc(company)}
</div>

</td>

<td
valign="top"
align="right"
dir="rtl"
width="38%"
style="
color:#ffd21c;
font-size:13px;
font-weight:900;
"
>

${MA_FLAG}

<div style="
margin-top:5px;
line-height:18px;
">
${esc(titleAr)}
</div>

</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     CAMPOS
     ===================================================== -->

<tr>
<td style="padding:11px 12px 4px;">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
>

<!-- CITTÀ -->

<tr>

<td width="50%" style="padding-right:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-right:1px solid #173e52;
font-size:19px;
"
>
📍
</td>

<td style="padding:6px 10px;">

<div style="
color:#38b9ff;
font-size:9px;
font-weight:900;
">
CITTÀ
</div>

<div style="
color:#fff;
font-size:12px;
margin-top:3px;
">
${esc(city)}${province ? ` (${esc(province)})` : ""}
</div>

</td>

</tr>
</table>

</td>


<td width="50%" style="padding-left:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
dir="rtl"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-left:1px solid #173e52;
font-size:19px;
"
>
📍
</td>

<td
style="
padding:6px 10px;
text-align:right;
"
>

<div style="
color:#38b9ff;
font-size:9px;
font-weight:900;
">
المدينة
</div>

<div style="
color:#fff;
font-size:12px;
margin-top:3px;
direction:rtl;
">
${esc(city)}${province ? ` (${esc(province)})` : ""}
</div>

</td>

</tr>
</table>

</td>

</tr>


<tr>
<td colspan="2" style="
height:5px;
font-size:0;
line-height:5px;
">
&nbsp;
</td>
</tr>


<!-- CATEGORIA -->

<tr>

<td width="50%" style="padding-right:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-right:1px solid #173e52;
font-size:19px;
"
>
💼
</td>

<td style="padding:6px 10px;">

<div style="
color:#19e49a;
font-size:9px;
font-weight:900;
">
CATEGORIA
</div>

<div style="
color:#fff;
font-size:12px;
margin-top:3px;
">
${esc(category)}
</div>

</td>

</tr>
</table>

</td>


<td width="50%" style="padding-left:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
dir="rtl"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-left:1px solid #173e52;
font-size:19px;
"
>
💼
</td>

<td
style="
padding:6px 10px;
text-align:right;
"
>

<div style="
color:#19e49a;
font-size:9px;
font-weight:900;
">
الفئة
</div>

<div style="
color:#fff;
font-size:12px;
margin-top:3px;
direction:rtl;
">
${esc(categoryAr)}
</div>

</td>

</tr>
</table>

</td>

</tr>


<tr>
<td colspan="2" style="
height:5px;
font-size:0;
line-height:5px;
">
&nbsp;
</td>
</tr>


<!-- POSIZIONE -->

<tr>

<td width="50%" style="padding-right:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-right:1px solid #173e52;
font-size:19px;
"
>
👤
</td>

<td style="padding:6px 10px;">

<div style="
color:#ff8a20;
font-size:9px;
font-weight:900;
">
POSIZIONE
</div>

<div style="
color:#fff;
font-size:12px;
margin-top:3px;
">
${esc(title)}
</div>

</td>

</tr>
</table>

</td>


<td width="50%" style="padding-left:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
dir="rtl"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-left:1px solid #173e52;
font-size:19px;
"
>
👤
</td>

<td
style="
padding:6px 10px;
text-align:right;
"
>

<div style="
color:#ff8a20;
font-size:9px;
font-weight:900;
">
العمل
</div>

<div style="
color:#fff;
font-size:12px;
margin-top:3px;
direction:rtl;
">
${esc(titleAr)}
</div>

</td>

</tr>
</table>

</td>

</tr>


<tr>
<td colspan="2" style="
height:5px;
font-size:0;
line-height:5px;
">
&nbsp;
</td>
</tr>


<!-- INDIRIZZO -->

<tr>

<td width="50%" style="padding-right:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-right:1px solid #173e52;
font-size:19px;
"
>
📍
</td>

<td style="padding:6px 10px;">

<div style="
color:#ff6574;
font-size:9px;
font-weight:900;
">
INDIRIZZO
</div>

<div style="
color:#fff;
font-size:11px;
line-height:14px;
margin-top:3px;
">
${esc(address)}
</div>

</td>

</tr>
</table>

</td>


<td width="50%" style="padding-left:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
dir="rtl"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-left:1px solid #173e52;
font-size:19px;
"
>
📍
</td>

<td
style="
padding:6px 10px;
text-align:right;
"
>

<div style="
color:#ff6574;
font-size:9px;
font-weight:900;
">
العنوان
</div>

<div style="
color:#fff;
font-size:11px;
line-height:14px;
margin-top:3px;
direction:rtl;
">
${esc(address)}
</div>

</td>

</tr>
</table>

</td>

</tr>


<tr>
<td colspan="2" style="
height:5px;
font-size:0;
line-height:5px;
">
&nbsp;
</td>
</tr>


<!-- RESPONSABILE / IDO -->

<tr>

<td width="50%" style="padding-right:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-right:1px solid #173e52;
font-size:19px;
"
>
📞
</td>

<td style="padding:6px 10px;">

<div style="
color:#19e49a;
font-size:9px;
font-weight:900;
">
RESPONSABILE
</div>

<div style="
color:#fff;
font-size:12px;
margin-top:3px;
">
${phoneHtml || "—"}
</div>

</td>

</tr>
</table>

</td>


<td width="50%" style="padding-left:3px;" valign="top">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
dir="rtl"
style="
border:1px solid #18445a;
border-radius:11px;
background:#071c2a;
"
>

<tr>

<td
width="48"
align="center"
style="
height:48px;
background:#06131e;
border-left:1px solid #173e52;
font-size:19px;
"
>
✉️
</td>

<td
style="
padding:6px 10px;
text-align:right;
"
>

<div style="
color:#a78aff;
font-size:9px;
font-weight:900;
">
الإيميل
</div>

<div style="
color:#fff;
font-size:10px;
line-height:14px;
margin-top:3px;
direction:ltr;
text-align:right;
">
${emailHtml || "—"}
</div>

</td>

</tr>
</table>

</td>

</tr>

</table>

</td>
</tr>


<!-- =====================================================
     DETTAGLI — DUE BOX GIALLI
     ===================================================== -->

<tr>
<td style="padding:8px 12px 13px;">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
>
<tr>

<td width="50%" valign="top" style="padding-right:3px;">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #d8a900;
border-radius:13px;
background:linear-gradient(
180deg,
#4b3a04,
#2b2103
);
"
>

<tr>
<td style="padding:12px 13px;">

<div style="
color:#ffd21c;
font-size:12px;
font-weight:900;
margin-bottom:7px;
">
${IT_FLAG}
&nbsp; Dettagli dell'offerta
</div>

<div style="
color:#fff5c9;
font-size:10px;
line-height:16px;
">
${detailsIt || "Dettagli disponibili nella fonte ufficiale dell'offerta."}
</div>

</td>
</tr>

</table>

</td>


<td width="50%" valign="top" style="padding-left:3px;">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
dir="rtl"
style="
border:1px solid #d8a900;
border-radius:13px;
background:linear-gradient(
180deg,
#4b3a04,
#2b2103
);
"
>

<tr>
<td style="
padding:12px 13px;
text-align:right;
">

<div style="
color:#ffd21c;
font-size:12px;
font-weight:900;
margin-bottom:7px;
">
${MA_FLAG}
&nbsp; تفاصيل العرض
</div>

<div style="
color:#fff5c9;
font-size:10px;
line-height:16px;
direction:rtl;
">
${detailsAr || "التفاصيل المتوفرة فالمصدر الرسمي ديال العرض."}
</div>

</td>
</tr>

</table>

</td>

</tr>
</table>

</td>
</tr>

</table>

</td>
</tr>
`;
      }).join("")
    : `
<tr>
<td style="
padding:35px;
text-align:center;
color:#d9e2ea;
">
Nessuna nuova offerta disponibile al momento.
</td>
</tr>
`;

  return `<!doctype html>
<html lang="it">

<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gestoria CitaIA — Decreto Flussi 2027</title>
</head>

<body style="
margin:0;
padding:0;
background:#020b12;
font-family:Arial,Helvetica,sans-serif;
color:#fff;
">

<center style="
width:100%;
background:#020b12;
padding:12px 4px;
">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
max-width:1120px;
width:100%;
background:#06131d;
border:1px solid #24485b;
border-radius:20px;
overflow:hidden;
"
>

<!-- =====================================================
     HEADER
     ===================================================== -->

<tr>
<td style="
padding:20px 22px 16px;
border-bottom:1px solid #24485b;
">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
>
<tr>

<td valign="top" width="40%">

<div style="
font-size:27px;
font-weight:900;
line-height:29px;
">
<span style="color:#18d99e;">gestoria</span>
<span style="color:#ffd01d;">CitaIA</span>
</div>

<div style="
color:#ffd01d;
font-size:9px;
font-weight:900;
letter-spacing:1.5px;
margin-top:5px;
">
DECRETO FLUSSI 2027
</div>

<div style="
color:#d7e0e6;
font-size:11px;
margin-top:7px;
">
Offerte di lavoro in Italia
</div>

</td>


<td
width="20%"
align="center"
valign="middle"
>

<div>
${IT_FLAG}
&nbsp;&nbsp;
${MA_FLAG}
</div>

<div style="
font-size:8px;
font-weight:900;
color:#dce7eb;
margin-top:5px;
">
ITALIA <span style="color:#ffd01d;">×</span> MAROCCO
</div>

</td>


<td
width="40%"
align="right"
valign="top"
dir="rtl"
>

<div style="
display:inline-block;
background:#087e64;
color:#7effdf;
padding:6px 11px;
border-radius:16px;
font-size:9px;
font-weight:900;
">
✓ عرض متوفر
</div>

<div style="
margin-top:7px;
font-size:18px;
font-weight:900;
">
عرض عمل <span style="color:#ffd01d;">جديد</span>
</div>

<div style="
font-size:9px;
color:#dce7eb;
margin-top:3px;
">
في إطار ديكريتو فلوسي 2027
</div>

</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     TITLE
     ===================================================== -->

<tr>
<td style="padding:17px 18px 7px;">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
>
<tr>

<td width="50%" valign="top">

<div style="
font-size:23px;
font-weight:900;
line-height:27px;
">
${IT_FLAG}
&nbsp;
Nuove offerte di
<span style="color:#ffd01d;">
lavoro
</span>
</div>

<div style="
margin-top:5px;
color:#c9d6de;
font-size:10px;
">
Abbiamo trovato offerte disponibili
nell'ambito del Decreto Flussi 2027.
</div>

</td>


<td
width="50%"
align="right"
valign="bottom"
dir="rtl"
>

<div style="
font-size:16px;
font-weight:900;
color:#ffd01d;
">
${MA_FLAG}
&nbsp;
عروض خدمة جداد
</div>

<div style="
margin-top:4px;
color:#c9d6de;
font-size:10px;
">
لقينا ليك عروض خدمة متاحة
فإطار Decreto Flussi 2027
</div>

</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     OFFERS
     ===================================================== -->

<tr>
<td style="padding:3px 9px 7px;">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
>

${cards}

</table>

</td>
</tr>


<!-- =====================================================
     INFORMATION
     ===================================================== -->

<tr>
<td style="padding:7px 18px 18px;">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #24485b;
border-radius:15px;
background:#071723;
"
>

<tr>
<td style="padding:15px 16px;">

<div style="
font-size:12px;
font-weight:900;
color:#fff;
">
${IT_FLAG}
&nbsp;
Informazione importante
</div>

<div style="
margin-top:6px;
color:#cbd8df;
font-size:10px;
line-height:17px;
">
Gestoria CitaIA non vende contratti di lavoro
e non garantisce l'ottenimento di un contratto,
nulla osta, visto o permesso di soggiorno.
Cerchiamo e inviamo offerte disponibili
nell'ambito del Decreto Flussi.
</div>

<div
dir="rtl"
style="
margin-top:8px;
color:#ffd21c;
font-size:10px;
line-height:17px;
text-align:right;
"
>
${MA_FLAG}
&nbsp;
ملاحظة مهمة:
Gestoria CitaIA ما كتبيعش عقود العمل
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
<td style="
padding:15px 18px 18px;
text-align:center;
border-top:1px solid #24485b;
">

<div style="
font-size:20px;
font-weight:900;
">
<span style="color:#18d99e;">gestoria</span>
<span style="color:#ffd01d;">CitaIA</span>
</div>

<div style="
color:#ffd01d;
font-size:9px;
font-weight:900;
letter-spacing:1.3px;
margin-top:3px;
">
DECRETO FLUSSI 2027
</div>

<div style="
margin-top:7px;
color:#7f96a5;
font-size:8px;
">
Gestoria CitaIA · Servizio informativo e di ricerca offerte
</div>

</td>
</tr>

</table>

</center>

</body>
</html>`;
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
   HELPERS BACKEND
   ============================================================ */

const clean = (
  value: unknown,
  max = 2000
): string =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const normalise = (
  value: unknown
): string =>
  clean(value)
    .toLowerCase()
    .trim();


const supabaseUrl =
  clean(process.env.SUPABASE_URL);

const serviceKey =
  clean(
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );


async function supabaseRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {

  if (
    !supabaseUrl ||
    !serviceKey
  ) {
    throw new Error(
      "Supabase configuration missing"
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
    }
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


/* ============================================================
   CLIENTS
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

  if (
    Array.isArray(value)
  ) {
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
    normalise(
      offer.category_code
    );

  const offerName =
    normalise(
      offer.category
    );

  const wanted =
    client.source_table ===
    "flussi_lavoro_24_99"
      ? listValues(
          client.category
        )
      : listValues(
          client.categories
        );

  if (
    !offerCode &&
    !offerName
  ) {
    return true;
  }

  return wanted.some(
    (item) => {

      if (!item) {
        return false;
      }

      return (
        item === offerCode ||
        item === offerName ||
        (!!offerCode &&
          item.includes(
            offerCode
          )) ||
        (!!offerName &&
          item.includes(
            offerName
          )) ||
        (!!offerCode &&
          offerCode.includes(
            item
          )) ||
        (!!offerName &&
          offerName.includes(
            item
          ))
      );
    }
  );
}


function isClientActive(
  row: Record<string, any>,
  table: string
): boolean {

  if (
    normalise(
      row.payment_status
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

  if (!row.expires_at) {
    return false;
  }

  return (
    new Date(
      row.expires_at
    ).getTime() >=
    Date.now()
  );
}


/* ============================================================
   GET ACTIVE CLIENTS
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
      JSON.parse(
        responseText
      );

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
  offerIds: string[]
): Promise<OfferRow[]> {

  const ids =
    offerIds
      .map(
        (id) =>
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
    JSON.parse(
      responseText
    );

  return (
    Array.isArray(rows)
      ? rows
      : []
  ).filter(
    (row) =>
      row.is_active !== false &&
      normalise(
        row.status
      ) !== "inactive"
  );
}


/* ============================================================
   DELIVERIES
   ============================================================ */

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
    JSON.parse(
      responseText
    );

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


/* ============================================================
   OFFER → EMAIL
   ============================================================ */

function toEmailOffer(
  row: OfferRow
): FlussiOffertaEmail {

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


/* ============================================================
   HEADER
   ============================================================ */

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


/* ============================================================
   API
   ============================================================ */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  if (
    req.method !== "POST"
  ) {
    return res.status(405).json({
      error:
        "Method not allowed",
      method:
        req.method,
    });
  }

  try {

    /* --------------------------------------------------------
       SECRET
       -------------------------------------------------------- */

    const internalSecret =
      process.env
        .FLUSSI_LAVORO_INTERNAL_SECRET;

    if (
      internalSecret
    ) {

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
          error:
            "Unauthorized",
        });
      }
    }


    /* --------------------------------------------------------
       BODY
       -------------------------------------------------------- */

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


    if (
      !offerIds.length
    ) {

      return res.status(400).json({
        error:
          "offerIds is required",

        example: {
          dryRun:
            true,

          offerIds: [
            "UUID-DE-LA-OFERTA",
          ],
        },
      });
    }


    if (
      offerIds.length > 50
    ) {

      return res.status(400).json({
        error:
          "Maximum 50 offers per bulletin",
      });
    }


    /* --------------------------------------------------------
       OFFERS
       -------------------------------------------------------- */

    const offers =
      await getOffers(
        offerIds
      );


    if (
      !offers.length
    ) {

      return res.status(404).json({
        error:
          "No active offers found",

        requestedOfferIds:
          offerIds,
      });
    }


    /* --------------------------------------------------------
       CLIENTS
       -------------------------------------------------------- */

    const clients =
      await getActiveClients();


    const delivered =
      await getAlreadyDelivered(
        offers.map(
          (offer) =>
            offer.id
        )
      );


    /* --------------------------------------------------------
       MATCHING
       -------------------------------------------------------- */

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


      if (
        matched.length
      ) {

        matches.set(
          normalise(
            client.email
          ),
          {
            client,
            offers:
              matched,
          }
        );
      }
    }


    /* --------------------------------------------------------
       PREVIEW
       -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       DRY RUN
       -------------------------------------------------------- */

    if (
      dryRun
    ) {

      return res.status(200).json({

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


    /* --------------------------------------------------------
       NO MATCHES
       -------------------------------------------------------- */

    if (
      !matches.size
    ) {

      return res.status(200).json({

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


    /* --------------------------------------------------------
       SMTP
       -------------------------------------------------------- */

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


    let sent =
      0;

    let failed =
      0;


    const results:
      Array<Record<string, unknown>> =
      [];


    /* --------------------------------------------------------
       SEND
       -------------------------------------------------------- */

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
              `"Gestoria CitaIA" <${from}>`,

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
              }
            );


          if (
            !delivery.ok
          ) {

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


      } catch (
        error
      ) {

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


    /* --------------------------------------------------------
       RESPONSE
       -------------------------------------------------------- */

    return res.status(200).json({

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
      error
    );


    return res.status(500).json({

      ok:
        false,

      error:
        "Could not process Flussi offers",

      message:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}
EOF
