import Stripe from "stripe";

import { buffer } from "micro";

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
    return res
      .status(405)
      .send("Method not allowed");
  }

  try {

    const sig =
      req.headers["stripe-signature"];

    if (!sig) {
      return res
        .status(400)
        .send("No signature");
    }

    const rawBody =
      await buffer(req);

    const event =
      stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env
          .STRIPE_WEBHOOK_SECRET as string
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
        session.metadata;

      /*
      =====================================
      SARA INITIAL PAYMENT
      =====================================
      */

      if (!metadata?.type) {

        console.log(
          "🔥 Sara initial payment success"
        );

        /*
        SAVE IN SUPABASE
        */

        await supabase
          .from("sara_searches")
          .insert([
            {
              customer_name:
                metadata.customer_name,

              customer_phone:
                metadata.customer_phone,

              customer_email:
                metadata.customer_email,

              city:
                metadata.city,

              province:
                metadata.province,

              tramite:
                metadata.tramite,

              status:
                "searching",
            },
          ]);

        console.log(
          "✅ Saved in Supabase"
        );

        /*
        SEND TO MAKE
        */

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
                metadata.customer_name,

              customer_phone:
                metadata.customer_phone,

              customer_email:
                metadata.customer_email,

              city:
                metadata.city,

              province:
                metadata.province,

              tramite:
                metadata.tramite,

              paid: true,

            }),
          }
        );

        console.log(
          "✅ Make webhook sent"
        );

      }

      /*
      =====================================
      SARA CONFIRMATION PAYMENT
      =====================================
      */

      if (
        metadata?.type ===
        "SARA_CONFIRMATION"
      ) {

        const appointmentId =
          metadata.appointment_id;

        await supabase
          .from("found_appointments")
          .update({
            payment_status:
              "paid",

            confirmed: true,
          })
          .eq(
            "id",
            appointmentId
          );

        console.log(
          "✅ Sara confirmation payment"
        );

      }

      /*
      =====================================
      KHALID PAYMENTS
      =====================================
      */

      if (
        metadata?.type ===
        "KHALID_PAYMENT"
      ) {

        console.log(
          "✅ Khalid payment"
        );

      }

      /*
      =====================================
      MOHAMED PAYMENTS
      =====================================
      */

      if (
        metadata?.type ===
        "MOHAMED_PAYMENT"
      ) {

        console.log(
          "✅ Mohamed payment"
        );

      }

    }

    return res.status(200).json({
      received: true,
    });

  } catch (err: any) {

    console.error(err);

    return res
      .status(400)
      .send(err.message);

  }

}
