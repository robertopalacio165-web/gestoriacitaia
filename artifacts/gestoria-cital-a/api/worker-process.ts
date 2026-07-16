import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Procesar máximo 2 a la vez
const MAX_CONCURRENT = 2;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Obtener cuántos están procesando actualmente
    const { count: processingCount, error: countError } = await supabase
      .from("worker_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing");

    if (countError) {
      console.error("❌ Error counting processing:", countError);
      return res.status(500).json({ error: countError });
    }

    // Si ya hay 2 procesando, no hacer nada
    if ((processingCount || 0) >= MAX_CONCURRENT) {
      console.log(`⏳ Ya hay ${processingCount} procesando, esperando...`);
      return res.status(200).json({
        message: "Already processing",
        processing: processingCount,
      });
    }

    // 2. Obtener el siguiente trabajo pendiente (el más antiguo)
    const { data: nextJob, error: jobError } = await supabase
      .from("worker_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (jobError) {
      console.error("❌ Error getting next job:", jobError);
      return res.status(500).json({ error: jobError });
    }

    if (!nextJob) {
      return res.status(200).json({ message: "No pending jobs" });
    }

    // 3. Marcar como procesando
    const { error: updateError } = await supabase
      .from("worker_queue")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", nextJob.id);

    if (updateError) {
      console.error("❌ Error updating job status:", updateError);
      return res.status(500).json({ error: updateError });
    }

    console.log(`🔄 Procesando trabajo: ${nextJob.application_id}`);

    // 4. Ejecutar la generación
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
      
      const response = await fetch(
        `${baseUrl}/api/generate-malta-documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId: nextJob.application_id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error generating documents");
      }

      // 5. Marcar como completado
      await supabase
        .from("worker_queue")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result: result,
        })
        .eq("id", nextJob.id);

      console.log(`✅ Trabajo completado: ${nextJob.application_id}`);

      return res.status(200).json({
        success: true,
        applicationId: nextJob.application_id,
        result,
      });

    } catch (error: any) {
      console.error(`❌ Error procesando ${nextJob.application_id}:`, error);

      // Marcar como fallido
      await supabase
        .from("worker_queue")
        .update({
          status: "failed",
          error: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", nextJob.id);

      return res.status(500).json({
        error: error.message,
        applicationId: nextJob.application_id,
      });
    }

  } catch (error: any) {
    console.error("❌ Worker error:", error);
    return res.status(500).json({ error: error.message });
  }
}
