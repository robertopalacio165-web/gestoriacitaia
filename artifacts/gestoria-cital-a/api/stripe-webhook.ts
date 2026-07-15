import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET no configurado");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const rawBody = await getRawBody(req);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    console.log("✅ Checkout completado:", session.id);
    console.log("📦 Metadata recibida:", metadata);

    const fullName = metadata.fullName || "";
    const whatsapp = metadata.whatsapp || "";
    const email = metadata.email || "";
    const nacionalidad = metadata.nacionalidad || "";
    const paisResidencia = metadata.paisResidencia || "";
    const fechaNacimiento = metadata.fechaNacimiento || "";
    
    const idiomas = metadata.idiomas || "";
    const ingles_nivel = metadata.ingles_nivel || "";
    const frances_nivel = metadata.frances_nivel || "";
    const italiano_nivel = metadata.italiano_nivel || "";
    const espanol_nivel = metadata.espanol_nivel || "";
    const arabe_nivel = metadata.arabe_nivel || "";
    const aleman_nivel = metadata.aleman_nivel || "";
    
    const profesion = metadata.profesion || "";
    const añosExperiencia = metadata.añosExperiencia || "";
    const estudios = metadata.estudios || "";
    const sectores = metadata.sectores || "";
    
    const carnetConducir = metadata.carnetConducir || "";
    const tieneCV = metadata.tieneCV || "";
    
    const cvUrl = metadata.cvUrl || "";
    const photoUrl = metadata.photoUrl || "";
    
    const pasaporteValido = metadata.pasaporteValido || "";
    const entrevistaVideo = metadata.entrevistaVideo || "";
    const disponibilidadInicio = metadata.disponibilidadInicio || "";
    const plan = metadata.plan || "monthly";

    // ✅ INSERT CORREGIDO - SIN plan_start_date y plan_end_date
    const { data, error } = await supabase
      .from("malta_applications")
      .insert({
        full_name: fullName,
        whatsapp: whatsapp,
        email: email,
        nacionalidad: nacionalidad,
        pais_residencia: paisResidencia,
        fecha_nacimiento: fechaNacimiento || null,
        idiomas: idiomas,
        ingles_nivel: ingles_nivel,
        frances_nivel: frances_nivel,
        italiano_nivel: italiano_nivel,
        espanol_nivel: espanol_nivel,
        arabe_nivel: arabe_nivel,
        aleman_nivel: aleman_nivel,
        profesion: profesion,
        anos_experiencia: añosExperiencia,
        estudios: estudios,
        sectores: sectores,
        carnet_conducir: carnetConducir,
        tiene_cv: tieneCV,
        cv_url: cvUrl,
        photo_url: photoUrl,
        pasaporte_valido: pasaporteValido,
        entrevista_video: entrevistaVideo,
        disponibilidad_inicio: disponibilidadInicio,
        plan: plan,
        stripe_session_id: session.id,
        worker_status: "waiting",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error insertando en Supabase:", error);
      return res.status(500).json({ error: "Error saving to database" });
    }

    console.log("✅ Registro creado en Supabase:", data.id);

    try {
      const webhookUrl = process.env.MAKE_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "new_application",
            applicationId: data.id,
            fullName: fullName,
            whatsapp: whatsapp,
            email: email,
            plan: plan,
          }),
        });
        console.log("✅ Notificación enviada a Make");
      }
    } catch (webhookError) {
      console.error("⚠️ Error enviando a Make:", webhookError);
    }
  }

  return res.status(200).json({ received: true });
}

async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}
