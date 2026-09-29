/**
 * GestoriaCitaIA — Decreto Flussi 2027
 * Template HTML para email de ofertas enviado por Brevo SMTP / Nodemailer.
 *
 * Uso:
 *   import { buildFlussiOfferteEmail } from "./flussi-lavoro-gmail-offerte";
 *   const html = buildFlussiOfferteEmail({ offers, logoUrl, ... });
 */

export type FlussiOffertaEmail = {
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
  offerUrl?: string;
};

export type FlussiOfferteEmailData = {
  offers: FlussiOffertaEmail[];
  logoUrl?: string;
  recipientName?: string;
};

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const optional = (value?: string) => value?.trim() || "";

function offerCard(offer: FlussiOffertaEmail, index: number) {
  const category = optional(offer.category) || "Offerta di lavoro";
  const title = optional(offer.jobTitle) || "Offerta di lavoro";
  const company = optional(offer.companyName) || "Azienda";
  const date = optional(offer.publicationDate) || "—";
  const salary = optional(offer.salary) || "—";
  const city = optional(offer.city) || "—";
  const province = optional(offer.province) || "—";
  const address = optional(offer.address);
  const phone = optional(offer.phone);
  const email = optional(offer.email);
  const url = optional(offer.offerUrl) || "#";

  return `
  <tr>
    <td style="padding:0 18px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #176274;border-radius:18px;background:#071723;">
        <tr>
          <td style="padding:17px 18px 14px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="top">
                  <span style="
                    display:inline-block;
                    padding:7px 16px;
                    border:1px solid #d5ad32;
                    border-radius:18px;
                    color:#f2d15c;
                    font-size:12px;
                    font-weight:700;
                    background:#12180f;
                  ">▣ ${esc(category)}</span>
                </td>

                <td align="right" valign="top"
                  style="color:#c5d1da;font-size:12px;line-height:18px;">
                  ▣ Pubblicata: ${esc(date)}
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="margin-top:13px;">
              <tr>
                <td valign="top" width="50%">
                  <div style="
                    color:#ffffff;
                    font-size:27px;
                    line-height:32px;
                    font-weight:800;
                    margin-bottom:6px;
                  ">${esc(title)}</div>

                  <div style="
                    color:#dce5eb;
                    font-size:15px;
                    font-weight:700;
                  ">▣ ${esc(company)}</div>
                </td>

                <td valign="top" align="right" width="50%"
                  style="
                    color:#ffffff;
                    font-size:17px;
                    line-height:25px;
                    font-weight:800;
                    padding-top:4px;
                  ">
                  € &nbsp;${esc(salary)} / anno
                </td>
              </tr>
            </table>

            <div style="
              height:1px;
              background:#214553;
              margin:16px 0 13px;
            "></div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="22%" valign="top">
                  <div style="color:#7f96a5;font-size:10px;">⌖ Città</div>
                  <div style="color:#ffffff;font-size:13px;font-weight:700;margin-top:4px;">
                    ${esc(city)}
                  </div>
                </td>

                <td width="22%" valign="top">
                  <div style="color:#7f96a5;font-size:10px;">◈ Provincia</div>
                  <div style="color:#ffffff;font-size:13px;font-weight:700;margin-top:4px;">
                    ${esc(province)}
                  </div>
                </td>

                <td width="25%" valign="top">
                  <div style="color:#7f96a5;font-size:10px;">☎ Telefono</div>
                  <div style="color:#22dfa0;font-size:13px;font-weight:700;margin-top:4px;">
                    ${phone ? esc(phone) : "—"}
                  </div>
                </td>

                <td width="31%" valign="middle" align="right">
                  <a href="${esc(url)}"
                    style="
                      display:inline-block;
                      background:#10c985;
                      color:#ffffff;
                      text-decoration:none;
                      font-size:12px;
                      font-weight:800;
                      padding:13px 20px;
                      border-radius:11px;
                      border:1px solid #48efb1;
                    ">
                    Vedi offerta completa →
                  </a>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="
                margin-top:14px;
                background:#0a1e2b;
                border-radius:9px;
              ">
              <tr>
                <td style="
                  padding:10px 12px;
                  color:#22dfa0;
                  font-size:11px;
                  font-weight:700;
                  line-height:18px;
                ">
                  ${address ? `⌂ ${esc(address)}` : "⌂ —"}
                  &nbsp;&nbsp;&nbsp;
                  ${email ? `✉ ${esc(email)}` : "✉ —"}
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function buildFlussiOfferteEmail(data: FlussiOfferteEmailData): string {
  const logoUrl = optional(data.logoUrl);
  const greeting = optional(data.recipientName)
    ? `Ciao ${esc(data.recipientName)}`
    : "Ciao";

  const offersHtml = data.offers.length
    ? data.offers.map((offer, i) => offerCard(offer, i)).join("")
    : `
      <tr>
        <td style="padding:25px;color:#d9e2ea;text-align:center;">
          Nessuna nuova offerta disponibile al momento.
        </td>
      </tr>`;

  const logoBlock = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="GestoriaCitaIA"
         style="display:block;max-width:300px;width:100%;height:auto;border:0;">`
    : `
      <div style="font-size:31px;font-weight:800;line-height:36px;">
        <span style="color:#27e690;">G</span>
        <span style="color:#f3f5f7;"> gestoria</span>
        <span style="color:#20df91;">citaIA</span>
      </div>`;

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nuove offerte di lavoro — Decreto Flussi 2027</title>
</head>

<body style="margin:0;padding:0;background:#02070b;font-family:Arial,Helvetica,sans-serif;">
<center style="width:100%;background:#02070b;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background:#02070b;">
<tr>
<td align="center" style="padding:18px 8px;">

<table role="presentation" width="680" cellpadding="0" cellspacing="0"
  style="
    width:100%;
    max-width:680px;
    background:#06131d;
    border:1px solid #176274;
    border-radius:25px;
    overflow:hidden;
    color:#ffffff;
  ">

<!-- HEADER -->
<tr>
<td style="padding:28px 28px 22px;background:#03101a;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td valign="top">
        ${logoBlock}
        <div style="
          color:#efc84a;
          font-size:12px;
          font-weight:800;
          letter-spacing:1px;
          margin-top:2px;
        ">DECRETO FLUSSI 2027</div>
      </td>

      <td align="right" valign="top"
        style="font-size:20px;white-space:nowrap;">
        🇮🇹 🇲🇦
      </td>
    </tr>

    <tr>
      <td colspan="2" style="padding-top:22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%"
              style="font-size:17px;font-weight:800;color:#ffffff;">
              🇮🇹 &nbsp;Offerte di lavoro in Italia
            </td>

            <td width="50%" align="right"
              dir="rtl"
              style="font-size:17px;font-weight:800;color:#f0c94a;">
              🇲🇦 &nbsp;فرص العمل في إيطاليا
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

</td>
</tr>

<!-- INTRO -->
<tr>
<td style="padding:20px 18px 6px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="
    border:1px solid #176274;
    border-radius:18px;
    background:#071723;
  ">
<tr>
<td style="padding:19px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>

<td width="70" valign="top">
  <div style="
    width:58px;
    height:58px;
    line-height:58px;
    text-align:center;
    border:1px solid #21dfa0;
    border-radius:50%;
    color:#21dfa0;
    font-size:26px;
  ">✉</div>
</td>

<td valign="middle">
  <div style="
    color:#2ee5a1;
    font-size:25px;
    line-height:30px;
    font-weight:800;
  ">Nuove offerte di lavoro per te!</div>

  <div style="
    color:#d9e3ea;
    font-size:12px;
    line-height:19px;
    margin-top:4px;
  ">
    Abbiamo selezionato le ultime opportunità in Italia in base al tuo profilo.
  </div>
</td>

<td valign="middle" align="right" dir="rtl"
  style="color:#f0c94a;font-size:16px;font-weight:800;">
  عروض عمل جديدة ليك!
  <div style="
    color:#d5dfe5;
    font-size:10px;
    font-weight:400;
    margin-top:6px;
  ">
    اخترنا ليك أحدث فرص العمل فإيطاليا
  </div>
</td>

</tr>
</table>

</td>
</tr>
</table>

</td>
</tr>

<!-- OFFERS -->
${offersHtml}

<!-- FEATURES -->
<tr>
<td style="padding:0 18px 18px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="
    border:1px solid #176274;
    border-radius:18px;
    background:#061521;
  ">
<tr>

<td align="center" width="25%" style="padding:16px 7px;">
  <div style="font-size:22px;color:#f1c63e;">⌕</div>
  <div style="font-size:11px;font-weight:800;color:#ffffff;margin-top:5px;">
    Offerte verificate
  </div>
  <div dir="rtl" style="font-size:9px;color:#e0b92f;margin-top:4px;">
    عروض موثوقة
  </div>
</td>

<td align="center" width="25%" style="padding:16px 7px;">
  <div style="font-size:22px;color:#f1c63e;">◷</div>
  <div style="font-size:11px;font-weight:800;color:#ffffff;margin-top:5px;">
    Aggiornate ogni giorno
  </div>
  <div dir="rtl" style="font-size:9px;color:#e0b92f;margin-top:4px;">
    تحديث يومي
  </div>
</td>

<td align="center" width="25%" style="padding:16px 7px;">
  <div style="font-size:22px;color:#f1c63e;">✉</div>
  <div style="font-size:11px;font-weight:800;color:#ffffff;margin-top:5px;">
    Direttamente nella tua email
  </div>
  <div dir="rtl" style="font-size:9px;color:#e0b92f;margin-top:4px;">
    مباشرة فإيميلك
  </div>
</td>

<td align="center" width="25%" style="padding:16px 7px;">
  <div style="font-size:22px;color:#f1c63e;">◉</div>
  <div style="font-size:11px;font-weight:800;color:#ffffff;margin-top:5px;">
    Supporto dedicato
  </div>
  <div dir="rtl" style="font-size:9px;color:#e0b92f;margin-top:4px;">
    دعم خاص
  </div>
</td>

</tr>
</table>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="padding:0 18px 20px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="
    border:1px solid #1de096;
    border-radius:18px;
    background:#06231d;
  ">
<tr>

<td style="padding:17px 18px;">
  <div style="font-size:13px;font-weight:800;color:#ffffff;">
    🇮🇹 &nbsp;Trova il tuo lavoro in Italia con
  </div>

  <div style="
    margin-top:5px;
    font-size:22px;
    font-weight:800;
  ">
    <span style="color:#25e58f;">G</span>
    <span style="color:#ffffff;"> gestoria</span>
    <span style="color:#20df91;">citaIA</span>
  </div>
</td>

<td align="right" style="padding:17px 18px;">
  <div dir="rtl" style="
    color:#efc94a;
    font-size:11px;
    font-weight:800;
    margin-bottom:9px;
  ">🇲🇦 &nbsp;حقق حلمك فإيطاليا مع</div>

  <a href="https://gestoriacitaia.com/decreto-flussi-2027"
    style="
      display:inline-block;
      padding:12px 18px;
      background:#10c985;
      border:1px solid #48efb1;
      border-radius:10px;
      color:#ffffff;
      text-decoration:none;
      font-size:11px;
      font-weight:800;
    ">
    Vedi altre offerte →
  </a>
</td>

</tr>
</table>

</td>
</tr>

<tr>
<td align="center" style="
  padding:0 20px 22px;
  color:#607685;
  font-size:10px;
">
  GestoriaCitaIA · Decreto Flussi 2027
</td>
</tr>

</table>

</td>
</tr>
</table>

</center>
</body>
</html>`;
}

/*
 * Ejemplo para Nodemailer + Brevo SMTP:
 *
 * const html = buildFlussiOfferteEmail({
 *   recipientName: "Mourad",
 *   logoUrl: "https://gestoriacitaia.com/images/logo.png",
 *   offers: [
 *     {
 *       category: "Ristorante",
 *       jobTitle: "Waiter / Waitress",
 *       companyName: "Samizu Ltd",
 *       publicationDate: "2026-09-19",
 *       salary: "16.000 – 17.000 €",
 *       city: "St. Julian's",
 *       province: "Malta",
 *       address: "St. Julian's, Malta",
 *       phone: "+356 7972 6498",
 *       email: "",
 *       offerUrl: "https://gestoriacitaia.com/decreto-flussi-2027"
 *     }
 *   ]
 * });
 *
 * await transporter.sendMail({
 *   from: `"GestoriaCitaIA" <jobs@gestoriacitaia.com>`,
 *   to: clientEmail,
 *   subject: "🇮🇹 Nuove offerte di lavoro — Decreto Flussi 2027",
 *   html
 * });
 */
