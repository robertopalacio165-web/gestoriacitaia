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

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    // ✅ TODOS LOS CAMPOS DEL FORMULARIO
    const {
      fullName,
      phone,
      email,

      expedienteNumero,
      identificadorSolicitud,

      fechaPresentacion,
      fechaNacimiento,

      // ✅ NUEVOS CAMPOS
      direccion,
      codigoPostal,
      ciudad,
      provincia,

      preferredOffice,
      nie,
    } = body;
    
    console.log("📞 PHONE RECEIVED:", phone);
    console.log("📋 BODY:", body);
    
    const session = await stripe.checkout.sessions.create({

      payment_method_types: ["card"],

      mode: "payment",

      // ✅ METADATA COMPLETA CON TODOS LOS CAMPOS
      metadata: {
        customer_name: fullName || "",
        customer_phone: phone || "",
        customer_email: email || "",

        expediente_numero: expedienteNumero || "",
        identificador_solicitud: identificadorSolicitud || "",
        fecha_presentacion: fechaPresentacion || "",
        fecha_nacimiento: fechaNacimiento || "",

        // ✅ NUEVOS CAMPOS EN METADATA
        nie: nie || "",
        direccion: direccion || "",
        codigo_postal: codigoPostal || "",
        ciudad: ciudad || "",
        provincia: provincia || "",
        preferred_office: preferredOffice || "+34",
      },

      line_items: [
        {
          price_data: {
            currency: "eur",

            product_data: {
              // ✅ NOMBRE ACTUALIZADO
              name: "Seguimiento Expediente + NUSS + Tasa 790",
            },

            // ✅ PRECIO ACTUALIZADO: 14.99€
            unit_amount: 1499,
          },

          quantity: 1,
        },
      ],

      success_url:
        `${process.env.NEXT_PUBLIC_URL}/buscar-citas?paid=true`,

      cancel_url:
        `${process.env.NEXT_PUBLIC_URL}/buscar-citas`,
    });

    return res.status(200).json({
      url: session.url,
    });

  } catch (err: any) {

    console.error(
      "❌ STRIPE ERROR:",
      err
    );

    return res.status(500).json({
      error:
        err.message || "Server error",
    });

  }

}
