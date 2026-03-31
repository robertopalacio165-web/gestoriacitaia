import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

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
    hero_sub:
      "Nuestro agente IA analiza tus documentos y te dice si estás listo para conseguir papeles, citas y residencia. Sin esperas, sin gestorías caras.",
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

    plan_reg_name: "REGULARIZACIÓN",
    plan_reg_f1: "1 trámite / mes",
    plan_reg_f2: "Subida de documentos",
    plan_reg_f3: "Verificación básica automática",
    plan_reg_f4: "Avatar guía (Mohamed)",
    plan_reg_f5: "Aviso WhatsApp",

    hero_btn_citas: "Buscar citas con Sara",

    buscar_doc_ready: "Listo",
    buscar_doc_review: "Revisar",
    buscar_doc_missing: "Pendiente",
    buscar_docs_required: "Documentos requeridos",
    buscar_forms_official: "Formularios oficiales",
    buscar_download_pdf: "Descargar PDF",
    buscar_wa_sent: "Confirmación enviada por WhatsApp",
    buscar_upload: "Subir",
    buscar_chat_label: "Chat",
    buscar_all_online: "100% online",
    buscar_support: "Soporte en español y darija",

    reg_alert_text:
      "Regularización Extraordinaria 2026. El agente IA verificará tus documentos y rellenará la solicitud automáticamente. Solo tendrás que confirmar.",
    reg_proc: "Procedimiento:",
    reg_upload: "Subir",
    reg_wa_sent: "Resguardo enviado por WhatsApp",
    reg_pdf_btn: "Descargar PDF",
    reg_auto_label: "(rellenado automáticamente)",
    reg_chat_label: "Chat",

    panel_active: "ACTIVO",
    panel_plan_active: "Plan activo",
    panel_tramites_curso: "Trámites en curso",
    panel_quick_actions: "Acciones rápidas",
    panel_legal_notice: "Aviso",
    panel_legal_text:
      "GestoriaCitaIA es un asistente IA. No somos gestoría ni abogados. Solo organizamos tus documentos y te ayudamos a buscar citas. No realizamos trámites en tu nombre.",
    panel_referral_title: "Tu código de referido",
    panel_referral_reward: "1 mes GRATIS",
    panel_referral_desc:
      "Invita a 3 amigos que compren un plan con tu código y ganas 1 mes gratis.",
    panel_copy: "Copiar",
    panel_copied: "Copiado",
    panel_referrals_bought: "Referidos que compraron",
    panel_referral_left: "Te falta",
    panel_referral_more: "referido más para ganar tu mes gratis",

    tramites_title: "Trámites que gestionamos",
    tramites_sub: "Todos los trámites de extranjería, gestionados por IA en tiempo real",

    buscar_title: "Buscar Citas",
    buscar_tramite: "TRÁMITE",
    buscar_fecha: "FECHA",
    buscar_hora: "HORA",
    buscar_confirmada: "CITA CONFIRMADA",
    buscar_confirmada_msg:
      "Tu cita ha sido reservada. Recibirás los datos por WhatsApp.",
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
    payment_soon_title: "Pagos disponibles próximamente",
    payment_soon_desc:
      "Déjanos tu email y serás el primero en activar tu plan",
    payment_soon_btn: "Avisamé cuando estén activos los pagos",
    payment_soon_done:
      "¡Apuntado! Te avisaremos en cuanto los pagos estén activos.",
    payment_soon_email: "Tu email",

    panel_header: "Panel Personal",
    panel_notif_btn: "Notificaciones",
    panel_notif_mark_read: "Marcar todo leído",
    panel_notif_view: "Ver panel completo",
    panel_stat_tramites: "Trámites activos",
    panel_stat_cita_next: "Próxima cita",
    panel_stat_docs: "Documentos",
    panel_stat_up_to: "Hasta 3 citas/mes",
    panel_tab_resumen: "Resumen",
    panel_tab_tramites: "Trámites",
    panel_tab_citas: "Mis Citas",
    panel_tab_docs: "Documentos",
    panel_plan_used: "Citas usadas",
    panel_next_invoice: "Próx. factura",
    panel_manage_plan: "Gestionar plan",
    panel_new_appt: "Nueva cita",
    panel_cita_proxima: "Próxima",
    panel_cita_done: "Completada ✓",
    panel_wa_confirmed: "Confirmada · Aviso WhatsApp enviado",
    panel_search_agent: "Buscar nueva cita con agente IA",
    panel_new_appt_agent: "Nueva cita con agente IA",
    panel_continue: "Continuar",
    panel_completed_pct: "completado",
    panel_docs_header: "Documentos de extranjería",
    panel_docs_completed: "completados",
    panel_upload_new: "Subir nuevo documento",
    panel_docs_encrypted:
      "Documentos cifrados según RGPD · Solo tú tienes acceso",
    panel_client_data: "Datos del cliente",
    panel_full_name: "Nombre completo",
    panel_procedures: "Trámites",
    panel_birthdate: "Fecha nacimiento",
    panel_situation: "Situación",
    panel_tie_expiry: "Caducidad TIE",
    panel_nav_resumen: "Resumen",
    panel_nav_tramites: "Trámites",
    panel_nav_citas: "Citas",
    panel_nav_docs: "Docs",
    panel_doc_ok: "OK",
    panel_doc_warn: "Revisar",
    panel_doc_missing: "Falta",
    panel_doc_upload: "Subir",
    panel_legal_aviso: "Aviso:",
    panel_legal_panel:
      "GestoriaCitaIA es un asistente IA. No somos gestoría ni abogados. Solo organizamos tus documentos y te ayudamos a buscar citas. No realizamos trámites en tu nombre.",
    panel_action_cita: "Buscar cita",
    panel_action_cita_sub: "Con agente Sara",
    panel_action_reg: "Regularización",
    panel_action_reg_sub: "2026 · Nuevo",
    panel_action_upload: "Subir documento",
    panel_action_upload_sub: "PDF, JPG, PNG",
    panel_action_ia: "Hablar con IA",
    panel_action_ia_sub: "Asistente 24/7",
    panel_tramite_curso: "En curso",
    panel_tramite_pending: "Pendiente docs",
    panel_tramite_s1: "Iniciado",
    panel_tramite_s2: "Docs OK",
    panel_tramite_s3: "Cita",
    panel_tramite_s4: "Completado",

    legal_label: "Aviso importante:",
    legal_body:
      "GestoriaCitaIA es un asistente de inteligencia artificial. No somos gestoría, ni abogados, ni despacho jurídico. No realizamos trámites en tu nombre ni te representamos ante ningún organismo oficial. Únicamente te ayudamos a organizar tus documentos, explicarte los requisitos de los trámites de extranjería y buscar disponibilidad de citas. Para trámites oficiales, consulta con un gestor administrativo colegiado o un abogado especialista en extranjería.",

    feat1: "100% online",
    feat2: "Soporte en español y darija",
    feat3: "Verificación IA de documentos",
    feat4: "Aviso WhatsApp de citas disponibles",

    tr_tie: "Renovación TIE",
    tr_visado_nac: "Visado Nacional",
    tr_nie: "Asignación NIE",
    tr_empadron: "Empadronamiento",
    tr_trabajo: "Autorización Trabajo",
    tr_familiar: "Reagrupación Familiar",
    tr_estudiante: "Visado Estudiante",
    tr_arraigo: "Residencia por Arraigo",
    tr_conducir: "Canje Permiso Conducir",
    tr_larga: "Residencia Larga Duración",
    tr_regreso: "Autorización de Regreso",
    tr_ue: "Certificado UE",

    appointment_tie_renewal: "Renovación TIE",
    appointment_empadronamiento: "Empadronamiento",
    appointment_nie_assignment: "Asignación NIE",
    appointment_place_madrid_center: "Comisaría Madrid Centro",
    appointment_place_madrid_townhall: "Ayuntamiento Madrid",
    appointment_place_madrid_north: "Comisaría Madrid Norte",

    procedure_tie_renewal: "Renovación TIE",
    procedure_arraigo_social: "Arraigo social",

    nationality_moroccan: "Marroquí",
    temporary_residence: "Residencia temporal",

    notif_appointment_confirmed: "Cita confirmada",
    notif_appointment_confirmed_body:
      "Renovación TIE · 24 Mar 2026 · 10:30 — Comisaría Madrid",
    notif_document_expiring: "Documento por renovar",
    notif_document_expiring_body:
      "Tu certificado de antecedentes penales caduca pronto",
    notif_regularizacion_title: "Regularización 2026",
    notif_regularizacion_body:
      "Nueva convocatoria disponible. Consulta tu elegibilidad.",

    time_2h_ago: "hace 2 h",
    time_1d_ago: "hace 1 día",
    time_3d_ago: "hace 3 días",

    panel_stat_tramites_sub: "1 en curso · 1 pendiente",
    panel_stat_next_appt_sub: "Renovación TIE · 10:30",

    per_month: "mes",
    pending: "Pendiente",
    share_referral_text:
      "Usa mi código {code} y consigue tu primer mes con descuento",

    plan_standard: "Estándar",
    plan_premium: "Premium",
    plan_pro: "Pro",

    docs_required_title: "Documentos requeridos",
    my_uploaded_docs: "Mis documentos subidos",
    loading: "Cargando...",
    documents_count: "documentos",
    loading_documents: "Cargando documentos...",
    no_documents_uploaded: "Aún no has subido documentos.",
    download: "Descargar",

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
    doc_pending: "Pendiente",
    doc_uploaded: "Subido",
    doc_replace: "Reemplazar",
    doc_upload: "Subir",

    proofs_complete_counter: "✔ {total}/{min} pruebas completas",
    proofs_counter: "{total}/{min} pruebas",

    error_loading_documents_title: "Error al cargar documentos",
    error_loading_documents_desc: "No se pudieron cargar los documentos",
    document_uploaded_title: "Documento subido",
    document_uploaded_success_named: "✅ {title} subido correctamente",
    document_uploaded_desc_named: "{title} subido correctamente.",
    error_upload_title: "Error al subir",
    error_upload_desc: "No se pudo subir el documento",
    error_download_title: "Error al descargar",
    error_download_desc: "No se pudo descargar el documento",
    referral_code_copied_desc: "{code} copiado al portapapeles.",
  },

  en: {
    nav_inicio: "Home",
    nav_panel: "Panel",
    nav_citas: "Appointments",
    nav_reg: "Regularisation 2026",
    nav_login: "Sign in",

    hero_badge: "Immigration AI Agent — 100% legal & safe",
    hero_title_main:
      "Find out in 5 minutes if you can regularise your status in Spain",
    hero_sub:
      "Our AI agent analyses your documents and tells you if you're ready to get your papers, appointments and residency. No waiting, no expensive agencies.",
    hero_btn1: "Analyse my case now",
    hero_btn2: "My dashboard",
    hero_trust: "Over 3,800 immigrants have already used GestoriaCitaIA",

    hero_title_1: "Find out if you can regularise",
    hero_title_2: "your status in Spain in 5 minutes",

    agents_title: "Your AI Agents available 24/7",
    agents_sub: "Digital specialists who assist you through every procedure",
    agent_mo_role: "Immigration Specialist",
    agent_mo_desc:
      "Process your NIE, TIE, visas and residency permit with AI in real time.",
    agent_mo_btn: "Talk to Mohamed",
    agent_sara_role: "Appointment Advisor 24/7",
    agent_sara_desc:
      "Find and book your appointment at the immigration office instantly.",
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

    plan_reg_name: "REGULARISATION",
    plan_reg_f1: "1 procedure / month",
    plan_reg_f2: "Document upload",
    plan_reg_f3: "Basic automatic verification",
    plan_reg_f4: "Guide avatar (Mohamed)",
    plan_reg_f5: "WhatsApp notification",

    hero_btn_citas: "Find appointments with Sara",

    buscar_doc_ready: "Ready",
    buscar_doc_review: "Review",
    buscar_doc_missing: "Pending",
    buscar_docs_required: "Required documents",
    buscar_forms_official: "Official forms",
    buscar_download_pdf: "Download PDF",
    buscar_wa_sent: "Confirmation sent via WhatsApp",
    buscar_upload: "Upload",
    buscar_chat_label: "Chat",
    buscar_all_online: "100% online",
    buscar_support: "Support in Spanish and Darija",

    reg_alert_text:
      "Extraordinary Regularisation 2026. The AI agent will verify your documents and fill in the application automatically. You just need to confirm.",
    reg_proc: "Procedure:",
    reg_upload: "Upload",
    reg_wa_sent: "Receipt sent via WhatsApp",
    reg_pdf_btn: "Download PDF",
    reg_auto_label: "(filled in automatically)",
    reg_chat_label: "Chat",

    panel_active: "ACTIVE",
    panel_plan_active: "Active plan",
    panel_tramites_curso: "Ongoing procedures",
    panel_quick_actions: "Quick actions",
    panel_legal_notice: "Notice",
    panel_legal_text:
      "GestoriaCitaIA is an AI assistant. We are not a gestoría or lawyers. We only organise your documents and help you find appointments. We do not process procedures on your behalf.",
    panel_referral_title: "Your referral code",
    panel_referral_reward: "1 month FREE",
    panel_referral_desc:
      "Invite 3 friends who buy a plan with your code and get 1 month free.",
    panel_copy: "Copy",
    panel_copied: "Copied",
    panel_referrals_bought: "Referrals who purchased",
    panel_referral_left: "You need",
    panel_referral_more: "more referral to earn your free month",

    tramites_title: "Procedures we handle",
    tramites_sub: "All immigration procedures, managed by AI in real time",

    buscar_title: "Find Appointments",
    buscar_tramite: "PROCEDURE",
    buscar_fecha: "DATE",
    buscar_hora: "TIME",
    buscar_confirmada: "APPOINTMENT CONFIRMED",
    buscar_confirmada_msg:
      "Your appointment has been booked. You will receive details via WhatsApp.",
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
    payment_soon_title: "Payments available soon",
    payment_soon_desc:
      "Leave your email and be the first to activate your plan",
    payment_soon_btn: "Notify me when payments are active",
    payment_soon_done:
      "Done! We'll notify you as soon as payments are active.",
    payment_soon_email: "Your email",

    panel_header: "Personal Dashboard",
    panel_notif_btn: "Notifications",
    panel_notif_mark_read: "Mark all read",
    panel_notif_view: "View full panel",
    panel_stat_tramites: "Active procedures",
    panel_stat_cita_next: "Next appointment",
    panel_stat_docs: "Documents",
    panel_stat_up_to: "Up to 3 appts/month",
    panel_tab_resumen: "Summary",
    panel_tab_tramites: "Procedures",
    panel_tab_citas: "My Appointments",
    panel_tab_docs: "Documents",
    panel_plan_used: "Appointments used",
    panel_next_invoice: "Next invoice",
    panel_manage_plan: "Manage plan",
    panel_new_appt: "New appointment",
    panel_cita_proxima: "Upcoming",
    panel_cita_done: "Completed ✓",
    panel_wa_confirmed: "Confirmed · WhatsApp alert sent",
    panel_search_agent: "Find new appointment with AI agent",
    panel_new_appt_agent: "New appointment with AI agent",
    panel_continue: "Continue",
    panel_completed_pct: "completed",
    panel_docs_header: "Immigration documents",
    panel_docs_completed: "completed",
    panel_upload_new: "Upload new document",
    panel_docs_encrypted:
      "Documents encrypted per GDPR · Only you have access",
    panel_client_data: "Client data",
    panel_full_name: "Full name",
    panel_procedures: "Procedures",
    panel_birthdate: "Date of birth",
    panel_situation: "Status",
    panel_tie_expiry: "TIE Expiry",
    panel_nav_resumen: "Summary",
    panel_nav_tramites: "Procedures",
    panel_nav_citas: "Appointments",
    panel_nav_docs: "Docs",
    panel_doc_ok: "OK",
    panel_doc_warn: "Review",
    panel_doc_missing: "Missing",
    panel_doc_upload: "Upload",
    panel_legal_aviso: "Notice:",
    panel_legal_panel:
      "GestoriaCitaIA is an AI assistant. We are not a gestoría or lawyers. We only organise your documents and help you find appointments. We do not process procedures on your behalf.",
    panel_action_cita: "Find appointment",
    panel_action_cita_sub: "With agent Sara",
    panel_action_reg: "Regularisation",
    panel_action_reg_sub: "2026 · New",
    panel_action_upload: "Upload document",
    panel_action_upload_sub: "PDF, JPG, PNG",
    panel_action_ia: "Talk to AI",
    panel_action_ia_sub: "Assistant 24/7",
    panel_tramite_curso: "In progress",
    panel_tramite_pending: "Pending docs",
    panel_tramite_s1: "Started",
    panel_tramite_s2: "Docs OK",
    panel_tramite_s3: "Appointment",
    panel_tramite_s4: "Completed",

    legal_label: "Important notice:",
    legal_body:
      "GestoriaCitaIA is an artificial intelligence assistant. We are not a gestoría, lawyers, or a legal firm. We do not process procedures on your behalf or represent you before any official body. We only help you organise your documents, explain the requirements for immigration procedures and find available appointments. For official procedures, consult a registered administrative agent or a lawyer specialising in immigration.",

    feat1: "100% online",
    feat2: "Support in Spanish and Darija",
    feat3: "AI document verification",
    feat4: "WhatsApp appointment alerts",

    tr_tie: "TIE Card Renewal",
    tr_visado_nac: "National Visa",
    tr_nie: "NIE Assignment",
    tr_empadron: "Registration (Empadronamiento)",
    tr_trabajo: "Work Authorisation",
    tr_familiar: "Family Reunification",
    tr_estudiante: "Student Visa",
    tr_arraigo: "Residence by Rootedness",
    tr_conducir: "Driving Licence Exchange",
    tr_larga: "Long-term Residence",
    tr_regreso: "Return Authorisation",
    tr_ue: "EU Certificate",

    appointment_tie_renewal: "TIE Renewal",
    appointment_empadronamiento: "Registration certificate",
    appointment_nie_assignment: "NIE Assignment",
    appointment_place_madrid_center: "Madrid Central Police Station",
    appointment_place_madrid_townhall: "Madrid City Hall",
    appointment_place_madrid_north: "Madrid North Police Station",

    procedure_tie_renewal: "TIE Renewal",
    procedure_arraigo_social: "Social Rooting",

    nationality_moroccan: "Moroccan",
    temporary_residence: "Temporary residence",

    notif_appointment_confirmed: "Appointment confirmed",
    notif_appointment_confirmed_body:
      "TIE Renewal · 24 Mar 2026 · 10:30 — Madrid Police Station",
    notif_document_expiring: "Document expiring soon",
    notif_document_expiring_body:
      "Your criminal record certificate will expire soon",
    notif_regularizacion_title: "Regularisation 2026",
    notif_regularizacion_body: "New call available. Check your eligibility.",

    time_2h_ago: "2h ago",
    time_1d_ago: "1 day ago",
    time_3d_ago: "3 days ago",

    panel_stat_tramites_sub: "1 in progress · 1 pending",
    panel_stat_next_appt_sub: "TIE Renewal · 10:30",

    per_month: "month",
    pending: "Pending",
    share_referral_text:
      "Use my code {code} and get your first month discounted",

    plan_standard: "Standard",
    plan_premium: "Premium",
    plan_pro: "Pro",

    docs_required_title: "Required documents",
    my_uploaded_docs: "My uploaded documents",
    loading: "Loading...",
    documents_count: "documents",
    loading_documents: "Loading documents...",
    no_documents_uploaded: "You have not uploaded any documents yet.",
    download: "Download",

    doc_passport: "Passport",
    doc_dni_nie: "DNI / NIE",
    doc_empadronamiento: "Registration certificate",
    doc_pruebas_espana: "Proof of stay in Spain",
    doc_fotografias: "Photographs",
    doc_formulario_oficial: "Official form",
    doc_tasa_pagada: "Paid fee",

    doc_required: "Required",
    doc_if_available: "If available",
    doc_important: "Important",
    doc_very_important: "Very important",
    doc_pending_fill: "Pending completion",
    doc_pending: "Pending",
    doc_uploaded: "Uploaded",
    doc_replace: "Replace",
    doc_upload: "Upload",

    proofs_complete_counter: "✔ {total}/{min} proofs complete",
    proofs_counter: "{total}/{min} proofs",

    error_loading_documents_title: "Error loading documents",
    error_loading_documents_desc: "Documents could not be loaded",
    document_uploaded_title: "Document uploaded",
    document_uploaded_success_named: "✅ {title} uploaded successfully",
    document_uploaded_desc_named: "{title} uploaded successfully.",
    error_upload_title: "Upload error",
    error_upload_desc: "The document could not be uploaded",
    error_download_title: "Download error",
    error_download_desc: "The document could not be downloaded",
    referral_code_copied_desc: "{code} copied to clipboard.",
  },

  darija: {
    nav_inicio: "البداية",
    nav_panel: "لوحتي",
    nav_citas: "المواعيد",
    nav_reg: "التسوية 2026",
    nav_login: "دخول",

    hero_badge: "وكيل ذكاء اصطناعي للهجرة — قانوني 100%",
    hero_title_main: "اعرف في 5 دقائق واش يمكنك تصلح وضعيتك في إسبانيا",
    hero_sub:
      "وكيلنا بالذكاء الاصطناعي كيحلل وراقك ويقولك واش أنت مستعد تجيب الإقامة والمواعيد والأوراق. بلا انتظار، بلا مكاتب غالية.",
    hero_btn1: "حلل حالتي دابا",
    hero_btn2: "شوف لوحتي",
    hero_trust: "أكثر من 3.800 مهاجر استخدموا GestoriaCitaIA",

    hero_title_1: "اعرف واش يمكنك تصلح وضعيتك",
    hero_title_2: "في إسبانيا في 5 دقائق",

    agents_title: "وكلاؤك بالذكاء الاصطناعي 24/7",
    agents_sub: "متخصصون رقميون كيرافقوك في كل خطوة",
    agent_mo_role: "متخصص في الهجرة",
    agent_mo_desc:
      "صلح NIE و TIE والتأشيرة والإقامة بالذكاء الاصطناعي في الوقت الحقيقي.",
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

    plan_reg_name: "التسوية",
    plan_reg_f1: "خدمة واحدة / شهر",
    plan_reg_f2: "رفع الوثائق",
    plan_reg_f3: "تحقق أساسي تلقائي",
    plan_reg_f4: "أفاتار مرشد (محمد)",
    plan_reg_f5: "إشعار واتساب",

    hero_btn_citas: "قلب على موعد مع سارة",

    buscar_doc_ready: "جاهز",
    buscar_doc_review: "مراجعة",
    buscar_doc_missing: "معلق",
    buscar_docs_required: "الوثائق المطلوبة",
    buscar_forms_official: "الاستمارات الرسمية",
    buscar_download_pdf: "تحميل PDF",
    buscar_wa_sent: "تم إرسال التأكيد عبر واتساب",
    buscar_upload: "رفع",
    buscar_chat_label: "شات",
    buscar_all_online: "100% عبر الإنترنت",
    buscar_support: "دعم بالعربي الدارجة والإسبانية",

    reg_alert_text:
      "التسوية الاستثنائية 2026. وكيل الذكاء الاصطناعي غادي يتحقق من وثائقك ويملأ الطلب تلقائياً. غير خاصك تأكد.",
    reg_proc: "الإجراء:",
    reg_upload: "رفع",
    reg_wa_sent: "تم إرسال الإيصال عبر واتساب",
    reg_pdf_btn: "تحميل PDF",
    reg_auto_label: "(مملوء تلقائياً)",
    reg_chat_label: "شات",

    panel_active: "نشط",
    panel_plan_active: "الباقة النشطة",
    panel_tramites_curso: "الخدمات الجارية",
    panel_quick_actions: "إجراءات سريعة",
    panel_legal_notice: "تنبيه",
    panel_legal_text:
      "GestoriaCitaIA هو مساعد ذكاء اصطناعي. ما حناش مكتب محامين. غير كنساعدوك تنظم وثائقك وتقلب على مواعيد.",
    panel_referral_title: "كود الإحالة ديالك",
    panel_referral_reward: "شهر مجاني",
    panel_referral_desc:
      "دعو 3 دياف يشرو باقة بكودك وغادي تربح شهر مجاني.",
    panel_copy: "نسخ",
    panel_copied: "تم النسخ",
    panel_referrals_bought: "الإحالات اللي شرو",
    panel_referral_left: "خاصك",
    panel_referral_more: "إحالة أخرى باش تربح شهرك المجاني",

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
    payment_soon_title: "المدفوعات قريبًا",
    payment_soon_desc: "اترك بريدك الإلكتروني وسنعلمك عند تفعيل الدفع",
    payment_soon_btn: "أعلمني عند تفعيل الدفع",
    payment_soon_done: "تم التسجيل! سنعلمك قريبًا.",
    payment_soon_email: "بريدك الإلكتروني",

    panel_header: "لوحتي الشخصية",
    panel_notif_btn: "الإشعارات",
    panel_notif_mark_read: "تعليم الكل كمقروء",
    panel_notif_view: "عرض اللوحة كاملة",
    panel_stat_tramites: "إجراءات نشطة",
    panel_stat_cita_next: "الموعد القادم",
    panel_stat_docs: "الوثائق",
    panel_stat_up_to: "حتى 3 مواعيد/الشهر",
    panel_tab_resumen: "ملخص",
    panel_tab_tramites: "الإجراءات",
    panel_tab_citas: "مواعيدي",
    panel_tab_docs: "الوثائق",
    panel_plan_used: "المواعيد المستعملة",
    panel_next_invoice: "الفاتورة الجاية",
    panel_manage_plan: "تسيير الباقة",
    panel_new_appt: "موعد جديد",
    panel_cita_proxima: "قريب",
    panel_cita_done: "مكتمل ✓",
    panel_wa_confirmed: "مؤكد · تصيفط تنبيه واتساب",
    panel_search_agent: "قلب على موعد جديد مع وكيل الذكاء الاصطناعي",
    panel_new_appt_agent: "موعد جديد مع وكيل الذكاء الاصطناعي",
    panel_continue: "كمل",
    panel_completed_pct: "مكتمل",
    panel_docs_header: "وثائق الهجرة",
    panel_docs_completed: "مكتملة",
    panel_upload_new: "رفع وثيقة جديدة",
    panel_docs_encrypted: "وثائق مشفرة حسب RGPD · غير نتا لي عندك الولوج",
    panel_client_data: "بيانات الزبون",
    panel_full_name: "الاسم الكامل",
    panel_procedures: "الإجراءات",
    panel_birthdate: "تاريخ الازدياد",
    panel_situation: "الوضعية",
    panel_tie_expiry: "انتهاء صلاحية TIE",
    panel_nav_resumen: "ملخص",
    panel_nav_tramites: "الإجراءات",
    panel_nav_citas: "المواعيد",
    panel_nav_docs: "الوثائق",
    panel_doc_ok: "جاهز",
    panel_doc_warn: "مراجعة",
    panel_doc_missing: "ناقص",
    panel_doc_upload: "رفع",
    panel_legal_aviso: "تنبيه:",
    panel_legal_panel:
      "GestoriaCitaIA هو مساعد ذكاء اصطناعي. ما حناش مكتب محامين. غير كنساعدوك تنظم وثائقك وتقلب على مواعيد. ما كنديروش الإجراءات بالنيابة عليك.",
    panel_action_cita: "قلب على موعد",
    panel_action_cita_sub: "مع الوكيلة سارة",
    panel_action_reg: "التسوية",
    panel_action_reg_sub: "2026 · جديد",
    panel_action_upload: "رفع وثيقة",
    panel_action_upload_sub: "PDF, JPG, PNG",
    panel_action_ia: "هضر مع الذكاء الاصطناعي",
    panel_action_ia_sub: "مساعد 24/7",
    panel_tramite_curso: "قيد التنفيذ",
    panel_tramite_pending: "في انتظار الوثائق",
    panel_tramite_s1: "بدا",
    panel_tramite_s2: "الوثائق واجدة",
    panel_tramite_s3: "الموعد",
    panel_tramite_s4: "مكتمل",

    legal_label: "تنبيه مهم:",
    legal_body:
      "GestoriaCitaIA هو مساعد ذكاء اصطناعي. ما حناش مكتب محامين ولا مستشارين قانونيين. ما كنديروش الإجراءات بالنيابة عليك ولا كنمثلوكش قدام أي جهة رسمية. غير كنساعدوك تنظم وثائقك، تفهم متطلبات الإجراءات، وتقلب على مواعيد. للإجراءات الرسمية، استاشر مع مستشار إداري أو محامي متخصص فالهجرة.",

    feat1: "100% عبر الإنترنت",
    feat2: "دعم بالإسبانية والدارجة",
    feat3: "التحقق بالذكاء الاصطناعي من الوثائق",
    feat4: "تنبيه واتساب بالمواعيد المتاحة",

    tr_tie: "تجديد بطاقة الإقامة TIE",
    tr_visado_nac: "التأشيرة الوطنية",
    tr_nie: "تعيين رقم NIE",
    tr_empadron: "التسجيل البلدي",
    tr_trabajo: "إذن العمل",
    tr_familiar: "لمّ الشمل العائلي",
    tr_estudiante: "تأشيرة الطالب",
    tr_arraigo: "الإقامة بالاندماج",
    tr_conducir: "تبديل رخصة السياقة",
    tr_larga: "الإقامة طويلة الأمد",
    tr_regreso: "رخصة الرجوع",
    tr_ue: "شهادة الاتحاد الأوروبي",

    appointment_tie_renewal: "تجديد بطاقة TIE",
    appointment_empadronamiento: "شهادة السكن",
    appointment_nie_assignment: "تعيين NIE",
    appointment_place_madrid_center: "كوميسارية مدريد سنطر",
    appointment_place_madrid_townhall: "بلدية مدريد",
    appointment_place_madrid_north: "كوميسارية مدريد الشمالية",

    procedure_tie_renewal: "تجديد بطاقة TIE",
    procedure_arraigo_social: "أرايغو سوسيال",

    nationality_moroccan: "مغربي",
    temporary_residence: "إقامة مؤقتة",

    notif_appointment_confirmed: "تم تأكيد الموعد",
    notif_appointment_confirmed_body:
      "تجديد TIE · 24 مارس 2026 · 10:30 — كوميسارية مدريد",
    notif_document_expiring: "وثيقة قربات تسالي",
    notif_document_expiring_body: "شهادة السوابق العدلية ديالك قربات تسالي",
    notif_regularizacion_title: "التسوية 2026",
    notif_regularizacion_body: "كاين إعلان جديد. شوف واش نتا مؤهل.",

    time_2h_ago: "منذ ساعتين",
    time_1d_ago: "منذ نهار",
    time_3d_ago: "منذ 3 أيام",

    panel_stat_tramites_sub: "1 جاري · 1 باقي",
    panel_stat_next_appt_sub: "تجديد TIE · 10:30",

    per_month: "الشهر",
    pending: "معلق",
    share_referral_text:
      "استعمل الكود ديالي {code} وخذ تخفيض فالشهر الأول",

    plan_standard: "القياسي",
    plan_premium: "بريميوم",
    plan_pro: "برو",

    docs_required_title: "الوثائق المطلوبة",
    my_uploaded_docs: "الوثائق اللي رفعت",
    loading: "جاري التحميل...",
    documents_count: "وثائق",
    loading_documents: "جاري تحميل الوثائق...",
    no_documents_uploaded: "مازال ما رفعتي حتى وثيقة.",
    download: "تحميل",

    doc_passport: "الباسبور",
    doc_dni_nie: "DNI / NIE",
    doc_empadronamiento: "شهادة السكن",
    doc_pruebas_espana: "إثباتات التواجد فإسبانيا",
    doc_fotografias: "تصاور",
    doc_formulario_oficial: "الاستمارة الرسمية",
    doc_tasa_pagada: "الرسوم مخلصة",

    doc_required: "إجباري",
    doc_if_available: "إلى كان",
    doc_important: "مهم",
    doc_very_important: "مهم بزاف",
    doc_pending_fill: "باقي خاصو يتعمر",
    doc_pending: "معلق",
    doc_uploaded: "مرفوع",
    doc_replace: "بدل",
    doc_upload: "رفع",

    proofs_complete_counter: "✔ {total}/{min} إثباتات كاملة",
    proofs_counter: "{total}/{min} إثباتات",

    error_loading_documents_title: "خطأ فتحميل الوثائق",
    error_loading_documents_desc: "ما قدرناش نحملو الوثائق",
    document_uploaded_title: "ترفعات الوثيقة",
    document_uploaded_success_named: "✅ {title} ترفعات بنجاح",
    document_uploaded_desc_named: "{title} ترفعات بنجاح.",
    error_upload_title: "خطأ فالرفع",
    error_upload_desc: "ما قدرناش نرفعو الوثيقة",
    error_download_title: "خطأ فالتحميل",
    error_download_desc: "ما قدرناش نحملو الوثيقة",
    referral_code_copied_desc: "{code} تنسخ فالحافظة.",
  },
};

type TranslationDict = typeof translations.es;
export type TranslationKey = keyof TranslationDict;

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

const STORAGE_KEY = "gestoriacitaia_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "es" || saved === "en" || saved === "darija") {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: TranslationKey): string => {
    return (
      (translations[lang] as Record<string, string>)[key] ??
      (translations.es as Record<string, string>)[key] ??
      key
    );
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      <div
        dir={lang === "darija" ? "rtl" : "ltr"}
        lang={lang === "darija" ? "ar" : lang === "en" ? "en" : "es"}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
