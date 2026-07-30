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

    // ✅ DETECCIÓN SIMPLE Y ROBUSTA
    const paisCliente = (pais || "")
      .trim()
      .toLowerCase();

    // ✅ Si el formulario siempre envía "Morocco"
    const CURRENCY = paisCliente === "morocco"
      ? "mad"
      : "eur";

    // Precios en céntimos de la moneda correspondiente
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

    // Determinar precio según el plan y la moneda seleccionada
    const unitAmount = plan === "weekly" 
      ? PRICES[CURRENCY as keyof typeof PRICES].weekly
      : PRICES[CURRENCY as keyof typeof PRICES].monthly;

    const planName = plan === "weekly" ? "Semanal" : "Mensual";
    const currencySymbol = CURRENCY === "mad" ? "MAD" : "€";

    console.log("========== CONFIGURACIÓN DE PAGO ==========");
    console.log(`País: ${pais || "No especificado"}`);
    console.log(`Ciudad: ${currentCity || "No especificada"}`);
    console.log(`Nacionalidad: ${nationality || "No especificada"}`);
    console.log(`Moneda seleccionada: ${CURRENCY.toUpperCase()}`);
    console.log(`Plan: ${planName}`);
    console.log(`Precio: ${unitAmount / 100} ${currencySymbol}`);
    console.log("===========================================");

    const session = await stripe.checkout.sessions.create({
      // ✅ Configuración básica de pago
      payment_method_types: ["card"],
      mode: "payment",
      
      // ✅ MEJORAS DE AUTORIZACIÓN
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true,
      },
      
      // ✅ Actualización automática de datos
      customer_update: {
        address: "auto",
        name: "auto",
        shipping: "auto",
      },
      
      // ✅ Configuración adicional
      consent_collection: {
        promotions: "auto",
      },
      allow_promotion_codes: true,
      locale: "auto",
      
      // ✅ Datos del cliente
      customer_email: email?.trim().toLowerCase(),
      customer_creation: "always",
      
      // ✅ Facturación
      invoice_creation: {
        enabled: true,
      },
      
      // ✅ Líneas de producto
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: `Búsqueda de Empleo Malta - Plan ${planName} (${currencySymbol})`,
              description: `Plan ${planName} de búsqueda de empleo en Malta con IA - Precio en ${currencySymbol}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      
      // ✅ URLs de redirección
      success_url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?canceled=true`,
      
      // ✅ Metadatos completos
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
        
        // ✅ Información de decisión de moneda
        currency: CURRENCY,
        detected_country: paisCliente || "not_detected",
        currency_based_on: "pais_field",
      },
    });

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
