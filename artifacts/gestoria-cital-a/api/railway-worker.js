import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  try {

    console.log("🚀 Sara Worker Running...");

    /*
    =========================
    GET SEARCHES
    =========================
    */

    const { data: searches, error } =
      await supabase
        .from("sara_searches")
        .select("*")
       .eq("reservation_status", "searching")
        .limit(5);

    if (error) {
      throw error;
    }

    console.log(
      "🔎 ACTIVE SEARCHES:",
      searches?.length || 0
    );

    /*
    =========================
    LOOP SEARCHES
    =========================
    */

    for (const search of searches || []) {

      console.log(
        "👤 CLIENT:",
        search.customer_name
      );

      /*
      =========================
      ASSIGN WORKER
      =========================
      */

      const { data: workerName } =
        await supabase.rpc(
          "assign_best_worker",
          {
            city_input: search.city
          }
        );

      console.log(
        "👷 WORKER:",
        workerName
      );

      /*
      =========================
      SIMULATE APPOINTMENT
      =========================
      */

   const foundAppointment = true;

      if (!foundAppointment) {

        console.log(
          "❌ NO APPOINTMENT"
        );

        continue;
      }

      console.log(
        "🔥 APPOINTMENT FOUND"
      );

      /*
      =========================
      CREATE HOLD
      =========================
      */

      const { data: holdId } =
        await supabase.rpc(
          "create_reservation_hold",
          {
            search_uuid:
              search.id,

            city_input:
              search.city,

            worker_input:
              workerName,

            customer_input:
              search.customer_name,

            phone_input:
              search.customer_phone,

            email_input:
              search.customer_email,

            appointment_day:
              "2026-06-15",

            appointment_hour:
              "09:30"
          }
        );

      console.log(
        "✅ HOLD:",
        holdId
      );

      /*
      =========================
      SAVE APPOINTMENT
      =========================
      */

      await supabase
        .from("found_appointments")
        .insert([
          {
        queue_id:
              search.id,

            city:
              search.city,

            worker_name:
              workerName,

            appointment_date:
              "2026-06-15",

        appointment_hour:
              "09:30",

            customer_name:
              search.customer_name,

            customer_phone:
              search.customer_phone,

            customer_email:
              search.customer_email,

            reservation_status:
              "hold_created"
          }
        ]);

      /*
      =========================
      UPDATE SEARCH
      =========================
      */

      await supabase
        .from("sara_searches")
        .update({
          status:
            "appointment_found"
        })
        .eq(
          "id",
          search.id
        );

    }

    return res.status(200).json({
      success: true
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }

}
