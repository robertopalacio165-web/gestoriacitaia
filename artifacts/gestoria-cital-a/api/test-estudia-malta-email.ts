
import nodemailer from "nodemailer";

const TEST_EMAIL = "robertopalacio165@gmail.com";

const SMTP_HOST = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.BREVO_SENDER_EMAIL || "gestoriacitaia@gmail.com";
const FROM_NAME = process.env.FROM_NAME || "GestoriaCitaIA · Estudios Malta 2027";

// PDF fijo de confirmación. Súbelo a public/images/ con este nombre.
// También puedes cambiarlo en Vercel con STUDY_MALTA_CONFIRMATION_PDF_URL.
const DEFAULT_PDF_URL =
  "https://gestoriacitaia.com/images/GestoriaCitaIA_Malta_Confirmation_FIXED.pdf";

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!SMTP_USER || !SMTP_PASS) {
      console.error("❌ Faltan SMTP_USER o SMTP_PASS en Vercel");
      return res.status(500).json({
        error: "Brevo SMTP no está configurado",
      });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const {
      fullName,
      dateOfBirth,
      placeOfBirth,
      nationality,
      passportNumber,
      passportExpiry,
      address,
      whatsapp,
      email,
      hasBac,
      bacYear,
      lastDiploma,
      otherDiplomas,
      otherDiplomasDetails,
      isWorking,
      company,
      jobTitle,
      isStudent,
      hasFinancialSponsor,
      sponsorName,
      sponsorRelation,
      sponsorProfession,
      sponsorIncome,
      sponsorCountry,
      previouslyAppliedVisa,
      previousVisaCountry,
      previousVisaType,
      previousVisaDate,
      visaRefused,
      refusalCountry,
      refusalDate,
      refusalReason,
      previouslyObtainedVisa,
      previousObtainedVisaDetails,
      pdfUrl,
    } = body;

    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!fullName) {
      return res.status(400).json({ error: "Falta el nombre del cliente" });
    }

    if (!normalizedEmail) {
      return res.status(400).json({ error: "Falta el email del cliente" });
    }

    // Esta ruta es SOLO para las pruebas del propietario.
    if (normalizedEmail !== TEST_EMAIL) {
      return res.status(403).json({
        error: "Esta API de prueba solamente está disponible para la cuenta autorizada.",
      });
    }

    const safeName = escapeHtml(fullName);
    const safeWhatsapp = escapeHtml(whatsapp || "");
    const safeEmail = escapeHtml(normalizedEmail);
    const safeDob = escapeHtml(dateOfBirth || "");
    const safeNationality = escapeHtml(nationality || "");
    const safePassport = escapeHtml(passportNumber || "");

    // ============================================================
    // PDF DE CONFIRMACIÓN
    // ============================================================
    const confirmationPdfUrl = String(
      pdfUrl || process.env.STUDY_MALTA_CONFIRMATION_PDF_URL || DEFAULT_PDF_URL
    ).trim();

    console.log("📄 Descargando PDF de confirmación:", confirmationPdfUrl);

    const pdfResponse = await fetch(confirmationPdfUrl);

    if (!pdfResponse.ok) {
      throw new Error(
        `No se pudo descargar el PDF de confirmación. HTTP ${pdfResponse.status}. URL: ${confirmationPdfUrl}`
      );
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    if (pdfBuffer.length < 1000) {
      throw new Error("El PDF descargado parece estar vacío o no es válido.");
    }

    const pdfFileName =
      `GestoriaCitaIA-Estudiar-Malta-2027-${cleanFileName(fullName)}.pdf`;

    // ============================================================
    // EMAIL HTML PROFESIONAL EN DARIJA
    // ============================================================
    const htmlContent = `
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
<img src="https://gestoriacitaia.com/images/gestoriacitaia-logo.png" alt="GestoriaCitaIA" style="width:300px;max-width:90%;height:auto;display:block;margin:0 auto 18px auto;" />
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

    // ============================================================
    // BREVO SMTP — NO API
    // ============================================================
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });

    console.log("📧 Enviando Estudios Malta mediante Brevo SMTP...");
    console.log("👤 Cliente:", fullName);
    console.log("📱 WhatsApp:", whatsapp || "");
    console.log("📨 Destino de prueba:", TEST_EMAIL);
    console.log("📄 PDF:", pdfFileName);

    const mailResult = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: TEST_EMAIL,
      subject: `🇲🇹 Confirmación Estudios Malta 2027 - ${String(fullName)}`,
      html: htmlContent,
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("✅ EMAIL ESTUDIOS MALTA ENVIADO POR BREVO SMTP");
    console.log("📨 Message ID:", mailResult.messageId);

    return res.status(200).json({
      success: true,
      service: "study_malta_2027",
      test: true,
      email: TEST_EMAIL,
      name: fullName,
      pdfAttached: true,
      pdfFileName,
      messageId: mailResult.messageId || null,
    });
  } catch (error: any) {
    console.error("❌ ERROR TEST ESTUDIA MALTA:", error);

    return res.status(500).json({
      error: error?.message || "Error enviando email de prueba",
    });
  }
}
