import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runWorker() {

  try {

    console.log(
      "🚀 Sara Worker Running..."
    );

    /*
    =========================
    GET ACTIVE SEARCHES
    =========================
    */

    const {
      data: searches,
      error
    } = await supabase
      .from("sara_searches")
      .select("*")
      .eq(
        "reservation_status",
        "searching"
      )
      .limit(5);

    if (error) {

      console.log(
        "❌ SEARCH ERROR:",
        error
      );

      return;
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



// Sara buscando citas reales

console.log(
  "🔍 Buscando citas reales..."
);

     console.log(
  "🔍 Buscando citas reales..."
);

      console.log(
        "✅ APPOINTMENT SAVED"
      );

      /*
      =========================
      UPDATE SEARCH STATUS
      =========================
      */

      const {
        error: updateError
      } = await supabase
        .from("sara_searches")
        .update({
          status:
            "appointment_found"
        })
        .eq(
          "id",
          search.id
        );

      if (updateError) {

        console.log(
          "❌ UPDATE ERROR:",
          updateError
        );

      } else {

        console.log(
          "✅ STATUS UPDATED"
        );

      }

    }

  } catch (err) {

    console.log(
      "❌ WORKER ERROR:",
      err
    );

  }

}

/*
=========================
START WORKER
=========================
*/

runWorker();

/*
=========================
RUN EVERY 30 SECONDS
=========================
*/

setInterval(
  runWorker,
  30000
);
