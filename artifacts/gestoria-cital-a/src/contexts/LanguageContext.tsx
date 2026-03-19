import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "es" | "darija" | "en";

const translations = {
  es: {
    nav_inicio: "Inicio",
    nav_panel: "Panel",
    nav_citas: "Citas",
    nav_reg: "Regularización 2026",
    nav_login: "Iniciar sesión",

    hero_badge: "Agente IA de Extranjería v2.0 Activo",
    hero_title_1: "Tu Gestoría de Extranjería",
    hero_title_2: "con Inteligencia Artificial",
    hero_sub: "Nuestros agentes IA te guían paso a paso en tiempo real para conseguir tu cita y tramitar tus documentos de extranjería desde el móvil.",
    hero_btn1: "Buscar mi cita",
    hero_btn2: "Ver mi panel",

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
  },

  en: {
    nav_inicio: "Home",
    nav_panel: "Panel",
    nav_citas: "Appointments",
    nav_reg: "Regularisation 2026",
    nav_login: "Sign in",

    hero_badge: "Immigration AI Agent v2.0 Active",
    hero_title_1: "Your Immigration Office",
    hero_title_2: "powered by AI",
    hero_sub: "Our AI agents guide you step by step in real time to get your appointment and process your immigration documents from your phone.",
    hero_btn1: "Find my appointment",
    hero_btn2: "My dashboard",

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
  },

  darija: {
    nav_inicio: "البداية",
    nav_panel: "لوحتي",
    nav_citas: "المواعيد",
    nav_reg: "التسوية 2026",
    nav_login: "دخول",

    hero_badge: "وكيل ذكاء اصطناعي نشط للهجرة v2.0",
    hero_title_1: "مكتبك للهجرة",
    hero_title_2: "بالذكاء الاصطناعي",
    hero_sub: "وكلاؤنا بالذكاء الاصطناعي كيرشدوك خطوة بخطوة في الوقت الحقيقي باش تجيب موعدك وتصلح وراقك ديال الهجرة من التيليفون.",
    hero_btn1: "قلب على موعد",
    hero_btn2: "شوف لوحتي",

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
