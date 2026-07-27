import nodemailer from "nodemailer";

export async function sendWelcomeEmail({
  email,
  name,
  plan,
  cvUrl,
  letterUrl,
}: {
  email: string;
  name: string;
  plan: string;
  cvUrl?: string;
  letterUrl?: string;
})
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"GestoriaCitaIA" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "✅ Welcome to Malta Jobs",
attachments: [
  ...(cvUrl
    ? [
        {
          filename: "CV-Malta.pdf",
          path: cvUrl,
        },
      ]
    : []),

  ...(letterUrl
    ? [
        {
          filename: "Cover-Letter-Malta.pdf",
          path: letterUrl,
        },
      ]
    : []),
],
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">

<tr>
<td align="center">

<table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08);">

<tr>
<td align="center" style="background:#0B57D0;padding:40px;">

<h1 style="margin:0;color:#fff;font-size:34px;">
GestoriaCitaIA
</h1>

<p style="margin-top:10px;color:#ffffff;font-size:18px;">
Malta Jobs
</p>

</td>
</tr>

<tr>

<td style="padding:45px;">

<h2 style="margin-top:0;">
🇲🇦 السلام عليكم ${name}
</h2>

<p style="font-size:16px;line-height:28px;">

شكراً بزاف على الثقة ديالك فـ <b>GestoriaCitaIA</b>.

</p>

<p style="font-size:16px;line-height:28px;">

توصلنا بالأداء ديالك بنجاح، ودابا الملف ديالك دخل لمرحلة التحضير.

</p>

<h3>
شنو غادي يوقع دابا؟
</h3>

<p style="line-height:30px;">

✅ غادي نوجدولك CV احترافي باللغة الإنجليزية.<br>
✅ غادي نحضرو ليك Cover Letter احترافية.<br>
✅ غادي نراجعو المعلومات ديالك كاملة.<br>
✅ من بعد غادي نبداو نرسلو الترشيحات ديالك للشركات المناسبة فمالطا.

</p>

<p>

<b>الباقة ديالك:</b> ${plan}

</p>

<hr style="margin:35px 0;">

<h2>
🇬🇧 Hello ${name},
</h2>

<p style="font-size:16px;line-height:28px;">

Thank you for choosing <b>GestoriaCitaIA</b>.

</p>

<p style="font-size:16px;line-height:28px;">

Your payment has been successfully received and your application is now being prepared.

</p>

<h3>
What happens next?
</h3>

<p style="line-height:30px;">

✅ Your professional CV will be prepared.<br>
✅ Your Cover Letter will be prepared.<br>
✅ Your profile will be reviewed.<br>
✅ Your application will then be submitted to suitable employers across Malta.

</p>

<p>

<b>Your plan:</b> ${plan}

</p>

<div style="text-align:center;margin:45px 0;">

<a
href="https://gestoriacitaia.com"
style="
background:#0B57D0;
color:white;
text-decoration:none;
padding:16px 34px;
border-radius:8px;
font-size:18px;
font-weight:bold;
display:inline-block;
">
Visit GestoriaCitaIA
</a>

</div>

<p style="font-size:15px;color:#555;line-height:28px;">

You will receive another email as soon as your documents are ready and the application process begins.

</p>

<p style="margin-top:40px;">

<b>GestoriaCitaIA Recruitment Team</b>

</p>

</td>

</tr>

<tr>

<td style="background:#f5f5f5;padding:25px;text-align:center;font-size:13px;color:#777;">

© ${new Date().getFullYear()} GestoriaCitaIA

<br><br>

https://gestoriacitaia.com

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
}
