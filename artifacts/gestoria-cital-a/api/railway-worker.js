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

      /*
      =========================
      VALIDATE DATA
      =========================
      */

      if (
        !search.customer_name ||
        !search.customer_phone ||
        !search.customer_email ||
        !search.city
      ) {

        console.log(
          "❌ INVALID SEARCH:",
          search.id
        );

        continue;
      }

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
      FORCE APPOINTMENT
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

      const { data: holdId, error: holdError } =
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

      if (holdError) {

        console.log(
          "❌ HOLD ERROR:",
          holdError
        );

        continue;
      }

      console.log(
        "✅ HOLD CREATED:",
        holdId
      );

      /*
      =========================
      SAVE APPOINTMENT
      =========================
      */

      const { error: insertError } =
        await supabase
          .from("found_appointments")
          .insert([
            {
              queue_id:
                search.id,

              customer_name:
                search.customer_name,

              customer_phone:
                search.customer_phone,

              customer_email:
                search.customer_email,

              tramite:
                search.tramite,

              province:
                search.province,

              city:
                search.city,

              appointment_date:
                "2026-06-15",

              appointment_hour:
                "09:30",

              worker_name:
                workerName,

              reservation_status:
                "hold_created",

              payment_status:
                "pending",

              confirmed:
                false
            }
          ]);

      if (insertError) {

        console.log(
          "❌ INSERT ERROR:",
          insertError
        );

        continue;
      }

      console.log(
        "✅ APPOINTMENT SAVED"
      );

      /*
      =========================
      UPDATE SEARCH
      =========================
      */

      await supabase
        .from("sara_searches")
        .update({
          status:
            "appointment_found",

          reservation_status:
            "hold_created"
        })
        .eq(
          "id",
          search.id
        );

      console.log(
        "✅ SEARCH UPDATED"
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
