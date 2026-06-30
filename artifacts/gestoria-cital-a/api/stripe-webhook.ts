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

      /*
      =====================================
      PREVENT DUPLICATES
      =====================================
      */

      const { data: existingSearch } = await supabase
        .from("expediente_checks")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existingSearch) {
        console.log("⚠️ SESSION ALREADY PROCESSED");
        return res.status(200).json({
          received: true,
        });
      }

      /*
      =====================================
      SAVE TO SUPABASE - CON TODOS LOS CAMPOS
      =====================================
      */

      const { error } = await supabase
        .from("expediente_checks")
        .insert([
          {
            stripe_session_id: session.id,

            // ✅ Datos personales
            customer_name: metadata.customer_name || "",
            customer_phone: metadata.customer_phone || "",
            customer_email: metadata.customer_email || "",

            // ✅ Datos del expediente
            expediente_numero: metadata.expediente_numero || "",
            identificador_solicitud: metadata.identificador_solicitud || "",
            fecha_presentacion: metadata.fecha_presentacion || "",
            fecha_nacimiento: metadata.fecha_nacimiento || "",

            // ✅ NUEVOS CAMPOS - COMPLETOS
            nie: metadata.nie || "",
            direccion: metadata.direccion || "",
            codigo_postal: metadata.codigo_postal || "",
            ciudad: metadata.ciudad || "",
            provincia: metadata.provincia || "",
           
          },
        ]);

      if (error) {
        console.log("❌ SUPABASE ERROR");
        console.log(error);
      } else {
        console.log("✅ Saved in Supabase");
      }

      /*
      =====================================
      SEND TO MAKE - CON TODOS LOS CAMPOS
      =====================================
      */

      try {
        const makeResponse = await fetch(
     https://hook.eu1.make.com/p90dqijtvx5cjvgxnk83uqak4w57vmsm,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              // ✅ Datos personales
              customer_name: metadata.customer_name || "",
              customer_phone: metadata.customer_phone || "",
              customer_email: metadata.customer_email || "",

              // ✅ Datos del expediente
              expediente_numero: metadata.expediente_numero || "",
              identificador_solicitud: metadata.identificador_solicitud || "",
              fecha_presentacion: metadata.fecha_presentacion || "",
              fecha_nacimiento: metadata.fecha_nacimiento || "",

              // ✅ NUEVOS CAMPOS
              nie: metadata.nie || "",
              direccion: metadata.direccion || "",
              codigo_postal: metadata.codigo_postal || "",
              ciudad: metadata.ciudad || "",
              provincia: metadata.provincia || "",
              preferred_office: metadata.preferred_office || "+34",

              paid: true,
            }),
          }
        );

        console.log("✅ MAKE STATUS:", makeResponse.status);
        const makeText = await makeResponse.text();
        console.log("📥 MAKE RESPONSE:", makeText);

      } catch (makeErr) {
        console.log("❌ MAKE ERROR");
        console.log(makeErr);
      }

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
