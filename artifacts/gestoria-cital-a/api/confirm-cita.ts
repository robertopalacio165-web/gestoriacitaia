import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  try {

    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: "Missing token",
      });
    }

    const { data, error } = await supabase
      .from("found_appointments")
      .select("*")
      .eq("confirmation_token", token)
      .single();

    if (error || !data) {

      return res.status(404).json({
        error: "Appointment not found",
      });

    }

    return res.status(200).json({
      success: true,
      appointment: data,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Server error",
    });

  }

}
