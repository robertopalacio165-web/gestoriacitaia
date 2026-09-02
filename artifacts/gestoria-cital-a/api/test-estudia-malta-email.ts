
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const TEST_EMAIL = "robertopalacio165@gmail.com";
const LOGO_URL = "https://gestoriacitaia.com/images/gestoriacitaia-logo.png";

function escapeHtml(value: unknown = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanFileName(value: string) {
  return String(value || "Cliente")
    .trim()
    .replace(/[^a-zA-Z0-9À-ÿ _-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Cliente";
}

async function imageAsDataUri(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo cargar el logo. HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get("content-type") || "image/png";
  return `data:${type};base64,${buffer.toString("base64")}`;
}

function buildPdfHtml(data: {
  logo: string;
  fullName: string;
  whatsapp: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
}) {
  const { logo, fullName, whatsapp, email, dateOfBirth, nationality, passportNumber } = data;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;width:210mm;height:297mm}
body{background:#eef2f6;color:#182235;font-family:"Noto Naskh Arabic","Noto Sans Arabic","Arial",sans-serif;direction:rtl;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;background:#fff;position:relative;overflow:hidden}
.header{height:55mm;background:#07111f;padding:6mm 14mm 4mm;border-bottom:2px solid #20d46b;text-align:center}
.logo{width:78mm;height:16mm;object-fit:contain;display:block;margin:0 auto 2mm}
.header h1{font-size:17pt;color:#fff;margin:0;font-weight:900;line-height:1.25}
.header p{font-size:9pt;color:#b9c6d8;margin:1.5mm 0 0;line-height:1.4}
.content{padding:6mm 14mm 18mm}
.badge{background:#e8fbf0;border:1px solid #9ee7ba;border-radius:5mm;color:#087f3d;font-size:9.5pt;font-weight:800;text-align:center;padding:2.2mm 4mm;margin-bottom:4mm}
.intro{text-align:center;font-size:11pt;line-height:1.6;margin:0 2mm 4mm}
.client{background:#f7fafc;border:1px solid #dbe3ec;border-radius:3.5mm;padding:3.5mm 5mm;margin-bottom:4mm;display:grid;grid-template-columns:1fr 1fr;gap:3mm;direction:rtl}
.client .cell{min-width:0}
.client .email{grid-column:1 / -1;border-top:1px solid #e8edf3;padding-top:2.5mm}
.label{font-size:7.5pt;color:#718096;margin-bottom:.7mm}
.value{font-size:10.5pt;font-weight:900;color:#111827;line-height:1.25;word-break:break-word}
.box{background:#f1f7ff;border:1px solid #c9ddf6;border-right:1.5mm solid #0b57d0;border-radius:3mm;padding:3.5mm 5mm;margin-bottom:4mm}
.box h2{color:#0b57d0;font-size:11.5pt;margin:0 0 1.5mm;font-weight:900}
.box p{font-size:9pt;line-height:1.65;margin:0}
.highlight{font-weight:900;color:#087f3d}
.steps h2{color:#0b57d0;font-size:11.5pt;margin:0 0 2mm}
.step{display:grid;grid-template-columns:7mm 1fr;gap:2mm;align-items:center;margin:1.8mm 0;direction:rtl}
.num{width:6mm;height:6mm;border-radius:50%;background:#20d46b;color:#07111f;text-align:center;font-family:Arial,sans-serif;font-size:8pt;font-weight:bold;line-height:6mm}
.steptext{font-size:8.7pt;line-height:1.45}
.note{background:#fff8e8;border:1px solid #efd99b;border-radius:3mm;padding:2.8mm 4mm;margin-top:4mm;text-align:center;font-size:7.8pt;line-height:1.5;color:#6b551e}
.thanks{text-align:center;color:#0b57d0;font-size:10pt;font-weight:900;margin-top:3mm}
.footer{position:absolute;bottom:0;left:0;right:0;height:13mm;background:#07111f;color:#b9c6d8;text-align:center;padding:2mm;font-size:7pt}
.footer strong{color:#fff;font-family:Arial,sans-serif;font-size:8.5pt;direction:ltr;display:block;margin-bottom:.5mm}
</style>
</head>
<body>
<div class="page">
<header class="header">
<img class="logo" src="${logo}" alt="GestoriaCitaIA">
<h1>طلب الدراسة فمالطا 2027 🇲🇹</h1>
<p>تأكيد الطلب وبداية مسطرة التسجيل فمركز اللغة الإنجليزية</p>
</header>
<main class="content">
<div class="badge">✓ توصلنا بالطلب ديالك بنجاح</div>
<p class="intro">السلام عليكم <strong>${fullName}</strong>،<br>كنأكدّو ليك باللي توصلنا بالطلب ديالك وبالأداء ديالك ديال خدمة <strong>الدراسة فمالطا 2027 🇲🇹</strong>.</p>
<section class="client">
<div class="cell"><div class="label">الاسم والنسب</div><div class="value">${fullName}</div></div>
<div class="cell"><div class="label">رقم الهاتف / WhatsApp</div><div class="value" dir="ltr">${whatsapp || "—"}</div></div>
<div class="cell email"><div class="label">البريد الإلكتروني</div><div class="value" dir="ltr">${email}</div></div>
</section>
<section class="box">
<h2>⏱️ شنو غادي يوقع دابا؟</h2>
<p>فمدة أقصاها <span class="highlight">24 ساعة ديال الخدمة</span>، غادي نتاصلو بيك فـ رقم الهاتف اللي عطيتينا.<br>غادي نراجعو معاك المعلومات ديالك ونبداو إجراءات التسجيل فـ <strong>مركز ديال اللغة الإنجليزية فمالطا 🇲🇹</strong>.</p>
</section>
<section class="steps">
<h2>المراحل ديال المسطرة</h2>
<div class="step"><span class="num">1</span><div class="steptext">غادي نراجعو المعلومات اللي عمرتي فالفورم.</div></div>
<div class="step"><span class="num">2</span><div class="steptext">غادي نتاصلو بيك فمدة أقصاها 24 ساعة ديال الخدمة.</div></div>
<div class="step"><span class="num">3</span><div class="steptext">غادي نبداو معاك إجراءات التسجيل فمركز ديال اللغة الإنجليزية فمالطا.</div></div>
<div class="step"><span class="num">4</span><div class="steptext">غادي نشرحو ليك فالمكالمة الوثائق والخطوات اللي خاصك تكمل من بعد.</div></div>
</section>
<div class="note"><strong>مهم:</strong> القبول النهائي كيبقا مرتبط بشروط المركز والوثائق المطلوبة. خدمة GestoriaCitaIA هي التوجيه وتدبير مسطرة الطلب.</div>
<div class="thanks">🇲🇦 🇲🇹 شكراً بزاف على الثقة ديالك فـ GestoriaCitaIA</div>
</main>
<footer class="footer"><strong>GestoriaCitaIA</strong>خدمة الدراسة فمالطا 2027 · غادي نتاصلو بيك على الرقم المسجل فالطلب</footer>
</div>
</body>
</html>`;
}

async function createDynamicPdf(data: {
  fullName: string;
  whatsapp: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
}) {
  const logo = await imageAsDataUri(LOGO_URL);
  const html = buildPdfHtml({
    logo,
    fullName: escapeHtml(data.fullName),
    whatsapp: escapeHtml(data.whatsapp),
    email: escapeHtml(data.email),
    dateOfBirth: escapeHtml(data.dateOfBirth),
    nationality: escapeHtml(data.nationality),
    passportNumber: escapeHtml(data.passportNumber),
  });

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 794, height: 1123 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      pageRanges: "1",
      scale: 1,
    });

    if (!pdf || pdf.length < 10000) {
      throw new Error("El PDF generado está vacío o es demasiado pequeño.");
    }

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function buildEmailHtml(data: {
  fullName: string;
  whatsapp: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
}) {
  const safeName = escapeHtml(data.fullName);
  const safeWhatsapp = escapeHtml(data.whatsapp);
  const safeEmail = escapeHtml(data.email);
  const safeDob = escapeHtml(data.dateOfBirth);
  const safeNationality = escapeHtml(data.nationality);
  const safePassport = escapeHtml(data.passportNumber);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#172033;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:30px 0;"><tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#fff;border-radius:18px;overflow:hidden;">
<tr><td style="background:#07111f;padding:35px 25px;text-align:center;border-bottom:4px solid #20d46b;">
<img src="${LOGO_URL}" alt="GestoriaCitaIA" style="width:300px;max-width:90%;height:auto;display:block;margin:0 auto 20px;">
<h1 style="margin:0;color:#fff;font-size:25px;">طلب الدراسة فمالطا 2027 🇲🇹</h1>
<p style="color:#c4ccd8;font-size:14px;margin-top:10px;">تأكيد الطلب وبداية مسطرة التسجيل</p>
</td></tr>
<tr><td style="padding:38px 42px;">
<div style="background:#eaf8ef;border:1px solid #b9ebcc;color:#07853f;padding:12px 18px;border-radius:30px;text-align:center;font-weight:bold;">✓ توصلنا بالطلب ديالك بنجاح</div>
<h2 style="font-size:22px;margin-top:28px;">السلام عليكم ${safeName}،</h2>
<p style="font-size:16px;line-height:1.9;">كنأكدّو ليك باللي توصلنا بالطلب ديالك وبالأداء ديالك ديال خدمة <strong>الدراسة فمالطا 2027 🇲🇹</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dfe6ef;border-radius:14px;margin:25px 0;"><tr><td style="padding:17px 20px;border-bottom:1px solid #e8edf3;"><div style="font-size:12px;color:#667085;margin-bottom:5px;">الاسم والنسب</div><strong style="font-size:17px;">${safeName}</strong></td></tr>
<tr><td style="padding:17px 20px;border-bottom:1px solid #e8edf3;"><div style="font-size:12px;color:#667085;margin-bottom:5px;">رقم الهاتف / WhatsApp</div><strong dir="ltr" style="font-size:17px;">${safeWhatsapp || "—"}</strong></td></tr>
<tr><td style="padding:17px 20px;"><div style="font-size:12px;color:#667085;margin-bottom:5px;">البريد الإلكتروني</div><strong dir="ltr" style="font-size:17px;">${safeEmail}</strong></td></tr></table>
<div style="background:#f1f7ff;border-right:5px solid #0b57d0;padding:22px;border-radius:12px;margin:25px 0;"><h2 style="margin:0 0 12px;color:#0b57d0;font-size:19px;">⏱️ شنو غادي يوقع دابا؟</h2><p style="font-size:16px;line-height:1.9;">فمدة أقصاها <strong style="color:#07853f;">24 ساعة ديال الخدمة</strong> غادي نتاصلو بيك فـ رقم الهاتف اللي عطيتينا.<br><br>غادي نراجعو معاك المعلومات ديالك ونبداو إجراءات التسجيل فـ <strong>مركز ديال اللغة الإنجليزية فمالطا 🇲🇹</strong>.</p></div>
<h3 style="font-size:19px;margin-top:30px;">المراحل ديال المسطرة</h3>
<p style="font-size:15px;line-height:1.9;">🟢 <strong>المرحلة 1:</strong> غادي نراجعو المعلومات اللي عمرتي فالفورم.<br><br>🟢 <strong>المرحلة 2:</strong> غادي نتاصلو بيك فمدة أقصاها 24 ساعة ديال الخدمة.<br><br>🟢 <strong>المرحلة 3:</strong> غادي نبداو معاك إجراءات التسجيل فمركز ديال اللغة الإنجليزية فمالطا.<br><br>🟢 <strong>المرحلة 4:</strong> غادي نشرحو ليك فالمكالمة الوثائق والخطوات اللي خاصك تكمل من بعد.</p>
<div style="background:#fff8e8;border:1px solid #f2d48b;border-radius:10px;padding:17px;margin-top:28px;font-size:14px;line-height:1.8;">📄 <strong>الوثيقة ديالك مرفقة مع هاد الإيميل.</strong><br>غادي تلقى فيها المعلومات الأساسية والخطوات الأولى ديال المسطرة.</div>
<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:22px;font-size:13px;line-height:1.8;"><strong>معلومات الطلب:</strong><br>تاريخ الازدياد: ${safeDob || "—"}<br>الجنسية: ${safeNationality || "—"}<br>رقم الباسبور: ${safePassport || "—"}</div>
<p style="font-size:17px;line-height:1.9;text-align:center;margin-top:35px;">🇲🇦 🇲🇹<br><br>شكراً بزاف على الثقة ديالك فـ <strong>GestoriaCitaIA</strong>.<br><br>حنا معاك خطوة بخطوة.</p>
</td></tr>
<tr><td style="background:#07111f;padding:22px;text-align:center;color:#aeb9c8;font-size:12px;"><strong style="color:#fff;">GestoriaCitaIA</strong><br>Estudiar en Malta 2027<br>gestoriacitaia@gmail.com</td></tr>
</table></td></tr></table></body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) return res.status(500).json({ error: "Brevo API key not configured" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const whatsapp = String(body.whatsapp || "").trim();
    const dateOfBirth = String(body.dateOfBirth || "").trim();
    const nationality = String(body.nationality || "").trim();
    const passportNumber = String(body.passportNumber || "").trim();

    if (!fullName) return res.status(400).json({ error: "Falta el nombre del cliente" });
    if (email !== TEST_EMAIL) return res.status(403).json({ error: "Esta API de prueba solamente está disponible para la cuenta autorizada." });

    console.log("🇲🇹 GENERANDO PDF DINÁMICO ESTUDIOS MALTA 2027");
    const pdfBuffer = await createDynamicPdf({ fullName, whatsapp, email, dateOfBirth, nationality, passportNumber });
    const pdfFileName = `GestoriaCitaIA-Estudiar-Malta-2027-${cleanFileName(fullName)}.pdf`;

    const brevoBody = {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || "gestoriacitaia@gmail.com",
        name: "GestoriaCitaIA · Estudios Malta 2027",
      },
      to: [{ email: TEST_EMAIL, name: fullName }],
      subject: `🇲🇹 Confirmación solicitud Estudios Malta 2027 - ${fullName}`,
      htmlContent: buildEmailHtml({ fullName, whatsapp, email, dateOfBirth, nationality, passportNumber }),
      attachment: [{ name: pdfFileName, content: pdfBuffer.toString("base64") }],
      tags: ["estudiar-malta-2027", "test"],
    };

    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: { accept: "application/json", "api-key": brevoApiKey, "content-type": "application/json" },
      body: JSON.stringify(brevoBody),
    });

    const responseText = await brevoResponse.text();
    let brevoData: any = {};
    try { brevoData = responseText ? JSON.parse(responseText) : {}; } catch { brevoData = { raw: responseText }; }

    if (!brevoResponse.ok) {
      console.error("❌ ERROR BREVO:", brevoData);
      return res.status(brevoResponse.status).json({ error: "Brevo no pudo enviar el email", details: brevoData });
    }

    console.log("✅ EMAIL + PDF DINÁMICO ENVIADOS", brevoData.messageId);

    return res.status(200).json({
      success: true,
      service: "study_malta_2027",
      test: true,
      email: TEST_EMAIL,
      name: fullName,
      pdfAttached: true,
      pdfFileName,
      pdfPages: 1,
      messageId: brevoData.messageId || null,
    });
  } catch (error: any) {
    console.error("❌ ERROR TEST ESTUDIA MALTA:", error);
    return res.status(500).json({ error: error?.message || "Error enviando email de prueba" });
  }
}
