import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MaltaApplicationData {
  plan: "weekly" | "monthly";
  fullName: string;
  whatsapp: string;
  email: string;
  nationality: string;
  currentCity: string;
  fechaNacimiento: string;
  idiomas: string;
  ingles_nivel: string;
  frances_nivel: string;
  italiano_nivel: string;
  espanol_nivel: string;
  arabe_nivel: string;
  aleman_nivel: string;
  trabajo_busca: string;
  experiencia_previa: string;
  anos_experiencia: string;
  education_level: string;
  carnetConducir: string;
  photoUrl: string | null;
  pdfUrl: string | null;
  payment_method: "stripe" | "paypal";
  payment_id: string;
  payment_customer_id?: string;
  payment_intent?: string;
   skipQueue?: boolean;
}

export interface SaveResult {
  applicationId: string;
  isNew: boolean;
}

export async function saveMaltaApplication(data: MaltaApplicationData): Promise<SaveResult> {
  console.log("=========================================");
  console.log("📦 saveMaltaApplication RECIBIDO:");
  console.log(`  - payment_method: ${data.payment_method}`);
  console.log(`  - payment_id: ${data.payment_id}`);
  console.log(`  - fullName: ${data.fullName}`);
  console.log(`  - email: ${data.email}`);
  console.log("=========================================");

  try {
    // ✅ 1. VERIFICAR SI YA EXISTE
    let query;
    
    if (data.payment_method === "stripe") {
      query = supabase
        .from("malta_applications")
        .select("id")
        .eq("stripe_session_id", data.payment_id);
    } else {
      query = supabase
        .from("malta_applications")
        .select("id")
        .eq("paypal_order_id", data.payment_id);
    }

    const { data: existing } = await query.maybeSingle();

    let applicationId: string;
    let isNew = false;

    // ✅ 2. SI EXISTE → ACTUALIZAR
    if (existing) {
      applicationId = existing.id;
      console.log(`🔄 Actualizando aplicación existente: ${applicationId}`);
      
      const updateData: any = {
        full_name: data.fullName,
        whatsapp: data.whatsapp,
        email: data.email,
        nacionalidad: data.nationality,
        nationality: data.nationality,
        current_city: data.currentCity,
        fecha_nacimiento: data.fechaNacimiento || null,
        idiomas: data.idiomas,
        ingles_nivel: data.ingles_nivel,
        frances_nivel: data.frances_nivel,
        italiano_nivel: data.italiano_nivel,
        espanol_nivel: data.espanol_nivel,
        arabe_nivel: data.arabe_nivel,
        aleman_nivel: data.aleman_nivel,
        profesion: data.trabajo_busca,
        sectores: data.experiencia_previa,
        anos_experiencia: data.anos_experiencia,
        education_level: data.education_level,
        carnet_conducir: data.carnetConducir,
        photo_url: data.photoUrl,
        pdf_url: data.pdfUrl,
        plan: data.plan,
        paid: true,
        updated_at: new Date().toISOString(),
      };

      if (data.payment_method === "stripe") {
        if (data.payment_customer_id) updateData.stripe_customer_id = data.payment_customer_id;
      } else {
        if (data.payment_customer_id) updateData.paypal_payer_id = data.payment_customer_id;
      }

      const { error } = await supabase
        .from("malta_applications")
        .update(updateData)
        .eq("id", applicationId);

      if (error) throw error;

      console.log(`✅ Aplicación ${applicationId} actualizada`);

    } else {
      // ✅ 3. SI NO EXISTE → INSERTAR
      isNew = true;
      console.log("🆕 Creando nueva aplicación");

      const insertData: any = {
        full_name: data.fullName,
        whatsapp: data.whatsapp,
        email: data.email,
        nacionalidad: data.nationality,
        nationality: data.nationality,
        current_city: data.currentCity,
        fecha_nacimiento: data.fechaNacimiento || null,
        idiomas: data.idiomas,
        ingles_nivel: data.ingles_nivel,
        frances_nivel: data.frances_nivel,
        italiano_nivel: data.italiano_nivel,
        espanol_nivel: data.espanol_nivel,
        arabe_nivel: data.arabe_nivel,
        aleman_nivel: data.aleman_nivel,
        profesion: data.trabajo_busca,
        sectores: data.experiencia_previa,
        anos_experiencia: data.anos_experiencia,
        education_level: data.education_level,
        carnet_conducir: data.carnetConducir,
        photo_url: data.photoUrl,
        pdf_url: data.pdfUrl,
        plan: data.plan,
        paid: true,
        worker_status: "ready",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (data.payment_method === "stripe") {
        insertData.stripe_session_id = data.payment_id;
        if (data.payment_customer_id) insertData.stripe_customer_id = data.payment_customer_id;
        if (data.payment_intent) insertData.stripe_payment_intent = data.payment_intent;
      } else {
        insertData.paypal_order_id = data.payment_id;
        if (data.payment_customer_id) insertData.paypal_payer_id = data.payment_customer_id;
      }

      const { data: newApp, error } = await supabase
        .from("malta_applications")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      applicationId = newApp.id;
      console.log(`✅ Registro creado: ${applicationId}`);
    }

    // ✅ 4. AÑADIR A LA COLA DE TRABAJO (SOLO SI ES NUEVO)
if (isNew && !data.skipQueue) {
      try {
        const { error: queueError } = await supabase
          .from("worker_queue")
          .insert({
            application_id: applicationId,
            status: "ready",
            priority: 1,
            created_at: new Date().toISOString(),
          });

        if (queueError) {
          console.error("❌ Error en worker_queue:", queueError);
        } else {
          console.log(`✅ Añadido a worker_queue: ${applicationId}`);
        }
      } catch (err) {
        console.error("❌ Error en worker_queue:", err);
      }
    }

    return {
      applicationId,
      isNew,
    };

  } catch (error) {
    console.error("❌ Error en saveMaltaApplication:", error);
    throw error;
  }
}
