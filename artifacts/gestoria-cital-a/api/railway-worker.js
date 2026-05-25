import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_RETRIES = 3;

export default async function handler(req, res) {

  try {

    console.log("🚀 SARA WORKER STARTED");

    /*
    =========================
    RESET STUCK SEARCHES
    =========================
    */

    await supabase
      .from("sara_searches")
      .update({
        reservation_status: "searching"
      })
      .eq("reservation_status", "processing");

    /*
    =========================
    GET PRIORITY SEARCHES
    =========================
    */

    const { data: searches, error } =
      await supabase
        .from("sara_searches")
        .select("*")
        .eq("reservation_status", "searching")
        .order(
          "priority_level",
          { ascending: false }
        )
        .limit(5);

    if (error) {
      throw error;
    }

    console.log(
      "🔎 SEARCHES:",
      searches?.length || 0
    );

    /*
    =========================
    LOOP SEARCHES
    =========================
    */

    for (const search of searches || []) {

      try {

        console.log(
          "👤 CLIENT:",
          search.customer_name
        );

        /*
        =========================
        LOCK SEARCH
        =========================
        */

        await supabase
          .from("sara_searches")
          .update({
            reservation_status:
              "processing",

            started_at:
              new Date(),

            last_worker_check:
              new Date()
          })
          .eq("id", search.id);

        /*
        =========================
        RETRY COUNT
        =========================
        */

        const currentRetries =
          search.retry_count || 0;

        if (
          currentRetries >=
          MAX_RETRIES
        ) {

          console.log(
            "❌ MAX RETRIES"
          );

          await supabase
            .from("sara_searches")
            .update({
              reservation_status:
                "failed",

              status:
                "max_retries"
            })
            .eq("id", search.id);

          continue;
        }

        /*
        =========================
        ASSIGN BEST WORKER
        =========================
        */

        const { data: workerName } =
          await supabase.rpc(
            "assign_best_worker",
            {
              city_input:
                search.city
            }
          );

        console.log(
          "👷 WORKER:",
          workerName
        );

        /*
        =========================
        SAVE ASSIGNED WORKER
        =========================
        */

        await supabase
          .from("sara_searches")
          .update({
            assigned_worker:
              workerName || "Sara AI"
          })
          .eq("id", search.id);

        /*
        =========================
        SIMULATE APPOINTMENT
        =========================
        */

        const foundAppointment =
          true;

        if (!foundAppointment) {

          console.log(
            "❌ NO APPOINTMENT"
          );

          await supabase
            .from("sara_searches")
            .update({
              reservation_status:
                "searching",

              retry_count:
                currentRetries + 1
            })
            .eq("id", search.id);

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
                workerName || "Sara AI",

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

                city:
                  search.city,

                province:
                  search.province,

                tramite:
                  search.tramite,

                worker_name:
                  workerName || "Sara AI",

                appointment_date:
                  "2026-06-15",

                appointment_hour:
                  "09:30",

                office:
                  "Barcelona Oficina",

                payment_status:
                  "pending",

                confirmed:
                  false,

                reservation_status:
                  "hold_created"
              }
            ]);

        if (insertError) {

          console.log(
            "❌ INSERT ERROR:",
            insertError
          );

          await supabase
            .from("sara_searches")
            .update({
              reservation_status:
                "searching",

              retry_count:
                currentRetries + 1
            })
            .eq("id", search.id);

          continue;
        }

        /*
        =========================
        COMPLETE SEARCH
        =========================
        */

        await supabase
          .from("sara_searches")
          .update({

            status:
              "appointment_found",

            reservation_status:
              "completed",

            completed_at:
              new Date()

          })
          .eq("id", search.id);

        console.log(
          "🎉 COMPLETED"
        );

      } catch (singleError) {

        console.log(
          "❌ SEARCH ERROR:",
          singleError
        );

        await supabase
          .from("sara_searches")
          .update({
            reservation_status:
              "searching",

            retry_count:
              (search.retry_count || 0) + 1
          })
          .eq("id", search.id);

      }

    }

    return res.status(200).json({
      success: true,
      message: "Sara Worker Completed"
    });

  } catch (err) {

    console.log(
      "❌ GLOBAL ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }

}
