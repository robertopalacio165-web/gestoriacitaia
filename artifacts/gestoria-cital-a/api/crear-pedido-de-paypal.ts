import type { NextApiRequest, NextApiResponse } from "next";

const PAYPAL_BASE = "https://api-m.paypal.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ SOLO ACEPTAMOS GET (el redirect de PayPal)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, plan, fullName, whatsapp, email, nationality, currentCity, fechaNacimiento, idiomas, ingles_nivel, frances_nivel, italiano_nivel, espanol_nivel, arabe_nivel, aleman_nivel, trabajo_busca, experiencia_previa, anos_experiencia, education_level, carnetConducir, photoUrl, pdfUrl } = req.query;

    console.log("=========================================");
    console.log("📦 PAYPAL CAPTURE RECIBIDO:");
    console.log("  - token:", token);
    console.log("  - plan:", plan);
    console.log("  - fullName:", fullName);
    console.log("  - email:", email);
    console.log("=========================================");

    if (!token || typeof token !== "string") {
      console.error("❌ Token no proporcionado");
      return res.redirect(
        `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=error&message=missing_token`
      );
    }

    const clientId = process.env.PAYPAL_CLIENT_ID!;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

    const auth = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    // ✅ 1. OBTENER TOKEN DE ACCESO
    const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("❌ Error obteniendo token PayPal:", errorText);
      return res.redirect(
        `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=error&message=auth_failed`
      );
    }

    const access = await tokenRes.json();

    // ✅ 2. CAPTURAR EL PAGO
    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${token}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!captureRes.ok) {
      const errorText = await captureRes.text();
      console.error("❌ Error capturando pago PayPal:", errorText);
      return res.redirect(
        `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=error&message=capture_failed`
      );
    }

    const capture = await captureRes.json();

    console.log("✅ Pago PayPal capturado:", capture.id);

    // ✅ 3. VERIFICAR QUE EL PAGO FUE EXITOSO
    if (capture.status !== "COMPLETED") {
      console.error("❌ Pago no completado:", capture.status);
      return res.redirect(
        `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=error&message=payment_not_completed`
      );
    }

    // ✅ 4. OBTENER EL PAYER ID
    const payerId = capture.payer?.payer_id || capture.payer?.id || "";

    // ✅ 5. ENVIAR TODOS LOS DATOS A capturar-pago-paypal
    console.log("📤 Enviando datos a capturar-pago-paypal...");

    const payload = {
      plan: plan || "monthly",
      fullName: fullName || "",
      whatsapp: whatsapp || "",
      email: email || "",
      nationality: nationality || "",
      currentCity: currentCity || "",
      fechaNacimiento: fechaNacimiento || "",
      idiomas: idiomas || "",
      ingles_nivel: ingles_nivel || "",
      frances_nivel: frances_nivel || "",
      italiano_nivel: italiano_nivel || "",
      espanol_nivel: espanol_nivel || "",
      arabe_nivel: arabe_nivel || "",
      aleman_nivel: aleman_nivel || "",
      trabajo_busca: trabajo_busca || "",
      experiencia_previa: experiencia_previa || "",
      anos_experiencia: anos_experiencia || "",
      education_level: education_level || "",
      carnetConducir: carnetConducir || "None",
      photoUrl: photoUrl || "",
      pdfUrl: pdfUrl || "",
      paypal_order_id: capture.id,
      paypal_payer_id: payerId,
    };

    console.log("📦 Payload enviado:");
    console.log(JSON.stringify(payload, null, 2));

    // ✅ 6. LLAMAR A capturar-pago-paypal
    const processRes = await fetch(
      `${process.env.NEXT_PUBLIC_URL}/api/capturar-pago-paypal`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!processRes.ok) {
      const errorText = await processRes.text();
      console.error("❌ Error en capturar-pago-paypal:", errorText);
      return res.redirect(
        `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=success&warning=processing_error`
      );
    }

    const result = await processRes.json();
    console.log("✅ Resultado de capturar-pago-paypal:", result);

    // ✅ 7. REDIRIGIR CON ÉXITO
    return res.redirect(
      `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=success&application_id=${result.applicationId}`
    );

  } catch (error) {
    console.error("❌ Error en create-paypal-order:", error);
    return res.redirect(
      `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=error&message=server_error`
    );
  }
}
