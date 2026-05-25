import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  try {

    console.log("🚀 Sara Worker Running...");

    return res.status(200).json({
      success: true,
      message: "worker alive"
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }

}
