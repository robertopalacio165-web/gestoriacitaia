import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Obtener el body
    const body = req.body;

    console.log("========== DEV CREATE APPLICATION ==========");
    console.log("📦 Body recibido:", JSON.stringify(body, null, 2));
    console.log("============================================");

    // ✅ Desestructurar todos los campos - ACTUALIZADO
    const {
      plan,
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
      photoUrl,
      pdfUrl,
    } = body;

    // ✅ Insertar directamente en Supabase (modo desarrollo) - ACTUALIZADO
    const { data, error } = await supabase
      .from("malta_applications")
      .insert({
        full_name: fullName || "",
        whatsapp: whatsapp || "",
        email: email || "",
        nacionalidad: nationality || "",
        nationality: nationality || "",
        current_city: currentCity || "",
        fecha_nacimiento: fechaNacimiento || null,
        idiomas: idiomas || "",
        ingles_nivel: ingles_nivel || "",
        frances_nivel: frances_nivel || "",
        italiano_nivel: italiano_nivel || "",
        espanol_nivel: espanol_nivel || "",
        arabe_nivel: arabe_nivel || "",
        aleman_nivel: aleman_nivel || "",
        // Nuevos campos
        trabajo_busca: trabajo_busca || "",
        experiencia_previa: experiencia_previa || "",
        // Compatibilidad con columnas antiguas
        profesion: trabajo_busca || "",
        sectores: experiencia_previa || "",
        anos_experiencia: anos_experiencia || "",
        education_level: education_level || "",
        estudios: education_level || "",
        carnet_conducir: carnetConducir || "",
        photo_url: photoUrl || "",
        pdf_url: pdfUrl || "",
        plan: plan || "monthly",
        paid: true,
        worker_status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error insertando en Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Aplicación creada en modo DEV: ${data.id}`);

    // ✅ Generar CV y carta inmediatamente (modo administrador)
    let cvUrl = "";
    let letterUrl = "";
    
    try {
      console.log(`📄 Generando documentos para ${data.id}`);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/generate-malta-documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId: data.id,
          }),
        }
      );

      // ✅ Mejor control de errores
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error generate-malta-documents:", errorText);
      } else {
        const result = await response.json();
        console.log("✅ Documentos generados:", result);
        
        // Guardar URLs para el email
        cvUrl = result.cvUrl || "";
        letterUrl = result.letterUrl || "";
      }
    } catch (err) {
      console.error("❌ Error generando documentos:", err);
    }

    // ============================================
    // ✅ ENVIAR EMAIL DE BIENVENIDA CON BREVO
    // ============================================
    try {
      // ✅ Validar que hay email
      if (!email) {
        throw new Error("No email provided");
      }

      // ✅ Convertir plan a nombre amigable
      const planName =
        plan === "weekly"
          ? "Weekly Plan (7 days)"
          : "Monthly Plan (30 days)";

      // ✅ Preparar adjuntos para Brevo
      const attachments = [];
      
      if (cvUrl) {
        attachments.push({
          name: "CV-Malta.pdf",
          url: cvUrl
        });
      }
      
      if (letterUrl) {
        attachments.push({
          name: "Cover-Letter-Malta.pdf",
          url: letterUrl
        });
      }

      // ✅ Enviar con Brevo
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: {
            name: "GestoriaCitaIA",
            email: process.env.BREVO_EMAIL
          },
          to: [
            {
              email: email,
              name: fullName
            }
          ],
          subject: `🇲🇹 Welcome ${fullName}! Your Malta Job Journey Starts Today`,
          htmlContent: `
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
🇲🇦 🇲🇹 السلام عليكم ${fullName}
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

✅ غادي نرسلو الترشيح ديالك حتى لـ <b>10 شركات كل نهار</b> حسب الباقة ديالك.

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
🇬🇧 🇲🇹 Hello ${fullName},
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

✅ We submit your application to <b>up to 10 companies every day</b> depending on your plan.

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

<a href="https://gestoriacitaia.com"
style="background:#0B57D0;color:white;text-decoration:none;padding:18px 36px;border-radius:8px;font-size:18px;font-weight:bold;display:inline-block;">

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
          attachment: attachments
        },
        {
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json"
          }
        }
      );

      console.log("✅ Email de bienvenida enviado con Brevo");

    } catch (err) {
      console.error("❌ Error enviando email con Brevo:", err);
    }

    // ✅ Añadir a la cola de trabajo
    const { error: queueError } = await supabase
      .from("worker_queue")
      .insert({
        application_id: data.id,
        status: "pending",
        priority: 1,
        created_at: new Date().toISOString(),
      });

    if (queueError) {
      console.error("❌ Error añadiendo a worker_queue:", queueError);
    } else {
      console.log(`✅ Añadido a la cola de trabajo: ${data.id}`);
    }

    // ✅ Responder con éxito
    return res.status(200).json({
      success: true,
      applicationId: data.id,
      message: "Application created in dev mode",
      url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?success=true&dev=true`,
    });

  } catch (error: any) {
    console.error("❌ Error en dev-create-application:", error);
    return res.status(500).json({ error: error.message });
  }
}
