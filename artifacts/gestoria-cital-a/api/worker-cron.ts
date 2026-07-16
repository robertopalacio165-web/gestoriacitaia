import type { VercelRequest, VercelResponse } from "@vercel/node";

// Este endpoint se llama cada 2 segundos desde Vercel Cron
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ Verificar que la solicitud viene de Vercel Cron (opcional)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    
    const response = await fetch(
      `${baseUrl}/api/worker-process`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    return res.status(200).json({
      success: true,
      result,
    });

  } catch (error: any) {
    console.error("❌ Cron worker error:", error);
    return res.status(500).json({ error: error.message });
  }
}
