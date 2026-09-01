import type { VercelRequest, VercelResponse } from "@vercel/node";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(value: string = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    // ============================================
    // BREVO
    // ============================================

    const brevoApiKey = process.env.BREVO_API_KEY;

    if (!brevoApiKey) {
      console.error("❌ Falta BREVO_API_KEY");

      return res.status(500).json({
        error: "Brevo API key not configured",
      });
    }

    // ============================================
    // DATOS DEL FORMULARIO
    // ============================================

    const {
      fullName,
      whatsapp,
      email,

      nationality,
      currentCity,

      fechaNacimiento,

      idiomas,
      ingles_nivel,
      frances_nivel,
      italiano_nivel,
      espanol_nivel,
      arabe_nivel,
      aleman_nivel,

      trabajo_busca,
      experiencia_previa,
      anos_experiencia,
      education_level,

      carnetConducir,

      pdfUrl,
    } = req.body || {};

    // ============================================
    // COMPROBACIONES
    // ============================================

    if (!fullName) {
      return res.status(400).json({
        error: "Falta el nombre del cliente",
      });
    }

    if (!email) {
      return res.status(400).json({
        error: "Falta el email del cliente",
      });
    }

    // ============================================
    // SOLO CUENTA DE PRUEBA
    // ============================================

    const normalizedEmail =
      String(email).trim().toLowerCase();

    if (
      normalizedEmail !==
      "robertopalacio165@gmail.com"
    ) {
      return res.status(403).json({
        error:
          "Esta API solamente está disponible para la cuenta de prueba autorizada.",
      });
    }

    console.log(
      "=========================================="
    );

    console.log(
      "🇲🇹 ESTUDIAR MALTA 2027 - PRUEBA"
    );

    console.log(
      "Cliente:",
      fullName
    );

    console.log(
      "Email:",
      normalizedEmail
    );

    console.log(
      "WhatsApp:",
      whatsapp
    );

    console.log(
      "PDF:",
      pdfUrl
    );

    console.log(
      "=========================================="
    );

    // ============================================
    // DATOS SEGUROS PARA HTML
    // ============================================

    const safeName =
      escapeHtml(String(fullName));

    const safeWhatsapp =
      escapeHtml(String(whatsapp || ""));

    const safeEmail =
      escapeHtml(normalizedEmail);

    const safeNationality =
      escapeHtml(String(nationality || ""));

    const safeCity =
      escapeHtml(String(currentCity || ""));

    // ============================================
    // PDF
    // ============================================

    const attachments: any[] = [];

    if (pdfUrl) {
      try {
        console.log(
          "📄 Descargando PDF..."
        );

        const pdfResponse =
          await fetch(String(pdfUrl));

        if (!pdfResponse.ok) {
          throw new Error(
            `HTTP ${pdfResponse.status}`
          );
        }

        const pdfBuffer =
          Buffer.from(
            await pdfResponse.arrayBuffer()
          );

        attachments.push({
          name:
            `GestoriaCitaIA-Estudiar-Malta-2027-${String(
              fullName
            )
              .trim()
              .replace(/\s+/g, "-")}.pdf`,

          content:
            pdfBuffer.toString("base64"),
        });

        console.log(
          "✅ PDF preparado"
        );

      } catch (pdfError) {

        console.error(
          "❌ Error descargando PDF:",
          pdfError
        );

        return res.status(500).json({
          error:
            "No se pudo preparar el PDF",
        });
      }
    }

    // ============================================
    // EMAIL HTML
    // ============================================

    const htmlContent = `
<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>
GestoriaCitaIA - Estudiar Malta 2027
</title>

</head>

<body
style="
margin:0;
padding:0;
background:#eef2f7;
font-family:Arial,Helvetica,sans-serif;
color:#172033;
"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#eef2f7;
padding:30px 0;
"
>

<tr>

<td align="center">

<table
width="680"
cellpadding="0"
cellspacing="0"
style="
width:100%;
max-width:680px;
background:#ffffff;
border-radius:18px;
overflow:hidden;
"
>

<!-- HEADER -->

<tr>

<td
style="
background:#07111f;
padding:35px 25px;
text-align:center;
border-bottom:4px solid #20d46b;
"
>

<img
src="https://gestoriacitaia.com/images/gestoriacitaia-logo.png"
alt="GestoriaCitaIA"
style="
width:300px;
max-width:90%;
height:auto;
display:block;
margin:0 auto 20px auto;
"
/>

<h1
style="
margin:0;
color:#ffffff;
font-size:25px;
"
>

طلب الدراسة فمالطا 2027 🇲🇹

</h1>

<p
style="
color:#c4ccd8;
font-size:14px;
margin-top:10px;
"
>

تأكيد الطلب وبداية مسطرة التسجيل

</p>

</td>

</tr>


<!-- CONTENT -->

<tr>

<td
style="
padding:38px 42px;
"
>

<div
style="
background:#eaf8ef;
border:1px solid #b9ebcc;
color:#07853f;
padding:12px 18px;
border-radius:30px;
text-align:center;
font-weight:bold;
"
>

✓ توصلنا بالطلب ديالك بنجاح

</div>


<h2
style="
font-size:22px;
margin-top:28px;
"
>

السلام عليكم ${safeName}،

</h2>


<p
style="
font-size:16px;
line-height:1.9;
"
>

كنأكدّو ليك باللي توصلنا بالطلب ديالك
وبالأداء ديالك ديال خدمة
<strong>
الدراسة فمالطا 2027 🇲🇹
</strong>.

</p>


<!-- CLIENT -->

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #dfe6ef;
border-radius:14px;
margin:25px 0;
"
>

<tr>

<td
style="
padding:17px 20px;
border-bottom:1px solid #e8edf3;
"
>

<div
style="
font-size:12px;
color:#667085;
margin-bottom:5px;
"
>
الاسم والنسب
</div>

<strong
style="font-size:17px;"
>
${safeName}
</strong>

</td>

</tr>


<tr>

<td
style="
padding:17px 20px;
border-bottom:1px solid #e8edf3;
"
>

<div
style="
font-size:12px;
color:#667085;
margin-bottom:5px;
"
>
رقم الهاتف / WhatsApp
</div>

<strong
dir="ltr"
style="font-size:17px;"
>
${safeWhatsapp}
</strong>

</td>

</tr>


<tr>

<td
style="padding:17px 20px;"
>

<div
style="
font-size:12px;
color:#667085;
margin-bottom:5px;
"
>
البريد الإلكتروني
</div>

<strong
dir="ltr"
style="font-size:17px;"
>
${safeEmail}
</strong>

</td>

</tr>

</table>


<!-- 24 HOURS -->

<div
style="
background:#f1f7ff;
border-right:5px solid #0b57d0;
padding:22px;
border-radius:12px;
margin:25px 0;
"
>

<h2
style="
margin:0 0 12px;
color:#0b57d0;
font-size:19px;
"
>

⏱️ شنو غادي يوقع دابا؟

</h2>


<p
style="
font-size:16px;
line-height:1.9;
"
>

فمدة أقصاها
<strong style="color:#07853f;">
24 ساعة ديال الخدمة
</strong>
غادي نتاصلو بيك فـ رقم الهاتف اللي عطيتينا.

<br><br>

غادي نراجعو معاك المعلومات ديالك
ونبداو إجراءات التسجيل فـ
<strong>
مركز ديال اللغة الإنجليزية فمالطا 🇲🇹
</strong>.

</p>

</div>


<!-- STEPS -->

<h3
style="
font-size:19px;
margin-top:30px;
"
>

المراحل ديال المسطرة

</h3>


<p
style="
font-size:15px;
line-height:1.9;
"
>

🟢 <strong>المرحلة 1:</strong>
غادي نراجعو المعلومات اللي عمرتي فالفورم.

<br><br>

🟢 <strong>المرحلة 2:</strong>
غادي نتاصلو بيك فمدة أقصاها
24 ساعة ديال الخدمة.

<br><br>

🟢 <strong>المرحلة 3:</strong>
غادي نبداو معاك إجراءات التسجيل
فمركز ديال اللغة الإنجليزية فمالطا.

<br><br>

🟢 <strong>المرحلة 4:</strong>
غادي نشرحو ليك فالمكالمة الوثائق
والخطوات اللي خاصك تكمل من بعد.

</p>


<!-- PDF -->

<div
style="
background:#fff8e8;
border:1px solid #f2d48b;
border-radius:10px;
padding:17px;
margin-top:28px;
font-size:14px;
line-height:1.8;
"
>

📄
<strong>
الوثيقة ديالك مرفقة مع هاد الإيميل.
</strong>

<br>

غادي تلقى فيها المعلومات الأساسية
والخطوات الأولى ديال المسطرة.

</div>


<p
style="
font-size:17px;
line-height:1.9;
text-align:center;
margin-top:35px;
"
>

🇲🇦 🇲🇹

<br><br>

شكراً بزاف على الثقة ديالك فـ
<strong>
GestoriaCitaIA
</strong>.

<br><br>

حنا معاك خطوة بخطوة.

</p>

</td>

</tr>


<!-- FOOTER -->

<tr>

<td
style="
background:#07111f;
padding:22px;
text-align:center;
color:#aeb9c8;
font-size:12px;
"
>

<strong
style="color:#ffffff;"
>
GestoriaCitaIA
</strong>

<br>

Estudiar en Malta 2027

<br>

gestoriacitaia@gmail.com

</td>

</tr>


</table>

</td>

</tr>

</table>

</body>

</html>
`;

    // ============================================
    // BREVO
    // ============================================

    const brevoBody: any = {
      sender: {
        email:
          process.env.BREVO_SENDER_EMAIL ||
          "gestoriacitaia@gmail.com",

        name:
          "GestoriaCitaIA · Estudios Malta 2027",
      },

      to: [
        {
          email: normalizedEmail,
          name: String(fullName),
        },
      ],

      subject:
        `🇲🇹 Confirmación solicitud Estudios Malta 2027 - ${String(
          fullName
        )}`,

      htmlContent,

      tags: [
        "estudiar-malta-2027",
        "test",
      ],
    };

    if (attachments.length > 0) {
      brevoBody.attachment =
        attachments;
    }

    console.log(
      "📧 Enviando email mediante Brevo..."
    );

    const brevoResponse =
      await fetch(BREVO_API_URL, {
        method: "POST",

        headers: {
          "accept":
            "application/json",

          "api-key":
            brevoApiKey,

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify(
            brevoBody
          ),
      });

    const brevoData =
      await brevoResponse.json();

    if (!brevoResponse.ok) {

      console.error(
        "❌ ERROR BREVO:",
        brevoData
      );

      return res.status(
        brevoResponse.status
      ).json({
        error:
          "Brevo no pudo enviar el email",
        details:
          brevoData,
      });
    }

    console.log(
      "=========================================="
    );

    console.log(
      "✅ EMAIL ESTUDIOS MALTA ENVIADO"
    );

    console.log(
      "📧 Destino:",
      normalizedEmail
    );

    console.log(
      "📄 PDF:",
      attachments.length > 0
        ? "ADJUNTADO"
        : "NO"
    );

    console.log(
      "Message ID:",
      brevoData.messageId
    );

    console.log(
      "=========================================="
    );

    return res.status(200).json({
      success: true,

      service:
        "study_malta_2027",

      email:
        normalizedEmail,

      name:
        fullName,

      pdfAttached:
        attachments.length > 0,

      messageId:
        brevoData.messageId ||
        null,
    });

  } catch (error: any) {

    console.error(
      "❌ ERROR TEST ESTUDIA MALTA:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Error enviando email",
    });
  }
}
