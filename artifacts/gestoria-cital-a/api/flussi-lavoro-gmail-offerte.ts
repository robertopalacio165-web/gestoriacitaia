/**
 * GestoriaCitaIA — Decreto Flussi 2027
 * PLANTILLA DEFINITIVA DE EMAIL DE OFERTAS
 *
 * No vende contratos.
 * No garantiza contrato, nulla osta, visado ni permiso.
 * No incluye enlaces a las ofertas ni botones "Vedi offerta".
 */

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

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const optional = (value: unknown): string => {
  const v = String(value ?? "").trim();
  return v || "";
};

/* Bandiera Italia — grafica HTML/CSS, non "IT" */
const IT_FLAG =
  '<span style="display:inline-block;width:34px;height:23px;vertical-align:middle;border:1px solid #425563;border-radius:2px;background:linear-gradient(to right,#009246 0%,#009246 33.333%,#ffffff 33.333%,#ffffff 66.666%,#ce2b37 66.666%,#ce2b37 100%);"></span>';

/* Bandiera Marocco — grafica HTML/CSS, non "MA" */
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
  };

  return map[key] || category;
}

function offerRow(
  offer: FlussiOffertaEmail,
  index: number,
): string {
  const category = optional(offer.category) || "—";
  const categoryAr = categoryDarija(category);
  const title = optional(offer.jobTitle) || "Offerta di lavoro";
  const company = optional(offer.companyName) || "Azienda";
  const date = optional(offer.publicationDate) || "—";
  const salary = optional(offer.salary) || "—";
  const city = optional(offer.city) || "—";
  const province = optional(offer.province);
  const address = optional(offer.address) || "—";
  const phone = optional(offer.phone) || "—";
  const email = optional(offer.email) || "—";
  const contract = optional(offer.contractType) || "—";
  const workType = optional(offer.workType) || "—";

  return `
<tr>
  <td style="padding:11px 8px;border:1px solid #315267;color:#fff;">
    ${index + 1}
  </td>

  <td style="padding:11px 8px;border:1px solid #315267;background:#0b241c;color:#fff;">
    <b>${esc(category)}</b><br>
    <span dir="rtl">${esc(categoryAr)}</span>
  </td>

  <td style="padding:11px 8px;border:1px solid #315267;color:#fff;">
    <b>${esc(title)}</b><br>
    ${esc(company)}<br>
    <span style="color:#9fb1bc;font-size:10px;">
      Contratto: ${esc(contract)} · Tipo: ${esc(workType)}
    </span>
  </td>

  <td style="padding:11px 8px;border:1px solid #315267;color:#fff;">
    ${esc(date)}
  </td>

  <td style="padding:11px 8px;border:1px solid #315267;color:#fff;">
    ${esc(salary)}
  </td>

  <td style="padding:11px 8px;border:1px solid #315267;color:#fff;">
    <b>${esc(city)}${province ? ` (${esc(province)})` : ""}</b><br>
    <span style="color:#9fb1bc;font-size:10px;">
      Indirizzo: ${esc(address)}
    </span>
  </td>

  <td style="padding:11px 8px;border:1px solid #315267;color:#25e5a1;">
    ☎ ${esc(phone)}<br>
    ✉ ${esc(email)}
  </td>
</tr>`;
}

export function buildFlussiOfferteEmail(
  data: FlussiOfferteEmailData,
): string {
  const recipient = optional(data.recipientName) || "Cliente";

  const rows = data.offers.length
    ? data.offers.map(offerRow).join("")
    : `
<tr>
  <td colspan="7"
      style="padding:30px;text-align:center;color:#d9e2ea;">
    Nessuna nuova offerta disponibile al momento.
  </td>
</tr>`;

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nuove offerte di lavoro — Decreto Flussi 2027</title>
</head>

<body style="margin:0;background:#f1f4f7;font-family:Arial,Helvetica,sans-serif;">

<center style="width:100%;padding:24px 8px;background:#f1f4f7;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
style="max-width:1120px;background:#06131d;border:1px solid #24485b;border-radius:22px;overflow:hidden;color:#fff;">

<!-- HEADER -->
<tr>
<td style="padding:22px 26px 18px;border-bottom:1px solid #24485b;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td valign="top">

<div style="font-size:30px;font-weight:900;line-height:31px;">
<span style="color:#fff;">gestoriacita</span><span style="color:#20df91;">IA</span>
</div>

<div style="color:#e7bf35;font-size:10px;font-weight:900;letter-spacing:1.5px;">
DECRETO FLUSSI 2027
</div>

<div style="margin-top:13px;color:#d7e0e6;font-size:12px;">
Offerte di lavoro in Italia
</div>

</td>

<td align="right" valign="top">

<div>
${IT_FLAG}&nbsp;&nbsp;${MA_FLAG}
</div>

<div dir="rtl"
style="margin-top:12px;color:#e7bf35;font-size:13px;font-weight:800;">
عروض العمل فإيطاليا
</div>

</td>

</tr>
</table>

</td>
</tr>

<!-- TITLE -->
<tr>
<td style="padding:22px 18px 8px;">

<div style="
display:inline-block;
background:#064b3b;
color:#48edb2;
border-radius:18px;
padding:8px 14px;
font-size:11px;
font-weight:900;
">
✓ OFFERTE DISPONIBILI
</div>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td style="padding-top:16px;">

<div style="font-size:25px;font-weight:900;color:#fff;">
${IT_FLAG}&nbsp;&nbsp;Nuove offerte di lavoro
</div>

<div style="margin-top:5px;color:#c9d6de;font-size:12px;">
Abbiamo trovato offerte disponibili nell'ambito del Decreto Flussi.
</div>

</td>

<td align="right" valign="bottom" dir="rtl"
style="padding-top:16px;color:#e7bf35;font-size:16px;font-weight:900;">
${MA_FLAG}&nbsp;&nbsp;عروض خدمة جداد
</td>

</tr>
</table>

</td>
</tr>

<!-- OFFERS TABLE -->
<tr>
<td style="padding:8px 12px 0;">

<table width="100%" cellpadding="0" cellspacing="0"
style="border-collapse:collapse;font-size:11px;">

<tr>

<th style="padding:10px 8px;text-align:left;background:#10283b;border:1px solid #315267;color:#fff;">
#
</th>

<th style="padding:10px 8px;text-align:left;background:#104b3b;border:1px solid #315267;color:#fff;">
📁 Categoria<br>
<span style="color:#e7bf35;">الصنف</span>
</th>

<th style="padding:10px 8px;text-align:left;background:#10283b;border:1px solid #315267;color:#fff;">
📄 Offerta / Azienda<br>
<span style="color:#e7bf35;">العرض / الشركة</span>
</th>

<th style="padding:10px 8px;text-align:left;background:#104b3b;border:1px solid #315267;color:#fff;">
📅 Data<br>
<span style="color:#e7bf35;">التاريخ</span>
</th>

<th style="padding:10px 8px;text-align:left;background:#104b3b;border:1px solid #315267;color:#fff;">
💰 Stipendio<br>
<span style="color:#e7bf35;">الأجرة</span>
</th>

<th style="padding:10px 8px;text-align:left;background:#10283b;border:1px solid #315267;color:#fff;">
📍 Luogo / Indirizzo<br>
<span style="color:#e7bf35;">المدينة / العنوان</span>
</th>

<th style="padding:10px 8px;text-align:left;background:#431827;border:1px solid #315267;color:#fff;">
☎ Contatti<br>
<span style="color:#e7bf35;">التواصل</span>
</th>

</tr>

${rows}

</table>

</td>
</tr>

<!-- DETAILS -->
<tr>
<td style="padding:18px 20px 8px;color:#d8e2e8;font-size:11px;line-height:18px;">

<b style="color:#fff;">
${IT_FLAG}&nbsp; Dettagli dell'offerta:
</b>
indirizzo, contratto e condizioni vengono mostrati quando presenti nei dati.

<br>

<span dir="rtl">
${MA_FLAG}&nbsp;
تفاصيل العرض: العنوان والعقد والشروط كيبانو غير إلا كانو موجودين فالمعطيات.
</span>

</td>
</tr>

<!-- LEGAL NOTICE -->
<tr>
<td style="padding:8px 20px 22px;">

<table width="100%" cellpadding="0" cellspacing="0"
style="border:1px solid #24485b;border-radius:16px;background:#071723;">

<tr>
<td style="padding:17px 18px;">

<div style="color:#fff;font-size:13px;font-weight:900;">
${IT_FLAG}&nbsp; Informazione importante
</div>

<div style="margin-top:7px;color:#cbd8df;font-size:11px;line-height:18px;">
GestoriaCitaIA non vende contratti di lavoro e non garantisce
l'ottenimento di un contratto, nulla osta, visto o permesso di soggiorno.
Cerchiamo e inviamo offerte disponibili nell'ambito del Decreto Flussi.
</div>

<div dir="rtl"
style="margin-top:8px;color:#e7bf35;font-size:11px;line-height:18px;">
${MA_FLAG}&nbsp;
ملاحظة مهمة: GestoriaCitaIA ما كتبيعش عقود العمل وما كتضمنش ليك العقد
ولا nulla osta ولا الفيزا ولا الإقامة. حنا كنقلبو ونصيفطو ليك عروض
العمل المتاحة فإطار Decreto Flussi.
</div>

</td>
</tr>

</table>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="padding:17px 20px 20px;text-align:center;border-top:1px solid #24485b;">

<div style="font-size:21px;font-weight:900;">
<span style="color:#fff;">gestoriacita</span><span style="color:#20df91;">IA</span>
</div>

<div style="color:#e7bf35;font-size:10px;font-weight:900;letter-spacing:1.4px;margin-top:3px;">
DECRETO FLUSSI 2027
</div>

<div style="margin-top:8px;color:#7f96a5;font-size:9px;">
GestoriaCitaIA · Servizio informativo e di ricerca offerte
</div>

</td>
</tr>

</table>

</center>
</body>
</html>`;
}
