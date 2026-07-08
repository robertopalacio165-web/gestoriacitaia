import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).json({
        error: "No stripe signature",
      });
    }

    /*
    =====================================
    RAW BODY FOR VERCEL
    =====================================
    */

    const chunks: Uint8Array[] = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks);

    /*
    =====================================
    STRIPE EVENT
    =====================================
    */

    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );

    console.log("✅ EVENT:", event.type);

    /*
    =====================================
    PAYMENT SUCCESS
    =====================================
    */

    if (event.type === "checkout.session.completed") {

      const session: any = event.data.object;
      const metadata = session.metadata || {};

      console.log("✅ PAYMENT SUCCESS");
      console.log("📦 METADATA:", metadata);

      // =============================================
      // SERVICIO: MALTA (TRABAJO EN MALTA)
      // =============================================
      if (metadata.service === "malta") {

        console.log("🔵 PROCESANDO PAGO DE MALTA");

        // ✅ Verificar duplicado en malta_applications
        const { data: existingMalta } = await supabase
          .from("malta_applications")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (existingMalta) {
          console.log("⚠️ MALTA SESSION ALREADY PROCESSED");
          return res.status(200).json({
            received: true,
          });
        }

        // ✅ Guardar en malta_applications
        const { error: maltaError } = await supabase
          .from("malta_applications")
          .insert([
            {
              stripe_session_id: session.id,
              stripe_customer_id: session.customer,

              full_name: metadata.customer_name || "",
              whatsapp: metadata.customer_phone || "",
              email: metadata.customer_email || "",

              nacionalidad: metadata.nacionalidad || "",
              pais_residencia: metadata.pais_residencia || "",
              fecha_nacimiento: metadata.fecha_nacimiento || null,
              nivel_ingles: metadata.nivel_ingles || null,
              otros_idiomas: metadata.otros_idiomas || "",
              profesion: metadata.profesion || "",
              // ✅ CORREGIDO: años_experiencia (con ñ) coincide con la tabla
              años_experiencia: metadata.anos_experiencia ? parseInt(metadata.anos_experiencia) : null,
              estudios: metadata.estudios || "",
              carnet_conducir: metadata.carnet_conducir === "Sí",
              tiene_cv: metadata.tiene_cv === "Sí",
              puesto_busca: metadata.puesto_busca || "",
              disponibilidad_viajar: metadata.disponibilidad_viajar === "Sí",
              fecha_disponible: metadata.fecha_disponible || null,

              plan: metadata.plan || "monthly",
              paid: true,
            },
          ]);

        if (maltaError) {
          console.log("❌ SUPABASE ERROR (MALTA):", maltaError);
        } else {
          console.log("✅ Saved in Supabase (MALTA)");
        }

        // ✅ Enviar a MAKE para WhatsApp (Malta)
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
                nombre: metadata.customer_name || "",
                whatsapp: metadata.customer_phone || "",
                email: metadata.customer_email || "",
                plan: metadata.plan || "monthly",
                puesto: metadata.puesto_busca || "",
                profesion: metadata.profesion || "",
                mensaje: `👋 ${metadata.customer_name || ""}! Hemos recibido tu solicitud para Trabajo en Malta. Empezamos a buscar oportunidades para ti.`,
                fecha: new Date().toISOString(),
              }),
            }
          );

          console.log("✅ MAKE STATUS (MALTA):", makeResponse.status);
          const makeText = await makeResponse.text();
          console.log("📥 MAKE RESPONSE (MALTA):", makeText);

        } catch (makeErr) {
          console.log("❌ MAKE ERROR (MALTA):", makeErr);
        }

        return res.status(200).json({
          received: true,
        });
      }

      // =============================================
      // SERVICIO: EXPEDIENTE (SARA) - CÓDIGO ACTUAL
      // =============================================
      // Si NO tiene service o es "expediente"
      if (!metadata.service || metadata.service === "expediente") {

        console.log("🟢 PROCESANDO PAGO DE EXPEDIENTE (SARA)");

        // ✅ Verificar duplicado en expediente_checks
        const { data: existingSearch } = await supabase
          .from("expediente_checks")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (existingSearch) {
          console.log("⚠️ SESSION ALREADY PROCESSED (SARA)");
          return res.status(200).json({
            received: true,
          });
        }

        // ✅ Guardar en expediente_checks
        const { error } = await supabase
          .from("expediente_checks")
          .insert([
            {
              stripe_session_id: session.id,

              customer_name: metadata.customer_name || "",
              customer_phone: metadata.customer_phone || "",
              customer_email: metadata.customer_email || "",

              expediente_numero: metadata.expediente_numero || "",
              identificador_solicitud: metadata.identificador_solicitud || "",
              fecha_presentacion: metadata.fecha_presentacion || "",
              fecha_nacimiento: metadata.fecha_nacimiento || "",

              nie: metadata.nie || "",
              direccion: metadata.direccion || "",
              codigo_postal: metadata.codigo_postal || "",
              ciudad: metadata.ciudad || "",
              provincia: metadata.provincia || "",

              proxima_revision: new Date().toISOString(),
            },
          ]);

        if (error) {
          console.log("❌ SUPABASE ERROR (SARA):", error);
        } else {
          console.log("✅ Saved in Supabase (SARA)");
        }

        // ✅ Enviar a MAKE para WhatsApp (Sara)
        try {
          const makeResponse = await fetch(
            process.env.MAKE_WEBHOOK_BIENVENIDA as string,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: session.id,

                nombre: metadata.customer_name || "",
                telefono: metadata.customer_phone || "",

                direccion: metadata.direccion || "",
                codigo_postal: metadata.codigo_postal || "",
                ciudad: metadata.ciudad || "",
                provincia: metadata.provincia || "",

                fecha_nacimiento: metadata.fecha_nacimiento || "",
                expediente: metadata.expediente_numero || "",
                nie: metadata.nie || "",

                mensaje_darija:
                  `👋 Salam ${metadata.customer_name || ""}! Sara tlebt 3lik l'exposant dyalk. Ghat9lb 3lih kola 30 minute w ghan9olik 7al l7ala dialo.`,

                mensaje_es:
                  `👋 Hola ${metadata.customer_name || ""}! Sara ha comenzado a vigilar tu expediente. Revisará cada 30 minutos y te informará del estado.`,

                tipo: "bienvenida",
                fecha: new Date().toISOString(),
              }),
            }
          );

          console.log("✅ MAKE STATUS (SARA):", makeResponse.status);
          const makeText = await makeResponse.text();
          console.log("📥 MAKE RESPONSE (SARA):", makeText);

        } catch (makeErr) {
          console.log("❌ MAKE ERROR (SARA):", makeErr);
        }

        // ✅ CIERRE DEL IF DE EXPEDIENTE
        return res.status(200).json({
          received: true,
        });
      } // <--- ✅ ESTA LLAVE CIERRA EL BLOQUE DE EXPEDIENTE

      // =============================================
      // SERVICIO DESCONOCIDO
      // =============================================
      console.log("⚠️ SERVICIO DESCONOCIDO:", metadata.service);
      return res.status(200).json({
        received: true,
        message: "Servicio no reconocido, pero procesado",
      });

    }

    return res.status(200).json({
      received: true,
    });

  } catch (err: any) {
    console.log("❌ WEBHOOK ERROR");
    console.log(err);
    return res.status(400).json({
      error: err.message || "Webhook error",
    });
  }

}
