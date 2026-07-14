import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

// ============================================
// ✅ VALIDACIÓN DE VARIABLES DE ENTORNO
// ============================================
console.log("🔧 Inicializando Stripe...");
console.log("🔑 STRIPE_SECRET_KEY existe:", !!process.env.STRIPE_SECRET_KEY);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY no está configurada");
  throw new Error("STRIPE_SECRET_KEY no está configurada");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log("✅ Stripe inicializado correctamente");

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ============================================
  // ✅ LOGS DE DIAGNÓSTICO - PRIMERO DE TODO
  // ============================================
  console.log("========================================");
  console.log("=== API CREATE CHECKOUT MALTA ===");
  console.log("========================================");
  console.log("📌 Method:", req.method);
  console.log("📌 Headers:", JSON.stringify(req.headers, null, 2));
  console.log("📌 Body (raw):", req.body);
  console.log("📌 Body type:", typeof req.body);
  console.log("📌 Body is Buffer:", req.body instanceof Buffer);
  console.log("📌 Body is string:", typeof req.body === "string");
  console.log("📌 Body is object:", typeof req.body === "object" && !(req.body instanceof Buffer));
  console.log("========================================");

  // Solo aceptar POST
  if (req.method !== "POST") {
    console.log("❌ Método no permitido:", req.method);
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    console.log("📥 Intentando parsear body...");

    // Parsear body
    let body;
    if (typeof req.body === "string") {
      console.log("📥 Body es string, parseando JSON...");
      try {
        body = JSON.parse(req.body);
      } catch (parseError) {
        console.error("❌ Error parseando JSON:", parseError);
        console.error("❌ Body string:", req.body);
        return res.status(400).json({
          error: "Invalid JSON body",
          details: "El cuerpo de la solicitud no es un JSON válido",
        });
      }
    } else if (req.body && typeof req.body === "object") {
      console.log("📥 Body es objeto, usando directamente");
      body = req.body;
    } else {
      console.error("❌ Body vacío o tipo no soportado:", typeof req.body);
      return res.status(400).json({
        error: "Empty or invalid body",
        details: "El cuerpo de la solicitud está vacío o no es válido",
      });
    }

    console.log("📋 BODY PARSED:", JSON.stringify(body, null, 2));

    // ✅ VERIFICAR VARIABLES DE ENTORNO
    console.log("🔧 Verificando variables de entorno...");
    console.log("🔑 STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "✅ Configurada" : "❌ FALTA");
    console.log("🌐 NEXT_PUBLIC_URL:", process.env.NEXT_PUBLIC_URL || "❌ FALTA");

    if (!process.env.NEXT_PUBLIC_URL) {
      console.error("❌ NEXT_PUBLIC_URL no configurada");
      return res.status(500).json({
        error: "Server configuration error",
        details: "NEXT_PUBLIC_URL no está configurada",
      });
    }

    // ============================================
    // ✅ NUEVOS CAMPOS DEL FORMULARIO
    // ============================================
    const {
      // Datos personales
      fullName,
      email,
      whatsapp,
      
      // Datos de ubicación
      nacionalidad,
      paisResidencia,
      fechaNacimiento,
      
      // ✅ Idiomas con niveles
      idiomas,
      ingles_nivel,
      frances_nivel,
      italiano_nivel,
      espanol_nivel,
      arabe_nivel,
      aleman_nivel,
      
      // ✅ Experiencia profesional
      profesion,
      anosExperiencia, // ✅ CAMBIADO: sin ñ
      estudios,
      
      // ✅ Sectores
      sectores,
      
      // Habilidades
      carnetConducir,
      tieneCV,
      
      // ✅ CV URL
      cv_url,
      
      // ✅ Preguntas importantes
      pasaporteValido,
      entrevistaVideo,
      
      // ✅ Disponibilidad
      disponibilidadInicio,
      
      // ✅ Worker status
      worker_status,
      
      // Plan seleccionado
      plan, // "weekly" o "monthly"
    } = body;

    // ✅ LOG: Verificar que los campos se extrajeron correctamente
    console.log("📥 Campos extraídos:");
    console.log("  👤 fullName:", fullName);
    console.log("  📧 email:", email);
    console.log("  📱 whatsapp:", whatsapp);
    console.log("  📋 plan:", plan);
    console.log("  📍 nacionalidad:", nacionalidad);
    console.log("  📍 paisResidencia:", paisResidencia);
    console.log("  📅 fechaNacimiento:", fechaNacimiento);
    console.log("  🏷️ idiomas:", idiomas);
    console.log("  🏷️ ingles_nivel:", ingles_nivel);
    console.log("  🏷️ frances_nivel:", frances_nivel);
    console.log("  🏷️ italiano_nivel:", italiano_nivel);
    console.log("  🏷️ espanol_nivel:", espanol_nivel);
    console.log("  🏷️ arabe_nivel:", arabe_nivel);
    console.log("  🏷️ aleman_nivel:", aleman_nivel);
    console.log("  💼 profesion:", profesion);
    console.log("  📅 anosExperiencia:", anosExperiencia);
    console.log("  🎓 estudios:", estudios);
    console.log("  📂 sectores:", sectores);
    console.log("  🚗 carnetConducir:", carnetConducir);
    console.log("  📄 tieneCV:", tieneCV);
    console.log("  🔗 cv_url:", cv_url);
    console.log("  🛂 pasaporteValido:", pasaporteValido);
    console.log("  🎥 entrevistaVideo:", entrevistaVideo);
    console.log("  ⏰ disponibilidadInicio:", disponibilidadInicio);
    console.log("  ⚙️ worker_status:", worker_status);

    // ✅ LIMPIAR DATOS
    const cleanFullName = fullName?.trim() || "";
    const cleanEmail = email?.trim().toLowerCase() || "";
    const cleanWhatsapp = whatsapp?.trim() || "";

    console.log("🧹 Datos limpiados:");
    console.log("  cleanFullName:", cleanFullName);
    console.log("  cleanEmail:", cleanEmail);
    console.log("  cleanWhatsapp:", cleanWhatsapp);

    // ✅ VALIDAR CAMPOS OBLIGATORIOS
    if (!cleanFullName || !cleanEmail || !cleanWhatsapp) {
      console.error("❌ Campos obligatorios faltantes");
      console.error("  cleanFullName:", !!cleanFullName);
      console.error("  cleanEmail:", !!cleanEmail);
      console.error("  cleanWhatsapp:", !!cleanWhatsapp);
      return res.status(400).json({
        error: "Faltan datos obligatorios",
        details: "fullName, email y whatsapp son requeridos",
        received: { fullName: !!cleanFullName, email: !!cleanEmail, whatsapp: !!cleanWhatsapp },
      });
    }

    // ✅ VALIDAR EMAIL
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      console.error("❌ Email inválido:", cleanEmail);
      return res.status(400).json({
        error: "Email inválido",
        details: "El email debe ser válido",
      });
    }

    // ✅ VALIDAR PLAN
    if (!plan || !["weekly", "monthly"].includes(plan)) {
      console.error("❌ Plan inválido:", plan);
      return res.status(400).json({
        error: "Invalid plan. Must be 'weekly' or 'monthly'",
        received: plan,
      });
    }

    // ✅ CONSTRUIR WHATSAPP COMPLETO (solo números)
    const whatsappCompleto = cleanWhatsapp.replace(/[^0-9+]/g, "");
    console.log("📞 WHATSAPP FINAL:", whatsappCompleto);

    // ✅ VALIDAR WHATSAPP (mínimo 8 dígitos)
    if (whatsappCompleto.length < 8) {
      console.error("❌ WhatsApp inválido:", whatsappCompleto);
      return res.status(400).json({
        error: "WhatsApp inválido",
        details: "El número de WhatsApp debe tener al menos 8 dígitos",
      });
    }

    // ✅ DETERMINAR PRECIO SEGÚN PLAN
    const planName = plan === "weekly" ? "Semanal" : "Mensual";
    const planPrice = plan === "weekly" ? 1999 : 2999; // 19.99€ o 29.99€

    console.log("💰 planName:", planName);
    console.log("💰 planPrice:", planPrice);

    // ✅ VERIFICAR URLS
    const successUrl = `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paid=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_URL}/trabajo-malta`;
    console.log("🔗 successUrl:", successUrl);
    console.log("🔗 cancelUrl:", cancelUrl);

    // ✅ LOG: Antes de crear la sesión
    console.log("🚀 CREANDO SESIÓN DE STRIPE...");

    // ============================================
    // ✅ PROCESAR IDIOMAS (si es array, unirlo)
    // ============================================
    const idiomasString = Array.isArray(idiomas) 
      ? idiomas.join(", ") 
      : idiomas || "";

    // ============================================
    // ✅ PROCESAR SECTORES (si es array, unirlo)
    // ============================================
    const sectoresString = Array.isArray(sectores) 
      ? sectores.join(", ") 
      : sectores || "";

    // ✅ CREAR SESIÓN DE STRIPE CHECKOUT
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      // ✅ EMAIL PARA EL RECIBO DE STRIPE
      customer_email: cleanEmail,

      // ✅ METADATA COMPLETA DE MALTA
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
        fecha_nacimiento: fechaNacimiento?.trim() || "",
        
        // ✅ Idiomas con niveles
        idiomas: idiomasString,
        ingles_nivel: ingles_nivel?.trim() || "",
        frances_nivel: frances_nivel?.trim() || "",
        italiano_nivel: italiano_nivel?.trim() || "",
        espanol_nivel: espanol_nivel?.trim() || "",
        arabe_nivel: arabe_nivel?.trim() || "",
        aleman_nivel: aleman_nivel?.trim() || "",
        
        // ✅ Experiencia profesional
        profesion: profesion?.trim() || "",
        anos_experiencia: anosExperiencia?.trim() || "", // ✅ Sin ñ
        estudios: estudios?.trim() || "",
        
        // ✅ Sectores
        sectores: sectoresString,
        
        // Habilidades
        carnet_conducir: carnetConducir?.trim() || "No",
        tiene_cv: tieneCV?.trim() || "No",
        
        // ✅ CV URL
        cv_url: cv_url?.trim() || "",
        
        // ✅ Preguntas importantes
        pasaporte_valido: pasaporteValido?.trim() || "Sí",
        entrevista_video: entrevistaVideo?.trim() || "Sí",
        
        // ✅ Disponibilidad
        disponibilidad_inicio: disponibilidadInicio?.trim() || "inmediato",
        
        // ✅ Worker status
        worker_status: worker_status?.trim() || "waiting",
        
        // ✅ Plan (eliminado plan_name)
        plan: plan || "",
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
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log("✅ STRIPE SESSION CREATED:", session.id);
    console.log("🔗 URL:", session.url);
    console.log("========================================");

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      plan: plan,
      planName: planName,
    });
  } catch (err: any) {
    console.error("========================================");
    console.error("❌ STRIPE ERROR:");
    console.error("❌ Message:", err.message);
    console.error("❌ Type:", err.type || "unknown");
    console.error("❌ Code:", err.code || "unknown");
    console.error("❌ Stack:", err.stack);
    console.error("========================================");

    // ✅ Devolver error detallado para diagnóstico
    return res.status(500).json({
      error: err.message || "Server error",
      details: err.message,
      type: err.type || "unknown",
      code: err.code || "unknown",
    });
  }
}
