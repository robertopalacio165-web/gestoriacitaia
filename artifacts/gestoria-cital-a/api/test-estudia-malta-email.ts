import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";

const TEST_EMAIL = "robertopalacio165@gmail.com";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================
   HTML ÚNICO
   ESTE MISMO HTML SE USA PARA:
   1. EMAIL
   2. PDF
   ============================================================ */

function createConfirmationHtml(data: any, pdfMode = false): string {
  const fullName = esc(data.fullName || "");
  const whatsapp = esc(data.whatsapp || "");
  const email = esc(data.email || TEST_EMAIL);
  const dateOfBirth = esc(data.dateOfBirth || "");
  const nationality = esc(data.nationality || "");
  const passportNumber = esc(data.passportNumber || "");

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
<meta charset="UTF-8">

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: ${pdfMode ? "#eef2f7" : "#ffffff"};
  font-family: Arial, Tahoma, "Noto Sans Arabic", sans-serif;
  color: #172033;
}

body {
  padding: ${pdfMode ? "24px" : "0"};
}

.wrapper {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e0e6ed;
}

.header {
  background: #07111f;
  border-bottom: 3px solid #20d46b;
  padding: 30px 25px 25px;
  text-align: center;
}

.logo {
  display: block;
  width: 270px;
  max-width: 85%;
  height: auto;
  margin: 0 auto 18px;
}

.header-title {
  color: #ffffff;
  font-size: 23px;
  font-weight: bold;
  margin: 0;
  line-height: 1.6;
}

.header-subtitle {
  color: #d5dbe4;
  font-size: 13px;
  margin: 8px 0 0;
  line-height: 1.7;
}

.content {
  padding: 28px 32px 30px;
}

.success {
  background: #eaf8ef;
  border: 1px solid #9fe0b5;
  color: #07853f;
  border-radius: 25px;
  padding: 11px 15px;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 24px;
}

.greeting {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #172033;
}

.intro {
  font-size: 15px;
  line-height: 2;
  margin: 0 0 20px;
}

.info-box {
  border: 1px solid #dce4ed;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
}

.info-row {
  padding: 13px 15px;
  border-bottom: 1px solid #e4e9ef;
}

.info-row:last-child {
  border-bottom: 0;
}

.label {
  display: block;
  color: #667085;
  font-size: 11px;
  margin-bottom: 5px;
}

.value {
  display: block;
  color: #172033;
  font-size: 14px;
  font-weight: bold;
}

.blue-box {
  background: #f0f7ff;
  border-right: 4px solid #1261c9;
  border-radius: 9px;
  padding: 17px 18px;
  margin: 20px 0;
}

.blue-title {
  color: #1261c9;
  font-size: 17px;
  font-weight: bold;
  margin-bottom: 9px;
}

.blue-text {
  font-size: 14px;
  line-height: 1.9;
  margin: 0;
}

.section-title {
  color: #172033;
  font-size: 17px;
  font-weight: bold;
  margin: 24px 0 14px;
}

.step {
  position: relative;
  padding-right: 27px;
  font-size: 13px;
  line-height: 1.9;
  margin-bottom: 11px;
}

.step:before {
  content: "";
  position: absolute;
  right: 0;
  top: 8px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #71b83b;
}

.warning {
  background: #fff8e8;
  border: 1px solid #f0d48c;
  border-radius: 9px;
  padding: 14px 16px;
  margin-top: 20px;
  font-size: 12px;
  line-height: 1.9;
}

.thanks {
  text-align: center;
  font-size: 15px;
  font-weight: bold;
  margin: 24px 0 8px;
}

.contact {
  text-align: center;
  font-size: 12px;
  color: #667085;
  line-height: 1.8;
}

.footer {
  background: #07111f;
  color: #ffffff;
  text-align: center;
  padding: 18px;
  font-size: 11px;
  line-height: 1.8;
}

.footer strong {
  font-size: 14px;
}

a {
  color: #1261c9;
}

</style>
</head>

<body>

<div class="wrapper">

  <!-- HEADER -->

  <div class="header">

    <img
      class="logo"
      src="https://gestoriacitaia.com/images/gestoriacitaia-logo.png"
      alt="GestoriaCitaIA"
    />

    <div class="header-title">
      طلب الدراسة فمالطا 2027 🇲🇹
    </div>

    <div class="header-subtitle">
      تأكيد الطلب وبداية مسطرة التسجيل فمركز اللغة الإنجليزية
    </div>

  </div>

  <!-- CONTENT -->

  <div class="content">

    <div class="success">
      ✓ توصلنا بالطلب ديالك بنجاح
    </div>

    <div class="greeting">
      السلام عليكم ${fullName}،
    </div>

    <p class="intro">
      كنأكدّو ليك باللي توصلنا بالطلب ديالك وبالأداء ديالك ديال خدمة
      <strong>الدراسة فمالطا 2027 🇲🇹</strong>.
    </p>

    <!-- CLIENT DATA -->

    <div class="info-box">

      <div class="info-row">
        <span class="label">
          الاسم والنسب
        </span>

        <span class="value">
          ${fullName}
        </span>
      </div>

      <div class="info-row">
        <span class="label">
          رقم الهاتف / WhatsApp
        </span>

        <span class="value" dir="ltr">
          ${whatsapp}
        </span>
      </div>

      <div class="info-row">
        <span class="label">
          البريد الإلكتروني
        </span>

        <span class="value" dir="ltr">
          ${email}
        </span>
      </div>

    </div>

    <!-- CONTACT -->

    <div class="blue-box">

      <div class="blue-title">
        ⏱️ شنو غادي يوقع دابا؟
      </div>

      <p class="blue-text">
        فمدة أقصاها
        <strong style="color:#07853f;">
          24 ساعة ديال الخدمة
        </strong>،
        غادي نتاصلو بيك فالرقم اللي عطيتينا باش نراجعو معاك المعلومات
        ونكملو معاك المرحلة الجاية ديال التسجيل عن طريق مكالمة.
      </p>

    </div>

    <!-- STEPS -->

    <div class="section-title">
      المراحل الجاية
    </div>

    <div class="step">
      <strong>المرحلة 1:</strong>
      الفريق ديالنا كيراجع المعلومات اللي عمرتي فالطلب.
    </div>

    <div class="step">
      <strong>المرحلة 2:</strong>
      غادي نتاصلو بيك فمدة أقصاها 24 ساعة ديال الخدمة.
    </div>

    <div class="step">
      <strong>المرحلة 3:</strong>
      غادي نبداو إجراءات التسجيل والتوجيه نحو مركز اللغة الإنجليزية فمالطا.
    </div>

    <div class="step">
      <strong>المرحلة 4:</strong>
      غادي نشرحو ليك الوثائق والخطوات اللي خاصك تكمل من بعد.
    </div>

    <!-- WARNING -->

    <div class="warning">
      📄 <strong>الوثيقة ديالك مرفقة مع هاد الإيميل.</strong>
      <br>
      هاد الوثيقة فيها المعلومات الأساسية والخطوات الأولى ديال المسطرة.
    </div>

    <!-- EXTRA DATA -->

    <div class="info-box" style="margin-top:20px;">

      <div class="info-row">
        <span class="label">
          تاريخ الازدياد
        </span>

        <span class="value">
          ${dateOfBirth || "—"}
        </span>
      </div>

      <div class="info-row">
        <span class="label">
          الجنسية
        </span>

        <span class="value">
          ${nationality || "—"}
        </span>
      </div>

      <div class="info-row">
        <span class="label">
          رقم الباسبور
        </span>

        <span class="value" dir="ltr">
          ${passportNumber || "—"}
        </span>
      </div>

    </div>

    <div class="thanks">
      🇲🇦 🇲🇹
      <br>
      شكراً بزاف على الثقة ديالك فـ GestoriaCitaIA.
    </div>

    <div class="contact">
      حنا معاك خطوة بخطوة.
      <br>
      gestoriacitaia@gmail.com
    </div>

  </div>

  <!-- FOOTER -->

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

/* ============================================================
   GENERAR PDF REAL
   ============================================================ */

async function generatePdf(html: string): Promise<Buffer> {
  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: {
        width: 900,
        height: 1200,
      },
    });

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    await page.evaluate(async () => {
      // Esperar a que carguen imágenes
      const images = Array.from(document.images);

      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

      // Esperar fuentes
      if ("fonts" in document) {
        await document.fonts.ready;
      }
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/* ============================================================
   API
   ============================================================ */

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

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (email !== TEST_EMAIL) {
      return res.status(403).json({
        error:
          "Esta API de prueba solamente está disponible para la cuenta autorizada.",
      });
    }

    if (!body.fullName) {
      return res.status(400).json({
        error: "Falta el nombre del cliente.",
      });
    }

    /* ========================================================
       1. MISMO HTML PARA EMAIL Y PDF
       ======================================================== */

    const emailHtml = createConfirmationHtml(body, false);

    const pdfHtml = createConfirmationHtml(body, true);

    /* ========================================================
       2. GENERAR PDF REAL
       ======================================================== */

    console.log("📄 Generando PDF real...");

    const pdfBuffer = await generatePdf(pdfHtml);

    console.log(
      `✅ PDF generado: ${pdfBuffer.length} bytes`
    );

    if (!pdfBuffer || pdfBuffer.length < 10000) {
      throw new Error(
        "El PDF generado parece estar vacío o incompleto."
      );
    }

    /* ========================================================
       3. BREVO SMTP
       ======================================================== */

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
          "Faltan SMTP_USER o SMTP_PASS de Brevo.",
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
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
      });

    await transporter.verify();

    console.log("✅ Brevo SMTP OK");

    /* ========================================================
       4. ENVIAR EMAIL
       ======================================================== */

    const cleanName = String(body.fullName)
      .replace(/[^a-zA-Z0-9À-ÿ _-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);

    const pdfName =
      `GestoriaCitaIA-Estudiar-Malta-2027-${cleanName}.pdf`;

    const result =
      await transporter.sendMail({
        from: `"GestoriaCitaIA" <${fromEmail}>`,
        to: TEST_EMAIL,

        subject:
          `🇲🇹 Confirmación Estudios Malta 2027 - ${body.fullName}`,

        html: emailHtml,

        attachments: [
          {
            filename: pdfName,
            content: pdfBuffer,
            contentType: "application/pdf",
            contentDisposition: "attachment",
          },
        ],
      });

    console.log(
      "✅ EMAIL + PDF ENVIADOS:",
      result.messageId
    );

    return res.status(200).json({
      success: true,
      test: true,
      email: TEST_EMAIL,
      pdfGenerated: true,
      pdfBytes: pdfBuffer.length,
      pdfFileName: pdfName,
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
