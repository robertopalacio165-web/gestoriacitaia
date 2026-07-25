import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,

  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

interface WelcomeEmail {
  email: string;
  name: string;
  plan: string;
}

export async function sendWelcomeEmail({
  email,
  name,
  plan,
}: WelcomeEmail) {

  await transporter.verify();

  await transporter.sendMail({
    from: `"GestoriaCitaIA Malta Jobs" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "✅ Welcome to Malta Jobs",

    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;margin:30px 0;overflow:hidden;">

<tr>
<td style="background:#0B57D0;padding:35px;text-align:center;">

<h1 style="margin:0;color:white;">
🇲🇹 Malta Jobs
</h1>

<p style="color:white;font-size:18px;">
GestoriaCitaIA Recruitment Platform
</p>

</td>
</tr>

<tr>
<td style="padding:40px;">

<h2>Hello ${name},</h2>

<p>
Thank you for purchasing our Malta Jobs service.
</p>

<p>
Your payment has been received successfully.
</p>

<p>
Your application has entered our recruitment system.
</p>

<h3>What happens next?</h3>

<ul>
<li>✅ We will generate your professional CV.</li>
<li>✅ We will generate your Cover Letter.</li>
<li>✅ We will prepare your profile.</li>
<li>✅ We will start applying to companies in Malta.</li>
</ul>

<p>
<strong>Selected plan:</strong> ${plan}
</p>

<p>
You will receive another email as soon as your documents are ready.
</p>

<div style="text-align:center;margin-top:35px;">

<a href="https://gestoriacitaia.com"
style="
background:#0B57D0;
color:white;
padding:15px 28px;
border-radius:8px;
text-decoration:none;
display:inline-block;
font-size:16px;
font-weight:bold;
">
Visit GestoriaCitaIA
</a>

</div>

<hr style="margin-top:40px;">

<p style="font-size:13px;color:#777;">
This email confirms that your Malta Jobs application has been successfully received.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
  });

  console.log("✅ Welcome email sent:", email);
}
