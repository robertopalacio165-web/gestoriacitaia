import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

type Payload = {
  service: "flussi_lavoro";
  product: "decreto_flussi_lavoro";
  paid: true;
  reference?: string;
  stripeSessionId?: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  workType: "non_stagionale" | "stagionale";
  categories: string[];
  packageCode: "monthly" | "biweekly" | "single_category";
  packageName?: string;
  packageAmountCents?: number;
  durationDays?: number;
};

const plans = {
  monthly: {
    it: "Offerte del mese",
    ar: "عروض العمل الشهرية",
    price: 999,
    days: 30,
  },
  biweekly: {
    it: "Aggiornamenti ogni 15 giorni",
    ar: "تحديثات عروض العمل كل 15 يوماً",
    price: 1999,
    days: 30,
  },
  single_category: {
    it: "Una sola categoria professionale",
    ar: "فئة مهنية واحدة",
    price: 2499,
    days: 30,
  },
} as const;

const categoryMap: Record<string, { it: string; ar: string }> = {
  agriculture: { it: "Agricoltura", ar: "الفلاحة" },
  food: { it: "Industria alimentare", ar: "الصناعة الغذائية" },
  textile: { it: "Tessile", ar: "النسيج" },
  metal: { it: "Industria metallurgica", ar: "صناعة المعادن" },
  other_industry: { it: "Altre industrie", ar: "صناعات أخرى" },
  construction: { it: "Edilizia", ar: "البناء" },
  commerce: { it: "Commercio", ar: "التجارة" },
  hospitality: { it: "Turismo e ristorazione", ar: "الفندقة والمطاعم" },
  tourism: { it: "Turismo", ar: "السياحة" },
  transport_logistics: { it: "Trasporto e logistica", ar: "النقل واللوجستيك" },
  business_support: { it: "Servizi di supporto", ar: "خدمات الدعم" },
  health_social: { it: "Sanità e servizi sociali", ar: "الصحة والخدمات الاجتماعية" },
  other_services: { it: "Altri servizi", ar: "خدمات أخرى" },
  family_assistance: { it: "Assistenza familiare", ar: "المساعدة الأسرية" },
};

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function categoryNames(categories: string[]) {
  return categories.map((key) => {
    const found = categoryMap[key];
    return found || { it: key, ar: key };
  });
}

function workTypeIt(type: Payload["workType"]) {
  return type === "stagionale" ? "Lavoro stagionale" : "Lavoro non stagionale";
}

function workTypeAr(type: Payload["workType"]) {
  return type === "stagionale" ? "عمل موسمي" : "عمل غير موسمي";
}

function flagsBlock() {
  return `
    <span style="display:inline-block;vertical-align:middle;white-space:nowrap;">
      <img src="https://flagcdn.com/w40/it.png" width="32" height="21" alt="Italia"
           style="display:inline-block;width:32px;height:21px;object-fit:cover;border:0;border-radius:3px;vertical-align:middle;">
      <span style="display:inline-block;width:6px;"></span>
      <img src="https://flagcdn.com/w40/ma.png" width="32" height="21" alt="Marocco"
           style="display:inline-block;width:32px;height:21px;object-fit:cover;border:0;border-radius:3px;vertical-align:middle;">
    </span>`;
}

function logoBlock() {
  // Optional real logo:
  // Set GESTORIA_LOGO_URL in Vercel to your public HTTPS logo URL.
  const url = process.env.GESTORIA_LOGO_URL;
  if (url) {
    return `<img src="${esc(url)}" width="190" alt="GestoriaCitaIA" style="display:block;border:0;max-width:190px;height:auto;">`;
  }

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="width:42px;height:42px;border:2px solid #d4af37;border-radius:12px;text-align:center;vertical-align:middle;font-size:23px;color:#fff;">▣</td>
        <td style="padding-left:10px;">
          <div style="font-size:25px;line-height:27px;font-weight:900;color:#fff;">Gestoria<span style="color:#d4af37;">CitaIA</span></div>
          <div style="font-size:9px;line-height:12px;letter-spacing:2px;color:#cbd5e1;font-weight:700;">DECRETO FLUSSI 2027</div>
        </td>
      </tr>
    </table>`;
}

function feature(icon: string, itTitle: string, arTitle: string, itText: string, arText: string) {
  return `
  <td width="25%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d1826;border:1px solid #26374a;border-radius:14px;">
      <tr><td style="padding:15px 10px;text-align:center;">
        <div style="width:42px;height:42px;margin:0 auto 8px;border:1px solid #3b82a5;border-radius:50%;line-height:42px;font-size:21px;color:#fff;">${icon}</div>
        <div style="font-size:12px;font-weight:800;color:#fff;">${esc(itTitle)}</div>
        <div dir="rtl" style="font-size:11px;font-weight:700;color:#d4af37;margin-top:2px;">${esc(arTitle)}</div>
        <div style="font-size:10px;line-height:15px;color:#aebdcc;margin-top:7px;">${esc(itText)}</div>
        <div dir="rtl" style="font-size:10px;line-height:16px;color:#aebdcc;margin-top:2px;">${esc(arText)}</div>
      </td></tr>
    </table>
  </td>`;
}

function buildHtml(p: Payload) {
  const plan = plans[p.packageCode];
  const price = money(p.packageAmountCents ?? plan.price);
  const days = p.durationDays ?? plan.days;
  const cats = categoryNames(p.categories);

  const catIt = cats.map((x) => esc(x.it)).join(" · ") || "Tutte le categorie";
  const catAr = cats.map((x) => esc(x.ar)).join(" · ") || "جميع المجالات";

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>GestoriaCitaIA — Pagamento confermato</title>
</head>
<body style="margin:0;padding:0;background:#070b11;font-family:Arial,Helvetica,sans-serif;color:#172033;">
<center style="width:100%;background:#070b11;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;background:#0a111b;border:1px solid #26384c;border-radius:22px;overflow:hidden;">

<!-- HEADER -->
<tr><td style="padding:22px 25px;background:linear-gradient(135deg,#08111c,#111d2c);border-bottom:1px solid #243548;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="left">${logoBlock()}</td>
<td align="right">${flagsBlock()}</td>
</tr>
<tr><td colspan="2" style="padding-top:10px;">
<div style="font-size:12px;color:#dbe5ee;">Offerte di lavoro in Italia</div>
<div dir="rtl" style="font-size:12px;color:#d4af37;margin-top:2px;">فرص العمل في إيطاليا</div>
</td></tr>
</table>
</td></tr>

<!-- HERO -->
<tr><td style="padding:28px 25px 25px;background:linear-gradient(180deg,#0c1724,#101a27);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="64%" valign="middle">
<div style="display:inline-block;padding:7px 12px;border-radius:20px;background:#0d3a31;color:#8ff0c8;font-size:11px;font-weight:800;">✓ PAGAMENTO CONFERMATO</div>
<h1 style="margin:13px 0 5px;font-size:34px;line-height:38px;color:#fff;">Il tuo servizio è attivo!</h1>
<div dir="rtl" style="font-size:23px;line-height:31px;font-weight:800;color:#d4af37;">تم تأكيد الأداء</div>
<div dir="rtl" style="font-size:16px;line-height:25px;color:#e6edf4;">خدمتك دابا مفعلة!</div>
<p style="margin:14px 0 0;font-size:14px;line-height:22px;color:#b9c6d3;">Benvenuto ${esc(p.client.firstName)} ${esc(p.client.lastName)}. Il pagamento è stato ricevuto correttamente.</p>
<p dir="rtl" style="margin:6px 0 0;font-size:13px;line-height:22px;color:#b9c6d3;">مرحبا ${esc(p.client.firstName)}، توصلنا بالأداء ديالك بنجاح.</p>
</td>
<td width="36%" align="center" valign="middle">
<div style="width:125px;height:125px;margin:auto;border-radius:50%;background:radial-gradient(circle,#183d3a,#0b1722 68%);border:2px solid #2ed39a;box-shadow:0 0 0 8px rgba(46,211,154,.08);">
<div style="font-size:60px;line-height:125px;color:#4ee1aa;">✓</div>
</div>
</td>
</tr>
</table>
</td></tr>

<!-- PLAN DETAILS -->
<tr><td style="padding:18px 20px;background:#0b1520;">
<div style="text-align:center;color:#fff;font-size:19px;font-weight:900;">🎁 Dettagli del tuo piano</div>
<div dir="rtl" style="text-align:center;color:#d4af37;font-size:15px;font-weight:800;margin-top:3px;">تفاصيل الباقة ديالك</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:15px;background:#fff;border-radius:15px;">
<tr>
<td width="20%" align="center" valign="top" style="padding:17px 7px;border-right:1px solid #dce2e8;">
<div style="font-size:23px;">▰</div><b style="display:block;margin-top:5px;font-size:11px;">Piano scelto</b>
<div dir="rtl" style="font-size:10px;color:#667085;margin-top:3px;">الباقة المختارة</div>
<div style="margin-top:8px;color:#1358a5;font-size:13px;font-weight:900;">${esc(plan.it)}</div>
<div dir="rtl" style="font-size:10px;color:#1358a5;font-weight:700;">${esc(plan.ar)}</div>
</td>
<td width="20%" align="center" valign="top" style="padding:17px 7px;border-right:1px solid #dce2e8;">
<div style="font-size:23px;">€</div><b style="display:block;margin-top:5px;font-size:11px;">Prezzo</b>
<div dir="rtl" style="font-size:10px;color:#667085;margin-top:3px;">الثمن</div>
<div style="margin-top:8px;font-size:22px;font-weight:900;">${price}</div>
</td>
<td width="20%" align="center" valign="top" style="padding:17px 7px;border-right:1px solid #dce2e8;">
<div style="font-size:23px;">▣</div><b style="display:block;margin-top:5px;font-size:11px;">Durata</b>
<div dir="rtl" style="font-size:10px;color:#667085;margin-top:3px;">المدة</div>
<div style="margin-top:8px;font-size:15px;font-weight:900;">${days} giorni</div>
<div dir="rtl" style="font-size:10px;color:#667085;">${days} يوم</div>
</td>
<td width="20%" align="center" valign="top" style="padding:17px 7px;border-right:1px solid #dce2e8;">
<div style="font-size:23px;">▣</div><b style="display:block;margin-top:5px;font-size:11px;">Tipo di lavoro</b>
<div dir="rtl" style="font-size:10px;color:#667085;margin-top:3px;">نوع العمل</div>
<div style="margin-top:8px;font-size:12px;font-weight:900;">${esc(workTypeIt(p.workType))}</div>
<div dir="rtl" style="font-size:10px;color:#667085;">${esc(workTypeAr(p.workType))}</div>
</td>
<td width="20%" align="center" valign="top" style="padding:17px 7px;">
<div style="font-size:23px;">☷</div><b style="display:block;margin-top:5px;font-size:11px;">Categorie</b>
<div dir="rtl" style="font-size:10px;color:#667085;margin-top:3px;">المجالات</div>
<div style="margin-top:8px;font-size:11px;line-height:16px;font-weight:900;">${catIt}</div>
<div dir="rtl" style="font-size:9px;line-height:15px;color:#667085;">${catAr}</div>
</td>
</tr>
</table>
</td></tr>

<!-- WHAT HAPPENS -->
<tr><td style="padding:18px 18px;background:#0a111b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" valign="top" style="padding:6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef7ff;border-radius:15px;">
<tr><td style="padding:17px;">
<div style="font-size:18px;font-weight:900;color:#164b91;">🇮🇹 Cosa succede adesso?</div>
<div style="font-size:12px;line-height:21px;margin-top:11px;">✓ Il pagamento è confermato.<br>✓ Il servizio è attivo.<br>✓ Riceverai le offerte direttamente via email.<br>✓ Le offerte saranno inviate separatamente quando disponibili.<br>✓ Il sistema cerca nuove opportunità ogni giorno.</div>
</td></tr></table>
</td>
<td width="50%" valign="top" style="padding:6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#effbf2;border-radius:15px;">
<tr><td dir="rtl" style="padding:17px;text-align:right;">
<div style="font-size:18px;font-weight:900;color:#197a46;">🇲🇦 شنو غادي يوقع دابا؟</div>
<div style="font-size:12px;line-height:22px;margin-top:11px;">✓ تم تأكيد الأداء بنجاح.<br>✓ الخدمة ديالك مفعلة.<br>✓ غادي توصلك عروض العمل مباشرة فالإيميل ديالك.<br>✓ العروض غادي ترسلك فإيميلات منفصلة ملي تلقاو فرص جديدة.<br>✓ النظام كيقلب كل يوم على عروض عمل جديدة.</div>
</td></tr></table>
</td>
</tr>
</table>
</td></tr>

<!-- FEATURES -->
<tr><td style="padding:4px 12px 16px;background:#0a111b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${feature("⌕","Ricerca quotidiana","بحث يومي","Nuove offerte ogni giorno","عروض جديدة كل يوم")}
${feature("◎","Offerte verificate","عروض موثوقة","Da aziende e fonti pubblicate","من الشركات والمصادر المنشورة")}
${feature("✉","Nella tua email","في إيميلك","Ricevi le offerte direttamente","توصل بالعروض مباشرة")}
${feature("◉","Supporto dedicato","دعم خاص","Assistenza sul servizio","مساعدة بخصوص الخدمة")}
</tr></table>
</td></tr>

<!-- IMPORTANT -->
<tr><td style="padding:0 18px 18px;background:#0a111b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8e7;border-radius:15px;border:1px solid #e7c86a;">
<tr><td style="padding:17px;">
<div style="font-size:16px;font-weight:900;color:#513e09;">🔔 Informazioni importanti &nbsp; <span dir="rtl">معلومات مهمة</span></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:9px;">
<tr>
<td width="50%" valign="top" style="padding-right:15px;font-size:11px;line-height:19px;color:#4b4b4b;">
• Il servizio invia offerte di lavoro, ma non garantisce un contratto, un'assunzione, un visto o l'ingresso in Italia.<br>
• Le opportunità dipendono dalle offerte pubblicate e dai requisiti delle aziende.<br>
• Controlla regolarmente la tua email, anche la cartella spam.
</td>
<td width="50%" dir="rtl" valign="top" style="padding-left:15px;text-align:right;font-size:11px;line-height:21px;color:#4b4b4b;">
• الخدمة كتوصلّك بعروض عمل منتظمة، ولكن ما كتضمنش عقد عمل ولا التوظيف ولا الفيزا ولا الدخول لإيطاليا.<br>
• العروض كتعلق بالفرص المنشورة وشروط الشركات.<br>
• تأكد من فحص إيميلك بانتظام، حتى مجلد الرسائل غير المرغوب فيها.
</td>
</tr></table>
</td></tr></table>
</td></tr>

<!-- REFERENCE -->
<tr><td style="padding:15px 25px;background:#0d1826;border-top:1px solid #223448;">
<div style="font-size:11px;color:#93a4b5;">Riferimento / المرجع: <b style="color:#fff;">${esc(p.reference || "—")}</b></div>
<div style="font-size:10px;color:#6f8294;margin-top:4px;">Stripe session: ${esc(p.stripeSessionId || "—")}</div>
</td></tr>

<!-- FOOTER -->
<tr><td style="padding:20px 25px;background:#060a0f;text-align:center;">
${logoBlock()}
<div style="margin-top:12px;color:#d4af37;font-size:12px;font-weight:800;">${flagsBlock()}<span style="display:inline-block;width:8px;"></span>Grazie per la tua fiducia · شكراً على ثقتك</div>
<div style="margin-top:8px;color:#64748b;font-size:10px;line-height:16px;">GestoriaCitaIA · Decreto Flussi 2027 · Servizio informativo e di ricerca offerte</div>
</td></tr>

</table>
</td></tr></table>
</center>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const secret = process.env.FLUSSI_LAVORO_INTERNAL_SECRET;
    if (secret && req.headers["x-flussi-lavoro-secret"] !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const p = req.body as Payload;

    if (p.service !== "flussi_lavoro" || p.product !== "decreto_flussi_lavoro" || p.paid !== true) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    if (!p.client?.email || !p.client?.firstName || !p.client?.lastName) {
      return res.status(400).json({ error: "Client data missing" });
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.FROM_EMAIL || user;

    if (!host || !user || !pass || !from) {
      return res.status(500).json({ error: "SMTP environment variables missing" });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth: { user, pass },
    });

    const plan = plans[p.packageCode];
    const subject = `🇮🇹 🇲🇦 GestoriaCitaIA — Benvenuto · Pagamento confermato · ${plan.it}`;

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "GestoriaCitaIA"}" <${from}>`,
      to: p.client.email,
      subject,
      text:
        `🇮🇹 🇲🇦 GestoriaCitaIA\n\n` +
        `Pagamento confermato. Il tuo servizio è attivo.\n` +
        `Piano: ${plan.it}\nPrezzo: ${money(p.packageAmountCents ?? plan.price)}\nDurata: ${p.durationDays ?? plan.days} giorni\n\n` +
        `Le offerte di lavoro saranno inviate in email separate quando disponibili.\n\n` +
        `مرحبا بك في GestoriaCitaIA\nتم تأكيد الأداء وتفعيل الخدمة. عروض العمل غادي توصلك فإيميلات أخرى بشكل منفصل ملي تكون متوفرة.`,
      html: buildHtml(p),
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("flussi-lavoro-gmail:", error);
    return res.status(500).json({ error: "Email sending failed" });
  }
}
