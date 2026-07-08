// server/api/create-checkout-malta.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      plan,
      fullName,
      whatsapp,
      email,
      nacionalidad,
      paisResidencia,
      fechaNacimiento,
      nivelIngles,
      otrosIdiomas,
      profesion,
      añosExperiencia,
      estudios,
      carnetConducir,
      tieneCV,
      puestoBusca,
      disponibilidadViajar,
      fechaDisponible,
    } = req.body;

    // Determinar precio y descripción según el plan
    const price = plan === 'weekly' ? 1999 : 2999; // en céntimos
    const planName = plan === 'weekly' ? 'Plan Semanal' : 'Plan Mensual';
    const planDays = plan === 'weekly' ? '7 días' : '30 días';
    const planApplications = plan === 'weekly' ? '70 candidaturas' : '300 candidaturas';

    // Crear el checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Trabajo en Malta - ${planName}`,
              description: `${planDays} · ${planApplications} · CV IA · Carta IA · WhatsApp`,
              images: ['https://tu-dominio.com/images/malta-logo.png'],
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/trabajo-malta?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/trabajo-malta?canceled=true`,
      customer_email: email,
      metadata: {
        plan,
        fullName,
        whatsapp,
        email,
        nacionalidad,
        paisResidencia,
        fechaNacimiento,
        nivelIngles,
        otrosIdiomas,
        profesion,
        añosExperiencia,
        estudios,
        carnetConducir,
        tieneCV,
        puestoBusca,
        disponibilidadViajar,
        fechaDisponible,
        service: 'malta',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}
