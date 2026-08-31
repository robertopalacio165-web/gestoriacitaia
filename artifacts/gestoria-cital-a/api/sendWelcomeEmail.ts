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
  cvUrl: string;
  letterUrl: string;
}) {

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const planName =
    plan === "weekly"
      ? "Weekly Plan (7 days)"
      : "Monthly Plan (30 days)";

  const attachments: any[] = [];

  if (cvUrl) {
    attachments.push({
      filename: "CV-Malta.pdf",
      content: Buffer.from(
        await (await fetch(cvUrl)).arrayBuffer()
      ),
    });
  }

  if (letterUrl) {
    attachments.push({
      filename: "Cover-Letter-Malta.pdf",
      content: Buffer.from(
        await (await fetch(letterUrl)).arrayBuffer()
      ),
    });
  }

  await transporter.sendMail({
    from: `"GestoriaCitaIA" <${process.env.FROM_EMAIL}>`,
    to: email,

    subject: `🇲🇹 Welcome ${name}! Your Malta Job Journey Starts Today`,

    attachments,

    html: `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;font-family:Arial,sans-serif;">

<tr>
<td align="center">

<table width="700" cellpadding="0" cellspacing="0" style="width:100%;max-width:700px;background:#ffffff;border-radius:12px;overflow:hidden;">

<tr>
<td style="background:#0B57D0;padding:35px;text-align:center;color:#fff;">

<h1 style="margin:0;">GestoriaCitaIA</h1>

<p style="margin-top:10px;font-size:18px;">
🇲🇹 Malta Jobs
</p>

</td>
</tr>

<tr>
<td style="padding:40px;">

<div dir="rtl" style="direction:rtl;text-align:right;">

<h2 style="margin-top:0;">
🇲🇦 🇲🇹 السلام عليكم ${name}
</h2>

<div style="background:#EAF3FF;border-right:5px solid #0B57D0;padding:18px;margin:25px 0;border-radius:8px;text-align:right;">

<b>⏳ شحال غادي ياخذ الوقت؟</b><br><br>

📄 تحضير CV و Cover Letter خلال 24 ساعة.<br>
📤 من بعد غادي نبداو نرسلو الترشيحات كل نهار.<br>
📩 إلى جاك أي استدعاء أو مقابلة غادي نخبرك مباشرة.

</div>

<p style="font-size:18px;line-height:32px;">
شكراً بزاف على الثقة ديالك فـ
<b>GestoriaCitaIA</b>.
</p>

<p style="font-size:18px;line-height:32px;">
🌟 حلمك تخدم فمالطا غادي يتحقق معانا إن شاء الله.
</p>

<p style="font-size:18px;line-height:32px;">
من اليوم فريقنا غادي يبدا يخدم على الملف ديالك ويرسل الترشيحات يومياً حتى تلقى أفضل فرصة عمل.
</p>

<p style="font-size:18px;">
<b>الباقة ديالك:</b> ${planName}
</p>

<p style="line-height:34px;font-size:18px;">

✅ غادي نحضرو ليك CV احترافي باللغة الإنجليزية.

<br><br>

✅ غادي نحضرو ليك Cover Letter احترافية.

<br><br>

✅ غادي نرسلو ليك بين <b>50 و80 عرض عمل جديد</b> خلال هاد الشهر، ومع كل عرض غادي نعطيوك <b>رقم الهاتف ديال الشركة</b>.

<br><br>

✅ وإنت مرتاح، فريقنا هو اللي غادي يخدم عليك كل يوم.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
استمتع بوقتك وخلي الخدمة علينا ✈️
</p>

<p style="font-size:18px;">
أول ما توصلنا أي مقابلة أو عرض عمل غادي نخبرك مباشرة.
</p>

</div>

<hr style="margin:45px 0;">

<div style="text-align:left;">

<h2>
🇬🇧 🇲🇹 Hello ${name},
</h2>

<div style="background:#EAF3FF;border-left:5px solid #0B57D0;padding:18px;margin:25px 0;border-radius:8px;">

<b>⏳ Estimated processing time</b><br><br>

📄 CV & Cover Letter: within 24 hours.<br>
📤 Daily applications: immediately after your documents are ready.<br>
📩 Interview invitations: we will notify you immediately.

</div>

<p style="font-size:18px;line-height:30px;">
Thank you for choosing
<b>GestoriaCitaIA</b>.
</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
🌟 Your dream to work in Malta starts today.
</p>

<p style="font-size:18px;line-height:30px;">
From today our recruitment team starts working on your profile and will submit your application every day until you receive the best job opportunity in Malta.
</p>

<p style="font-size:18px;">
<b>Your plan:</b> ${planName}
</p>

<p style="font-size:18px;line-height:34px;">

✅ Professional CV in English

<br><br>

✅ Professional Cover Letter

<br><br>

✅ We will send you between <b>50 and 80 new job offers</b> during this month, with the <b>company phone number</b> for each offer.

<br><br>

✅ While you enjoy your holidays, our team works every day to find the best employer for you.

</p>

<p style="font-size:20px;color:#0B57D0;font-weight:bold;">
Relax while our team works for you every single day. 🌴
</p>

<p style="font-size:18px;">
As soon as an employer contacts us or invites you for an interview, we will notify you immediately.
</p>

<div style="text-align:center;margin-top:45px;">

<a
href="https://gestoriacitaia.com"
style="
background:#0B57D0;
color:white;
text-decoration:none;
padding:18px 36px;
border-radius:8px;
font-size:18px;
font-weight:bold;
display:inline-block;
"
>
Visit GestoriaCitaIA
</a>

</div>

</div>

</td>
</tr>

<tr>
<td style="background:#f5f5f5;padding:20px;text-align:center;color:#666;">

<p style="font-size:14px;color:#777;line-height:24px;text-align:center;">

Questions?<br>

📧 gestoriacitaia@gmail.com

</p>

© 2026 GestoriaCitaIA · Malta Recruitment

</td>
</tr>

</table>

</td>
</tr>

</table>
`,
  });

  console.log(
    `✅ Email de bienvenida enviado a ${email} con CV y Cover Letter adjuntos`
  );
}
