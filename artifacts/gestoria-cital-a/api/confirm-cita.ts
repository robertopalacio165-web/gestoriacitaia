import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      token,
      appointment_id,
      full_name,
      phone,
      tramite,
      city,
      office,
      date,
      time,
    } = req.body;

    // 1. نحفظ الكليان
    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          token,
          appointment_id,
          full_name,
          phone,
          tramite,
          city,
          office,
          date,
          time,
          status: "searching",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "DB error" });
    }

    // 2. نصيفط ل Make (WhatsApp)
    await fetch(process.env.MAKE_WEBHOOK_SARA!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "NEW_SEARCH",
        lead: data,
        message:
          "شكراً على الثقة ديالك 🙏\nدابا بدينا نقلبو ليك على cita ديالك، وغادي نعلموك فـ WhatsApp ملي نلقاوها.",
      }),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
