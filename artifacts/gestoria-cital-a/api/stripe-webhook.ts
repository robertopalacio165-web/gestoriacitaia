import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Configuración de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuración de Stripe
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

// ✅ IMPORTANTE: Deshabilitar bodyParser para recibir raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Función para leer el body raw
async function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    req.on("error", reject);
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo aceptar POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Leer el body raw para verificar firma de Stripe
    const rawBody = await readRawBody(req);
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    // Verificar la firma del webhook en producción
    if (webhookSecret) {
      try {
        // ✅ Usar rawBody (Buffer) para la verificación
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        console.error("❌ Webhook signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }
    } else {
      // En desarrollo, parsear el body manualmente
      const bodyString = rawBody.toString("utf8");
      event = JSON.parse(bodyString);
    }

    console.log(`📋 Webhook event: ${event.type}`);

    // Procesar solo checkout.session.completed
    if (event.type === "checkout.session.completed") {
      // ============================================
      // PASO 1: LOGS DE DEPURACIÓN
      // ============================================
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      console.log("============== MALTA DEBUG ==============");
      console.log("SESSION:", session.id);
      console.log("METADATA:", metadata);
      console.log("SERVICE:", metadata.service);
      console.log("=========================================");

      // ============================================
      // PASO 2: VERIFICAR SI ES MALTA
      // ============================================
      console.log("Entrando al IF MALTA...");

      if (metadata.service === "malta") {
        console.log("✅ Processing Malta checkout session:", session.id);
        console.log("📋 Metadata:", metadata);

        // =====================================
        // ✅ PASO 1: VERIFICAR SI YA FUE PROCESADO
        // =====================================
        
        const { data: existingMalta } = await supabase
          .from("malta_applications")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (existingMalta) {
          console.log("⚠️ MALTA SESSION ALREADY PROCESSED:", existingMalta.id);
          return res.status(200).json({
            received: true,
            alreadyProcessed: true,
            applicationId: existingMalta.id,
          });
        }

        // =====================================
        // PASO 3: SAVE TO SUPABASE - MALTA
        // =====================================

        // ✅ Preparar datos para insertar - ACTUALIZADO
        const insertData: any = {
          stripe_session_id: session.id,
          stripe_customer_id: session.customer?.toString() || "",

          // Datos personales
          full_name: metadata.customer_name || "",
          whatsapp: metadata.customer_phone || "",
          email: metadata.customer_email || "",

          // Datos de ubicación
          nacionalidad: metadata.nacionalidad || "",
          pais_residencia: metadata.pais_residencia || "",
          fecha_nacimiento: metadata.fecha_nacimiento || "",

          // ✅ Idiomas con niveles (NUEVO)
          idiomas: metadata.idiomas || "",
          ingles_nivel: metadata.ingles_nivel || "",
          frances_nivel: metadata.frances_nivel || "",
          italiano_nivel: metadata.italiano_nivel || "",
          espanol_nivel: metadata.espanol_nivel || "",
          arabe_nivel: metadata.arabe_nivel || "",
          aleman_nivel: metadata.aleman_nivel || "",

          // ✅ Experiencia profesional
          profesion: metadata.profesion || "",
          anos_experiencia: metadata.anos_experiencia || "",
          estudios: metadata.estudios || "",

          // ✅ Sectores (NUEVO)
          sectores: metadata.sectores || "",

          // Habilidades
          carnet_conducir: metadata.carnet_conducir || "", // ✅ Texto (No, B, C, C+E)
          tiene_cv: metadata.tiene_cv === "Sí",

          // ✅ CV URL (NUEVO)
          cv_url: metadata.cv_url || "",

          // ✅ Preguntas importantes (NUEVO)
          pasaporte_valido: metadata.pasaporte_valido === "Sí",
          entrevista_video: metadata.entrevista_video === "Sí",

          // ✅ Disponibilidad (NUEVO)
          disponibilidad_inicio: metadata.disponibilidad_inicio || "inmediato",

          // ✅ Worker status (NUEVO)
          worker_status: metadata.worker_status || "waiting",
          worker_started: false,
          worker_finished: false,

          // Plan
          plan: metadata.plan || "weekly",
          paid: true,
        };

        // ============================================
        // PASO 4: LOGS DE SUPABASE
        // ============================================
        console.log("📝 Insertando en Supabase...");
        console.log("📝 insertData:", JSON.stringify(insertData, null, 2));

        const { data: insertedApplication, error: maltaError } = await supabase
          .from("malta_applications")
          .insert([insertData])
          .select()
          .single();

        console.log("SUPABASE ERROR:", maltaError);
        console.log("SUPABASE DATA:", insertedApplication);

        if (maltaError) {
          console.error("❌ ERROR SAVING MALTA:", maltaError);
          return res.status(500).json({
            error: "Failed to save Malta application",
            details: maltaError.message,
          });
        }

        console.log("✅ Malta application saved:", insertedApplication.id);

        // =====================================
        // PASO 5: SEND TO MAKE - MALTA WELCOME
        // =====================================

        // ✅ No detener el flujo si Make falla
        if (!process.env.MAKE_WEBHOOK_MALTA) {
          console.error("❌ MAKE_WEBHOOK_MALTA no configurado - continuando sin enviar WhatsApp");
        } else {
          try {
            const makeResponse = await fetch(
              process.env.MAKE_WEBHOOK_MALTA as string,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  tipo: "malta_bienvenida",

                  id: insertedApplication.id,

                  nombre: metadata.customer_name || "",
                  whatsapp: metadata.customer_phone || "",
                  email: metadata.customer_email || "",

                  plan: metadata.plan || "monthly",

                  profesion: metadata.profesion || "",
                  puesto: metadata.profesion || "", // ✅ Usamos profesion en lugar de puesto_busca

                  mensaje:
                    `👋 Hola ${metadata.customer_name || ""}. Hemos recibido correctamente tu solicitud para Trabajo en Malta. En unos minutos comenzaremos a generar tu CV profesional y tu carta de presentación mediante IA. Después empezaremos a buscar ofertas adaptadas a tu perfil.`,

                  fecha: new Date().toISOString(),
                }),
              }
            );

            console.log("✅ MAKE MALTA STATUS:", makeResponse.status);

            if (makeResponse.ok) {
              const makeText = await makeResponse.text();
              console.log("📥 MAKE MALTA RESPONSE:", makeText);
            } else {
              console.error("❌ MAKE MALTA ERROR:", makeResponse.status, await makeResponse.text());
            }

          } catch (makeErr) {
            console.log("❌ MAKE MALTA EXCEPTION (continuando):");
            console.log(makeErr);
          }
        }

        // =====================================
        // PASO 6: GENERATE CV + COVER LETTER
        // =====================================

        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_URL ||
            `https://${req.headers.host}`;

          // ✅ Verificar que baseUrl esté configurado
          if (!baseUrl) {
            console.error("❌ NEXT_PUBLIC_URL no configurado");
            throw new Error("NEXT_PUBLIC_URL no configurado");
          }

          console.log("🚀 Llamando a generate-malta-documents...");
          console.log("🚀 baseUrl:", baseUrl);
          console.log("🚀 applicationId:", insertedApplication.id);

          // ✅ Nombre correcto del endpoint: generate-malta-documents
          const generateResponse = await fetch(
            `${baseUrl}/api/generate-malta-documents`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                applicationId: insertedApplication.id,
              }),
            }
          );

          console.log(
            "✅ GENERATE DOCUMENTS STATUS:",
            generateResponse.status
          );

          // ✅ Comprobar si la generación falló
          if (!generateResponse.ok) {
            const errorText = await generateResponse.text();
            console.error(
              "❌ Error generando documentos:",
              generateResponse.status,
              errorText
            );
          } else {
            const generateText = await generateResponse.text();
            console.log("📄 GENERATE DOCUMENTS RESPONSE:", generateText);
          }

        } catch (generateErr) {
          console.log("❌ GENERATE DOCUMENTS EXCEPTION:");
          console.log(generateErr);
        }

        // =====================================
        // RESPONDER OK
        // =====================================

        return res.status(200).json({
          received: true,
          service: "malta",
          applicationId: insertedApplication.id,
        });
      }

      // Si no es Malta, continuar con el flujo normal (Sara u otros)
      console.log("⏭️ Service not malta, skipping...");
      return res.status(200).json({ received: true, service: metadata.service });
    }

    return res.status(200).json({
      received: true,
      event: event.type,
    });
  } catch (error: any) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({
      error: "Webhook processing failed",
      details: error.message || "Unknown error",
    });
  }
}
