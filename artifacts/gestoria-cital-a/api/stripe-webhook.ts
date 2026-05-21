import Stripe from "stripe";

import { buffer } from "micro";

import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {

    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).send("No signature");
    }

    const rawBody = await buffer(req);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );

    if (event.type === "checkout.session.completed") {

      const session: any = event.data.object;

      const metadata = session.metadata;

      /*
      =========================
      SARA CONFIRMATION PAYMENT
      =========================
      */

      if (metadata?.type === "SARA_CONFIRMATION") {

        const appointmentId = metadata.appointment_id;

        const token = metadata.token;

        await supabase
          .from("found_appointments")
          .update({
            payment_status: "paid",
            confirmed: true,
          })
          .eq("id", appointmentId);

        console.log("✅ Sara payment confirmed:", appointmentId);

        /*
        هنا من بعد:
        - Playwright booking
        - ICP confirmation
        - PDF generation
        - WhatsApp final
        */

      }

      /*
      =========================
      KHALID PAYMENTS
      =========================
      */

      if (metadata?.type === "KHALID_PAYMENT") {

        console.log("✅ Khalid payment");

        /*
        logic ديال Khalid
        */

      }

      /*
      =========================
      MOHAMED PAYMENTS
      =========================
      */

      if (metadata?.type === "MOHAMED_PAYMENT") {

        console.log("✅ Mohamed payment");

        /*
        logic ديال Mohamed
        */

      }

    }

    return res.status(200).json({
      received: true,
    });

  } catch (err: any) {

    console.error(err);

    return res.status(400).send(err.message);

  }

}
