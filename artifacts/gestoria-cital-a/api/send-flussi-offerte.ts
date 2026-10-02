function buildFlussiOfferteEmail(
  data: FlussiOfferteEmailData,
): string {
  const offers = data.offers || [];

  const field = (
    icon: string,
    labelIt: string,
    labelAr: string,
    value: string,
    accent: string,
  ) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="border-collapse:separate;border-spacing:0;margin:0 0 3px;">
<tr>
  <td width="58" valign="middle" style="width:58px;padding:0 0 0 7px;">
    <div style="width:42px;height:42px;line-height:42px;text-align:center;
      background:#0d2639;border:1px solid #173e56;border-radius:12px;
      font-size:22px;">${icon}</div>
  </td>

  <td valign="middle" style="background:#081d2c;border:1px solid #173e56;
      padding:7px 12px;text-align:left;">
    <div style="font-size:12px;font-weight:900;color:${accent};line-height:16px;">
      ${emailEsc(labelIt)}
    </div>
    <div style="font-size:11px;color:#ffffff;line-height:16px;">
      ${emailEsc(value || "—")}
    </div>
  </td>

  <td width="58" valign="middle" style="width:58px;padding:0 7px 0 0;text-align:right;">
    <div style="width:42px;height:42px;line-height:42px;text-align:center;
      margin-left:auto;background:#0d2639;border:1px solid #173e56;
      border-radius:12px;font-size:22px;">${icon}</div>
  </td>

  <td dir="rtl" valign="middle" style="background:#081d2c;border:1px solid #173e56;
      padding:7px 12px;text-align:right;">
    <div style="font-size:12px;font-weight:900;color:${accent};line-height:16px;">
      ${emailEsc(labelAr)}
    </div>
    <div style="font-size:11px;color:#ffffff;line-height:16px;">
      ${emailEsc(value || "—")}
    </div>
  </td>
</tr>
</table>`;

  const cards = offers.length
    ? offers.map((offer, index) => {
        const category =
          emailValue(offer.category) || "Offerta di lavoro";

        const categoryAr = categoryDarija(category);

        const title =
          emailValue(offer.jobTitle) || "Offerta di lavoro";

        const city =
          emailValue(offer.city) || "—";

        const province =
          emailValue(offer.province) || "—";

        const address =
          emailValue(offer.address) || "—";

        const phone =
          emailValue(offer.phone) || "—";

        const ido =
          emailValue(offer.email) || "—";

        const contract =
          emailValue(offer.contractType) || "—";

        const workType =
          emailValue(offer.workType) || "—";

        const salary =
          emailValue(offer.salary) || "—";

        const company =
          emailValue(offer.companyName);

        const date =
          emailValue(offer.publicationDate);

        const detailsIt = [
          contract !== "—"
            ? `Contratto: ${contract}`
            : "",

          workType !== "—"
            ? `Tipo: ${workType}`
            : "",

          salary !== "—"
            ? `Retribuzione: ${salary}`
            : "",

          company
            ? `Azienda: ${company}`
            : "",

          date
            ? `Pubblicata: ${date}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
          ||
          "Dettagli disponibili nell'offerta.";

        const detailsAr = [
          contract !== "—"
            ? `العقد: ${contract}`
            : "",

          workType !== "—"
            ? `النوع: ${workType}`
            : "",

          salary !== "—"
            ? `الأجرة: ${salary}`
            : "",

          company
            ? `الشركة: ${company}`
            : "",

          date
            ? `تاريخ النشر: ${date}`
            : "",
        ]
          .filter(Boolean)
          .join(" • ")
          ||
          "تفاصيل العرض متوفرة حسب المعطيات.";

        return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="border-collapse:separate;border-spacing:0;margin:0 0 18px;
  background:#061522;border:1px solid #1c4b63;border-radius:18px;overflow:hidden;">

<tr>
<td style="padding:16px 16px 8px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>

<td valign="top" style="width:50%;padding-right:6px;">

  <div style="display:inline-block;background:#07543f;color:#48efb0;
    border-radius:18px;padding:6px 11px;font-size:10px;font-weight:900;">
    ✓ OFFERTA ${String(index + 1).padStart(2, "0")}
  </div>

  <div style="margin-top:9px;font-size:22px;font-weight:900;
    color:#fff;line-height:27px;">
    ${emailEsc(title)}
  </div>

  <div style="margin-top:3px;font-size:12px;color:#c9d6de;">
    ${emailEsc(category)}
  </div>

</td>

<td dir="rtl" valign="top" align="right"
    style="width:50%;padding-left:6px;">

  <div style="display:inline-block;background:#07543f;color:#48efb0;
    border-radius:18px;padding:6px 11px;font-size:10px;font-weight:900;">
    ✓ عرض متوفر
  </div>

  <div style="margin-top:9px;font-size:20px;font-weight:900;
    color:#fff;line-height:27px;">
    ${emailEsc(title)}
  </div>

  <div style="margin-top:3px;font-size:12px;color:#c9d6de;">
    ${emailEsc(categoryAr)}
  </div>

</td>

</tr>
</table>


<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="border-collapse:separate;border-spacing:0;margin-top:12px;">

<tr>

<td valign="top" width="50%" style="padding-right:4px;">

  ${field(
    "📍",
    "Città",
    "المدينة",
    city,
    "#35bfff"
  )}

  ${field(
    "🏢",
    "Provincia",
    "الإقليم",
    province,
    "#9d7cff"
  )}

  ${field(
    "💼",
    "Categoria",
    "الفئة",
    category,
    "#23e69a"
  )}

  ${field(
    "👤",
    "Posizione",
    "العمل",
    title,
    "#ff8a21"
  )}

  ${field(
    "📌",
    "Indirizzo",
    "العنوان",
    address,
    "#ff667a"
  )}

  ${field(
    "📞",
    "Responsabile",
    "رقم المسؤول",
    phone,
    "#23e69a"
  )}

  ${field(
    "✉️",
    "IDO",
    "الإيميل",
    ido,
    "#a77cff"
  )}

</td>

</tr>
</table>


<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="border-collapse:separate;border-spacing:0;margin-top:9px;">

<tr>

<td width="50%" valign="top" style="padding-right:4px;">

  <div style="
    background:#182006;
    border:1px solid #6d651d;
    border-radius:15px;
    padding:13px 14px;
  ">

    <div style="
      font-size:14px;
      font-weight:900;
      color:#ffd429;
      margin-bottom:7px;
    ">
      📋 Dettagli dell'offerta
    </div>

    <div style="
      font-size:11px;
      line-height:18px;
      color:#fff;
    ">
      ${emailEsc(detailsIt)}
    </div>

  </div>

</td>


<td width="50%" valign="top" dir="rtl"
    style="padding-left:4px;">

  <div style="
    background:#182006;
    border:1px solid #6d651d;
    border-radius:15px;
    padding:13px 14px;
    text-align:right;
  ">

    <div style="
      font-size:14px;
      font-weight:900;
      color:#ffd429;
      margin-bottom:7px;
    ">
      تفاصيل الخدمة 📋
    </div>

    <div style="
      font-size:11px;
      line-height:18px;
      color:#fff;
    ">
      ${emailEsc(detailsAr)}
    </div>

  </div>

</td>

</tr>
</table>

</td>
</tr>
</table>`;
      })
      .join("")
    : `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center"
    style="padding:35px;color:#fff;">
  Nessuna nuova offerta disponibile al momento.
</td>
</tr>
</table>`;


  return `<!doctype html>

<html lang="it">

<head>

<meta charset="utf-8">

<meta name="viewport"
      content="width=device-width,initial-scale=1">

<title>
Nuova offerta di lavoro — Decreto Flussi 2027
</title>

</head>


<body style="
  margin:0;
  padding:0;
  background:#020b12;
  font-family:Arial,Helvetica,sans-serif;
">


<center style="
  width:100%;
  background:#020b12;
  padding:14px 4px;
">


<table role="presentation"
       width="100%"
       cellpadding="0"
       cellspacing="0"
       style="
         max-width:1120px;
         background:#031522;
         border:1px solid #16435c;
         border-radius:24px;
         color:#fff;
         overflow:hidden;
       ">


<!-- HEADER -->

<tr>

<td style="
  padding:18px 20px 10px;
">


<table role="presentation"
       width="100%"
       cellpadding="0"
       cellspacing="0">

<tr>


<!-- ITALIANO -->

<td width="38%"
    valign="top">


<div style="
  display:inline-block;
  background:#07543f;
  color:#45efad;
  border-radius:18px;
  padding:7px 12px;
  font-size:11px;
  font-weight:900;
">
✓ OFFERTE DISPONIBILI
</div>


<div style="
  margin-top:12px;
  font-size:27px;
  font-weight:900;
  line-height:30px;
  color:#fff;
">

🇮🇹 Nuova offerta di
<span style="color:#ffd429;">
lavoro
</span>

</div>


<div style="
  margin-top:5px;
  font-size:12px;
  color:#d5e0e7;
">

Nell'ambito del Decreto Flussi 2027

</div>


</td>


<!-- BANDIERE -->

<td width="24%"
    align="center"
    valign="top">

<div style="
  font-size:55px;
  line-height:60px;
">

🇮🇹&nbsp;&nbsp;🇲🇦

</div>

</td>


<!-- DARIJA -->

<td width="38%"
    dir="rtl"
    align="right"
    valign="top">


<div style="
  display:inline-block;
  background:#07543f;
  color:#45efad;
  border-radius:18px;
  padding:7px 12px;
  font-size:11px;
  font-weight:900;
">

✓ عرض متوفر

</div>


<div style="
  margin-top:12px;
  font-size:27px;
  font-weight:900;
  line-height:30px;
  color:#fff;
">

عرض عمل
<span style="color:#ffd429;">
جديد
</span>

</div>


<div style="
  margin-top:5px;
  font-size:12px;
  color:#d5e0e7;
">

في إطار ديكريتو فلوسي 2027

</div>


</td>


</tr>

</table>


</td>

</tr>


<!-- OFFERS -->

<tr>

<td style="
  padding:6px 16px 18px;
">

${cards}

</td>

</tr>


<!-- FOOTER -->

<tr>

<td style="
  padding:14px 20px 22px;
  border-top:1px solid #16435c;
  text-align:center;
">


<div style="
  font-size:20px;
  font-weight:900;
">

<span style="color:#fff;">
gestoria
</span>

<span style="color:#ffd429;">
cita
</span>

<span style="color:#24e29a;">
ia
</span>

</div>


<div style="
  margin-top:4px;
  color:#ffd429;
  font-size:9px;
  font-weight:900;
  letter-spacing:1.3px;
">

DECRETO FLUSSI 2027

</div>


<div style="
  margin-top:8px;
  color:#718999;
  font-size:9px;
  line-height:15px;
">

GestoriaCitaIA · Servizio informativo e ricerca offerte

<br>

ماشي وكالة توظيف وما كاين حتى ضمان للحصول على عقد أو فيزا أو إقامة.

</div>


</td>

</tr>


</table>


</center>

</body>

</html>`;
}
