import Stripe from "stripe";

import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2024-06-20",
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
        metadata?.type ===
          "SARA_INITIAL"
      ) {

        /*
        SAVE TO SUPABASE
        */

        const { error } =
          await supabase
            .from("sara_searches")
            .insert([
              {
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

                status:
                  "searching",
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
        SEND TO MAKE
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

        await supabase
          .from("found_appointments")
          .update({
            payment_status:
              "paid",

            confirmed: true,
          })
          .eq(
            "id",
            metadata.appointment_id
          );

        console.log(
          "✅ Confirmation paid"
        );

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
