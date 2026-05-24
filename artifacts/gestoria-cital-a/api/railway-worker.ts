import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: any,
  res: any
) {

  try {

    /*
    =====================================
    GET ACTIVE SEARCHES
    =====================================
    */

    const { data: searches } =
      await supabase
        .from("sara_searches")
        .select("*")
        .eq("status", "searching")
        .limit(5);

    console.log(
      "🔎 SEARCHES:",
      searches?.length || 0
    );

    /*
    =====================================
    LOOP SEARCHES
    =====================================
    */

    for (const search of searches || []) {

      console.log(
        "🚀 PROCESS:",
        search.customer_name
      );

      /*
      =====================================
      ASSIGN WORKER
      =====================================
      */

      const { data: workerData } =
        await supabase.rpc(
          "assign_best_worker",
          {
            city_input:
              search.city,
          }
        );

      const workerName =
        workerData;

      console.log(
        "👷 WORKER:",
        workerName
      );

      /*
      =====================================
      SIMULATE FOUND APPOINTMENT
      =====================================
      */

      const foundAppointment =
        Math.random() > 0.7;

      if (foundAppointment) {

        console.log(
          "🔥 APPOINTMENT FOUND"
        );

        /*
        CREATE HOLD
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
                "09:30",
            }
          );

        console.log(
          "✅ HOLD CREATED:",
          holdId
        );

        /*
        SAVE FOUND APPOINTMENT
        */

        await supabase
          .from("found_appointments")
          .insert([
            {
              search_id:
                search.id,

              city:
                search.city,

              worker_name:
                workerName,

              appointment_date:
                "2026-06-15",

              appointment_time:
                "09:30",

              customer_name:
                search.customer_name,

              customer_phone:
                search.customer_phone,

              customer_email:
                search.customer_email,

              reservation_status:
                "hold_created",
            },
          ]);

        /*
        UPDATE SEARCH STATUS
        */

        await supabase
          .from("sara_searches")
          .update({
            status:
              "appointment_found",
          })
          .eq(
            "id",
            search.id
          );

      }

    }

    return res.status(200).json({
      success: true,
    });

  } catch (err: any) {

    console.log(err);

    return res.status(500).json({
      error: err.message,
    });

  }

}
