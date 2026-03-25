import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "es" | "darija" | "en";

const translations = {
  es: {
    nav_inicio: "Inicio",
    nav_panel: "Panel",
    nav_citas: "Citas",
    nav_reg: "Regularización 2026",
    nav_login: "Iniciar sesión",

    hero_badge: "Agente IA de Extranjería — 100% legal y seguro",
    hero_title_main: "Descubre si puedes regularizarte en España en 5 minutos",
    hero_sub: "Nuestro agente IA analiza tus documentos y te dice si estás listo para conseguir papeles, citas y residencia. Sin esperas, sin gestorías caras.",
    hero_btn1: "Analizar mi caso ahora",
    hero_btn2: "Ver mi panel",
    hero_trust: "Más de 3.800 inmigrantes ya han usado GestoriaCitaIA",

    hero_title_1: "Descubre si puedes regularizarte",
    hero_title_2: "en España en 5 minutos",

    agents_title: "Tus Agentes IA disponibles 24/7",
    agents_sub: "Especialistas digitales que te acompañan en cada trámite",
    agent_mo_role: "Especialista en Extranjería",
    agent_mo_desc: "Tramita tu NIE, TIE, visados y residencia con IA en tiempo real.",
    agent_mo_btn: "Hablar con Mohamed",
    agent_sara_role: "Asesora de Citas 24/7",
    agent_sara_desc: "Busca y reserva tu cita en comisaría de extranjería al instante.",
    agent_sara_btn: "Buscar mi cita",

    plans_title: "Planes de servicio",
    plans_sub: "Elige el plan que mejor se adapta a tu situación",
    plan_free_btn: "Empezar gratis",
    plan_btn: "Seleccionar",
    plan_popular: "POPULAR",

    plan_free_name: "GRATIS",
    plan_cita_name: "BUSCAR CITA",
    plan_std_name: "ESTÁNDAR",

    plan_free_f1: "Consulta inicial con agente IA",
    plan_free_f2: "Descubre si puedes regularizarte",
    plan_free_f3: "Ver cómo funciona el proceso",
    plan_free_f4: "Sin tarjeta de crédito",

    plan_cita_f1: "Búsqueda avanzada de citas (más rápida)",
    plan_cita_f2: "Aviso prioritario por WhatsApp",
    plan_cita_f3: "Guía paso a paso hasta confirmar la cita",
    plan_cita_f4: "Asistente IA 24/7 (prioridad)",
    plan_cita_f5: "Hasta 3 oportunidades de cita al mes",
    plan_cita_f6: "Mayor probabilidad de conseguir cita",

    plan_std_f1: "3 trámites activos",
    plan_std_f2: "Citas ilimitadas al mes",
    plan_std_f3: "Videollamada con agente IA",
    plan_std_f4: "Soporte prioritario",
    plan_std_f5: "Aviso automático por WhatsApp",
    plan_std_f6: "Historial completo del trámite",
    plan_std_f7: "Descargar PDF de documentos",

    tramites_title: "Trámites que gestionamos",
    tramites_sub: "Todos los trámites de extranjería, gestionados por IA en tiempo real",

    buscar_title: "Buscar Citas",
    buscar_tramite: "TRÁMITE",
    buscar_fecha: "FECHA",
    buscar_hora: "HORA",
    buscar_confirmada: "CITA CONFIRMADA",
    buscar_confirmada_msg: "Tu cita ha sido reservada. Recibirás los datos por WhatsApp.",
    buscar_confirmar: "Confirmar cita y recibir PDF por WhatsApp",
    buscar_pasos: "PASOS",
    buscar_chat_open: "Prefiero escribir · Abrir chat",
    buscar_chat_close: "Cerrar chat",
    buscar_chat_placeholder: "Escribe tu pregunta...",
    buscar_mute: "Mute",
    buscar_sin_audio: "Sin audio",
    buscar_docs: "Documentos",
    buscar_forms: "Formularios",

    reg_title: "Regularización 2026",
    reg_sub: "Tramita tu regularización en España con ayuda del agente IA",
    reg_new: "NUEVO",
    reg_activar: "Activar plan",
    reg_sit: "SITUACIÓN ACTUAL",
    reg_docs: "VERIFICACIÓN DE DOCUMENTOS",
    reg_docs_btn: "Verificar todos los documentos con IA",
    reg_datos: "DATOS DE LA SOLICITUD",
    reg_enviar: "Enviar solicitud",
    reg_success_title: "¡SOLICITUD ENVIADA!",
    reg_success_sub: "Regularización 2026 · Arraigo Laboral",
    reg_pdf: "Descargar PDF",
    reg_whatsapp_sent: "Resguardo enviado por WhatsApp",
    reg_chat_open: "Prefiero escribir · Abrir chat",
    reg_chat_close: "Cerrar chat",

    panel_title: "Panel Personal",
    panel_nie: "NIE / Número Identidad",
    panel_name: "Nombre completo",
    panel_nationality: "Nacionalidad",
    panel_address: "Dirección",
    panel_phone: "Teléfono",
    panel_email: "Correo electrónico",

    payment_title: "Pago seguro con Stripe",
    payment_secure: "Pago 100% seguro · SSL cifrado · Powered by Stripe",
    payment_select: "Elegir plan",
    payment_rec: "Recomendado",

    payment_processing: "Procesando pago...",
    payment_cancel: "Puedes cancelar en cualquier momento · Sin permanencia",
    payment_choose: "Elige tu plan",
    payment_selected: "Seleccionado",
    payment_pay: "Pagar",
    payment_activate: "Activar",
  },

  en: {
    nav_inicio: "Home",
    nav_panel: "Panel",
    nav_citas: "Appointments",
    nav_reg: "Regularisation 2026",
    nav_login: "Sign in",

    hero_badge: "Immigration AI Agent — 100% legal & safe",
    hero_title_main: "Find out in 5 minutes if you can regularise your status in Spain",
    hero_sub: "Our AI agent analyses your documents and tells you if you're ready to get your papers, appointments and residency. No waiting, no expensive agencies.",
    hero_btn1: "Analyse my case now",
    hero_btn2: "My dashboard",
    hero_trust: "Over 3,800 immigrants have already used GestoriaCitaIA",

    hero_title_1: "Find out if you can regularise",
    hero_title_2: "your status in Spain in 5 minutes",

    agents_title: "Your AI Agents available 24/7",
    agents_sub: "Digital specialists who assist you through every procedure",
    agent_mo_role: "Immigration Specialist",
    agent_mo_desc: "Process your NIE, TIE, visas and residency permit with AI in real time.",
    agent_mo_btn: "Talk to Mohamed",
    agent_sara_role: "Appointment Advisor 24/7",
    agent_sara_desc: "Find and book your appointment at the immigration office instantly.",
    agent_sara_btn: "Find my appointment",

    plans_title: "Service plans",
    plans_sub: "Choose the plan that best fits your situation",
    plan_free_btn: "Start for free",
    plan_btn: "Select",
    plan_popular: "POPULAR",

    plan_free_name: "FREE",
    plan_cita_name: "APPOINTMENT",
    plan_std_name: "STANDARD",

    plan_free_f1: "Initial consultation with AI agent",
    plan_free_f2: "Discover if you can regularise",
    plan_free_f3: "See how the process works",
    plan_free_f4: "No credit card required",

    plan_cita_f1: "Advanced appointment search (faster)",
    plan_cita_f2: "Priority WhatsApp notifications",
    plan_cita_f3: "Step-by-step guide to confirm appointment",
    plan_cita_f4: "AI assistant 24/7 (priority)",
    plan_cita_f5: "Up to 3 appointment slots per month",
    plan_cita_f6: "Higher chance of getting an appointment",

    plan_std_f1: "3 active procedures",
    plan_std_f2: "Unlimited appointments per month",
    plan_std_f3: "Video call with AI agent",
    plan_std_f4: "Priority support",
    plan_std_f5: "Automatic WhatsApp notifications",
    plan_std_f6: "Full procedure history",
    plan_std_f7: "Download PDF documents",

    tramites_title: "Procedures we handle",
    tramites_sub: "All immigration procedures, managed by AI in real time",

    buscar_title: "Find Appointments",
    buscar_tramite: "PROCEDURE",
    buscar_fecha: "DATE",
    buscar_hora: "TIME",
    buscar_confirmada: "APPOINTMENT CONFIRMED",
    buscar_confirmada_msg: "Your appointment has been booked. You will receive details via WhatsApp.",
    buscar_confirmar: "Confirm appointment and receive PDF via WhatsApp",
    buscar_pasos: "STEPS",
    buscar_chat_open: "I prefer to write · Open chat",
    buscar_chat_close: "Close chat",
    buscar_chat_placeholder: "Type your question...",
    buscar_mute: "Mute",
    buscar_sin_audio: "No audio",
    buscar_docs: "Documents",
    buscar_forms: "Forms",

    reg_title: "Regularisation 2026",
    reg_sub: "Process your regularisation in Spain with AI agent assistance",
    reg_new: "NEW",
    reg_activar: "Activate plan",
    reg_sit: "CURRENT SITUATION",
    reg_docs: "DOCUMENT VERIFICATION",
    reg_docs_btn: "Verify all documents with AI",
    reg_datos: "APPLICATION DATA",
    reg_enviar: "Submit application",
    reg_success_title: "APPLICATION SUBMITTED!",
    reg_success_sub: "Regularisation 2026 · Labour Rootedness",
    reg_pdf: "Download PDF",
    reg_whatsapp_sent: "Receipt sent via WhatsApp",
    reg_chat_open: "I prefer to write · Open chat",
    reg_chat_close: "Close chat",

    panel_title: "Personal Dashboard",
    panel_nie: "NIE / Identity Number",
    panel_name: "Full name",
    panel_nationality: "Nationality",
    panel_address: "Address",
    panel_phone: "Phone",
    panel_email: "Email address",

    payment_title: "Secure payment with Stripe",
    payment_secure: "100% secure payment · SSL encrypted · Powered by Stripe",
    payment_select: "Choose plan",
    payment_rec: "Recommended",

    payment_processing: "Processing payment...",
    payment_cancel: "Cancel anytime · No commitment",
    payment_choose: "Choose your plan",
    payment_selected: "Selected",
    payment_pay: "Pay",
    payment_activate: "Activate",
  },

  darija: {
    nav_inicio: "البداية",
    nav_panel: "لوحتي",
    nav_citas: "المواعيد",
    nav_reg: "التسوية 2026",
    nav_login: "دخول",

    hero_badge: "وكيل ذكاء اصطناعي للهجرة — قانوني 100%",
    hero_title_main: "اعرف في 5 دقائق واش يمكنك تصلح وضعيتك في إسبانيا",
    hero_sub: "وكيلنا بالذكاء الاصطناعي كيحلل وراقك ويقولك واش أنت مستعد تجيب الإقامة والمواعيد والأوراق. بلا انتظار، بلا مكاتب غالية.",
    hero_btn1: "حلل حالتي دابا",
    hero_btn2: "شوف لوحتي",
    hero_trust: "أكثر من 3.800 مهاجر استخدموا GestoriaCitaIA",

    hero_title_1: "اعرف واش يمكنك تصلح وضعيتك",
    hero_title_2: "في إسبانيا في 5 دقائق",

    agents_title: "وكلاؤك بالذكاء الاصطناعي 24/7",
    agents_sub: "متخصصون رقميون كيرافقوك في كل خطوة",
    agent_mo_role: "متخصص في الهجرة",
    agent_mo_desc: "صلح NIE و TIE والتأشيرة والإقامة بالذكاء الاصطناعي في الوقت الحقيقي.",
    agent_mo_btn: "هضر مع محمد",
    agent_sara_role: "مستشارة المواعيد 24/7",
    agent_sara_desc: "قلب وحجز موعدك في مفوضية الهجرة على الفور.",
    agent_sara_btn: "قلب على موعدي",

    plans_title: "الباقات",
    plans_sub: "اختار الباقة اللي تناسبك",
    plan_free_btn: "ابدا بالمجان",
    plan_btn: "اختار",
    plan_popular: "الأكثر طلباً",

    plan_free_name: "مجاني",
    plan_cita_name: "الموعد",
    plan_std_name: "القياسي",

    plan_free_f1: "استشارة أولية مع وكيل الذكاء الاصطناعي",
    plan_free_f2: "اكتشف واش يمكنك تصلح وضعيتك",
    plan_free_f3: "شوف كيفاش كيخدم الذكاء الاصطناعي",
    plan_free_f4: "بلا كارط بنكية",

    plan_cita_f1: "بحث متقدم عن المواعيد (أسرع)",
    plan_cita_f2: "إشعارات واتساب ذات أولوية",
    plan_cita_f3: "دليل خطوة بخطوة لتأكيد الموعد",
    plan_cita_f4: "وكيل ذكاء اصطناعي 24/7 (أولوية)",
    plan_cita_f5: "حتى 3 فرص للموعد في الشهر",
    plan_cita_f6: "احتمال أكبر للحصول على موعد",

    plan_std_f1: "3 خدمات نشطة",
    plan_std_f2: "مواعيد غير محدودة في الشهر",
    plan_std_f3: "مكالمة فيديو مع الوكيل الذكاء الاصطناعي",
    plan_std_f4: "دعم ذو أولوية",
    plan_std_f5: "إشعار تلقائي عبر واتساب",
    plan_std_f6: "سجل كامل للخدمة",
    plan_std_f7: "تحميل وثائق PDF",

    tramites_title: "الخدمات اللي كنديروها",
    tramites_sub: "جميع خدمات الهجرة، مُدارة بالذكاء الاصطناعي في الوقت الحقيقي",

    buscar_title: "قلب على مواعيد",
    buscar_tramite: "الخدمة",
    buscar_fecha: "التاريخ",
    buscar_hora: "الوقت",
    buscar_confirmada: "الموعد متأكد",
    buscar_confirmada_msg: "تحجز الموعد ديالك. غادي يوصلك التفاصيل على واتساب.",
    buscar_confirmar: "تأكيد الموعد واستلام PDF على واتساب",
    buscar_pasos: "الخطوات",
    buscar_chat_open: "نفضل نكتب · فتح الشات",
    buscar_chat_close: "قفل الشات",
    buscar_chat_placeholder: "كتب سؤالك هنا...",
    buscar_mute: "كتم الصوت",
    buscar_sin_audio: "بلا صوت",
    buscar_docs: "الوثائق",
    buscar_forms: "الاستمارات",

    reg_title: "التسوية 2026",
    reg_sub: "صلح التسوية ديالك في إسبانيا بمساعدة وكيل الذكاء الاصطناعي",
    reg_new: "جديد",
    reg_activar: "فعّل الباقة",
    reg_sit: "الوضعية الحالية",
    reg_docs: "التحقق من الوثائق",
    reg_docs_btn: "تحقق من جميع الوثائق بالذكاء الاصطناعي",
    reg_datos: "بيانات الطلب",
    reg_enviar: "ارسل الطلب",
    reg_success_title: "تم إرسال الطلب!",
    reg_success_sub: "التسوية 2026 · Arraigo Laboral",
    reg_pdf: "حمّل PDF",
    reg_whatsapp_sent: "تم إرسال الوصل على واتساب",
    reg_chat_open: "نفضل نكتب · فتح الشات",
    reg_chat_close: "قفل الشات",

    panel_title: "لوحتي الشخصية",
    panel_nie: "NIE / رقم الهوية",
    panel_name: "الاسم الكامل",
    panel_nationality: "الجنسية",
    panel_address: "العنوان",
    panel_phone: "الهاتف",
    panel_email: "البريد الإلكتروني",

    payment_title: "دفع آمن مع Stripe",
    payment_secure: "دفع آمن 100% · SSL مشفر · Powered by Stripe",
    payment_select: "اختار الباقة",
    payment_rec: "الأنسب",

    payment_processing: "جاري معالجة الدفع...",
    payment_cancel: "يمكنك الإلغاء في أي وقت · بلا التزام",
    payment_choose: "اختار باقتك",
    payment_selected: "مختار",
    payment_pay: "ادفع",
    payment_activate: "فعّل",
  },
};

type TranslationKey = keyof typeof translations.es;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  const t = (key: TranslationKey): string => {
    return (translations[lang] as Record<string, string>)[key] ?? (translations.es as Record<string, string>)[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <div dir={lang === "darija" ? "rtl" : "ltr"} lang={lang === "darija" ? "ar" : lang === "en" ? "en" : "es"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
