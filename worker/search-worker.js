const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runWorker() {

  console.log("🔥 Sara Worker Started");

  const { data, error } = await supabase
    .from("search_queue")
    .select("*")
    .eq("status", "waiting")
    .limit(5);

  if (error) {
    console.log(error);
    return;
  }

  if (!data?.length) {

    console.log("❌ No clients waiting");

    return;
  }

  for (const client of data) {

    console.log("🔍 Searching cita for:");

    console.log(client.customer_name);

    /*
    هنا غادي يجي Playwright الحقيقي
    */

    const fakeFound = Math.random() > 0.7;

    if (fakeFound) {

      console.log("✅ Cita encontrada");

      const token =
        Math.random().toString(36).substring(2, 12);

      await supabase
        .from("found_appointments")
        .insert([
          {
            queue_id: client.id,

            customer_name: client.customer_name,

            customer_phone: client.customer_phone,

            customer_email: client.customer_email,

            tramite: client.tramite,

            province: client.province,

            city: client.city,

            appointment_date: "28/05/2026",

            appointment_hour: "09:30",

            office: "Policía Madrid Centro",

            confirmation_token: token,

            payment_status: "pending",
          },
        ]);

      await supabase
        .from("search_queue")
        .update({
          status: "found",
        })
        .eq("id", client.id);

      console.log("📲 Ready for WhatsApp");

    } else {

      console.log("❌ No cita found");

    }

  }

}

runWorker();
