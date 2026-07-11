import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo aceptar POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    // Parsear body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // ✅ TODOS LOS CAMPOS DEL FORMULARIO DE MALTA
    const {
      // Datos personales
      fullName,
      email,
      whatsapp,
      
      // Datos de ubicación
      nacionalidad,
      paisResidencia,
      
      // Idiomas
      nivelIngles,
      otrosIdiomas,
      
      // Experiencia profesional
      profesion,
      anosExperiencia,
      estudios,
      
      // Habilidades
      carnetConducir,
      tieneCV,
      
      // Búsqueda de empleo
      puestoBusca,
      disponibilidadViajar,
      fechaDisponible,
      
      // Plan seleccionado
      plan, // "weekly" o "monthly"
    } = body;

    // ✅ LIMPIAR DATOS
    const cleanFullName = fullName?.trim() || "";
    const cleanEmail = email?.trim().toLowerCase() || "";
    const cleanWhatsapp = whatsapp?.trim() || "";

    console.log("📋 BODY RECEIVED:", body);
    console.log("📞 WHATSAPP:", cleanWhatsapp);
    console.log("📋 PLAN:", plan);

    // ✅ VALIDAR CAMPOS OBLIGATORIOS
    if (!cleanFullName || !cleanEmail || !cleanWhatsapp) {
      return res.status(400).json({
        error: "Faltan datos obligatorios",
        details: "fullName, email y whatsapp son requeridos",
      });
    }

    // ✅ VALIDAR PLAN
    if (!plan || !["weekly", "monthly"].includes(plan)) {
      return res.status(400).json({
        error: "Invalid plan. Must be 'weekly' or 'monthly'",
      });
    }

    // ✅ CONSTRUIR WHATSAPP COMPLETO (solo números)
    const whatsappCompleto = cleanWhatsapp.replace(/[^0-9+]/g, "");
    console.log("📞 WHATSAPP FINAL:", whatsappCompleto);

    // ✅ DETERMINAR PRECIO SEGÚN PLAN
    const planName = plan === "weekly" ? "Semanal" : "Mensual";
    const planPrice = plan === "weekly" ? 1999 : 2999; // 19.99€ o 29.99€

    // ✅ CREAR SESIÓN DE STRIPE CHECKOUT
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      // ✅ EMAIL PARA EL RECIBO DE STRIPE
      customer_email: cleanEmail,

      // ✅ METADATA COMPLETA DE MALTA CON DATOS LIMPIOS
      metadata: {
        // Identificador del servicio
        service: "malta",
        
        // Datos personales
        customer_name: cleanFullName,
        customer_email: cleanEmail,
        customer_phone: whatsappCompleto,
        
        // Datos de ubicación
        nacionalidad: nacionalidad?.trim() || "",
        pais_residencia: paisResidencia?.trim() || "",
        
        // Idiomas
        nivel_ingles: nivelIngles?.trim() || "",
        otros_idiomas: otrosIdiomas?.trim() || "",
        
        // Experiencia profesional
        profesion: profesion?.trim() || "",
        anos_experiencia: anosExperiencia?.trim() || "",
        estudios: estudios?.trim() || "",
        
        // Habilidades (con los valores exactos que espera el webhook)
        carnet_conducir: carnetConducir?.trim() || "No", // "Sí" o "No"
        tiene_cv: tieneCV?.trim() || "No", // "Sí" o "No"
        
        // Búsqueda de empleo
        puesto_busca: puestoBusca?.trim() || "",
        disponibilidad_viajar: disponibilidadViajar?.trim() || "No", // "Sí" o "No"
        fecha_disponible: fechaDisponible?.trim() || "",
        
        // Plan
        plan: plan || "",
        plan_name: planName || "",
      },

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Trabajo en Malta - ${planName}`,
              description: `Servicio de búsqueda de empleo en Malta - Plan ${planName}`,
            },
            unit_amount: planPrice,
          },
          quantity: 1,
        },
      ],

      // ✅ URLS DE MALTA
      success_url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paid=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta`,
    });

    console.log("✅ STRIPE SESSION CREATED:", session.id);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      plan: plan,
      planName: planName,
    });
  } catch (err: any) {
    console.error("❌ STRIPE ERROR:", err);

    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}
