import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type Lang = "es" | "en" | "darija";

type TranslationMap = Record<string, string>;

type AllTranslations = Record<Lang, TranslationMap>;

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  isRTL: boolean;
  translations: TranslationMap;
};

const STORAGE_KEY = "gestoriacitaia_lang";

const translations: AllTranslations = {
  es: {
    // NAV
    nav_inicio: "Inicio",
    nav_panel: "Panel",
    nav_citas: "Citas",
    nav_reg: "Regularización 2026",
    nav_login: "Iniciar sesión",
    nav_logout: "Cerrar sesión",
    nav_documentos: "Documentos",
    nav_contacto: "Contacto",
    nav_idioma: "Idioma",

    // HERO
    hero_badge: "Agente IA de Extranjería — 100% legal y seguro",
    hero_title_main: "Descubre si puedes",
    hero_title_highlight: "regularizarte en España",
    hero_sub:
      "Nuestro agente IA analiza tu situación, revisa tus documentos y te guía paso a paso de forma clara, rápida y segura.",
    hero_cta_primary: "Empezar ahora",
    hero_cta_secondary: "Ver cómo funciona",
    hero_trust_1: "Análisis rápido",
    hero_trust_2: "Subida de documentos",
    hero_trust_3: "Preparación en PDF",

    // COMMON
    common_loading: "Cargando...",
    common_error: "Ha ocurrido un error",
    common_success: "Operación realizada correctamente",
    common_cancel: "Cancelar",
    common_save: "Guardar",
    common_close: "Cerrar",
    common_continue: "Continuar",
    common_back: "Atrás",
    common_next: "Siguiente",
    common_send: "Enviar",
    common_yes: "Sí",
    common_no: "No",
    common_required: "Obligatorio",
    common_optional: "Opcional",
    common_select: "Seleccionar",
    common_search: "Buscar",
    common_download: "Descargar",
    common_upload: "Subir",
    common_delete: "Eliminar",
    common_edit: "Editar",
    common_view: "Ver",
    common_free: "Gratis",
    common_paid: "De pago",

    // AUTH
    login_title: "Accede a tu cuenta",
    login_subtitle: "Entra para continuar con tu expediente",
    login_email: "Correo electrónico",
    login_password: "Contraseña",
    login_button: "Entrar",
    login_google: "Continuar con Google",
    login_no_account: "¿No tienes cuenta?",
    login_create_account: "Crear cuenta",
    login_forgot_password: "¿Has olvidado tu contraseña?",
    register_title: "Crear cuenta",
    register_subtitle: "Empieza hoy tu proceso de forma segura",
    register_name: "Nombre completo",
    register_button: "Registrarme",
    register_have_account: "Ya tengo cuenta",

    // PANEL
    panel_title: "Tu panel",
    panel_subtitle: "Gestiona tu proceso desde un solo lugar",
    panel_welcome: "Bienvenido",
    panel_cases: "Tus trámites",
    panel_documents: "Tus documentos",
    panel_notifications: "Notificaciones",
    panel_profile: "Perfil",
    panel_no_data: "Aún no hay datos disponibles",
    panel_header: "Panel",
    panel_tab_docs: "Documentos",
    panel_tab_profile: "Perfil",
    panel_tab_notifications: "Notificaciones",
    panel_plan_active: "Plan activo",
    plan_standard: "Plan estándar",

    // CITAS
    citas_title: "Tus citas",
    citas_subtitle: "Consulta y gestiona tus próximas citas",
    citas_book: "Reservar cita",
    citas_upcoming: "Próximas citas",
    citas_empty: "No tienes citas programadas",
    citas_date: "Fecha",
    citas_time: "Hora",
    citas_type: "Tipo",
    citas_status: "Estado",
    buscar_chat_open: "Abrir chat",
    buscar_chat_close: "Cerrar chat",
    buscar_title: "Buscar citas",
    buscar_subtitle: "Busca citas disponibles de forma rápida",

    // DOCUMENTOS
    docs_title: "Tus documentos",
    docs_subtitle: "Sube, revisa y verifica tus documentos",
    docs_upload: "Subir documento",
    docs_drag_drop: "Arrastra tu archivo aquí o haz clic para subirlo",
    docs_supported: "Formatos permitidos: PDF, JPG, PNG",
    docs_verification: "Verificación",
    docs_verified: "Verificado",
    docs_pending: "Pendiente",
    docs_rejected: "Rechazado",
    docs_no_docs: "Todavía no has subido documentos",

    // REGULARIZACION
    reg_title: "Regularización 2026",
    reg_subtitle:
      "Descubre si cumples los requisitos y prepara tu caso con ayuda de IA",
    reg_badge: "Nuevo proceso",
    reg_cta: "Comprobar ahora",
    reg_step_1: "Responde unas preguntas",
    reg_step_2: "Sube tus pruebas y documentos",
    reg_step_3: "Recibe el análisis y recomendaciones",
    reg_step_4: "Descarga tu documentación preparada",
    reg_eligibility_title: "Comprobación de elegibilidad",
    reg_eligibility_sub:
      "Evaluamos tu situación con preguntas simples y directas",
    reg_alert_text: "Consulta la información y revisa si cumples los requisitos.",

    // FEATURES
    feature_ai_title: "Análisis con IA",
    feature_ai_text:
      "Nuestro sistema analiza tu situación de manera rápida y clara.",
    feature_docs_title: "Revisión de documentos",
    feature_docs_text:
      "Sube tus archivos y revisamos si son válidos o si falta algo.",
    feature_pdf_title: "PDF listo",
    feature_pdf_text:
      "Preparamos tus documentos en formato PDF para que todo esté organizado.",
    feature_whatsapp_title: "Avisos por WhatsApp",
    feature_whatsapp_text:
      "Recibe actualizaciones importantes y recordatorios directamente en tu móvil.",
    feature_secure_title: "Seguro y privado",
    feature_secure_text:
      "Tus datos se gestionan con medidas de seguridad y confidencialidad.",
    feature_human_title: "Apoyo humano",
    feature_human_text:
      "Cuando lo necesites, podrás complementar el proceso con ayuda humana.",

    // LEGAL
    legal_title: "Aviso legal",
    legal_text:
      "La información proporcionada por esta plataforma es orientativa y no sustituye el asesoramiento jurídico profesional individualizado.",
    legal_accept: "He leído y acepto",

    // PAYMENT
    payment_title: "Elige tu plan",
    payment_subtitle: "Selecciona la opción que mejor se adapte a ti",
    payment_plan_basic: "Plan Básico",
    payment_plan_pro: "Plan Pro",
    payment_plan_premium: "Plan Premium",
    payment_buy_now: "Comprar ahora",
    payment_secure: "Pago seguro",

    // FOOTER
    footer_rights: "Todos los derechos reservados",
    footer_privacy: "Privacidad",
    footer_terms: "Términos",
    footer_contact: "Contacto",

    // CONTACT
    contact_title: "Contacto",
    contact_subtitle: "Estamos aquí para ayudarte",
    contact_name: "Nombre",
    contact_message: "Mensaje",
    contact_send: "Enviar mensaje",

    // STATUS
    case_status_open: "Abierto",
    case_status_pending: "Pendiente",
    case_status_completed: "Completado",
    case_status_review: "En revisión",
    case_status_rejected: "Rechazado",

    // EXTRA
    badge_legal_safe: "Legal y seguro",
    badge_fast: "Rápido",
    badge_online: "100% online",
    empty_title: "Nada por mostrar",
    empty_text: "Cuando haya información disponible aparecerá aquí",
  },

  en: {
    nav_inicio: "Home",
    nav_panel: "Dashboard",
    nav_citas: "Appointments",
    nav_reg: "Regularization 2026",
    nav_login: "Log in",
    nav_logout: "Log out",
    nav_documentos: "Documents",
    nav_contacto: "Contact",
    nav_idioma: "Language",

    hero_badge: "Immigration AI Agent — 100% legal and secure",
    hero_title_main: "Find out if you can",
    hero_title_highlight: "regularize your status in Spain",
    hero_sub:
      "Our AI agent analyzes your situation, reviews your documents, and guides you step by step in a clear, fast, and secure way.",
    hero_cta_primary: "Start now",
    hero_cta_secondary: "See how it works",
    hero_trust_1: "Fast analysis",
    hero_trust_2: "Document upload",
    hero_trust_3: "PDF preparation",

    common_loading: "Loading...",
    common_error: "An error occurred",
    common_success: "Operation completed successfully",
    common_cancel: "Cancel",
    common_save: "Save",
    common_close: "Close",
    common_continue: "Continue",
    common_back: "Back",
    common_next: "Next",
    common_send: "Send",
    common_yes: "Yes",
    common_no: "No",
    common_required: "Required",
    common_optional: "Optional",
    common_select: "Select",
    common_search: "Search",
    common_download: "Download",
    common_upload: "Upload",
    common_delete: "Delete",
    common_edit: "Edit",
    common_view: "View",
    common_free: "Free",
    common_paid: "Paid",

    login_title: "Access your account",
    login_subtitle: "Log in to continue with your case",
    login_email: "Email",
    login_password: "Password",
    login_button: "Log in",
    login_google: "Continue with Google",
    login_no_account: "Don't have an account?",
    login_create_account: "Create account",
    login_forgot_password: "Forgot your password?",
    register_title: "Create account",
    register_subtitle: "Start your process securely today",
    register_name: "Full name",
    register_button: "Sign up",
    register_have_account: "I already have an account",

    panel_title: "Your dashboard",
    panel_subtitle: "Manage your process from one place",
    panel_welcome: "Welcome",
    panel_cases: "Your cases",
    panel_documents: "Your documents",
    panel_notifications: "Notifications",
    panel_profile: "Profile",
    panel_no_data: "No data available yet",
    panel_header: "Dashboard",
    panel_tab_docs: "Documents",
    panel_tab_profile: "Profile",
    panel_tab_notifications: "Notifications",
    panel_plan_active: "Active plan",
    plan_standard: "Standard plan",

    citas_title: "Your appointments",
    citas_subtitle: "Check and manage your upcoming appointments",
    citas_book: "Book appointment",
    citas_upcoming: "Upcoming appointments",
    citas_empty: "You have no scheduled appointments",
    citas_date: "Date",
    citas_time: "Time",
    citas_type: "Type",
    citas_status: "Status",
    buscar_chat_open: "Open chat",
    buscar_chat_close: "Close chat",
    buscar_title: "Find appointments",
    buscar_subtitle: "Find available appointments quickly",

    docs_title: "Your documents",
    docs_subtitle: "Upload, review, and verify your documents",
    docs_upload: "Upload document",
    docs_drag_drop: "Drag your file here or click to upload",
    docs_supported: "Allowed formats: PDF, JPG, PNG",
    docs_verification: "Verification",
    docs_verified: "Verified",
    docs_pending: "Pending",
    docs_rejected: "Rejected",
    docs_no_docs: "You have not uploaded documents yet",

    reg_title: "Regularization 2026",
    reg_subtitle:
      "Find out whether you meet the requirements and prepare your case with AI support",
    reg_badge: "New process",
    reg_cta: "Check now",
    reg_step_1: "Answer a few questions",
    reg_step_2: "Upload your proof and documents",
    reg_step_3: "Receive analysis and recommendations",
    reg_step_4: "Download your prepared documentation",
    reg_eligibility_title: "Eligibility check",
    reg_eligibility_sub:
      "We evaluate your situation with simple and direct questions",
    reg_alert_text: "Review the information and check whether you meet the requirements.",

    feature_ai_title: "AI analysis",
    feature_ai_text: "Our system analyzes your situation quickly and clearly.",
    feature_docs_title: "Document review",
    feature_docs_text:
      "Upload your files and we review whether they are valid or if something is missing.",
    feature_pdf_title: "Ready PDF",
    feature_pdf_text:
      "We prepare your documents in PDF format so everything stays organized.",
    feature_whatsapp_title: "WhatsApp alerts",
    feature_whatsapp_text:
      "Receive important updates and reminders directly on your phone.",
    feature_secure_title: "Secure and private",
    feature_secure_text:
      "Your data is handled with security and confidentiality measures.",
    feature_human_title: "Human support",
    feature_human_text:
      "Whenever needed, you can complement the process with human assistance.",

    legal_title: "Legal notice",
    legal_text:
      "The information provided by this platform is for guidance purposes only and does not replace individualized professional legal advice.",
    legal_accept: "I have read and accept",

    payment_title: "Choose your plan",
    payment_subtitle: "Select the option that best suits you",
    payment_plan_basic: "Basic Plan",
    payment_plan_pro: "Pro Plan",
    payment_plan_premium: "Premium Plan",
    payment_buy_now: "Buy now",
    payment_secure: "Secure payment",

    footer_rights: "All rights reserved",
    footer_privacy: "Privacy",
    footer_terms: "Terms",
    footer_contact: "Contact",

    contact_title: "Contact",
    contact_subtitle: "We are here to help you",
    contact_name: "Name",
    contact_message: "Message",
    contact_send: "Send message",

    case_status_open: "Open",
    case_status_pending: "Pending",
    case_status_completed: "Completed",
    case_status_review: "Under review",
    case_status_rejected: "Rejected",

    badge_legal_safe: "Legal and secure",
    badge_fast: "Fast",
    badge_online: "100% online",
    empty_title: "Nothing to show",
    empty_text: "When information is available it will appear here",
  },

  darija: {
    nav_inicio: "الرئيسية",
    nav_panel: "البانيل",
    nav_citas: "المواعيد",
    nav_reg: "التسوية 2026",
    nav_login: "دخول",
    nav_logout: "خروج",
    nav_documentos: "الوثائق",
    nav_contacto: "تواصل",
    nav_idioma: "اللغة",

    hero_badge: "مساعد الذكاء الاصطناعي ديال الهجرة — قانوني وآمن 100%",
    hero_title_main: "عرف واش تقدر",
    hero_title_highlight: "تسوي الوضعية ديالك فإسبانيا",
    hero_sub:
      "المساعد ديالنا كايحلل الحالة ديالك، كايشوف الوثائق ديالك، وكايوجهك مرحلة بمرحلة بطريقة واضحة وسريعة وآمنة.",
    hero_cta_primary: "بدا دابا",
    hero_cta_secondary: "شوف كيفاش خدام",
    hero_trust_1: "تحليل سريع",
    hero_trust_2: "رفع الوثائق",
    hero_trust_3: "تحضير PDF",

    common_loading: "جاري التحميل...",
    common_error: "وقع خطأ",
    common_success: "تمت العملية بنجاح",
    common_cancel: "إلغاء",
    common_save: "حفظ",
    common_close: "إغلاق",
    common_continue: "كمل",
    common_back: "رجوع",
    common_next: "التالي",
    common_send: "إرسال",
    common_yes: "نعم",
    common_no: "لا",
    common_required: "إجباري",
    common_optional: "اختياري",
    common_select: "اختار",
    common_search: "بحث",
    common_download: "تحميل",
    common_upload: "رفع",
    common_delete: "حذف",
    common_edit: "تعديل",
    common_view: "شوف",
    common_free: "مجاني",
    common_paid: "بالمقابل",

    login_title: "دخل للحساب ديالك",
    login_subtitle: "دخل باش تكمل الملف ديالك",
    login_email: "البريد الإلكتروني",
    login_password: "كلمة السر",
    login_button: "دخول",
    login_google: "كمل مع Google",
    login_no_account: "ما عندكش حساب؟",
    login_create_account: "دير حساب",
    login_forgot_password: "نسيتي كلمة السر؟",
    register_title: "دير حساب",
    register_subtitle: "بدا المسار ديالك اليوم بطريقة آمنة",
    register_name: "الاسم الكامل",
    register_button: "سجل",
    register_have_account: "عندي حساب من قبل",

    panel_title: "البانيل ديالك",
    panel_subtitle: "سير المسار ديالك من بلاصة وحدة",
    panel_welcome: "مرحبا",
    panel_cases: "الملفات ديالك",
    panel_documents: "الوثائق ديالك",
    panel_notifications: "الإشعارات",
    panel_profile: "البروفايل",
    panel_no_data: "ما كاين حتى معطيات دابا",
    panel_header: "البانيل",
    panel_tab_docs: "الوثائق",
    panel_tab_profile: "البروفايل",
    panel_tab_notifications: "الإشعارات",
    panel_plan_active: "الخطة النشيطة",
    plan_standard: "الخطة الأساسية",

    citas_title: "المواعيد ديالك",
    citas_subtitle: "شوف وسير المواعيد الجاية ديالك",
    citas_book: "حجز موعد",
    citas_upcoming: "المواعيد الجاية",
    citas_empty: "ما عندك حتى موعد مبرمج",
    citas_date: "التاريخ",
    citas_time: "الوقت",
    citas_type: "النوع",
    citas_status: "الحالة",
    buscar_chat_open: "حل الشات",
    buscar_chat_close: "سد الشات",
    buscar_title: "بحث عن المواعيد",
    buscar_subtitle: "قلب على المواعيد المتاحة بسرعة",

    docs_title: "الوثائق ديالك",
    docs_subtitle: "رفع، راجع، وتأكد من الوثائق ديالك",
    docs_upload: "رفع وثيقة",
    docs_drag_drop: "جر الملف لهنا ولا كليك باش ترفعو",
    docs_supported: "الصيغ المسموح بها: PDF, JPG, PNG",
    docs_verification: "التحقق",
    docs_verified: "متأكد منو",
    docs_pending: "معلق",
    docs_rejected: "مرفوض",
    docs_no_docs: "مازال ما رفعتي حتى وثيقة",

    reg_title: "التسوية 2026",
    reg_subtitle:
      "عرف واش كتوفر فيك الشروط وجهز الملف ديالك بمساعدة الذكاء الاصطناعي",
    reg_badge: "مسار جديد",
    reg_cta: "تحقق دابا",
    reg_step_1: "جاوب على شوية أسئلة",
    reg_step_2: "رفع الإثباتات والوثائق ديالك",
    reg_step_3: "توصل بالتحليل والتوصيات",
    reg_step_4: "حمل الوثائق ديالك واجدة",
    reg_eligibility_title: "التحقق من الأهلية",
    reg_eligibility_sub: "كنقيمو الحالة ديالك بأسئلة بسيطة وواضحة",
    reg_alert_text: "شوف المعلومات وتحقق واش كتوفر فيك الشروط.",

    feature_ai_title: "تحليل بالذكاء الاصطناعي",
    feature_ai_text: "النظام ديالنا كايحلل الحالة ديالك بسرعة وبوضوح.",
    feature_docs_title: "مراجعة الوثائق",
    feature_docs_text:
      "رفع الملفات ديالك وغادي نشوفو واش صالحين ولا خاص شي حاجة أخرى.",
    feature_pdf_title: "PDF واجد",
    feature_pdf_text: "كنوجدو الوثائق ديالك فـ PDF باش يكون كلشي منظم.",
    feature_whatsapp_title: "إشعارات واتساب",
    feature_whatsapp_text:
      "توصل بالتحديثات المهمة والتذكير مباشرة فالتلفون ديالك.",
    feature_secure_title: "آمن وخاص",
    feature_secure_text:
      "المعطيات ديالك كتتعالج بإجراءات ديال الأمان والسرية.",
    feature_human_title: "مساعدة بشرية",
    feature_human_text:
      "إلى احتجتي، تقدر تكمل المسار ديالك حتى بمساعدة بشرية.",

    legal_title: "تنبيه قانوني",
    legal_text:
      "المعلومات اللي كتقدمها هاد المنصة غير للتوجيه وما كتعوضش الاستشارة القانونية المهنية الخاصة بكل حالة.",
    legal_accept: "قريت ووافقت",

    payment_title: "اختار الخطة ديالك",
    payment_subtitle: "اختار العرض اللي كيناسبك",
    payment_plan_basic: "الخطة الأساسية",
    payment_plan_pro: "خطة برو",
    payment_plan_premium: "الخطة الممتازة",
    payment_buy_now: "شري دابا",
    payment_secure: "أداء آمن",

    footer_rights: "جميع الحقوق محفوظة",
    footer_privacy: "الخصوصية",
    footer_terms: "الشروط",
    footer_contact: "تواصل",

    contact_title: "تواصل",
    contact_subtitle: "حنا هنا باش نساعدوك",
    contact_name: "الاسم",
    contact_message: "الرسالة",
    contact_send: "رسل الرسالة",

    case_status_open: "مفتوح",
    case_status_pending: "معلق",
    case_status_completed: "مكمل",
    case_status_review: "قيد المراجعة",
    case_status_rejected: "مرفوض",

    badge_legal_safe: "قانوني وآمن",
    badge_fast: "سريع",
    badge_online: "أونلاين 100%",
    empty_title: "ما كاين والو دابا",
    empty_text: "مني تكون المعطيات غادي تبان هنا",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (savedLang === "es" || savedLang === "en" || savedLang === "darija") {
      setLangState(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);

    const isRTL = lang === "darija";
    document.documentElement.lang = lang === "darija" ? "ar" : lang;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.body.dir = isRTL ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] ?? translations.es?.[key] ?? key;
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      isRTL: lang === "darija",
      translations: translations[lang] || {},
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLang must be used within a LanguageProvider");
  }

  return context;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
