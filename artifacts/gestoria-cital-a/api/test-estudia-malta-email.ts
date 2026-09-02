import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";

const TEST_EMAIL = "robertopalacio165@gmail.com";

function escapeHtml(value: unknown = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function generateStudyMaltaPdfHtml(data: any): string {
  const name = escapeHtml(data.fullName || "Cliente");
  const whatsapp = escapeHtml(data.whatsapp || "");
  const email = escapeHtml(data.email || "");
  const nationality = escapeHtml(data.nationality || "");
  const passport = escapeHtml(data.passportNumber || "");
  const dateOfBirth = escapeHtml(data.dateOfBirth || "");

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">

<style>

@page {
  size: A4;
  margin: 0;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  background: #eef2f7;
  font-family: Arial, "Tahoma", sans-serif;
  color: #172033;
}

.page {
  width: 210mm;
  min-height: 297mm;
  background: #eef2f7;
  padding: 10mm;
}

.header {
  background: #07111f;
  border: 2px solid #20d46b;
  border-radius: 12px;
  padding: 10mm 8mm;
  text-align: center;
  color: white;
}

.logo {
  width: 72mm;
  max-width: 80%;
  margin-bottom: 5mm;
}

.header h1 {
  margin: 0;
  font-size: 25px;
  line-height: 1.5;
}

.header p {
  margin: 3mm 0 0;
  color: #cbd5e1;
  font-size: 13px;
}

.content {
  background: white;
  border-radius: 12px;
  margin-top: 7mm;
  padding: 8mm;
  border: 1px solid #dbe3ec;
}

.success {
  background: #eaf8ef;
  border: 1px solid #a9e6bf;
  color: #087f3d;
  border-radius: 8px;
  padding: 4mm;
  text-align: center;
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 7mm;
}

.greeting {
  font-size: 19px;
  font-weight: bold;
  margin-bottom: 4mm;
}

.text {
  font-size: 14px;
  line-height: 1.9;
}

.info {
  background: #f6f9fc;
  border: 1px solid #dce4ed;
  border-radius: 9px;
  padding: 5mm;
  margin-top: 6mm;
}

.info-row {
  padding: 3mm 0;
  border-bottom: 1px solid #e4e9ef;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 11px;
  color: #667085;
  margin-bottom: 1mm;
}

.value {
  font-size: 14px;
  font-weight: bold;
}

.blue-box {
  background: #f0f7ff;
  border-right: 4px solid #1261c9;
  border-radius: 8px;
  padding: 5mm;
  margin-top: 7mm;
}

.blue-box h2 {
  color: #1261c9;
  margin: 0 0 3mm;
  font-size: 17px;
}

.section-title {
  color: #1261c9;
  font-size: 18px;
  margin: 7mm 0 4mm;
}

.steps {
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 4mm;
  margin-bottom: 4mm;
  font-size: 13px;
  line-height: 1.8;
}

.number {
  flex: 0 0 7mm;
  height: 7mm;
  width: 7mm;
  border-radius: 50%;
  background: #20d46b;
  color: #07111f;
  text-align: center;
  line-height: 7mm;
  font-weight: bold;
}

.warning {
  background: #fff8e7;
  border: 1px solid #f0d48c;
  border-radius: 8px;
  padding: 4mm;
  margin-top: 7mm;
  font-size: 11px;
  line-height: 1.8;
}

.thanks {
  text-align: center;
  font-size: 15px;
  font-weight: bold;
  margin-top: 8mm;
  color: #1261c9;
}

.footer {
  margin-top: 7mm;
  background: #07111f;
  color: white;
  text-align: center;
  padding: 6mm;
  border-radius: 10px;
  font-size: 11px;
}

.footer strong {
  font-size: 14px;
}

</style>
</head>

<body>

<div class="page">

  <div class="header">

    <img
      class="logo"
      src="https://gestoriacitaia.com/images/gestoriacitaia-logo.png"
    />

    <h1>
      طلب الدراسة فمالطا 2027 🇲🇹
    </h1>

    <p>
      تأكيد الطلب وبداية مسطرة التسجيل فمركز اللغة الإنجليزية
    </p>

  </div>

  <div class="content">

    <div class="success">
      ✓ توصلنا بالطلب ديالك بنجاح
    </div>

    <div class="greeting">
      السلام عليكم ${name}،
    </div>

    <div class="text">
      كنأكدّو ليك باللي توصلنا بالطلب ديالك وبالأداء ديالك ديال خدمة
      <strong>الدراسة فمالطا 2027 🇲🇹</strong>.
    </div>

    <div class="info">

      <div class="info-row">
        <div class="label">الاسم والنسب</div>
        <div class="value">${name}</div>
      </div>

      <div class="info-row">
        <div class="label">رقم الهاتف / WhatsApp</div>
        <div class="value" dir="ltr">${whatsapp || "—"}</div>
      </div>

      <div class="info-row">
        <div class="label">البريد الإلكتروني</div>
        <div class="value" dir="ltr">${email || "—"}</div>
      </div>

      <div class="info-row">
        <div class="label">تاريخ الازدياد</div>
        <div class="value">${dateOfBirth || "—"}</div>
      </div>

      <div class="info-row">
        <div class="label">الجنسية</div>
        <div class="value">${nationality || "—"}</div>
      </div>

      <div class="info-row">
        <div class="label">رقم الباسبور</div>
        <div class="value" dir="ltr">${passport || "—"}</div>
      </div>

    </div>

    <div class="blue-box">

      <h2>
        شنو غادي يوقع دابا؟
      </h2>

      <div class="text">
        فمدة أقصاها
        <strong>24 ساعة ديال الخدمة</strong>،
        غادي نتاصلو بيك فالرقم اللي عطيتينا باش نراجعو معاك المعلومات
        ونبداو مسطرة التسجيل فـ مركز ديال اللغة الإنجليزية فمالطا.
      </div>

    </div>

    <div class="section-title">
      المراحل الجاية
    </div>

    <div class="steps">

      <div class="step">
        <div class="number">1</div>
        <div>
          الفريق ديالنا كيراجع المعلومات اللي عمرتي فالطلب.
        </div>
      </div>

      <div class="step">
        <div class="number">2</div>
        <div>
          كنعادو نتاصلو بيك فـ 24 ساعة ديال الخدمة باش نكملو معاك.
        </div>
      </div>

      <div class="step">
        <div class="number">3</div>
        <div>
          كنبداو إجراءات التسجيل والتوجيه نحو مركز اللغة الإنجليزية فمالطا.
        </div>
      </div>

      <div class="step">
        <div class="number">4</div>
        <div>
          كنشرحو ليك الوثائق والخطوات اللي خاصك دير من بعد.
        </div>
      </div>

    </div>

    <div class="warning">

      <strong>مهم:</strong>
      القبول النهائي كيبقا مرتبط بشروط المركز والوثائق المطلوبة.
      خدمة GestoriaCitaIA هي التوجيه وتدبير مسطرة الطلب.

    </div>

    <div class="thanks">
      شكراً على الثقة ديالك فـ GestoriaCitaIA 🇲🇦 🇲🇹
    </div>

  </div>

  <div class="footer">

    <strong>GestoriaCitaIA</strong>

    <br>

    خدمة الدراسة فمالطا 2027

    <br>

    gestoriacitaia@gmail.com

  </div>

</div>

</body>
</html>
`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const normalizedEmail = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    if (normalizedEmail !== TEST_EMAIL) {
      return res.status(403).json({
        error:
          "Esta API de prueba solamente está disponible para la cuenta autorizada.",
      });
    }

    if (!body.fullName) {
      return res.status(400).json({
        error: "Falta el nombre.",
      });
    }

    // ============================================================
    // 1. GENERAR PDF REAL
    // ============================================================

    console.log("📄 Generando PDF Estudios Malta...");

    const pdfHtml =
      generateStudyMaltaPdfHtml(body);

    const pdfBuffer =
      await renderPdfFromHtml(pdfHtml);

    console.log(
      `✅ PDF generado correctamente: ${pdfBuffer.length} bytes`
    );

    // ============================================================
    // 2. BREVO SMTP
    // ============================================================

    const smtpHost =
      process.env.SMTP_HOST ||
      "smtp-relay.brevo.com";

    const smtpPort = Number(
      process.env.SMTP_PORT || 587
    );

    const smtpUser =
      process.env.SMTP_USER;

    const smtpPass =
      process.env.SMTP_PASS;

    const fromEmail =
      process.env.FROM_EMAIL ||
      "gestoriacitaia@gmail.com";

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({
        error:
          "Faltan SMTP_USER o SMTP_PASS.",
      });
    }

    const transporter =
      nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        requireTLS: true,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

    await transporter.verify();

    console.log("✅ Brevo SMTP conectado");

    // ============================================================
    // 3. EMAIL
    // ============================================================

    const safeName =
      escapeHtml(body.fullName);

    const safeWhatsapp =
      escapeHtml(body.whatsapp || "");

    const htmlEmail = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<body style="
margin:0;
padding:30px;
background:#eef2f7;
font-family:Arial,Tahoma,sans-serif;
">

<div style="
max-width:680px;
margin:auto;
background:white;
border-radius:18px;
overflow:hidden;
">

<div style="
background:#07111f;
padding:30px;
text-align:center;
border-bottom:4px solid #20d46b;
">

<img
src="https://gestoriacitaia.com/images/gestoriacitaia-logo.png"
style="width:280px;max-width:90%;"
/>

<h1 style="
color:white;
font-size:24px;
">
طلب الدراسة فمالطا 2027 🇲🇹
</h1>

</div>

<div style="padding:35px;">

<div style="
background:#eaf8ef;
border:1px solid #a9e6bf;
padding:14px;
border-radius:10px;
text-align:center;
color:#087f3d;
font-weight:bold;
">

✓ توصلنا بالطلب ديالك بنجاح

</div>

<h2>
السلام عليكم ${safeName}،
</h2>

<p style="
font-size:16px;
line-height:1.9;
">

كنأكدّو ليك باللي توصلنا بالطلب ديالك وبالأداء ديالك ديال خدمة
<strong>
الدراسة فمالطا 2027 🇲🇹
</strong>.

</p>

<div style="
background:#f0f7ff;
border-right:5px solid #1261c9;
padding:20px;
border-radius:10px;
">

<strong style="
color:#1261c9;
font-size:18px;
">

شنو غادي يوقع دابا؟

</strong>

<p style="
line-height:1.9;
">

فمدة أقصاها
<strong>24 ساعة ديال الخدمة</strong>،
غادي نتاصلو بيك فالرقم
<strong>${safeWhatsapp}</strong>
باش نراجعو معاك المعلومات ونبداو المسطرة.

</p>

</div>

<h3 style="color:#1261c9;">
المراحل الجاية
</h3>

<p style="line-height:2;">

🟢 1. الفريق ديالنا كيراجع المعلومات اللي عمرتي فالطلب.

<br>

🟢 2. كنتاصلو بيك فـ 24 ساعة ديال الخدمة.

<br>

🟢 3. كنبداو إجراءات التسجيل والتوجيه.

<br>

🟢 4. كنشرحو ليك الوثائق والخطوات الجاية.

</p>

<p style="
background:#fff8e7;
padding:15px;
border-radius:8px;
font-size:13px;
">

📄 الوثيقة ديالك مرفقة مع هاد الإيميل.

</p>

<p style="
text-align:center;
font-weight:bold;
font-size:16px;
">

شكراً على الثقة ديالك فـ GestoriaCitaIA 🇲🇦 🇲🇹

</p>

</div>

<div style="
background:#07111f;
color:white;
text-align:center;
padding:20px;
font-size:12px;
">

<strong>GestoriaCitaIA</strong>

<br>

خدمة الدراسة فمالطا 2027

<br>

gestoriacitaia@gmail.com

</div>

</div>

</body>
</html>
`;

    const result =
      await transporter.sendMail({
        from: `"GestoriaCitaIA" <${fromEmail}>`,
        to: TEST_EMAIL,
        subject:
          `🇲🇹 Confirmación Estudios Malta 2027 - ${body.fullName}`,
        html: htmlEmail,
        attachments: [
          {
            filename:
              `GestoriaCitaIA-Estudiar-Malta-2027-${String(
                body.fullName
              )
                .replace(/[^a-zA-Z0-9À-ÿ _-]/g, "")
                .replace(/\s+/g, "-")
                .slice(0, 60)}.pdf`,
            content: pdfBuffer,
            contentType:
              "application/pdf",
          },
        ],
      });

    console.log(
      "✅ EMAIL + PDF ENVIADOS",
      result.messageId
    );

    return res.status(200).json({
      success: true,
      test: true,
      email: TEST_EMAIL,
      pdfGenerated: true,
      pdfBytes: pdfBuffer.length,
      messageId: result.messageId,
    });

  } catch (error: any) {
    console.error(
      "❌ ERROR ESTUDIA MALTA:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Error generando PDF o enviando email.",
    });
  }
}
