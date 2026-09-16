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

    console.log("========== ESTUDIAR MALTA 2027 ==========");
    console.log("BODY RECIBIDO:", body);
    console.log("==========================================");

    const {
      fullName,
      dateOfBirth,
      placeOfBirth,
      nationality,
      passportNumber,
      passportExpiry,
      address,
      whatsapp,
      email,

      hasBac,
      bacYear,
      lastDiploma,
      otherDiplomas,
      otherDiplomasDetails,

      isWorking,
      company,
      jobTitle,
      isStudent,

      hasFinancialSponsor,
      sponsorName,
      sponsorRelation,
      sponsorProfession,
      sponsorIncome,
      sponsorCountry,

      previouslyAppliedVisa,
      previousVisaCountry,
      previousVisaType,
      previousVisaDate,

      visaRefused,
      refusalCountry,
      refusalDate,
      refusalReason,

      previouslyObtainedVisa,
      previousObtainedVisaDetails,

      plan,
    } = body;

    // ============================================
    // DATOS MÍNIMOS
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
    // PRECIO REAL
    // 1499 = 14,99 €
    // ============================================

    const unitAmount = 1499;

    console.log("========== ESTUDIAR MALTA 2027 ==========");
    console.log("Nombre:", fullName);
    console.log("Email:", email);
    console.log("WhatsApp:", whatsapp);
    console.log("💰 PRECIO: 14,99 €");
    console.log("Stripe amount:", unitAmount, "céntimos");
    console.log("==========================================");

    // ============================================
    // STRIPE CHECKOUT
    // ============================================

    const session =
      await stripe.checkout.sessions.create({

        mode: "payment",

        customer_email:
          email
            ?.trim()
            .toLowerCase(),

        customer_creation: "always",

        invoice_creation: {
          enabled: true,
        },

        phone_number_collection: {
          enabled: false,
        },

        line_items: [
          {
            price_data: {
              currency: "eur",

              product_data: {
                name: "Estudiar en Malta 2027",

                description:
                  "Servicio de orientación y asistencia para iniciar el procedimiento de inscripción en un centro de idioma inglés en Malta.",
              },

              // ==================================
              // PRECIO: 14,99 €
              // ==================================

              unit_amount: unitAmount,
            },

            quantity: 1,
          },
        ],

        // ============================================
        // RUTA REAL DEL FORMULARIO
        // ============================================

        success_url:
          `${process.env.NEXT_PUBLIC_URL}/estudiar-malta-2027?success=true&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${process.env.NEXT_PUBLIC_URL}/estudiar-malta-2027?canceled=true`,

        // ============================================
        // METADATA
        // CAMPOS REALES DEL FORMULARIO
        // ============================================

        metadata: {

          service: "study_malta_2027",

          fullName:
            fullName?.trim() || "",

          dateOfBirth:
            dateOfBirth?.trim() || "",

          placeOfBirth:
            placeOfBirth?.trim() || "",

          nationality:
            nationality?.trim() || "",

          passportNumber:
            passportNumber?.trim() || "",

          passportExpiry:
            passportExpiry?.trim() || "",

          address:
            address?.trim() || "",

          whatsapp:
            whatsapp?.trim() || "",

          email:
            email?.trim().toLowerCase() || "",

          // =========================================
          // ESTUDIOS
          // =========================================

          hasBac:
            hasBac?.trim() || "",

          bacYear:
            bacYear?.trim() || "",

          lastDiploma:
            lastDiploma?.trim() || "",

          otherDiplomas:
            otherDiplomas?.trim() || "",

          otherDiplomasDetails:
            otherDiplomasDetails?.trim() || "",

          // =========================================
          // SITUACIÓN ACTUAL
          // =========================================

          isWorking:
            isWorking?.trim() || "",

          company:
            company?.trim() || "",

          jobTitle:
            jobTitle?.trim() || "",

          isStudent:
            isStudent?.trim() || "",

          // =========================================
          // GARANTE
          // =========================================

          hasFinancialSponsor:
            hasFinancialSponsor?.trim() || "",

          sponsorName:
            sponsorName?.trim() || "",

          sponsorRelation:
            sponsorRelation?.trim() || "",

          sponsorProfession:
            sponsorProfession?.trim() || "",

          sponsorIncome:
            sponsorIncome?.trim() || "",

          sponsorCountry:
            sponsorCountry?.trim() || "",

          // =========================================
          // HISTORIAL DE VISADOS
          // =========================================

          previouslyAppliedVisa:
            previouslyAppliedVisa?.trim() || "",

          previousVisaCountry:
            previousVisaCountry?.trim() || "",

          previousVisaType:
            previousVisaType?.trim() || "",

          previousVisaDate:
            previousVisaDate?.trim() || "",

          visaRefused:
            visaRefused?.trim() || "",

          refusalCountry:
            refusalCountry?.trim() || "",

          refusalDate:
            refusalDate?.trim() || "",

          refusalReason:
            refusalReason?.trim() || "",

          previouslyObtainedVisa:
            previouslyObtainedVisa?.trim() || "",

          previousObtainedVisaDetails:
            previousObtainedVisaDetails?.trim() || "",

          // =========================================
          // PLAN
          // =========================================

          plan:
            plan?.trim() || "monthly",
        },
      });

    // ============================================
    // RESULTADO
    // ============================================

    console.log("==========================================");
    console.log("✅ CHECKOUT ESTUDIAR MALTA CREADO");
    console.log("💰 IMPORTE: 14,99 €");
    console.log("Session ID:", session.id);
    console.log("URL:", session.url);
    console.log("==========================================");

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      service: "study_malta_2027",
      amount: 1499,
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
