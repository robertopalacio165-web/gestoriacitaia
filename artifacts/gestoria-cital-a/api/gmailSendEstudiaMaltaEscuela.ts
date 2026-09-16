import nodemailer from "nodemailer";

type WelcomeEmailData = {
  email: string;
  name: string;
  whatsapp?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  pdfUrl?: string;
};

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value: unknown = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanFileName(value: unknown) {
  return String(value || "Cliente")
    .trim()
    .replace(/[^a-zA-Z0-9À-ÿ _-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Cliente";
}

// ============================================================
// HTML EMAIL CLIENTE
// ============================================================

function buildWelcomeHtml(
  data: WelcomeEmailData
) {
  const name = escapeHtml(data.name);

  const logoUrl =
    process.env.GESTORIA_LOGO_URL ||
    `${
      process.env.NEXT_PUBLIC_URL ||
      "https://gestoriacitaia.com"
    }/images/gestoriacitaia-logo.png`;

  return `
<!doctype html>
<html lang="es">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>
GestoriaCitaIA - Estudios Malta 2027
</title>

</head>

<body style="
margin:0;
padding:24px;
background:#eef2f7;
font-family:Arial,Helvetica,sans-serif;
color:#172033;
">

<table width="100%" cellpadding="0" cellspacing="0">

<tr>

<td align="center">

<table
width="700"
cellpadding="0"
cellspacing="0"
style="
max-width:700px;
width:100%;
background:#ffffff;
border-radius:16px;
overflow:hidden;
"
>

<!-- HEADER -->

<tr>

<td style="
background:#07111f;
padding:30px;
text-align:center;
border-bottom:4px solid #20d46b;
">

<img
src="${escapeHtml(logoUrl)}"
alt="GestoriaCitaIA"
style="
width:250px;
max-width:90%;
height:auto;
"
>

<h1 style="
color:#ffffff;
font-size:23px;
margin:18px 0 8px;
">

🇲🇹 Estudios en Malta 2027

</h1>

<p style="
color:#c4ccd8;
font-size:14px;
margin:0;
">

Confirmación de tu solicitud

</p>

</td>

</tr>

<!-- CONTENT -->

<tr>

<td style="padding:30px;">

<h2 style="
font-size:20px;
margin:0 0 18px;
">

Hola ${name},

</h2>

<p style="
font-size:15px;
line-height:1.6;
color:#344054;
">

Hemos recibido correctamente tu solicitud
para estudiar en Malta 2027.

</p>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
margin-top:20px;
border-collapse:collapse;
"
>

<tr>

<td style="
padding:10px;
border-bottom:1px solid #e5e7eb;
font-weight:700;
width:35%;
">

Nombre

</td>

<td style="
padding:10px;
border-bottom:1px solid #e5e7eb;
">

${name}

</td>

</tr>

<tr>

<td style="
padding:10px;
border-bottom:1px solid #e5e7eb;
font-weight:700;
">

Email

</td>

<td style="
padding:10px;
border-bottom:1px solid #e5e7eb;
">

${escapeHtml(data.email)}

</td>

</tr>

<tr>

<td style="
padding:10px;
border-bottom:1px solid #e5e7eb;
font-weight:700;
">

WhatsApp

</td>

<td style="
padding:10px;
border-bottom:1px solid #e5e7eb;
">

${escapeHtml(data.whatsapp || "—")}

</td>

</tr>

</table>

<p style="
margin-top:24px;
font-size:14px;
line-height:1.6;
color:#475467;
">

Tu formulario original se encuentra adjunto
a este correo.

</p>

</td>

</tr>

<!-- FOOTER -->

<tr>

<td style="
background:#07111f;
padding:16px;
text-align:center;
color:#aeb9c8;
font-size:11px;
">

<strong style="color:#ffffff;">

GestoriaCitaIA

</strong>

<br>

Estudios en Malta 2027 🇲🇹

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`;
}

// ============================================================
// EMAIL CLIENTE
// ============================================================

export async function sendWelcomeEmail(
  data: WelcomeEmailData
) {
  const email = String(
    data.email || ""
  )
    .trim()
    .toLowerCase();

  const name = String(
    data.name || "Cliente"
  ).trim();

  if (!email) {
    throw new Error(
      "No existe email del cliente."
    );
  }

  if (!process.env.GMAIL_USER) {
    throw new Error(
      "GMAIL_USER no está configurado."
    );
  }

  if (!process.env.GMAIL_PASS) {
    throw new Error(
      "GMAIL_PASS no está configurado."
    );
  }

  console.log(
    "========================================="
  );

  console.log(
    "📧 GMAIL CLIENTE — ESTUDIOS MALTA 2027"
  );

  console.log(
    "Cliente:",
    name
  );

  console.log(
    "Destino:",
    email
  );

  // ==========================================================
  // GMAIL SMTP
  // ==========================================================

  const transporter =
    nodemailer.createTransport({
      host: "smtp.gmail.com",

      port: 587,

      secure: false,

      requireTLS: true,

      auth: {
        user:
          process.env.GMAIL_USER,

        pass:
          process.env.GMAIL_PASS,
      },

      connectionTimeout: 15000,

      greetingTimeout: 15000,

      socketTimeout: 20000,
    });

  await transporter.verify();

  // ==========================================================
  // PDF ORIGINAL
  // ==========================================================

  const attachments: any[] = [];

  if (data.pdfUrl) {

    console.log(
      "📎 Descargando PDF original..."
    );

    const response =
      await fetch(data.pdfUrl);

    if (!response.ok) {
      throw new Error(
        `No se pudo descargar el PDF: HTTP ${response.status}`
      );
    }

    const pdfArrayBuffer =
      await response.arrayBuffer();

    const pdfBuffer =
      Buffer.from(pdfArrayBuffer);

    attachments.push({

      filename:
        `GestoriaCitaIA-Estudios-Malta-2027-${cleanFileName(
          name
        )}.pdf`,

      content:
        pdfBuffer,

      contentType:
        "application/pdf",

      contentDisposition:
        "attachment",

    });

    console.log(
      "✅ PDF original preparado"
    );
  }

  // ==========================================================
  // ENVIAR EMAIL
  // ==========================================================

  const info =
    await transporter.sendMail({

      from:
        `"GestoriaCitaIA" <${process.env.GMAIL_USER}>`,

      to:
        email,

      subject:
        `🇲🇹 Confirmación solicitud Estudios Malta 2027 · ${name}`,

      html:
        buildWelcomeHtml(data),

      attachments,

    });

  console.log(
    "✅ EMAIL CLIENTE ENVIADO"
  );

  console.log(
    "Message ID:",
    info.messageId
  );

  console.log(
    "📧 Destino:",
    email
  );

  console.log(
    "📎 PDF:",
    attachments.length > 0
      ? "ADJUNTADO"
      : "NO DISPONIBLE"
  );

  console.log(
    "========================================="
  );

  return {

    messageId:
      info.messageId,

    email,

    pdfAttached:
      attachments.length > 0,

  };
}
