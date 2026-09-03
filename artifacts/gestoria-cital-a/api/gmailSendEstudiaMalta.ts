
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

interface SendWelcomeEmailParams {
  email: string;
  name: string;
  whatsapp: string;
  pdfUrl?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
}

const LOGO_URL =
  process.env.GESTORIA_LOGO_URL ||
  `${process.env.NEXT_PUBLIC_URL || "https://gestoriacitaia.com"}/images/gestoriacitaia-logo.png`;

function escapeHtml(value: unknown = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanFileName(value: string) {
  return String(value || "Cliente")
    .trim()
    .replace(/[^a-zA-Z0-9À-ÿ _-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Cliente";
}

function value(v: unknown) {
  const s = String(v ?? "").trim();
  return s || "—";
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

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

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GestoriaCitaIA · Estudiar en Malta 2027</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#172033;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:25px 0;">
<tr><td align="center">

<table width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#ffffff;border-radius:18px;overflow:hidden;">

<tr>
<td style="background:#07111f;padding:32px 24px;text-align:center;border-bottom:4px solid #20d46b;">
<img src="${LOGO_URL}" alt="GestoriaCitaIA" style="width:300px;max-width:90%;height:auto;display:block;margin:0 auto 18px auto;" />
<h1 style="margin:0;color:#ffffff;font-size:25px;line-height:1.4;">طلب الدراسة فمالطا 2027 🇲🇹</h1>
<p style="color:#c4ccd8;font-size:14px;margin:10px 0 0;">تأكيد الطلب وبداية مسطرة التسجيل فمركز اللغة الإنجليزية</p>
</td>
</tr>

<tr>
<td style="padding:35px 40px;">

<div style="background:#eaf8ef;border:1px solid #b9ebcc;color:#07853f;padding:12px 18px;border-radius:30px;text-align:center;font-weight:bold;">
✓ توصلنا بالطلب ديالك بنجاح
</div>

<h2 style="font-size:22px;margin:25px 0 10px;">السلام عليكم ${safeName}،</h2>

<p style="font-size:16px;line-height:1.9;margin:0 0 22px;">
كنأكدّو ليك باللي توصلنا بالطلب ديالك ديال خدمة
<strong>الدراسة فمالطا 2027 🇲🇹</strong>.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dfe6ef;border-radius:14px;margin:20px 0 25px;">
<tr>
<td style="padding:16px 20px;border-bottom:1px solid #e8edf3;">
<div style="font-size:12px;color:#667085;margin-bottom:5px;">الاسم والنسب</div>
<strong style="font-size:17px;">${safeName}</strong>
</td>
</tr>
<tr>
<td style="padding:16px 20px;border-bottom:1px solid #e8edf3;">
<div style="font-size:12px;color:#667085;margin-bottom:5px;">رقم الهاتف / WhatsApp</div>
<strong dir="ltr" style="font-size:17px;">${safeWhatsapp}</strong>
</td>
</tr>
<tr>
<td style="padding:16px 20px;">
<div style="font-size:12px;color:#667085;margin-bottom:5px;">البريد الإلكتروني</div>
<strong dir="ltr" style="font-size:17px;">${safeEmail}</strong>
</td>
</tr>
</table>

<div style="background:#f1f7ff;border-right:5px solid #0b57d0;padding:21px;border-radius:12px;margin:25px 0;">
<h2 style="margin:0 0 12px;color:#0b57d0;font-size:19px;">⏱️ شنو غادي يوقع دابا؟</h2>
<p style="font-size:16px;line-height:1.9;margin:0;">
فمدة أقصاها <strong style="color:#07853f;">24 ساعة ديال الخدمة</strong>،
غادي نتاصلو بيك فالرقم اللي عطيتينا باش نراجعو معاك المعلومات ونبداو
<strong>مسطرة التسجيل فـ مركز ديال اللغة الإنجليزية فمالطا 🇲🇹</strong>.
</p>
</div>

<h3 style="font-size:19px;margin:28px 0 15px;">المراحل الجاية</h3>

<p style="font-size:15px;line-height:1.9;margin:0;">
🟢 <strong>المرحلة 1:</strong> الفريق ديالنا كيراجع المعلومات اللي عمرتي فالطلب.<br><br>
🟢 <strong>المرحلة 2:</strong> غادي نتاصلو بيك فمدة أقصاها 24 ساعة ديال الخدمة.<br><br>
🟢 <strong>المرحلة 3:</strong> غادي نبداو إجراءات التسجيل والتوجيه نحو مركز اللغة الإنجليزية فمالطا.<br><br>
🟢 <strong>المرحلة 4:</strong> غادي نشرحو ليك فالمكالمة الوثائق والخطوات اللي خاصك تكمل من بعد.
</p>

<div style="background:#fff8e8;border:1px solid #f2d48b;border-radius:10px;padding:17px;margin-top:28px;font-size:14px;line-height:1.8;">
📄 <strong>الوثيقة ديالك مرفقة مع هاد الإيميل.</strong><br>
غادي تلقى فيها المعلومات الأساسية والخطوات الأولى ديال المسطرة.
</div>

<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:22px;font-size:13px;line-height:1.8;">
<strong>معلومات الطلب:</strong><br>
تاريخ الازدياد: ${safeDob || "—"}<br>
الجنسية: ${safeNationality || "—"}<br>
رقم الباسبور: ${safePassport || "—"}
</div>

<p style="font-size:17px;line-height:1.9;text-align:center;margin:32px 0 0;">
🇲🇦 🇲🇹<br><br>
شكراً بزاف على الثقة ديالك فـ <strong>GestoriaCitaIA</strong>.<br><br>
حنا معاك خطوة بخطوة.
</p>

</td>
</tr>

<tr>
<td style="background:#07111f;padding:21px;text-align:center;color:#aeb9c8;font-size:12px;">
<strong style="color:#ffffff;font-size:14px;">GestoriaCitaIA</strong><br>
خدمة الدراسة فمالطا 2027<br>
gestoriacitaia@gmail.com
</td>
</tr>

</table>
</td></tr>
</table>

</body>
</html>
`;
}

// ============================================================
// PDF — MISMO ESTILO DEL GMAIL, PERO COMPACTADO A UNA SOLA A4
// ============================================================
function buildPdfHtml(data: {
  fullName: string;
  whatsapp: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
}) {
  const n = escapeHtml(value(data.fullName));
  const w = escapeHtml(value(data.whatsapp));
  const e = escapeHtml(value(data.email));
  const dob = escapeHtml(value(data.dateOfBirth));
  const nat = escapeHtml(value(data.nationality));
  const pass = escapeHtml(value(data.passportNumber));

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
@import url("https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700;800&display=swap");
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;width:210mm;height:297mm}
body{
  background:#eef2f7;
  color:#172033;
  font-family:"Noto Naskh Arabic","Noto Sans Arabic","DejaVu Sans",Arial,sans-serif;
  direction:rtl;
  -webkit-font-smoothing:antialiased;
}
.page,.page *{
  font-family:"Noto Naskh Arabic","Noto Sans Arabic","DejaVu Sans",Arial,sans-serif;
  direction:rtl;
  unicode-bidi:plaintext;
  text-align:right;
}
.header,
.badge,
.thanks,
.footer{
  text-align:center;
}
.header img{
  margin-left:auto;
  margin-right:auto;
}
.client,
.client2{
  direction:rtl;
}
.client td,
.client2 td{
  direction:rtl;
  text-align:right;
}
.blue h2,
.blue p,
.steps h2,
.steptext,
.note{
  direction:rtl;
  text-align:right;
}
.value{
  direction:rtl;
  unicode-bidi:plaintext;
}
[dir="ltr"]{
  direction:ltr !important;
  unicode-bidi:isolate;
  text-align:left !important;
}
.page{box-sizing:border-box;
  width:210mm;
  height:297mm;
  background:#fff;
  position:relative;
  overflow:hidden;
}
.header{
  height:48mm;
  background:#07111f;
  padding:5mm 12mm 3.5mm;
  border-bottom:1.5mm solid #20d46b;
  text-align:center;
}
.logo{
  width:78mm;
  height:16mm;
  object-fit:contain;
  display:block;
  margin:0 auto 1.5mm;
}
.header h1{
  color:#fff;
  font-size:17pt;
  line-height:1.2;
  margin:0.5mm 0 1mm;
  font-weight:900;
}
.header p{
  color:#c4ccd8;
  font-size:9pt;
  margin:0;
  line-height:1.4;
}
.content{
  padding:6mm 12mm 15mm;
}
.badge{
  background:#eaf8ef;
  border:1px solid #b9ebcc;
  color:#07853f;
  border-radius:7mm;
  padding:2.3mm 4mm;
  text-align:center;
  font-size:10pt;
  font-weight:900;
  margin-bottom:4mm;
}
.greeting{
  font-size:13pt;
  font-weight:900;
  margin:0 0 1.5mm;
}
.intro{
  font-size:9.5pt;
  line-height:1.55;
  margin:0 0 4mm;
}
.client{
  width:100%;
  border:1px solid #dfe6ef;
  border-radius:3.5mm;
  border-collapse:separate;
  overflow:hidden;
  margin-bottom:4mm;
}
.client td{
  width:33.333%;
  padding:2.3mm 3mm;
  border-left:1px solid #e8edf3;
  vertical-align:top;
}
.client td:last-child{border-left:0}
.label{
  color:#667085;
  font-size:7pt;
  margin-bottom:.6mm;
}
.value{
  color:#111827;
  font-size:9pt;
  font-weight:900;
  line-height:1.25;
}
.client2{
  width:100%;
  border:1px solid #e5e7eb;
  background:#f8fafc;
  border-radius:3.5mm;
  border-collapse:separate;
  margin-top:3mm;
  margin-bottom:4mm;
}
.client2 td{
  width:33.333%;
  padding:2mm 3mm;
  border-left:1px solid #e5e7eb;
}
.client2 td:last-child{border-left:0}
.blue{
  background:#f1f7ff;
  border:1px solid #c9ddf6;
  border-right:1.5mm solid #0b57d0;
  border-radius:3.5mm;
  padding:3mm 4mm;
  margin-bottom:4mm;
}
.blue h2{
  color:#0b57d0;
  font-size:11.5pt;
  margin:0 0 1.2mm;
  font-weight:900;
}
.blue p{
  font-size:9pt;
  line-height:1.55;
  margin:0;
}
.steps h2{
  color:#0b57d0;
  font-size:11.5pt;
  margin:0 0 1.8mm;
  font-weight:900;
}
.step{
  display:table;
  width:100%;
  margin:1.6mm 0;
  direction:rtl;
}
.num{
  display:table-cell;
  width:7mm;
  vertical-align:middle;
}
.num span{
  display:block;
  width:5.5mm;
  height:5.5mm;
  border-radius:50%;
  background:#20d46b;
  color:#07111f;
  text-align:center;
  font-family:Arial,sans-serif;
  font-size:7.5pt;
  font-weight:900;
  line-height:5.5mm;
}
.steptext{
  display:table-cell;
  vertical-align:middle;
  font-size:8.5pt;
  line-height:1.45;
  padding-right:1.5mm;
}
.note{
  background:#fff8e8;
  border:1px solid #f2d48b;
  border-radius:3mm;
  padding:2.5mm 3.5mm;
  margin-top:3mm;
  text-align:center;
  font-size:8pt;
  line-height:1.45;
}
.thanks{
  text-align:center;
  color:#0b57d0;
  font-size:9.5pt;
  font-weight:900;
  margin-top:2.5mm;
}
.footer{
  position:absolute;
  left:0;right:0;bottom:0;
  height:12mm;
  background:#07111f;
  color:#aeb9c8;
  text-align:center;
  padding:2mm;
  font-size:6.5pt;
  line-height:1.35;
}
.footer strong{
  display:block;
  color:#fff;
  font-family:Arial,sans-serif;
  font-size:8pt;
  margin-bottom:.4mm;
}
</style>
</head>
<body dir="rtl">
<div class="page" dir="rtl">

<header class="header">
<img class="logo" src="${LOGO_URL}">
<h1>طلب الدراسة فمالطا 2027 🇲🇹</h1>
<p>تأكيد الطلب وبداية مسطرة التسجيل فمركز اللغة الإنجليزية</p>
</header>

<main class="content">

<div class="badge">✓ توصلنا بالطلب ديالك بنجاح</div>

<p class="greeting" dir="rtl">السلام عليكم ${n}،</p>
<p class="intro" dir="rtl">
كنأكدّو ليك باللي توصلنا بالطلب ديالك ديال خدمة
<strong>الدراسة فمالطا 2027 🇲🇹</strong>.
</p>

<table class="client" cellpadding="0" cellspacing="0">
<tr>
<td><div class="label">الاسم والنسب</div><div class="value">${n}</div></td>
<td><div class="label">رقم الهاتف / WhatsApp</div><div class="value" dir="ltr">${w}</div></td>
<td><div class="label">البريد الإلكتروني</div><div class="value" dir="ltr">${e}</div></td>
</tr>
</table>

<table class="client2" cellpadding="0" cellspacing="0">
<tr>
<td><div class="label">تاريخ الازدياد</div><div class="value">${dob}</div></td>
<td><div class="label">الجنسية</div><div class="value">${nat}</div></td>
<td><div class="label">رقم الباسبور</div><div class="value">${pass}</div></td>
</tr>
</table>

<section class="blue" dir="rtl">
<h2>⏱️ شنو غادي يوقع دابا؟</h2>
<p>
فمدة أقصاها <strong style="color:#07853f">24 ساعة ديال الخدمة</strong>،
غادي نتاصلو بيك فالرقم اللي عطيتينا باش نراجعو معاك المعلومات ونبداو
<strong>مسطرة التسجيل فـ مركز ديال اللغة الإنجليزية فمالطا 🇲🇹</strong>.
</p>
</section>

<section class="steps" dir="rtl">
<h2>المراحل الجاية</h2>

<div class="step"><div class="num"><span>1</span></div><div class="steptext">الفريق ديالنا كيراجع المعلومات اللي عمرتي فالطلب.</div></div>
<div class="step"><div class="num"><span>2</span></div><div class="steptext">غادي نتاصلو بيك فمدة أقصاها 24 ساعة ديال الخدمة.</div></div>
<div class="step"><div class="num"><span>3</span></div><div class="steptext">غادي نبداو إجراءات التسجيل والتوجيه نحو مركز اللغة الإنجليزية فمالطا.</div></div>
<div class="step"><div class="num"><span>4</span></div><div class="steptext">غادي نشرحو ليك فالمكالمة الوثائق والخطوات اللي خاصك تكمل من بعد.</div></div>

</section>

<div class="note">
📄 <strong>الوثيقة ديالك مرفقة مع هاد الإيميل.</strong>
غادي تلقى فيها المعلومات الأساسية والخطوات الأولى ديال المسطرة.
</div>

<div class="thanks">🇲🇦 🇲🇹 شكراً بزاف على الثقة ديالك فـ GestoriaCitaIA</div>

</main>

<footer class="footer">
<strong>GestoriaCitaIA</strong>
خدمة الدراسة فمالطا 2027 · gestoriacitaia@gmail.com
</footer>

</div>
</body>
</html>`;
}

// ============================================================
// PDF DINÁMICO — SIEMPRE UNA SOLA A4
// ============================================================
async function createOnePagePdf(data: {
  fullName: string;
  whatsapp: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
}) {
  const browser = await playwrightChromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 794, height: 1123 },
      deviceScaleFactor: 1,
    });

    const pdfHtml = buildPdfHtml(data);

    await page.setContent(pdfHtml, {
      waitUntil: "networkidle",
    });

    await page.emulateMedia({ media: "screen" });

    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                })
        )
      );

      // Espera las fuentes disponibles sin bloquear si una fuente externa falla.
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      try {
        await document.fonts.load('700 24px "Noto Naskh Arabic"');
        await document.fonts.load('400 16px "Noto Naskh Arabic"');
      } catch {}
    });

    // El diseño tiene altura A4 fija y overflow:hidden:
    // nunca puede crear una segunda página.
    
// Ajuste final: comprueba que TODO el contenido entre en una única A4.
// Reduce únicamente la escala visual del contenido si fuese necesario;
// no cambia el HTML del email ni el transporte SMTP.
await page.evaluate(() => {
  const root = document.querySelector(".page") as HTMLElement | null;
  if (!root) return;

  const footer = root.querySelector(".footer") as HTMLElement | null;
  const content = root.querySelector(".content") as HTMLElement | null;

  const target = 297 * 3.779527559; // 297mm en px CSS
  const margin = 2 * 3.779527559;
  const maxHeight = target - margin;

  // Compactación suave antes de escalar.
  root.style.boxSizing = "border-box";
  root.style.overflow = "hidden";

  const all = root.querySelectorAll<HTMLElement>(
    ".content, .client, .client2, .blue, .steps, .step, .note, .thanks"
  );
  all.forEach((el) => {
    el.style.boxSizing = "border-box";
  });

  // Reservar el footer dentro de la A4.
  if (footer) footer.style.position = "absolute";

  // Medir el contenido real.
  const contentBottom = content
    ? content.getBoundingClientRect().bottom
    : root.getBoundingClientRect().bottom;
  const footerTop = footer
    ? footer.getBoundingClientRect().top
    : maxHeight;

  const used = Math.max(contentBottom, footerTop);
  const available = maxHeight;

  // Si queda fuera, reducir el contenido completo de forma proporcional.
  if (used > available) {
    const scale = Math.max(0.82, Math.min(1, available / used));
    if (content) {
      content.style.transformOrigin = "top center";
      content.style.transform = `scale(${scale})`;
      content.style.width = `${100 / scale}%`;
      content.style.marginLeft = `${(100 - 100 / scale) / 2}%`;
    }
  }
});

const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
      pageRanges: "1",
      scale: 1,
    });

    if (!pdfBuffer || pdfBuffer.length < 10000) {
      throw new Error("El PDF generado no es válido.");
    }

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}



export async function sendWelcomeEmail({
  email,
  name,
  whatsapp,
  pdfUrl,
  dateOfBirth,
  nationality,
  passportNumber,
}: SendWelcomeEmailParams) {
  if (!email) {
    throw new Error("No se ha recibido el email del cliente.");
  }

  const fullName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const safeWhatsapp = String(whatsapp || "").trim();

  console.log("=========================================");
  console.log("📧 GMAIL — ESTUDIOS MALTA 2027");
  console.log("=========================================");
  console.log("Cliente:", fullName);
  console.log("Email:", normalizedEmail);
  console.log("WhatsApp:", safeWhatsapp);

  const data = {
    fullName,
    whatsapp: safeWhatsapp,
    email: normalizedEmail,
    dateOfBirth: String(dateOfBirth || "").trim(),
    nationality: String(nationality || "").trim(),
    passportNumber: String(passportNumber || "").trim(),
  };

  // ============================================================
  // PDF DINÁMICO — EL MISMO PDF QUE YA PROBASTE Y APROBASTE
  // ============================================================
  const pdfBuffer = await createOnePagePdf(data);
  const pdfFileName =
    `GestoriaCitaIA-Estudiar-Malta-2027-${cleanFileName(fullName)}.pdf`;

  console.log("📄 PDF generado:", pdfFileName);
  console.log("📄 PDF bytes:", pdfBuffer.length);

  // ============================================================
  // GMAIL — EL MISMO MENSAJE RTL QUE YA PROBASTE Y APROBASTE
  // ============================================================
  const html = buildEmailHtml(data);

  await transporter.verify();
  console.log("✅ Gmail SMTP OK");

  const info = await transporter.sendMail({
    from: `"GestoriaCitaIA" <${process.env.GMAIL_USER}>`,
    to: normalizedEmail,
    subject: `🇲🇹 تأكيد طلب الدراسة فمالطا 2027 · ${fullName}`,
    html,
    attachments: [
      {
        filename: pdfFileName,
        content: pdfBuffer,
        contentType: "application/pdf",
        contentDisposition: "attachment",
      },
    ],
  });

  console.log("=========================================");
  console.log("✅ EMAIL + PDF ESTUDIOS MALTA ENVIADOS");
  console.log("Message ID:", info.messageId);
  console.log("Cliente:", fullName);
  console.log("Destino:", normalizedEmail);
  console.log("PDF: ADJUNTADO — 1 página A4");
  console.log("=========================================");

  return info;
}
