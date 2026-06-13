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

    const sig =
      req.headers["stripe-signature"];

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

    const rawBody =
      Buffer.concat(chunks);

    /*
    =====================================
    STRIPE EVENT
    =====================================
    */

    const event =
      stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env
          .STRIPE_WEBHOOK_SECRET as string
      );

    console.log(
      "✅ EVENT:",
      event.type
    );

    /*
    =====================================
    PAYMENT SUCCESS
    =====================================
    */

    if (
      event.type ===
      "checkout.session.completed"
    ) {

      const session: any =
        event.data.object;

      const metadata =
        session.metadata || {};

      console.log(
        "✅ PAYMENT SUCCESS"
      );

      console.log(metadata);

      /*
      =====================================
      SARA INITIAL PAYMENT
      =====================================
      */

   if (
  !metadata?.type ||
  metadata?.type === "SARA_INITIAL"
) {

  /*
  =====================================
  PREVENT DUPLICATES
  =====================================
  */

  const { data: existingSearch } =
    await supabase
.from("expediente_checks")
      .select("id")
      .eq(
        "stripe_session_id",
        session.id
      )
      .maybeSingle();

  if (existingSearch) {

    console.log(
      "⚠️ SESSION ALREADY PROCESSED"
    );

    return res.status(200).json({
      received: true,
    });

  }

  /*
  =====================================
  SAVE TO SUPABASE
  =====================================
  */

  const { error } =
    await supabase
  .from("expediente_checks")
      .insert([
        {

      stripe_session_id:
  session.id,

customer_name:
  metadata.customer_name || "",

customer_phone:
  metadata.customer_phone || "",

customer_email:
  metadata.customer_email || "",

expediente_numero:
  metadata.expediente_numero || "",

identificador_solicitud:
  metadata.identificador_solicitud || "",

fecha_presentacion:
  metadata.fecha_presentacion || "",

fecha_nacimiento:
  metadata.fecha_nacimiento || "",

        },
      ]);

  if (error) {

    console.log(
      "❌ SUPABASE ERROR"
    );

    console.log(error);

  } else {

    console.log(
      "✅ Saved in Supabase"
    );

  }

  /*
  =====================================
  SEND TO MAKE
  =====================================
  */

  try {

    const makeResponse =
      await fetch(
        "https://hook.eu1.make.com/k7f36tb5x2lh9840o19a9timdtnvcnqi",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            customer_name:
              metadata.customer_name || "",

            customer_phone:
              metadata.customer_phone || "",

            customer_email:
              metadata.customer_email || "",

            city:
              metadata.city || "",

            province:
              metadata.province || "",

            tramite:
              metadata.tramite || "",

            paid: true,

          }),
        }
      );

    console.log(
      "✅ MAKE STATUS:",
      makeResponse.status
    );

  } catch (makeErr) {

    console.log(
      "❌ MAKE ERROR"
    );

    console.log(makeErr);

  }

}

      /*
      =====================================
      SARA CONFIRMATION
      =====================================
      */

      if (
        metadata?.type ===
        "SARA_CONFIRMATION"
      ) {

      const updateResult =
  await supabase
    .from("found_appointments")
    .update({
      payment_status: "paid",
      confirmed: true,
    })
    .eq(
      "id",
      metadata.appointment_id
    )
    .select();

console.log(
  "APPOINTMENT ID:",
  metadata.appointment_id
);

console.log(
  "UPDATE RESULT:"
);

console.log(updateResult);

console.log(
  "✅ Confirmation paid"
);

        console.log(
          "✅ Confirmation paid"
        );

        /*
        =====================================
        SEND FINAL DATA TO MAKE
        =====================================
        */

        try {

          await fetch(
            "https://hook.eu1.make.com/vxsuo8kk9mssjam4bu2yyjpdkonjf5x6",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                appointment_id:
                  metadata.appointment_id,

                customer_name:
                  metadata.customer_name || "",

                customer_phone:
                  metadata.customer_phone || "",

                customer_email:
                  metadata.customer_email || "",

                city:
                  metadata.city || "",

                office:
                  metadata.office || "",

                appointment_date:
                  metadata.appointment_date || "",

                appointment_hour:
                  metadata.appointment_hour || "",

                tramite:
                  metadata.tramite || "",

                paid: true,

              }),
            }
          );

          console.log(
            "✅ FINAL MAKE SENT"
          );

        } catch (makeError) {

          console.log(
            "❌ FINAL MAKE ERROR"
          );

          console.log(makeError);

        }

      }

    }

    return res.status(200).json({
      received: true,
    });

  } catch (err: any) {

    console.log(
      "❌ WEBHOOK ERROR"
    );

    console.log(err);

    return res.status(400).json({
      error:
        err.message ||
        "Webhook error",
    });

  }

}
