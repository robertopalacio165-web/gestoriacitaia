import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { saveMaltaApplication } from "../../lib/saveMaltaApplication";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});

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

    console.log("=========================================");
    console.log("✅ Checkout completado:", session.id);
    console.log("📦 METADATA COMPLETA RECIBIDA:");
    console.log(JSON.stringify(metadata, null, 2));
    console.log("=========================================");

    // ============================================
    // 1. DATOS PERSONALES
    // ============================================
    const fullName = metadata.fullName || "";
    const whatsapp = metadata.whatsapp || "";
    const email = metadata.email || "";
    const nationality = metadata.nationality || "";
    const currentCity = metadata.currentCity || "";
    const fechaNacimiento = metadata.fechaNacimiento || "";
    
    // ============================================
    // 2. IDIOMAS
    // ============================================
    const idiomas = metadata.idiomas || "";
    const ingles_nivel = metadata.ingles_nivel || "";
    const frances_nivel = metadata.frances_nivel || "";
    const italiano_nivel = metadata.italiano_nivel || "";
    const espanol_nivel = metadata.espanol_nivel || "";
    const arabe_nivel = metadata.arabe_nivel || "";
    const aleman_nivel = metadata.aleman_nivel || "";
    
    // ============================================
    // 3. EXPERIENCIA
    // ============================================
    const trabajo_busca = metadata.trabajo_busca || "";
    const experiencia_previa = metadata.experiencia_previa || "";
    const anos_experiencia = metadata.anos_experiencia || "";
    const education_level = metadata.education_level || "";
    
    // ============================================
    // 4. CARNET
    // ============================================
    const carnetConducir = metadata.carnetConducir || "";
    
    // ============================================
    // 5. DOCUMENTOS
    // ============================================
    const photoUrl = metadata.photoUrl || null;
    const pdfUrl = metadata.pdfUrl || null;
    
    // ============================================
    // 6. PLAN
    // ============================================
    const plan = (metadata.plan || "monthly") as "weekly" | "monthly";

    console.log("📋 DATOS PROCESADOS:");
    console.log("  - fullName:", fullName);
    console.log("  - email:", email);
    console.log("  - plan:", plan);
    console.log("  - trabajo_busca:", trabajo_busca);
    console.log("  - experiencia_previa:", experiencia_previa);

    // ============================================
    // ✅ 7. LLAMAR A LA FUNCIÓN COMPARTIDA
    // ============================================
    try {
      const result = await saveMaltaApplication({
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
        payment_method: "stripe",
        payment_id: session.id,
        payment_customer_id: session.customer as string || undefined,
        payment_intent: session.payment_intent as string || undefined,
      });

      console.log(`✅ Aplicación procesada: ${result.applicationId} (${result.isNew ? "nueva" : "actualizada"})`);

      return res.status(200).json({
        received: true,
        applicationId: result.applicationId,
        isNew: result.isNew,
        message: result.isNew ? "Application created and queued" : "Application updated",
      });

    } catch (error) {
      console.error("❌ Error saving application:", error);
      return res.status(500).json({ 
        error: "Failed to save application",
        details: error instanceof Error ? error.message : "Unknown error"
      });
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
