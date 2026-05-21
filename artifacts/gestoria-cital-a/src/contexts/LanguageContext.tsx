import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

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
    nav_inicio: "Inicio",
    nav_panel: "Panel",
    nav_citas: "Citas",
    nav_reg: "Regularización 2026",
    nav_login: "Iniciar sesión",
    nav_logout: "Cerrar sesión",
    nav_documentos: "Documentos",
    nav_contacto: "Contacto",
    nav_idioma: "Idioma",

    hero_badge: "Agente IA de Extranjería — 100% legal y seguro",
    hero_title_1: "Descubre si puedes",
    hero_title_2: "regularizarte en España",
    hero_sub:
      "Nuestro agente IA analiza tu situación, revisa tus documentos y te guía paso a paso de forma clara, rápida y segura.",
    hero_btn1: "Empezar ahora",
    hero_btn2: "Ir al panel",
    hero_btn_citas: "Buscar citas",
    hero_trust: "Miles de personas ya usan GestoriaCitaIA",

    feat1: "Análisis rápido",
    feat2: "Subida de documentos",
    feat3: "Preparación en PDF",
    feat4: "Asistencia 24/7",

    plans_title: "Planes disponibles",
    plans_sub: "Elige el plan que mejor se adapte a ti",

    plan_popular: "Más popular",
    plan_btn: "Elegir plan",
    plan_free_btn: "Empezar gratis",

    plan_free_name: "Gratis",
    plan_free_f1: "Consulta inicial con el agente IA",
    plan_free_f2: "Descubre si puedes avanzar",
    plan_free_f3: "Orientación básica del trámite",
    plan_free_f4: "Sin pago inicial",

    plan_cita_name: "Plan Citas",
    plan_cita_f1: "Búsqueda de citas 24/7",
    plan_cita_f2: "Intentos automáticos continuos",
    plan_cita_f3: "Aviso cuando aparezca cita",
    plan_cita_f4: "Seguimiento prioritario",
    plan_cita_f5: "Soporte del agente IA",
    plan_cita_f6: "Más opciones disponibles",

    plan_reg_name: "Plan Regularización",
    plan_reg_f1: "Evaluación del caso",
    plan_reg_f2: "Revisión de documentos",
    plan_reg_f3: "Guía paso a paso",
    plan_reg_f4: "Formularios orientativos",
    plan_reg_f5: "Seguimiento del expediente",

    plan_std_name: "Plan Estándar",
    plan_std_f1: "Todo lo del plan citas",
    plan_std_f2: "Todo lo del plan regularización",
    plan_std_f3: "Más prioridad",
    plan_std_f4: "Soporte ampliado",
    plan_std_f5: "Gestión más rápida",
    plan_std_f6: "Acceso completo",
    plan_std_f7: "Mejor seguimiento",

    tramites_title: "Trámites disponibles",
    tramites_sub: "Explora los trámites que puedes gestionar con nosotros",

    tr_tie: "Renovación TIE",
    tr_visado_nac: "Visado nacional",
    tr_nie: "Asignación NIE",
    tr_empadron: "Empadronamiento",
    tr_trabajo: "Autorización de trabajo",
    tr_familiar: "Reagrupación familiar",
    tr_estudiante: "Estudiantes",
    tr_arraigo: "Arraigo",
    tr_conducir: "Canje / conducir",
    tr_larga: "Larga duración",
    tr_regreso: "Autorización de regreso",
    tr_ue: "Certificado UE",

    agent_mo_role: "Especialista en Extranjería",
    agent_sara_role: "Buscar Citas · 24/7",

    legal_label: "Aviso legal",
    legal_body:
      "La información mostrada es orientativa y no sustituye el asesoramiento jurídico profesional.",

    footer_legal: "Aviso legal",
    footer_privacy: "Privacidad",
    footer_cookies: "Cookies",

    secure_payment_methods: "Pago seguro · Métodos aceptados",
    ssl_payment_text: "Pagos procesados con cifrado SSL 256-bit · PCI DSS Compliant",

    access_error_title: "Error de acceso",
    access_error_desc: "No se pudo iniciar sesión con Google",
    google_login_error: "Error al iniciar sesión con Google",
    google_login_failed: "No se pudo iniciar sesión con Google",

    panel_header: "Panel",
    panel_plan_active: "Plan activo",
    panel_tab_resumen: "Resumen",
    panel_tab_tramites: "Trámites",
    panel_tab_citas: "Citas",
    panel_tab_docs: "Documentos",
    panel_notif_btn: "Notificaciones",
    panel_quick_actions: "Acciones rápidas",
    panel_manage_plan: "Gestionar plan",
    panel_new_appt: "Nueva cita",
    panel_tramites_curso: "Trámites en curso",
    panel_action_cita: "Buscar cita",
    panel_action_cita_sub: "Encuentra una cita disponible",
    panel_action_reg: "Regularización",
    panel_action_reg_sub: "Revisa tu situación",
    panel_action_upload: "Subir documentos",
    panel_action_upload_sub: "Añade tus archivos",
    panel_action_ia: "Asistente IA",
    panel_action_ia_sub: "Ayuda automática",
    panel_stat_up_to: "Actualizado",
    panel_stat_tramites: "Trámites",
    panel_stat_tramites_sub: "1 en curso · 1 pendiente",
    panel_stat_cita_next: "Próxima cita",
    panel_stat_next_appt_sub: "Renovación TIE · 10:30",
    panel_stat_docs: "Documentos",
    panel_completed_pct: "completado",
    panel_active: "Activo",
    panel_procedures: "Trámites",
    panel_next_invoice: "Próxima factura",
    panel_plan_used: "Uso del plan",
    panel_continue: "Continuar",
    panel_search_agent: "Ir al buscador de citas",
    panel_cita_proxima: "Próxima",
    panel_cita_done: "Completada",
    panel_wa_confirmed: "Confirmada también por WhatsApp",
    panel_new_appt_agent: "Buscar nueva cita con agente",
    panel_upload_new: "Subir nuevo documento",
    panel_client_data: "Datos del cliente",
    panel_full_name: "Nombre completo",
    panel_nationality: "Nacionalidad",
    panel_birthdate: "Fecha de nacimiento",
    panel_nav_resumen: "Resumen",
    panel_nav_tramites: "Trámites",
    panel_nav_citas: "Citas",
    panel_nav_docs: "Docs",
    panel_referral_title: "Invita a tus amigos",
    panel_referral_reward: "Recompensa",
    panel_referral_desc: "Comparte tu código y consigue ventajas.",
    panel_referrals_bought: "Invitaciones usadas",
    panel_referral_left: "Te faltan",
    panel_referral_more: "para completar la recompensa",
    panel_copy: "Copiar",
    panel_copied: "Copiado",
    panel_legal_aviso: "Aviso:",
    panel_legal_panel:
      "La información del panel es orientativa y puede cambiar según el expediente.",
    panel_tramite_curso: "En curso",
    panel_tramite_pending: "Pendiente",
    panel_tramite_s1: "Inicio",
    panel_tramite_s2: "Documentos",
    panel_tramite_s3: "Revisión",
    panel_tramite_s4: "Final",

    docs_required_title: "Documentos requeridos",
    my_uploaded_docs: "Mis documentos subidos",
    documents_count: "documentos",
    loading: "Cargando...",
    loading_documents: "Cargando documentos...",
    no_documents_uploaded: "Todavía no has subido documentos",
    download: "Descargar",
    doc_uploaded: "Subido",
    doc_pending: "Pendiente",
    doc_replace: "Reemplazar",
    doc_upload: "Subir",

    doc_passport: "Pasaporte",
    doc_dni_nie: "DNI / NIE",
    doc_empadronamiento: "Empadronamiento",
    doc_pruebas_espana: "Pruebas de estancia en España",
    doc_fotografias: "Fotografías",
    doc_formulario_oficial: "Formulario oficial",
    doc_tasa_pagada: "Tasa pagada",
    doc_required: "Obligatorio",
    doc_if_available: "Si disponible",
    doc_important: "Importante",
    doc_very_important: "Muy importante",
    doc_pending_fill: "Pendiente de rellenar",
    doc_pending_payment: "Pendiente de pago",

    create_auto_form: "Crear formulario automático",
    automatic_forms: "Formularios automáticos",
    created: "creados",
    no_automatic_forms: "Aún no has creado formularios automáticos.",
    type: "Tipo",
    status: "Estado",
    result: "Resultado",
    reviewed_by: "Revisado por",
    reviewed_on: "Revisado el",
    expires_on: "Caduca el",
    note: "Nota",
    detected_as: "Detectado como",
    system: "Sistema",
    verified: "Verificado",
    in_review: "En revisión",
    rejected: "Rechazado",
    expired: "Caducado",
    pending: "Pendiente",
    apt: "Apto",
    not_apt: "No apto",
    close: "Cerrar",
    form_created_title: "Formulario creado",
    form_created_desc: "Formulario preparado automáticamente con los datos del perfil.",
    form_create_error_title: "Error al crear formulario",
    form_create_error_desc: "No se pudo crear el formulario automático",
    error_download_title: "Error al descargar",
    error_download_desc: "No se pudo descargar el documento",
    document_uploaded_title: "Documento subido",
    document_uploaded_desc_named: "{title} recibido correctamente. Ahora está en revisión.",
    document_uploaded_success_named: "✅ {title} subido correctamente y enviado a revisión",
    error_upload_title: "Error al subir",
    error_upload_desc: "No se pudo subir el documento",
    error_loading_documents_title: "Error al cargar documentos",
    error_loading_documents_desc: "No se pudieron cargar los documentos",
    proofs_complete_counter: "✔ {total}/{min} pruebas completas",
    proofs_counter: "{total}/{min} pruebas",
    document_pending_review: "Documento recibido. Pendiente de revisión.",

    buscar_title: "Buscar citas",
    buscar_subtitle: "Busca citas disponibles de forma rápida",
    buscar_chat_open: "Abrir chat",
    buscar_chat_close: "Cerrar chat",
    buscar_docs: "Documentos",
    buscar_forms: "Formularios",
    buscar_docs_required: "Documentos requeridos",
    buscar_forms_official: "Formularios oficiales",
    buscar_doc_ready: "Listo",
    buscar_doc_review: "Revisar",
    buscar_doc_missing: "Falta",
    buscar_agent_role: "Asesora de Citas",
    buscar_chat_placeholder: "Escribe tu pregunta...",
    buscar_title_short: "Citas",
    buscar_confirmar: "Confirmar",
    buscar_download_pdf: "Descargar PDF",
    buscar_mute: "Quitar audio",
    buscar_sin_audio: "Sin audio",
    buscar_mute_simple: "Mute",
    buscar_payment_agent_message:
      "Para reservar tu cita y continuar con el proceso, activa tu plan. Yo te guío paso a paso.",

    reg_title: "Regularización 2026",
    reg_sub: "Descubre si cumples los requisitos y prepara tu caso con ayuda de IA",
    reg_new: "Nuevo",
    reg_alert_text:
      "Consulta la información y revisa si cumples los requisitos antes de continuar.",
    reg_activar: "Activar",
    reg_sit: "Selecciona tu situación",
    reg_docs: "Documentos",
    reg_upload: "Subir",
    reg_docs_btn: "Verificar documentos",
    reg_agent_role: "Especialista en Extranjería",
    reg_payment_agent_message:
      "Para continuar con tu Regularización 2026 y presentar tu solicitud, activa tu plan.",
    khalidDescription:
  "Especialista profesional en extranjería española para marroquíes en España. Pregunta sobre residencia, papeles, policía, nacionalidad, arraigo, trabajo, estudios y cualquier problema legal relacionado con inmigración.",

unlockKhalid: "Desbloquea a Khalid",

premiumDescription:
  "Acceso ilimitado a respuestas y asesoría personalizada.",

unlockNow: "Desbloquear ahora",

securePayment: "Pago seguro con Stripe",

endConversation: "Finalizar conversación",

talkToKhalid: "Hablar con Khalid",
    onlineNow: "En línea",

mohamedRole: "Especialista en Extranjería",

talkMohamed: "Hablar con Mohamed",

stopMic: "Parar micrófono",

unlockMohamed: "Desbloquea a Mohamed",

mohamedPremium:
  "Acceso ilimitado a Mohamed IA, videollamada realtime, análisis de documentos y generación automática del expediente.",

mohamedDescription:
  "Especialista profesional en extranjería española para marroquíes en España. Pregunta sobre residencia, papeles, policía, nacionalidad, arraigo, trabajo, estudios y cualquier problema legal relacionado con inmigración.",
  },

  en: {
    nav_inicio: "Home",
    nav_panel: "Panel",
    nav_citas: "Appointments",
    nav_reg: "Regularization 2026",
    nav_login: "Log in",
    nav_logout: "Log out",
    nav_documentos: "Documents",
    nav_contacto: "Contact",
    nav_idioma: "Language",

    hero_badge: "Immigration AI Agent — 100% legal and secure",
    hero_title_1: "Find out if you can",
    hero_title_2: "regularize your status in Spain",
    hero_sub:
      "Our AI agent analyzes your situation, reviews your documents, and guides you step by step clearly, quickly, and securely.",
    hero_btn1: "Start now",
    hero_btn2: "Go to panel",
    hero_btn_citas: "Find appointments",
    hero_trust: "Thousands of people already use GestoriaCitaIA",

    feat1: "Fast analysis",
    feat2: "Document upload",
    feat3: "PDF preparation",
    feat4: "24/7 assistance",

    plans_title: "Available plans",
    plans_sub: "Choose the plan that best fits you",

    plan_popular: "Most popular",
    plan_btn: "Choose plan",
    plan_free_btn: "Start free",

    plan_free_name: "Free",
    plan_free_f1: "Initial consultation with AI agent",
    plan_free_f2: "See if you can move forward",
    plan_free_f3: "Basic guidance",
    plan_free_f4: "No initial payment",

    plan_cita_name: "Appointments Plan",
    plan_cita_f1: "24/7 appointment search",
    plan_cita_f2: "Automatic continuous attempts",
    plan_cita_f3: "Alert when a slot appears",
    plan_cita_f4: "Priority follow-up",
    plan_cita_f5: "AI support",
    plan_cita_f6: "More options",

    plan_reg_name: "Regularization Plan",
    plan_reg_f1: "Case evaluation",
    plan_reg_f2: "Document review",
    plan_reg_f3: "Step-by-step guide",
    plan_reg_f4: "Guided forms",
    plan_reg_f5: "Case follow-up",

    plan_std_name: "Standard Plan",
    plan_std_f1: "Everything in appointments plan",
    plan_std_f2: "Everything in regularization plan",
    plan_std_f3: "More priority",
    plan_std_f4: "Extended support",
    plan_std_f5: "Faster processing",
    plan_std_f6: "Full access",
    plan_std_f7: "Better tracking",

    tramites_title: "Available procedures",
    tramites_sub: "Explore the procedures you can manage with us",

    tr_tie: "TIE renewal",
    tr_visado_nac: "National visa",
    tr_nie: "NIE assignment",
    tr_empadron: "Registration",
    tr_trabajo: "Work permit",
    tr_familiar: "Family reunification",
    tr_estudiante: "Students",
    tr_arraigo: "Regularization",
    tr_conducir: "Driving exchange",
    tr_larga: "Long-term residence",
    tr_regreso: "Return authorization",
    tr_ue: "EU certificate",

    agent_mo_role: "Immigration specialist",
    agent_sara_role: "Appointments · 24/7",

    panel_header: "Panel",
    panel_plan_active: "Active plan",
    panel_tab_resumen: "Summary",
    panel_tab_tramites: "Procedures",
    panel_tab_citas: "Appointments",
    panel_tab_docs: "Documents",
    panel_notif_btn: "Notifications",
    panel_quick_actions: "Quick actions",
    panel_manage_plan: "Manage plan",
    panel_new_appt: "New appointment",
    panel_tramites_curso: "Ongoing procedures",
    panel_action_cita: "Find appointment",
    panel_action_cita_sub: "Find an available appointment",
    panel_action_reg: "Regularization",
    panel_action_reg_sub: "Check your situation",
    panel_action_upload: "Upload documents",
    panel_action_upload_sub: "Add your files",
    panel_action_ia: "AI assistant",
    panel_action_ia_sub: "Automatic help",
    panel_stat_up_to: "Updated",
    panel_stat_tramites: "Procedures",
    panel_stat_tramites_sub: "1 ongoing · 1 pending",
    panel_stat_cita_next: "Next appointment",
    panel_stat_next_appt_sub: "TIE renewal · 10:30",
    panel_stat_docs: "Documents",
    panel_completed_pct: "completed",
    panel_active: "Active",
    panel_procedures: "Procedures",
    panel_next_invoice: "Next invoice",
    panel_plan_used: "Plan usage",
    panel_continue: "Continue",
    panel_search_agent: "Go to appointment search",
    panel_cita_proxima: "Upcoming",
    panel_cita_done: "Completed",
    panel_wa_confirmed: "Also confirmed by WhatsApp",
    panel_new_appt_agent: "Find new appointment with agent",
    panel_upload_new: "Upload new document",
    panel_client_data: "Client data",
    panel_full_name: "Full name",
    panel_nationality: "Nationality",
    panel_birthdate: "Birth date",
    panel_nav_resumen: "Summary",
    panel_nav_tramites: "Procedures",
    panel_nav_citas: "Appointments",
    panel_nav_docs: "Docs",
    panel_referral_title: "Invite your friends",
    panel_referral_reward: "Reward",
    panel_referral_desc: "Share your code and get benefits.",
    panel_referrals_bought: "Invites used",
    panel_referral_left: "You still need",
    panel_referral_more: "to complete the reward",
    panel_copy: "Copy",
    panel_copied: "Copied",
    panel_legal_aviso: "Notice:",
    panel_legal_panel: "Panel information is indicative and may change depending on the file.",
    panel_tramite_curso: "In progress",
    panel_tramite_pending: "Pending",
    panel_tramite_s1: "Start",
    panel_tramite_s2: "Documents",
    panel_tramite_s3: "Review",
    panel_tramite_s4: "Done",

    docs_required_title: "Required documents",
    my_uploaded_docs: "My uploaded documents",
    documents_count: "documents",
    loading: "Loading...",
    loading_documents: "Loading documents...",
    no_documents_uploaded: "You have not uploaded documents yet",
    download: "Download",
    doc_uploaded: "Uploaded",
    doc_pending: "Pending",
    doc_replace: "Replace",
    doc_upload: "Upload",

    doc_passport: "Passport",
    doc_dni_nie: "ID / NIE",
    doc_empadronamiento: "Registration certificate",
    doc_pruebas_espana: "Proofs of stay in Spain",
    doc_fotografias: "Photos",
    doc_formulario_oficial: "Official form",
    doc_tasa_pagada: "Paid fee",
    doc_required: "Required",
    doc_if_available: "If available",
    doc_important: "Important",
    doc_very_important: "Very important",
    doc_pending_fill: "Pending completion",
    doc_pending_payment: "Pending payment",

    buscar_title: "Find appointments",
    buscar_subtitle: "Search for available appointments quickly",
    reg_title: "Regularization 2026",
    reg_sub: "Find out if you meet the requirements and prepare your case with AI support",
    khalidDescription:
  "Professional Spanish immigration specialist for Moroccans in Spain. Ask about residency, police, nationality, work, studies or any immigration legal issue.",

unlockKhalid: "Unlock Khalid",

premiumDescription:
  "Unlimited access to answers and personalized assistance.",

unlockNow: "Unlock now",

securePayment: "Secure payment with Stripe",

endConversation: "End conversation",

talkToKhalid: "Talk to Khalid",
    onlineNow: "Online",

mohamedRole: "Immigration Specialist",

talkMohamed: "Talk to Mohamed",

stopMic: "Stop microphone",

unlockMohamed: "Unlock Mohamed",

mohamedPremium:
  "Unlimited access to Mohamed AI, realtime video call, document analysis and automatic case generation.",

mohamedDescription:
  "Professional Spanish immigration specialist for Moroccans in Spain. Ask about residency, police, nationality, work, studies and immigration legal issues.",
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
    hero_title_1: "عرف واش تقدر",
    hero_title_2: "تسوي الوضعية ديالك فإسبانيا",
    hero_sub:
      "المساعد ديالنا كايحلل الحالة ديالك، كايشوف الوثائق ديالك، وكايوجهك مرحلة بمرحلة بطريقة واضحة وسريعة وآمنة.",
    hero_btn1: "بدا دابا",
    hero_btn2: "دخل للبانيل",
    hero_btn_citas: "قلب على موعد",
    hero_trust: "آلاف الناس كيستعملو GestoriaCitaIA",

    feat1: "تحليل سريع",
    feat2: "رفع الوثائق",
    feat3: "تحضير PDF",
    feat4: "مساعدة 24/7",

    plans_title: "الخطط المتوفرة",
    plans_sub: "اختار الخطة اللي كتناسبك",

    plan_popular: "الأكثر طلباً",
    plan_btn: "اختار الخطة",
    plan_free_btn: "بدا مجاناً",

    plan_free_name: "مجاني",
    plan_free_f1: "استشارة أولية مع الوكيل الذكي",
    plan_free_f2: "تعرف واش تقدر تكمل",
    plan_free_f3: "توجيه أساسي",
    plan_free_f4: "بلا أداء أولي",

    plan_cita_name: "خطة المواعيد",
    plan_cita_f1: "بحث على المواعيد 24/7",
    plan_cita_f2: "محاولات أوتوماتيكية",
    plan_cita_f3: "إشعار ملي يبان الموعد",
    plan_cita_f4: "متابعة مفضلة",
    plan_cita_f5: "مساعدة الذكاء الاصطناعي",
    plan_cita_f6: "خيارات أكثر",

    plan_reg_name: "خطة التسوية",
    plan_reg_f1: "تقييم الملف",
    plan_reg_f2: "مراجعة الوثائق",
    plan_reg_f3: "شرح مرحلة بمرحلة",
    plan_reg_f4: "استمارات موجهة",
    plan_reg_f5: "متابعة الملف",

    plan_std_name: "الخطة القياسية",
    plan_std_f1: "كل ما في خطة المواعيد",
    plan_std_f2: "كل ما في خطة التسوية",
    plan_std_f3: "أولوية أكثر",
    plan_std_f4: "دعم موسع",
    plan_std_f5: "معالجة أسرع",
    plan_std_f6: "ولوج كامل",
    plan_std_f7: "تتبع أفضل",

    tramites_title: "الخدمات المتوفرة",
    tramites_sub: "شوف شنو تقدر تدير معنا",

    tr_tie: "تجديد TIE",
    tr_visado_nac: "الفيزا الوطنية",
    tr_nie: "رقم NIE",
    tr_empadron: "شهادة السكن",
    tr_trabajo: "رخصة العمل",
    tr_familiar: "التجمع العائلي",
    tr_estudiante: "الطلبة",
    tr_arraigo: "الاستقرار",
    tr_conducir: "رخصة السياقة",
    tr_larga: "الإقامة الطويلة",
    tr_regreso: "رخصة الرجوع",
    tr_ue: "شهادة الاتحاد الأوروبي",

    agent_mo_role: "متخصص فالهجرة",
    agent_sara_role: "البحث على المواعيد · 24/7",

    panel_header: "البانيل",
    panel_plan_active: "الخطة النشيطة",
    panel_tab_resumen: "الملخص",
    panel_tab_tramites: "الملفات",
    panel_tab_citas: "المواعيد",
    panel_tab_docs: "الوثائق",
    panel_notif_btn: "الإشعارات",
    panel_quick_actions: "إجراءات سريعة",
    panel_manage_plan: "تدبير الخطة",
    panel_new_appt: "موعد جديد",
    panel_tramites_curso: "الملفات الجارية",
    panel_action_cita: "قلب على موعد",
    panel_action_cita_sub: "لقى موعد متاح",
    panel_action_reg: "التسوية",
    panel_action_reg_sub: "شوف الحالة ديالك",
    panel_action_upload: "رفع الوثائق",
    panel_action_upload_sub: "زيد الملفات ديالك",
    panel_action_ia: "مساعد ذكي",
    panel_action_ia_sub: "مساعدة أوتوماتيكية",
    panel_stat_up_to: "محدّث",
    panel_stat_tramites: "الملفات",
    panel_stat_tramites_sub: "1 جاري · 1 معلق",
    panel_stat_cita_next: "الموعد الجاي",
    panel_stat_next_appt_sub: "تجديد TIE · 10:30",
    panel_stat_docs: "الوثائق",
    panel_completed_pct: "مكمل",
    panel_active: "نشط",
    panel_procedures: "الملفات",
    panel_next_invoice: "الفاتورة الجاية",
    panel_plan_used: "استعمال الخطة",
    panel_continue: "كمل",
    panel_search_agent: "سير لبحث المواعيد",
    panel_cita_proxima: "قريبة",
    panel_cita_done: "مكملة",
    panel_wa_confirmed: "تأكدات حتى فالواتساب",
    panel_new_appt_agent: "قلب على موعد جديد مع الوكيل",
    panel_upload_new: "رفع وثيقة جديدة",
    panel_client_data: "بيانات الزبون",
    panel_full_name: "الاسم الكامل",
    panel_nationality: "الجنسية",
    panel_birthdate: "تاريخ الازدياد",
    panel_nav_resumen: "ملخص",
    panel_nav_tramites: "الملفات",
    panel_nav_citas: "المواعيد",
    panel_nav_docs: "الوثائق",
    panel_referral_title: "عيّط لصحابك",
    panel_referral_reward: "المكافأة",
    panel_referral_desc: "شارك الكود ديالك وربح مزايا.",
    panel_referrals_bought: "الدعوات المستعملة",
    panel_referral_left: "باقي خاصك",
    panel_referral_more: "باش تكمل المكافأة",
    panel_copy: "نسخ",
    panel_copied: "تنسخ",
    panel_legal_aviso: "تنبيه:",
    panel_legal_panel: "المعلومات فالبانيل غير توجيهية وتقدر تبدل حسب الملف.",
    panel_tramite_curso: "جاري",
    panel_tramite_pending: "معلق",
    panel_tramite_s1: "البداية",
    panel_tramite_s2: "الوثائق",
    panel_tramite_s3: "المراجعة",
    panel_tramite_s4: "النهاية",

    docs_required_title: "الوثائق المطلوبة",
    my_uploaded_docs: "الوثائق اللي رفعت",
    documents_count: "وثائق",
    loading: "جاري التحميل...",
    loading_documents: "جاري تحميل الوثائق...",
    no_documents_uploaded: "مازال ما رفعتي حتى وثيقة",
    download: "تحميل",
    doc_uploaded: "مرفوع",
    doc_pending: "معلق",
    doc_replace: "بدل",
    doc_upload: "رفع",

    doc_passport: "الباسبور",
    doc_dni_nie: "DNI / NIE",
    doc_empadronamiento: "شهادة السكن",
    doc_pruebas_espana: "إثباتات الإقامة فإسبانيا",
    doc_fotografias: "الصور",
    doc_formulario_oficial: "الاستمارة الرسمية",
    doc_tasa_pagada: "الرسوم المؤداة",
    doc_required: "إجباري",
    doc_if_available: "إلى كان",
    doc_important: "مهم",
    doc_very_important: "مهم بزاف",
    doc_pending_fill: "خاصها تعمر",
    doc_pending_payment: "الأداء معلق",

    buscar_title: "البحث على المواعيد",
    buscar_subtitle: "قلب على المواعيد المتاحة بسرعة",
    reg_title: "التسوية 2026",
    reg_sub: "عرف واش فيك الشروط وجهز الملف ديالك بمساعدة الذكاء الاصطناعي",
    khalidDescription:
  "خبير فالهجرة والأوراق القانونية فإسبانيا للمغاربة. سول على الإقامة، البوليس، الجنسية، الخدمة، الدراسة وأي مشكل متعلق بالهجرة.",

unlockKhalid: "فتح خالد",

premiumDescription:
  "ولوج كامل للأجوبة والمساعدة الخاصة.",

unlockNow: "فتح الآن",

securePayment: "دفع آمن عبر Stripe",

endConversation: "إنهاء المحادثة",

talkToKhalid: "تكلم مع خالد",
    onlineNow: "متصل الآن",

mohamedRole: "مختص فالهجرة",

talkMohamed: "تكلم مع محمد",

stopMic: "وقف الميكروفون",

unlockMohamed: "فتح محمد",

mohamedPremium:
  "ولوج كامل لمحمد الذكي، مكالمة مباشرة، تحليل الوثائق وتحضير الملف أوتوماتيكياً.",

mohamedDescription:
  "خبير فالهجرة والأوراق القانونية فإسبانيا للمغاربة. سول على الإقامة، البوليس، الجنسية، الخدمة، الدراسة وأي مشكل متعلق بالهجرة.",
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

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
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
