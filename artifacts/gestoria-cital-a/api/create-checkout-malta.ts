import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

export default async function handler(
  req: any,
  res: any
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const body = req.body;

    console.log("========== BODY RECIBIDO ==========");
    console.log(body);
    console.log("==================================");

    const {
      fullName,
      whatsapp,
      email,

      nationality,
      currentCity,
      pais,

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

      plan,
    
    } = body;

    // ✅ 1. DETECCIÓN DE PAÍS (usando pais o nationality)
    const paisCliente = (pais || nationality || "")
      .trim()
      .toLowerCase();

    // ✅ 2. MONEDA: MAD para Marruecos, EUR para el resto
    const esMarruecos = ["morocco", "marruecos", "maroc"].includes(paisCliente);
    const CURRENCY = esMarruecos ? "mad" : "eur";

    // ✅ 3. PRECIOS DINÁMICOS
    const PRICES = {
      eur: {
        weekly: 999,   // 9.99 €
        monthly: 1999, // 19.99 €
      },
      mad: {
        weekly: 10000,  // 100.00 MAD
        monthly: 20000, // 200.00 MAD
      }
    };

    const unitAmount = plan === "weekly" 
      ? PRICES[CURRENCY as keyof typeof PRICES].weekly
      : PRICES[CURRENCY as keyof typeof PRICES].monthly;

    const planName = plan === "weekly" ? "Semanal" : "Mensual";
    const currencySymbol = CURRENCY === "mad" ? "MAD" : "€";

    console.log("========== CONFIGURACIÓN DE PAGO ==========");
    console.log(`País detectado: ${paisCliente || "No especificado"}`);
    console.log(`Moneda: ${CURRENCY.toUpperCase()}`);
    console.log(`Plan: ${planName}`);
    console.log(`Precio: ${unitAmount / 100} ${currencySymbol}`);
    console.log("===========================================");

    // ✅ 4. CREAR SESIÓN CON TODAS LAS MEJORAS
    const session = await stripe.checkout.sessions.create({
      // Configuración básica
      payment_method_types: ["card"],
      mode: "payment",
      
      // ✅ MEJORA 1: Dirección de facturación OBLIGATORIA
      billing_address_collection: "required",
      
      // ✅ MEJORA 2: Teléfono OBLIGATORIO
      phone_number_collection: {
        enabled: true,
      },
      
      // ✅ MEJORA 3: Recoger nombre del cliente
      name_collection: {
        enabled: true,
      },
      
      // ✅ MEJORA 4: Idioma automático
      locale: "auto",
      
      // ✅ MEJORA 5: Forzar 3D Secure SIEMPRE (no automático)
      payment_method_options: {
        card: {
          request_three_d_secure: "any", // 👈 "any" fuerza 3DS siempre
          // Para tarjetas marroquíes, esto ayuda a autorizar
        },
      },
      
      // ✅ MEJORA 6: Descripción clara en el extracto bancario
      payment_intent_data: {
        statement_descriptor: "EMPLEO-MALTA",
        statement_descriptor_suffix: planName.toUpperCase(),
      },
      
      // ✅ MEJORA 7: Datos del cliente
      customer_email: email?.trim().toLowerCase(),
      customer_creation: "always",
      
      // ✅ MEJORA 8: Facturación
      invoice_creation: {
        enabled: true,
      },
      
      // ✅ MEJORA 9: Consentimiento promocional
      consent_collection: {
        promotions: "auto",
      },
      
      // ✅ MEJORA 10: Códigos promocionales
      allow_promotion_codes: true,
      
      // ✅ MEJORA 11: Impuestos automáticos (para Adaptive Pricing)
      automatic_tax: {
        enabled: true,
      },
      
      // ✅ Líneas de producto con moneda dinámica
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: `Empleo Malta - Plan ${planName}`,
              description: `Plan ${planName} de búsqueda de empleo en Malta con IA`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      
      // ✅ URLs de redirección
      success_url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?canceled=true`,
      
      // ✅ Metadatos COMPLETOS
      metadata: {
        fullName: fullName?.trim() || "",
        whatsapp: whatsapp?.trim() || "",
        email: email?.trim().toLowerCase() || "",

        nationality: nationality?.trim() || "",
        currentCity: currentCity?.trim() || "",
        pais: pais?.trim() || "",

        fechaNacimiento: fechaNacimiento?.trim() || "",

        idiomas: idiomas?.trim() || "",
        ingles_nivel: ingles_nivel?.trim() || "",
        frances_nivel: frances_nivel?.trim() || "",
        italiano_nivel: italiano_nivel?.trim() || "",
        espanol_nivel: espanol_nivel?.trim() || "",
        arabe_nivel: arabe_nivel?.trim() || "",
        aleman_nivel: aleman_nivel?.trim() || "",

        trabajo_busca: trabajo_busca?.trim() || "",
        experiencia_previa: experiencia_previa?.trim() || "",
        anos_experiencia: anos_experiencia?.trim() || "",
        education_level: education_level?.trim() || "",

        carnetConducir: carnetConducir?.trim() || "",

        photoUrl: photoUrl?.trim() || "",
        pdfUrl: pdfUrl?.trim() || "",

        plan: plan?.trim() || "monthly",
        
        // ✅ Información de moneda
        currency: CURRENCY,
        detected_country: paisCliente || "not_detected",
        is_morocco: esMarruecos ? "true" : "false",
      },
    });

    console.log("========== SESIÓN CREADA ==========");
    console.log(`Session ID: ${session.id}`);
    console.log(`URL: ${session.url}`);
    console.log("===================================");

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      currency: CURRENCY,
      detected_country: paisCliente || "not_detected",
    });

  } catch (error: any) {
    console.error("❌ Error creating Stripe session:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
}
