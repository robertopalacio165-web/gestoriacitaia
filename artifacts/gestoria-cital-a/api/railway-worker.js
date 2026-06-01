import crypto from "crypto";
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
    ====================================
    INTERNAL REASSIGNMENT ENGINE
    ====================================
    */

    const now = new Date();

    const { data: expiredAppointments } =
      await supabase
        .from("found_appointments")
        .select("*")
        .lt(
          "expires_at",
          now.toISOString()
        )
        .eq(
          "payment_status",
          "pending"
        )
        .eq(
          "reassigned",
          false
        );

    for (const appointment of expiredAppointments || []) {

      console.log(
        "♻️ REASSIGN:",
        appointment.customer_name
      );

      /*
      ====================================
      FIND NEXT CLIENT
      ====================================
      */

      const { data: nextClient } =
        await supabase
          .from("sara_searches")
          .select("*")
          .eq(
            "reservation_status",
            "searching"
          )
          .eq(
            "city",
            appointment.city
          )
          .eq(
            "tramite",
            appointment.tramite
          )
          .order(
            "priority_level",
            { ascending: false }
          )
          .limit(1)
          .single();

      if (!nextClient) {

        console.log(
          "❌ NO NEXT CLIENT"
        );

        continue;
      }

      /*
      ====================================
      CREATE NEW ASSIGNMENT
      ====================================
      */

      const reassignedToken =
        crypto.randomUUID();

      await supabase
        .from("found_appointments")
        .insert([
          {

            queue_id:
              nextClient.id,

            customer_name:
              nextClient.customer_name,

            customer_phone:
              nextClient.customer_phone,

            customer_email:
              nextClient.customer_email,

            city:
              appointment.city,

            province:
              nextClient.province,

            tramite:
              appointment.tramite,

            worker_name:
              "Sara AI",

            appointment_date:
              appointment.appointment_date,

            appointment_hour:
              appointment.appointment_hour,

            office:
              appointment.office,

            payment_status:
              "pending",

            confirmed:
              false,

            reservation_status:
              "reassigned",

            confirmation_token:
              reassignedToken,

            expires_at:
              new Date(
                Date.now() + 5 * 60 * 1000
              )
          }
        ]);

      /*
      ====================================
      MARK OLD AS REASSIGNED
      ====================================
      */

      await supabase
        .from("found_appointments")
        .update({
          reassigned:
            true,

          reservation_status:
            "reassigned_old"
        })
        .eq(
          "id",
          appointment.id
        );

      /*
      ====================================
      UPDATE CLIENT STATUS
      ====================================
      */

      await supabase
        .from("sara_searches")
        .update({
          reservation_status:
            "completed",

          status:
            "appointment_found"
        })
        .eq(
          "id",
          nextClient.id
        );

      console.log(
        "✅ REASSIGNED"
      );

    }

    /*
    ====================================
    RESET STUCK SEARCHES
    ====================================
    */

    await supabase
      .from("sara_searches")
      .update({
        reservation_status:
          "searching"
      })
      .eq(
        "reservation_status",
        "processing"
      );

    /*
    ====================================
    GET SEARCHES
    ====================================
    */

    const { data: searches, error } =
      await supabase
        .from("sara_searches")
        .select("*")
        .eq(
          "reservation_status",
          "searching"
        )
        .order(
          "priority_level",
          { ascending: false }
        )
        .limit(5);

    if (error) {
      throw error;
    }

    /*
    ====================================
    LOOP SEARCHES
    ====================================
    */

    for (const search of searches || []) {

      try {

        /*
        ====================================
        LOCK SEARCH
        ====================================
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
        ====================================
        RETRIES
        ====================================
        */

        const currentRetries =
          search.retry_count || 0;

        if (
          currentRetries >=
          MAX_RETRIES
        ) {

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
        ====================================
        ASSIGN WORKER
        ====================================
        */

        const { data: workerName } =
          await supabase.rpc(
            "assign_best_worker",
            {
              city_input:
                search.city
            }
          );

        /*
        ====================================
        APPOINTMENT FOUND
        ====================================
        */

      const foundAppointment =
  false;

        if (!foundAppointment) {

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

        const { data: existingAppointment } = await supabase
  .from("found_appointments")
  .select("id")
  .eq("queue_id", search.id)
  .limit(1);

if (existingAppointment && existingAppointment.length > 0) {

  await supabase
    .from("sara_searches")
    .update({
      status: "appointment_found",
      reservation_status: "completed"
    })
    .eq("id", search.id);

  continue;
}
        /*
        ====================================
        SAVE APPOINTMENT
        ====================================
        */

        const expirationDate =
          new Date(
            Date.now() + 5 * 60 * 1000
          );

        const confirmationToken =
          crypto.randomUUID();

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
                "hold_created",

              confirmation_token:
                confirmationToken,

              expires_at:
                expirationDate
            }
          ]);

        /*
        ====================================
        COMPLETE SEARCH
        ====================================
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
      success: true
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
