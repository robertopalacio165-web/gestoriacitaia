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
    // ============================================
    // 1. BODY RECIBIDO
    // ============================================

    const body = req.body;

    console.log(
      "========== ESTUDIAR MALTA 2027 =========="
    );

    console.log(
      "BODY RECIBIDO:",
      body
    );

    console.log(
      "=========================================="
    );

    // ============================================
    // 2. DATOS DEL CLIENTE
    // ============================================

    const {
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

      plan,
    } = body;

    // ============================================
    // 3. COMPROBAR DATOS MÍNIMOS
    // ============================================

    if (!fullName) {
      return res.status(400).json({
        error: "El nombre es obligatorio",
      });
    }

    if (!email) {
      return res.status(400).json({
        error: "El email es obligatorio",
      });
    }

    // ============================================
    // 4. PRECIO ESTUDIOS MALTA
    // ============================================

    /*
     * PRUEBA:
     *
     * Stripe cobrará solamente 0,50 €
     *
     * Stripe trabaja en céntimos:
     *
     * 50 = 0,50 €
     */

    const unitAmount = 50;

    const planName =
      plan === "weekly"
        ? "Semanal"
        : "Mensual";

    // ============================================
    // 5. LOGS
    // ============================================

    console.log(
      "========== ESTUDIOS MALTA =========="
    );

    console.log(
      "Nombre:",
      fullName
    );

    console.log(
      "WhatsApp:",
      whatsapp
    );

    console.log(
      "Email:",
      email
    );

    console.log(
      "Plan:",
      planName
    );

    console.log(
      "💰 PRECIO DE PRUEBA:",
      "0,50 €"
    );

    console.log(
      "photoUrl:",
      photoUrl
    );

    console.log(
      "pdfUrl:",
      pdfUrl
    );

    console.log(
      "===================================="
    );

    // ============================================
    // 6. CREAR CHECKOUT STRIPE
    // ============================================

    const session =
      await stripe.checkout.sessions.create({

        mode: "payment",

        // ========================================
        // EMAIL
        // ========================================

        customer_email:
          email
            ?.trim()
            .toLowerCase(),

        customer_creation:
          "always",

        // ========================================
        // FACTURA
        // ========================================

        invoice_creation: {
          enabled: true,
        },

        // ========================================
        // TELÉFONO
        // ========================================

        phone_number_collection: {
          enabled: false,
        },

        // ========================================
        // PRODUCTO
        // ========================================

        line_items: [
          {
            price_data: {

              currency: "eur",

              product_data: {
                name:
                  `Estudiar en Malta 2027 - Plan ${planName}`,

                description:
                  `Servicio de orientación y asistencia para iniciar el procedimiento de inscripción en un centro de idioma inglés en Malta.`,
              },

              // ==================================
              // 0,50 € = 50 CÉNTIMOS
              // ==================================

              unit_amount: 50,
            },

            quantity: 1,
          },
        ],

        // ========================================
        // URL ÉXITO
        // ========================================

        success_url:
          `${process.env.NEXT_PUBLIC_URL}/estudiar-en-malta-2027?success=true&session_id={CHECKOUT_SESSION_ID}`,

        // ========================================
        // URL CANCELADO
        // ========================================

        cancel_url:
          `${process.env.NEXT_PUBLIC_URL}/estudiar-en-malta-2027?canceled=true`,

        // ========================================
        // METADATA
        // ========================================

        metadata: {

          // IDENTIFICADOR DEL SERVICIO
          service:
            "study_malta_2027",

          // DATOS PERSONALES
          fullName:
            fullName
              ?.trim() || "",

          whatsapp:
            whatsapp
              ?.trim() || "",

          email:
            email
              ?.trim()
              .toLowerCase() || "",

          nationality:
            nationality
              ?.trim() || "",

          currentCity:
            currentCity
              ?.trim() || "",

          fechaNacimiento:
            fechaNacimiento
              ?.trim() || "",

          // IDIOMAS
          idiomas:
            idiomas
              ?.trim() || "",

          ingles_nivel:
            ingles_nivel
              ?.trim() || "",

          frances_nivel:
            frances_nivel
              ?.trim() || "",

          italiano_nivel:
            italiano_nivel
              ?.trim() || "",

          espanol_nivel:
            espanol_nivel
              ?.trim() || "",

          arabe_nivel:
            arabe_nivel
              ?.trim() || "",

          aleman_nivel:
            aleman_nivel
              ?.trim() || "",

          // EXPERIENCIA
          trabajo_busca:
            trabajo_busca
              ?.trim() || "",

          experiencia_previa:
            experiencia_previa
              ?.trim() || "",

          anos_experiencia:
            anos_experiencia
              ?.trim() || "",

          education_level:
            education_level
              ?.trim() || "",

          // CARNET
          carnetConducir:
            carnetConducir
              ?.trim() || "",

          // DOCUMENTOS
          photoUrl:
            photoUrl
              ?.trim() || "",

          pdfUrl:
            pdfUrl
              ?.trim() || "",

          // PLAN
          plan:
            plan
              ?.trim() || "monthly",
        },
      });

    // ============================================
    // 7. RESPUESTA
    // ============================================

    console.log(
      "=========================================="
    );

    console.log(
      "✅ CHECKOUT ESTUDIAR MALTA CREADO"
    );

    console.log(
      "💰 IMPORTE: 0,50 €"
    );

    console.log(
      "Session ID:",
      session.id
    );

    console.log(
      "URL:",
      session.url
    );

    console.log(
      "=========================================="
    );

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      service: "study_malta_2027",
      amount: 50,
      currency: "eur",
    });

  } catch (error: any) {

    console.error(
      "❌ ERROR CREANDO CHECKOUT ESTUDIAR MALTA:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Error creating Stripe checkout",
    });
  }
}
