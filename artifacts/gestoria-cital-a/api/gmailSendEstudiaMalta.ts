import nodemailer from "nodemailer";

interface SendWelcomeEmailParams {
  email: string;
  name: string;
  whatsapp: string;
  pdfUrl?: string;
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

function escapeHtml(value: string = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendWelcomeEmail({
  email,
  name,
  whatsapp,
  pdfUrl,
}: SendWelcomeEmailParams) {
  if (!email) {
    throw new Error("No se ha recibido el email del cliente.");
  }

  const safeName = escapeHtml(name || "العميل");
  const safeWhatsapp = escapeHtml(whatsapp || "");

  console.log("=========================================");
  console.log("📧 GMAIL — ESTUDIOS MALTA 2027");
  console.log("=========================================");
  console.log("Cliente:", name);
  console.log("Email:", email);
  console.log("WhatsApp:", whatsapp);

  // ============================================
  // DESCARGAR PDF SI EXISTE
  // ============================================

  const attachments: any[] = [];

  if (pdfUrl) {
    try {
      console.log("📄 Descargando PDF:", pdfUrl);

      const response = await fetch(pdfUrl);

      if (!response.ok) {
        throw new Error(
          `No se pudo descargar el PDF. HTTP ${response.status}`
        );
      }

      const pdfBuffer = Buffer.from(await response.arrayBuffer());

      attachments.push({
        filename: `GestoriaCitaIA_Estudios_Malta_2027_${(
          name || "cliente"
        ).replace(/\s+/g, "_")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      });

      console.log("✅ PDF preparado para adjuntar");
    } catch (error) {
      console.error("❌ Error descargando PDF:", error);
    }
  }

  // ============================================
  // EMAIL
  // ============================================

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>GestoriaCitaIA · Malta 2027</title>

<style>

body {
  margin: 0;
  padding: 0;
  background: #eef2f7;
  font-family: Arial, Helvetica, sans-serif;
  color: #172033;
}

.wrapper {
  width: 100%;
  padding: 35px 0;
}

.email {
  width: 680px;
  max-width: calc(100% - 30px);
  margin: auto;
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,.12);
}

.header {
  background: #07111f;
  padding: 35px 25px;
  text-align: center;
  border-bottom: 4px solid #20d46b;
}

.logo {
  width: 300px;
  max-width: 90%;
  height: auto;
  margin-bottom: 18px;
}

.header h1 {
  margin: 0;
  color: #ffffff;
  font-size: 25px;
}

.header p {
  margin: 8px 0 0;
  color: #b9c4d3;
  font-size: 14px;
}

.content {
  padding: 38px 42px;
}

.badge {
  display: inline-block;
  background: #eaf8ef;
  color: #07853f;
  border: 1px solid #b9ebcc;
  padding: 9px 16px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: bold;
}

.greeting {
  font-size: 22px;
  font-weight: bold;
  margin-top: 28px;
}

.text {
  font-size: 16px;
  line-height: 1.9;
}

.client {
  margin: 25px 0;
  border: 1px solid #e1e7ef;
  border-radius: 14px;
  overflow: hidden;
}

.client-row {
  padding: 18px 20px;
  border-bottom: 1px solid #e8edf3;
}

.client-row:last-child {
  border-bottom: none;
}

.label {
  color: #667085;
  font-size: 12px;
  margin-bottom: 5px;
}

.value {
  font-size: 17px;
  font-weight: bold;
  color: #172033;
}

.main-box {
  background: #f1f7ff;
  border-right: 5px solid #0b57d0;
  padding: 22px;
  border-radius: 12px;
  margin: 25px 0;
}

.main-box h2 {
  margin: 0 0 12px;
  color: #0b57d0;
  font-size: 19px;
}

.hours {
  color: #07853f;
  font-weight: bold;
}

.steps {
  margin-top: 25px;
}

.step {
  margin-bottom: 16px;
  font-size: 15px;
  line-height: 1.8;
}

.step-number {
  display: inline-block;
  width: 27px;
  height: 27px;
  line-height: 27px;
  text-align: center;
  background: #20d46b;
  color: #ffffff;
  border-radius: 50%;
  font-weight: bold;
  margin-left: 8px;
}

.note {
  background: #fff8e8;
  border: 1px solid #f2d48b;
  border-radius: 10px;
  padding: 17px;
  margin-top: 28px;
  font-size: 13px;
  line-height: 1.8;
}

.footer {
  background: #07111f;
  color: #aeb9c8;
  padding: 22px;
  text-align: center;
  font-size: 12px;
}

.footer strong {
  color: #ffffff;
}

</style>

</head>

<body>

<div class="wrapper">

<div class="email">

  <!-- HEADER -->

  <div class="header">

    <img
      class="logo"
      src="${
        process.env.NEXT_PUBLIC_URL ||
        "https://gestoriacitaia.com"
      }/images/gestoriacitaia-logo.png"
      alt="GestoriaCitaIA"
    />

    <h1>طلب الدراسة فمالطا 2027 🇲🇹</h1>

    <p>
      تأكيد الطلب وبداية مسطرة التسجيل فمركز اللغة الإنجليزية
    </p>

  </div>

  <!-- CONTENT -->

  <div class="content">

    <div class="badge">
      ✓ توصلنا بالطلب ديالك بنجاح
    </div>

    <div class="greeting">
      السلام عليكم ${safeName}،
    </div>

    <p class="text">
      كنأكدّو ليك باللي توصلنا بالطلب ديالك وبالأداء ديالك
      ديال خدمة <strong>الدراسة فمالطا 2027</strong>.
    </p>

    <!-- CLIENT -->

    <div class="client">

      <div class="client-row">

        <div class="label">
          الاسم والنسب
        </div>

        <div class="value">
          ${safeName}
        </div>

      </div>

      <div class="client-row">

        <div class="label">
          رقم الهاتف / WhatsApp
        </div>

        <div class="value" dir="ltr">
          ${safeWhatsapp}
        </div>

      </div>

      <div class="client-row">

        <div class="label">
          البريد الإلكتروني
        </div>

        <div class="value" dir="ltr">
          ${escapeHtml(email)}
        </div>

      </div>

    </div>

    <!-- 24 HOURS -->

    <div class="main-box">

      <h2>
        ⏱️ شنو غادي يوقع دابا؟
      </h2>

      <p class="text">

        فمدة أقصاها
        <span class="hours">
          24 ساعة ديال الخدمة
        </span>
        ، غادي نتاصلو بيك فالرقم اللي عطيتينا.

        غادي نراجعو معاك المعلومات ديالك ونبداو
        مسطرة التسجيل فـ
        <strong>
          مركز ديال اللغة الإنجليزية فمالطا
        </strong>.

      </p>

    </div>

    <!-- STEPS -->

    <div class="steps">

      <div class="step">

        <span class="step-number">1</span>

        غادي نراجعو المعلومات اللي عمرتي فالفورم.

      </div>

      <div class="step">

        <span class="step-number">2</span>

        غادي نتاصلو بيك فمدة أقصاها 24 ساعة ديال الخدمة.

      </div>

      <div class="step">

        <span class="step-number">3</span>

        غادي نبداو معاك إجراءات التوجيه والتسجيل
        فمركز ديال اللغة الإنجليزية فمالطا.

      </div>

      <div class="step">

        <span class="step-number">4</span>

        غادي نشرحو ليك فالمكالمة الوثائق والخطوات
        اللي خاصك تكمل من بعد.

      </div>

    </div>

    <!-- IMPORTANT -->

    <div class="note">

      <strong>
        ⚠️ مهم:
      </strong>

      الأداء كيتعلق بخدمة التوجيه والمساعدة فمسطرة
      التسجيل.

      القبول النهائي كيبقى تابع للمركز التعليمي
      والشروط المطلوبة من طرف المؤسسة التعليمية.

    </div>

    <p
      class="text"
      style="margin-top:30px;text-align:center;"
    >

      🇲🇦 🇲🇹

      شكراً على الثقة ديالك فـ
      <strong>GestoriaCitaIA</strong>.

      <br><br>

      حنا معاك خطوة بخطوة.

    </p>

  </div>

  <!-- FOOTER -->

  <div class="footer">

    <strong>GestoriaCitaIA</strong>

    <br>

    Estudios en Malta 2027

    <br>

    gestoriacitaia@gmail.com

  </div>

</div>

</div>

</body>
</html>
`;

  // ============================================
  // ENVIAR
  // ============================================

  await transporter.verify();

  console.log("✅ Gmail SMTP OK");

  const info = await transporter.sendMail({
    from: `"GestoriaCitaIA" <${process.env.GMAIL_USER}>`,
    to: email,

    subject:
      `🇲🇹 تأكيد طلب الدراسة فمالطا 2027 · ${name}`,

    html,

    attachments:
      attachments.length > 0
        ? attachments
        : undefined,
  });

  console.log("=========================================");
  console.log("✅ EMAIL ESTUDIOS MALTA ENVIADO");
  console.log("Message ID:", info.messageId);
  console.log("Cliente:", name);
  console.log("Destino:", email);
  console.log("PDF:", attachments.length > 0 ? "ADJUNTADO" : "NO");
  console.log("=========================================");

  return info;
}
