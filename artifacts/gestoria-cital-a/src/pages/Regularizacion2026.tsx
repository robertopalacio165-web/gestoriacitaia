import { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { PaymentModal } from "@/components/PaymentModal";
import { useLang } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Settings,
  Mic,
  MicOff,
  RefreshCw,
  Shield,
  Bell,
  CheckCircle2,
  MessageSquare,
  Send,
  Upload,
  AlertTriangle,
  Star,
  ExternalLink,
  Download,
  FileUp,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fileToDataUrl, verifyDocument } from "@/lib/verifyDocument";

interface ChatMsg {
  from: "agent" | "user";
  text: string;
  ts?: number;
}

type DocStatus = "ok" | "warn" | "missing";

type SituationItem = {
  value: string;
  label: string;
};

type RequiredDocItem = {
  nombre: string;
  estado: DocStatus;
};

type StoredDocItem = {
  id: string;
  nombre: string;
  archivo: string;
  estado: DocStatus;
  kb: string;
};

type FormItem = {
  nombre: string;
  codigo: string;
  url: string;
};

export default function Regularizacion2026() {
  const [selectedSituacion, setSelectedSituacion] = useState("laboral");
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [sendingChat, setSendingChat] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [paymentTriggered, setPaymentTriggered] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatBootstrapped, setChatBootstrapped] = useState(false);

  const { t, lang } = useLang();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const ui = useMemo(() => {
    if (lang === "darija") {
      return {
        initialChat:
          "وعليكم السلام، مرحبا بيك. أنا محمد، وغادي نعاونك فـ التسوية 2026 خطوة بخطوة.",
        agentSteps: (selectedLabel: string) => [
          {
            text: `سلام، أنا محمد. غادي نعاونك فالتسوية 2026. أولاً اختار الوضعية الحالية ديالك باش نلقاو الإجراء المناسب. الوضعية الحالية المختارة هي «${selectedLabel}».`,
            highlight: "التسوية 2026",
          },
          {
            text: "مزيان. لقينا الإجراء المناسب. دابا غادي نتحقق من الوثائق ديالك. كنحتاج: الباسبور أو NIE، شهادة السكن لعامين، وعقد العمل.",
            highlight: "نتحقق من الوثائق ديالك",
          },
          {
            text: "الوثائق تراجعات بنجاح. دابا غادي نعمرو الطلب فالموقع الرسمي. أنا نهتم بالبيانات.",
            highlight: "الوثائق تراجعات بنجاح",
          },
          {
            text: "ترسل الطلب بنجاح. النظام خرج ليك الوصل وتْسجل الملف بشكل صحيح.",
            highlight: "ترسل الطلب بنجاح",
          },
        ],
        situations: [
          {
            value: "laboral",
            label: "أرايغو مهني (2 سنين فإسبانيا، عقد عمل)",
          },
          {
            value: "social",
            label: "أرايغو اجتماعي (3 سنين فإسبانيا، روابط عائلية/اجتماعية)",
          },
          {
            value: "familiar",
            label: "أرايغو عائلي (قريب لمواطن إسباني/أوروبي)",
          },
          {
            value: "ampliado",
            label: "أرايغو اجتماعي موسع (تكوين مهني معترف به)",
          },
          {
            value: "retorno",
            label: "رجوع الأشخاص المهاجرين",
          },
          {
            value: "excep_trabajo",
            label: "ترخيص لظروف استثنائية (العمل)",
          },
        ] as SituationItem[],
        requiredDocs: [
          { nombre: "الباسبور أو NIE صالح", estado: "ok" as DocStatus },
          { nombre: "شهادة السكن (على الأقل عامين)", estado: "ok" as DocStatus },
          { nombre: "عقد العمل موقع", estado: "ok" as DocStatus },
          { nombre: "شهادة السوابق العدلية", estado: "warn" as DocStatus },
          { nombre: "استمارة EX-10 / EX-11", estado: "missing" as DocStatus },
          { nombre: "تصاور حديثة (2)", estado: "ok" as DocStatus },
        ] as RequiredDocItem[],
        initialStoredDocs: [
          {
            id: "nie",
            nombre: "الباسبور / NIE صالح",
            archivo: "NIE_X1234567Z.pdf",
            estado: "ok" as DocStatus,
            kb: "248 KB",
          },
          {
            id: "empadron",
            nombre: "شهادة السكن",
            archivo: "Empadronamiento_2024.pdf",
            estado: "ok" as DocStatus,
            kb: "156 KB",
          },
          {
            id: "contrato",
            nombre: "عقد العمل موقع",
            archivo: "Contrato_Benali_2026.pdf",
            estado: "ok" as DocStatus,
            kb: "312 KB",
          },
          {
            id: "penales",
            nombre: "شهادة السوابق العدلية",
            archivo: "Antecedentes_tramitando.pdf",
            estado: "warn" as DocStatus,
            kb: "قيد الإنجاز",
          },
          {
            id: "ex10",
            nombre: "استمارة EX-10 / EX-11",
            archivo: "",
            estado: "missing" as DocStatus,
            kb: "",
          },
          {
            id: "fotos",
            nombre: "تصاور حديثة (2)",
            archivo: "Fotos_Benali.jpg",
            estado: "ok" as DocStatus,
            kb: "84 KB",
          },
        ] as StoredDocItem[],
        forms: [
          {
            nombre: "أرايغو مهني / اجتماعي",
            codigo: "EX-10",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf",
          },
          {
            nombre: "أرايغو عائلي",
            codigo: "EX-11",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/11-Arraigo_familiar.pdf",
          },
          {
            nombre: "ترخيص الإقامة",
            codigo: "EX-01",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/01-Autorizacion_residencia.pdf",
          },
        ] as FormItem[],
        online: "متصل الآن",
        role: "مختص فالهجرة",
        paymentMessage:
          "باش تكمل فالتسوية 2026 وتقدم الطلب فالموقع الرسمي، فعل الخطة ديالك. أنا نرشدك خطوة بخطوة.",
        paymentTriggerMessage:
          "باش نكملو ونخدمو على الملف ديالك، خاصك تفعل الخدمة. منين تخلص نكملو معاك مباشرة.",
        planActivated: "تفعلات الخطة",
        planContinue: "مزيان. نكملو دابا عملية التسوية ديالك.",
        docsVerifiedTitle: "تراجعات الوثائق",
        docsVerifiedDesc: "الوثائق الرئيسية تراجعات بشكل صحيح.",
        submitSuccessTitle: "ترسل الطلب!",
        submitSuccessDesc: "الملف تسجل بشكل صحيح.",
        documentUploadedTitle: "ترفعات الوثيقة",
        documentUploadedDesc: "تزاد الفورمولير بنجاح.",
        openChat: "نفضل نكتب · فتح الشات",
        closeChat: "سد الشات",
        writeQuestion: "كتب سؤالك...",
        docsPanelTitle: "وثائق التسوية 2026",
        readyPlural: "واجدين",
        uploading: "كيترفع...",
        uploadPdf: "رفع PDF",
        uploadedPdfs: "PDF مرفوعين",
        aiVerified: "مراجعين بالذكاء",
        pending: "معلق",
        toSend: "باش يتصيفط",
        completeOnOfficialSite: "كمّل الطلب فـ sede.gob.es",
        aiFillsOfficialSite: "الوكيل الذكي كيحضر ويعمر البيانات أوتوماتيكياً",
        procedureSmall: "الإجراء:",
        govHeader: "التسوية 2026",
        govLine1: "وزارة الداخلية",
        govLine2: "كتابة الدولة",
        govLine3: "ديال الهجرة",
        situationTitle: "الوضعية الحالية",
        applicationData: "بيانات الطلب",
        filledAutomatically: "تعمر أوتوماتيكياً",
        sendApplication: "صيفط الطلب",
        requestSent: "ترسل الطلب!",
        fullName: "الاسم",
        reference: "المرجع",
        sendDate: "تاريخ الإرسال",
        status: "الحالة",
        inProcess: "قيد المعالجة",
        resolution: "الجواب",
        receiptGenerated: "تولد الوصل بنجاح",
        downloadPdf: "تحميل PDF",
        documents: "الوثائق",
        formsLabel: "الاستمارات",
        requiredDocuments: "الوثائق المطلوبة",
        officialForms: "الاستمارات الرسمية",
        ready: "واجد",
        review: "راجع",
        withoutAudio: "بلا صوت",
        mute: "كتم",
        activePlanLabel: "الخطة",
        active: "نشطة",
        source: "المصدر: extranjeros.inclusion.gob.es",
      };
    }

    if (lang === "en") {
      return {
        initialChat:
          "Hello, I’m Mohamed. I’m here to help you with Regularization 2026 step by step.",
        agentSteps: (selectedLabel: string) => [
          {
            text: `Hi, I’m Mohamed. I’ll help you with Regularization 2026. First, select your current situation to find the correct process. The selected situation is “${selectedLabel}”.`,
            highlight: "Regularization 2026",
          },
          {
            text: "Perfect. I found the correct process. Now I’m going to verify your documents. I need: NIE or passport, 2 years of registration certificate, and employment contract.",
            highlight: "verify your documents",
          },
          {
            text: "Documents verified! Everything looks correct. Now we’ll fill out the application on the official site. I’ll handle the data.",
            highlight: "Documents verified!",
          },
          {
            text: "Application submitted successfully! The system generated your receipt and the case was recorded correctly.",
            highlight: "Application submitted successfully!",
          },
        ],
        situations: [
          {
            value: "laboral",
            label: "Work Rootedness (2+ years in Spain, employment contract)",
          },
          {
            value: "social",
            label: "Social Rootedness (3+ years in Spain, family/social ties)",
          },
          {
            value: "familiar",
            label: "Family Rootedness (family member of Spanish/EU citizen)",
          },
          {
            value: "ampliado",
            label: "Extended Social Rootedness (approved job training)",
          },
          {
            value: "retorno",
            label: "Return of Emigrant Persons",
          },
          {
            value: "excep_trabajo",
            label: "Authorization for Exceptional Circumstances (work)",
          },
        ] as SituationItem[],
        requiredDocs: [
          { nombre: "Valid passport or NIE", estado: "ok" as DocStatus },
          {
            nombre: "Registration certificate (minimum 2 years)",
            estado: "ok" as DocStatus,
          },
          { nombre: "Signed employment contract", estado: "ok" as DocStatus },
          { nombre: "Criminal record certificate", estado: "warn" as DocStatus },
          { nombre: "EX-10 / EX-11 form", estado: "missing" as DocStatus },
          { nombre: "Recent photographs (2)", estado: "ok" as DocStatus },
        ] as RequiredDocItem[],
        initialStoredDocs: [
          {
            id: "nie",
            nombre: "Valid passport / NIE",
            archivo: "NIE_X1234567Z.pdf",
            estado: "ok" as DocStatus,
            kb: "248 KB",
          },
          {
            id: "empadron",
            nombre: "Registration certificate",
            archivo: "Empadronamiento_2024.pdf",
            estado: "ok" as DocStatus,
            kb: "156 KB",
          },
          {
            id: "contrato",
            nombre: "Signed employment contract",
            archivo: "Contrato_Benali_2026.pdf",
            estado: "ok" as DocStatus,
            kb: "312 KB",
          },
          {
            id: "penales",
            nombre: "Criminal record certificate",
            archivo: "Antecedentes_tramitando.pdf",
            estado: "warn" as DocStatus,
            kb: "In progress",
          },
          {
            id: "ex10",
            nombre: "EX-10 / EX-11 form",
            archivo: "",
            estado: "missing" as DocStatus,
            kb: "",
          },
          {
            id: "fotos",
            nombre: "Recent photographs (2)",
            archivo: "Fotos_Benali.jpg",
            estado: "ok" as DocStatus,
            kb: "84 KB",
          },
        ] as StoredDocItem[],
        forms: [
          {
            nombre: "Work / Social Rootedness",
            codigo: "EX-10",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf",
          },
          {
            nombre: "Family Rootedness",
            codigo: "EX-11",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/11-Arraigo_familiar.pdf",
          },
          {
            nombre: "Residence Authorization",
            codigo: "EX-01",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/01-Autorizacion_residencia.pdf",
          },
        ] as FormItem[],
        online: "Online",
        role: "Immigration Specialist",
        paymentMessage:
          "To continue with your Regularization 2026 and submit your application on the official site, activate your plan. I’ll guide you step by step.",
        paymentTriggerMessage:
          "To continue with your case, activate the service and we continue with you step by step.",
        planActivated: "Plan activated",
        planContinue: "Perfect. Let’s continue with your regularization.",
        docsVerifiedTitle: "Documents verified",
        docsVerifiedDesc: "The main documentation was reviewed successfully.",
        submitSuccessTitle: "Application submitted!",
        submitSuccessDesc: "The case has been recorded successfully.",
        documentUploadedTitle: "Document uploaded",
        documentUploadedDesc: "The form has been added successfully.",
        openChat: "I prefer to write · Open chat",
        closeChat: "Close chat",
        writeQuestion: "Type your question...",
        docsPanelTitle: "Regularization 2026 Documents",
        readyPlural: "ready",
        uploading: "Uploading...",
        uploadPdf: "Upload PDF",
        uploadedPdfs: "PDF uploaded",
        aiVerified: "AI verified",
        pending: "Pending",
        toSend: "To submit",
        completeOnOfficialSite: "Complete application on sede.gob.es",
        aiFillsOfficialSite:
          "The AI agent prepares and fills the data automatically",
        procedureSmall: "Procedure:",
        govHeader: "REGULARIZATION 2026",
        govLine1: "MINISTRY OF INTERIOR",
        govLine2: "STATE SECRETARIAT",
        govLine3: "OF IMMIGRATION",
        situationTitle: "CURRENT SITUATION",
        applicationData: "APPLICATION DATA",
        filledAutomatically: "filled automatically",
        sendApplication: "Submit application",
        requestSent: "APPLICATION SUBMITTED!",
        fullName: "Name",
        reference: "Reference",
        sendDate: "Submission date",
        status: "Status",
        inProcess: "In process",
        resolution: "Resolution",
        receiptGenerated: "Receipt generated successfully",
        downloadPdf: "Download PDF",
        documents: "Documents",
        formsLabel: "Forms",
        requiredDocuments: "Required documents",
        officialForms: "Official forms",
        ready: "Ready",
        review: "Review",
        withoutAudio: "No audio",
        mute: "Mute",
        activePlanLabel: "Plan",
        active: "active",
        source: "Source: extranjeros.inclusion.gob.es",
      };
    }

    return {
      initialChat:
        "Hola, soy Mohamed. Estoy aquí para ayudarte con la Regularización 2026 paso a paso.",
      agentSteps: (selectedLabel: string) => [
        {
          text: `Hola, soy Mohamed. Te voy a ayudar con la Regularización 2026. Primero, selecciona tu situación actual para encontrar el trámite correcto. La situación elegida es «${selectedLabel}».`,
          highlight: "Regularización 2026",
        },
        {
          text: "Perfecto. He encontrado tu trámite. Ahora voy a verificar tus documentos. Necesito: NIE o pasaporte, empadronamiento de 2 años y contrato de trabajo.",
          highlight: "verificar tus documentos",
        },
        {
          text: "¡Documentos verificados! Todo está correcto. Ahora vamos a rellenar la solicitud en la sede oficial. Yo me encargo de los datos.",
          highlight: "¡Documentos verificados!",
        },
        {
          text: "¡Solicitud enviada con éxito! El sistema ha generado tu resguardo y el proceso ha quedado registrado correctamente.",
          highlight: "¡Solicitud enviada con éxito!",
        },
      ],
      situations: [
        {
          value: "laboral",
          label: "Arraigo Laboral (2+ años en España, contrato de trabajo)",
        },
        {
          value: "social",
          label:
            "Arraigo Social (3+ años en España, vínculos familiares/sociales)",
        },
        {
          value: "familiar",
          label: "Arraigo Familiar (familiar de ciudadano español/UE)",
        },
        {
          value: "ampliado",
          label: "Arraigo Social Ampliado (formación laboral homologada)",
        },
        {
          value: "retorno",
          label: "Retorno de Personas Emigrantes",
        },
        {
          value: "excep_trabajo",
          label: "Autorización por Circunstancias Excepcionales (trabajo)",
        },
      ] as SituationItem[],
      requiredDocs: [
        { nombre: "Pasaporte o NIE vigente", estado: "ok" as DocStatus },
        {
          nombre: "Empadronamiento (2 años mínimo)",
          estado: "ok" as DocStatus,
        },
        { nombre: "Contrato de trabajo firmado", estado: "ok" as DocStatus },
        {
          nombre: "Certificado de antecedentes penales",
          estado: "warn" as DocStatus,
        },
        { nombre: "Formulario EX-10 / EX-11", estado: "missing" as DocStatus },
        { nombre: "Fotografías recientes (2 unidades)", estado: "ok" as DocStatus },
      ] as RequiredDocItem[],
      initialStoredDocs: [
        {
          id: "nie",
          nombre: "Pasaporte / NIE vigente",
          archivo: "NIE_X1234567Z.pdf",
          estado: "ok" as DocStatus,
          kb: "248 KB",
        },
        {
          id: "empadron",
          nombre: "Certificado de empadronamiento",
          archivo: "Empadronamiento_2024.pdf",
          estado: "ok" as DocStatus,
          kb: "156 KB",
        },
        {
          id: "contrato",
          nombre: "Contrato de trabajo firmado",
          archivo: "Contrato_Benali_2026.pdf",
          estado: "ok" as DocStatus,
          kb: "312 KB",
        },
        {
          id: "penales",
          nombre: "Certificado antecedentes penales",
          archivo: "Antecedentes_tramitando.pdf",
          estado: "warn" as DocStatus,
          kb: "En trámite",
        },
        {
          id: "ex10",
          nombre: "Formulario EX-10 / EX-11",
          archivo: "",
          estado: "missing" as DocStatus,
          kb: "",
        },
        {
          id: "fotos",
          nombre: "Fotografías recientes (2 uds.)",
          archivo: "Fotos_Benali.jpg",
          estado: "ok" as DocStatus,
          kb: "84 KB",
        },
      ] as StoredDocItem[],
      forms: [
        {
          nombre: "Arraigo Laboral / Social",
          codigo: "EX-10",
          url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf",
        },
        {
          nombre: "Arraigo Familiar",
          codigo: "EX-11",
          url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/11-Arraigo_familiar.pdf",
        },
        {
          nombre: "Autorización Residencia",
          codigo: "EX-01",
          url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/01-Autorizacion_residencia.pdf",
        },
      ] as FormItem[],
      online: "En línea",
      role: "Especialista en Extranjería",
      paymentMessage:
        "Para continuar con tu Regularización 2026 y presentar tu solicitud en la sede oficial, activa tu plan. Yo me encargo de guiarte paso a paso.",
      paymentTriggerMessage:
        "Para continuar con tu trámite, activa el servicio y seguimos contigo paso a paso.",
      planActivated: "Plan activado",
      planContinue: "Perfecto. Continuamos con tu regularización.",
      docsVerifiedTitle: "Documentos verificados",
      docsVerifiedDesc:
        "La documentación principal ha sido revisada correctamente.",
      submitSuccessTitle: "¡Solicitud enviada!",
      submitSuccessDesc: "El expediente ha quedado registrado correctamente.",
      documentUploadedTitle: "Documento subido",
      documentUploadedDesc: "El formulario ha sido añadido correctamente.",
      openChat: "Prefiero escribir · Abrir chat",
      closeChat: "Cerrar chat",
      writeQuestion: "Escribe tu pregunta...",
      docsPanelTitle: "Documentos Regularización 2026",
      readyPlural: "listos",
      uploading: "Subiendo...",
      uploadPdf: "Subir PDF",
      uploadedPdfs: "PDF subidos",
      aiVerified: "Verificados IA",
      pending: "Pendiente",
      toSend: "Para enviar",
      completeOnOfficialSite: "Completar solicitud en sede.gob.es",
      aiFillsOfficialSite:
        "El agente IA rellena y prepara los datos automáticamente",
      procedureSmall: "Procedimiento:",
      govHeader: "REGULARIZACIÓN 2026",
      govLine1: "MINISTERIO DEL INTERIOR",
      govLine2: "SECRETARÍA DE ESTADO",
      govLine3: "DE INMIGRACIÓN",
      situationTitle: "SITUACIÓN ACTUAL",
      applicationData: "DATOS DE LA SOLICITUD",
      filledAutomatically: "rellenado automáticamente",
      sendApplication: "Enviar solicitud",
      requestSent: "¡SOLICITUD ENVIADA!",
      fullName: "Nombre",
      reference: "Referencia",
      sendDate: "Fecha envío",
      status: "Estado",
      inProcess: "En tramitación",
      resolution: "Resolución",
      receiptGenerated: "Resguardo generado correctamente",
      downloadPdf: "Descargar PDF",
      documents: "Documentos",
      formsLabel: "Formularios",
      requiredDocuments: "Documentos requeridos",
      officialForms: "Formularios oficiales",
      ready: "Listo",
      review: "Revisar",
      withoutAudio: "Sin audio",
      mute: "Mute",
      activePlanLabel: "Plan",
      active: "activo",
      source: "Fuente: extranjeros.inclusion.gob.es",
    };
  }, [lang]);

  const [docs, setDocs] = useState<StoredDocItem[]>(ui.initialStoredDocs);

  const chatStorageKey = useMemo(() => {
    return `gestoriacitaia_mohamed_chat_regularizacion_${lang}`;
  }, [lang]);

  useEffect(() => {
    setDocs(ui.initialStoredDocs);
  }, [ui.initialStoredDocs]);

  useEffect(() => {
    if (!chatStorageKey) return;

    try {
      const raw = localStorage.getItem(chatStorageKey);

      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);

          const userMsgs = parsed.filter((m) => m.from === "user").length;
          setUserMessageCount(userMsgs);

          const paymentAlreadyTriggered = parsed.some(
            (m) => m.from === "agent" && m.text === ui.paymentTriggerMessage
          );

          setPaymentTriggered(paymentAlreadyTriggered);
          setChatBootstrapped(true);
          return;
        }
      }

      const freshChat: ChatMsg[] = [
        {
          from: "agent",
          text: ui.initialChat,
          ts: Date.now(),
        },
      ];

      setChatMessages(freshChat);
      setUserMessageCount(0);
      setPaymentTriggered(false);
      setChatBootstrapped(true);
    } catch (error) {
      console.error("Error cargando historial de Mohamed:", error);

      const freshChat: ChatMsg[] = [
        {
          from: "agent",
          text: ui.initialChat,
          ts: Date.now(),
        },
      ];

      setChatMessages(freshChat);
      setUserMessageCount(0);
      setPaymentTriggered(false);
      setChatBootstrapped(true);
    }
  }, [chatStorageKey, ui.initialChat, ui.paymentTriggerMessage]);

  useEffect(() => {
    if (!chatBootstrapped || !chatStorageKey || chatMessages.length === 0) {
      return;
    }

    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
    } catch (error) {
      console.error("Error guardando historial de Mohamed:", error);
    }
  }, [chatMessages, chatBootstrapped, chatStorageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, sendingChat]);

  const selectedSituationLabel =
    ui.situations.find((s) => s.value === selectedSituacion)?.label ||
    ui.situations[0].label;

  const AGENT_STEPS = ui.agentSteps(selectedSituationLabel);
  const SITUACIONES = ui.situations;
  const DOCS_REQUERIDOS = ui.requiredDocs;
  const FORMULARIOS = ui.forms;

  const handleSituacionClick = (value: string) => {
    setSelectedSituacion(value);

    if (step === 0 && planActivo) {
      setStep(1);
    }
  };

  const handleVerificarDocs = () => {
    if (!planActivo) {
      setShowPayment(true);
      return;
    }

    setStep(2);

    toast({
      title: ui.docsVerifiedTitle,
      description: ui.docsVerifiedDesc,
    });
  };

  const handleEnviarSolicitud = () => {
    if (!planActivo) {
      setShowPayment(true);
      return;
    }

    setStep(3);

    setTimeout(() => {
      setSubmitted(true);
    }, 800);

    toast({
      title: ui.submitSuccessTitle,
      description: ui.submitSuccessDesc,
    });
  };

  const handleSelectPlan = (plan: string) => {
    setPlanActivo(plan);
    setShowPayment(false);
    setStep(1);

    toast({
      title: ui.planActivated,
      description: ui.planContinue,
    });
  };

  const docsOk = docs.filter((d) => d.estado === "ok").length;
  const docsTotal = docs.length;
  const allReady = docsOk >= docsTotal - 1;
const handleUploadDoc = async (id: string) => {
  if (!planActivo) {
    setShowPayment(true);
    return;
  }

  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setUploadingId(id);

      try {
        const base64 = await fileToDataUrl(file);

        const result = await verifyDocument({
          imageBase64: base64,
          expectedDocumentType: "auto",
          lang: lang as "darija" | "es" | "en",
        });

        console.log("RESULTADO IA:", result);

        setDocs((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  estado: "ok" as DocStatus,
                  archivo: file.name,
                  kb: `${Math.round(file.size / 1024)} KB`,
                }
              : d
          )
        );

        toast({
          title:
            lang === "darija"
              ? "تراجع الوثيقة"
              : lang === "en"
              ? "Document verified"
              : "Documento verificado",
          description:
            result?.summary ||
            (lang === "darija"
              ? "الذكاء الاصطناعي حلل الوثيقة بنجاح."
              : lang === "en"
              ? "The AI analyzed the document successfully."
              : "La IA analizó el documento correctamente."),
        });
      } catch (err: any) {
        console.error("Error IA documento:", err);

        toast({
          title:
            lang === "darija"
              ? "خطأ فالتحليل"
              : lang === "en"
              ? "Verification error"
              : "Error de verificación",
          description:
            err?.message ||
            (lang === "darija"
              ? "ما قدرناش نحللو الوثيقة."
              : lang === "en"
              ? "Could not analyze the document."
              : "No se pudo analizar el documento."),
          variant: "destructive",
        });
      } finally {
        setUploadingId(null);
      }
    };

    input.click();
  } catch (error: any) {
    console.error("Error general handleUploadDoc:", error);

    toast({
      title:
        lang === "darija"
          ? "خطأ"
          : lang === "en"
          ? "Error"
          : "Error",
      description:
        error?.message ||
        (lang === "darija"
          ? "وقع مشكل غير متوقع."
          : lang === "en"
          ? "An unexpected error occurred."
          : "Ocurrió un error inesperado."),
      variant: "destructive",
    });
  }
};


      input.click();
    } catch (error: any) {
      console.error("Error general handleUploadDoc:", error);

      toast({
        title:
          lang === "darija"
            ? "خطأ"
            : lang === "en"
            ? "Error"
            : "Error",
        description:
          error?.message ||
          (lang === "darija"
            ? "وقع مشكل غير متوقع."
            : lang === "en"
            ? "An unexpected error occurred."
            : "Ocurrió un error inesperado."),
        variant: "destructive",
      });
    }
  };

  const handleIrSede = () => {
    if (!planActivo) {
      setShowPayment(true);
      return;
    }

    window.open(
      "https://sede.administracionespublicas.gob.es/procedimientoini/",
      "_blank"
    );

    if (step < 1) setStep(1);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || sendingChat || !chatBootstrapped) return;

    const rawText = chatInput.trim();
    const nextUserCount = userMessageCount + 1;
    const shouldTriggerPayment =
      !planActivo && !paymentTriggered && nextUserCount >= 2;

    const userMessage: ChatMsg = {
      from: "user",
      text: rawText,
      ts: Date.now(),
    };

    const historyToSend = chatMessages.slice(-8).map((msg) => ({
      from: msg.from,
      text: msg.text,
    }));

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setSendingChat(true);
    setUserMessageCount(nextUserCount);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant: "mohamed",
          message: rawText,
          context: "regularizacion_2026",
          lang,
          history: historyToSend,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error en Mohamed");
      }

      const finalReply =
        data?.reply ||
        (lang === "darija"
          ? "سمح ليا، ما قدرتش نجاوب دابا."
          : lang === "en"
          ? "Sorry, I could not answer right now."
          : "Lo siento, no pude responder ahora mismo.");

      const agentReply: ChatMsg = {
        from: "agent",
        text: finalReply,
        ts: Date.now(),
      };

      if (shouldTriggerPayment) {
        const paymentMsg: ChatMsg = {
          from: "agent",
          text: ui.paymentTriggerMessage,
          ts: Date.now() + 1,
        };

        setChatMessages((prev) => [...prev, agentReply, paymentMsg]);
        setPaymentTriggered(true);

        setTimeout(() => {
          setShowPayment(true);
        }, 900);
      } else {
        setChatMessages((prev) => [...prev, agentReply]);
      }
    } catch (error) {
      console.error("Error conectando con Mohamed:", error);

      const errorReply: ChatMsg = {
        from: "agent",
        text:
          lang === "darija"
            ? "وقع مشكل فالاتصال مع محمد، عاود حاول."
            : lang === "en"
            ? "There was a connection error with Mohamed. Please try again."
            : "Error conectando con Mohamed, intenta otra vez.",
        ts: Date.now(),
      };

      setChatMessages((prev) => [...prev, errorReply]);
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <div
        className="fixed inset-0 z-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 40% at 30% 20%, rgba(34,197,94,0.1), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.08), transparent)",
        }}
      />

      <Navbar />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={handleSelectPlan}
        agentMessage={ui.paymentMessage}
      />

      <main className="flex-1 relative z-10 flex flex-col pt-16 pb-0">
        <div className="px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
              {t("reg_title")}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Star className="w-2.5 h-2.5" />
                {t("reg_new")}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">{t("reg_sub")}</p>
          </div>

          {planActivo ? (
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium">
              {ui.activePlanLabel} {planActivo} {ui.active} ✓
            </span>
          ) : (
            <button
              onClick={() => setShowPayment(true)}
              className="text-xs px-3 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
              type="button"
            >
              {t("reg_activar")}
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full pb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-3"
          >
            <div
              className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)] bg-black"
              style={{ height: "260px" }}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                alt="Mohamed"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-white">{ui.online}</span>
              </div>

              <div className="absolute top-3 right-3">
                <div className="relative w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                    !
                  </span>
                </div>
              </div>

              {!muted && (
                <div className="absolute bottom-14 left-4 flex items-end gap-0.5 h-5">
                  {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: [`${h}px`, `${h * 2}px`, `${h}px`] }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.07,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="absolute bottom-12 right-3 text-right">
                <p className="text-white font-bold text-sm drop-shadow-lg">
                  Mohamed
                </p>
                <p className="text-white/70 text-[11px] drop-shadow-lg">
                  {ui.role}
                </p>
              </div>

              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors ${
                    muted
                      ? "bg-destructive/80 border-destructive"
                      : "bg-black/50 border-white/20 hover:bg-black/70"
                  }`}
                  type="button"
                >
                  {muted ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                showChat
                  ? "bg-secondary/20 border-secondary/40 text-secondary"
                  : "glass-panel border-white/10 text-white/70 hover:text-white hover:border-white/20"
              }`}
              type="button"
            >
              <MessageSquare className="w-4 h-4" />
              {showChat ? ui.closeChat : ui.openChat}
            </button>

            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                  style={{ maxHeight: "220px" }}
                >
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={`${msg.ts || i}-${i}`}
                        className={`flex gap-2 ${
                          msg.from === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.from === "agent" && (
                          <img
                            src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                            className="w-6 h-6 rounded-full object-cover object-top shrink-0"
                            alt=""
                          />
                        )}
                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                            msg.from === "agent"
                              ? "bg-white/8 text-white/90 border border-white/10"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {sendingChat && (
                      <div className="flex gap-2 justify-start">
                        <img
                          src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                          className="w-6 h-6 rounded-full object-cover object-top shrink-0"
                          alt=""
                        />
                        <div className="px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed bg-white/8 text-white/90 border border-white/10">
                          ...
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  <div className="border-t border-white/10 p-2 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder={ui.writeQuestion}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={sendingChat}
                      className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-60"
                      type="button"
                    >
                      <Send className="w-3.5 h-3.5 text-primary-foreground" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${step}-${selectedSituacion}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="glass-panel-heavy border border-primary/25 rounded-2xl rounded-tl-sm p-3 flex gap-3 shadow-lg relative overflow-hidden"
              >
                <div className="relative shrink-0">
                  <img
                    src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                    className="w-9 h-9 rounded-full object-cover object-top border border-primary/40"
                    alt="Mohamed"
                  />
                  {!muted && (
                    <motion.div
                      className="absolute -inset-1 rounded-full border border-primary/40"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>

                <p className="text-[11px] text-white/90 leading-relaxed flex-1">
                  {(() => {
                    const s = AGENT_STEPS[Math.min(step, AGENT_STEPS.length - 1)];
                    const parts = s.text.split(s.highlight);

                    return parts.map((part, i, arr) =>
                      i < arr.length - 1 ? (
                        <span key={i}>
                          {part}
                          <span className="font-bold text-primary">
                            {s.highlight}
                          </span>
                        </span>
                      ) : (
                        part
                      )
                    );
                  })()}
                </p>
              </motion.div>
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-panel border border-white/[0.08] rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-white">
                    {ui.docsPanelTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      docsOk === docsTotal ? "bg-primary" : "bg-amber-400"
                    }`}
                  />
                  <span className="text-[10px] font-semibold text-white/70">
                    {docsOk}/{docsTotal} {ui.readyPlural}
                  </span>
                </div>
              </div>

              <div className="px-4 pt-2.5 pb-1">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(docsOk / docsTotal) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                  />
                </div>
              </div>

              <div className="px-3 py-2 space-y-1.5">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 border transition-colors ${
                      doc.estado === "ok"
                        ? "bg-primary/5 border-primary/15"
                        : doc.estado === "warn"
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-destructive/5 border-destructive/20"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                        doc.estado === "ok"
                          ? "bg-primary/15"
                          : doc.estado === "warn"
                          ? "bg-amber-500/15"
                          : "bg-destructive/15"
                      }`}
                    >
                      {doc.estado === "ok" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      )}
                      {doc.estado === "warn" && (
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {doc.estado === "missing" && (
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-white truncate">
                        {doc.nombre}
                      </p>
                      <p
                        className={`text-[9px] truncate ${
                          doc.estado === "ok"
                            ? "text-primary/70"
                            : doc.estado === "warn"
                            ? "text-amber-400/70"
                            : "text-destructive/60"
                        }`}
                      >
                        {doc.estado === "ok"
                          ? doc.archivo
                          : doc.estado === "warn"
                          ? `⏳ ${doc.kb}`
                          : lang === "en"
                          ? "Not uploaded · required"
                          : lang === "darija"
                          ? "ما ترفعش · إجباري"
                          : "Sin subir · obligatorio"}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {doc.estado === "ok" && (
                        <button
                          className="p-1 rounded hover:bg-primary/10 transition-colors"
                          title={ui.downloadPdf}
                          type="button"
                        >
                          <Download className="w-3 h-3 text-primary/70" />
                        </button>
                      )}

                      {doc.estado === "warn" && (
                        <span className="text-[9px] text-amber-400 font-medium whitespace-nowrap">
                          {doc.kb}
                        </span>
                      )}

                      {doc.estado === "missing" &&
                        (uploadingId === doc.id ? (
                          <span className="text-[9px] text-primary flex items-center gap-1">
                            <motion.div
                              className="w-2.5 h-2.5 border border-primary border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 0.7,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                            {ui.uploading}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUploadDoc(doc.id)}
                            className="flex items-center gap-1 text-[9px] font-bold text-white bg-primary/80 hover:bg-primary px-2 py-0.5 rounded transition-colors whitespace-nowrap"
                            type="button"
                          >
                            <Upload className="w-2.5 h-2.5" />
                            {ui.uploadPdf}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-3 py-2 border-t border-white/[0.07] grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-primary/8 rounded-lg py-1.5">
                  <p className="text-[10px] font-black text-primary">
                    {docs.filter((d) => d.estado === "ok").length}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {ui.uploadedPdfs}
                  </p>
                </div>

                <div className="bg-primary/8 rounded-lg py-1.5">
                  <p className="text-[10px] font-black text-primary">
                    {docs.filter((d) => d.estado === "ok").length}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {ui.aiVerified}
                  </p>
                </div>

                <div
                  className={`rounded-lg py-1.5 ${
                    allReady ? "bg-primary/15" : "bg-amber-500/10"
                  }`}
                >
                  <p
                    className={`text-[10px] font-black ${
                      allReady ? "text-primary" : "text-amber-400"
                    }`}
                  >
                    {allReady ? "✓ Listo" : ui.pending}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {ui.toSend}
                  </p>
                </div>
              </div>

              <div className="px-3 pb-3 pt-2">
                <button
                  onClick={handleIrSede}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-[#003366] hover:bg-[#002244] text-white border border-[#003366] transition-all shadow-md"
                  type="button"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {ui.completeOnOfficialSite}
                </button>
                <p className="text-center text-[9px] text-muted-foreground mt-1.5">
                  {ui.aiFillsOfficialSite}
                </p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-gray-300 shadow-2xl bg-white min-h-[400px]"
          >
            <div className="bg-[#f1f3f4] border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 flex-1 border border-gray-200 shadow-sm min-w-0">
                <Shield className="w-3 h-3 text-green-600 shrink-0" />
                <span className="text-xs text-gray-600 font-medium truncate">
                  sede.administracionespublicas.gob.es/procedimientoini/
                </span>
              </div>

              <button
                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded"
                type="button"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-primary shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                  className="w-full h-full object-cover object-top"
                  alt=""
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 text-black">
              {!submitted ? (
                <>
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-200">
                    <div className="flex items-center border border-gray-200 rounded overflow-hidden shrink-0">
                      <div className="w-7 h-12 bg-red-600" />
                      <div className="w-7 h-12 bg-yellow-400" />
                      <div className="w-7 h-12 bg-red-600" />
                    </div>

                    <div className="text-[9px] leading-tight text-gray-600 font-medium uppercase shrink-0">
                      <div>{ui.govLine1}</div>
                      <div>{ui.govLine2}</div>
                      <div>{ui.govLine3}</div>
                    </div>

                    <div className="ml-auto text-right shrink-0">
                      <div className="text-[10px] text-gray-500">
                        {ui.procedureSmall}
                      </div>
                      <div className="text-sm font-black text-[#003366]">
                        {ui.govHeader}
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {t("reg_alert_text")}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      {ui.situationTitle}
                    </p>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedSituacion}
                      onChange={(e) => handleSituacionClick(e.target.value)}
                    >
                      {SITUACIONES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border border-gray-200 rounded overflow-hidden divide-y divide-gray-100 mb-5">
                    {SITUACIONES.map((s) => (
                      <div
                        key={s.value}
                        onClick={() => handleSituacionClick(s.value)}
                        className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                          selectedSituacion === s.value
                            ? "bg-yellow-300 font-semibold text-gray-900"
                            : "text-gray-700 hover:bg-blue-50"
                        }`}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>

                  <AnimatePresence>
                    {step >= 1 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mb-5"
                      >
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                          {t("reg_docs")}
                        </p>

                        <div className="space-y-2">
                          {DOCS_REQUERIDOS.map((doc, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50"
                            >
                              <span className="text-sm text-gray-700">
                                {doc.nombre}
                              </span>

                              {doc.estado === "ok" && (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              )}

                              {doc.estado === "warn" && (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              )}

                              {doc.estado === "missing" && (
                                <button
                                  type="button"
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  <Upload className="w-3 h-3" />
                                  {t("reg_upload")}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={handleVerificarDocs}
                          className="mt-3 w-full bg-[#003366] text-white text-sm font-bold py-2.5 rounded hover:bg-[#002244] transition-colors"
                          type="button"
                        >
                          {t("reg_docs_btn")}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {step >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mb-5 space-y-3"
                      >
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                          {ui.applicationData}{" "}
                          <span className="text-green-600 font-normal normal-case">
                            ({ui.filledAutomatically})
                          </span>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50"
                            value="Ahmed Benali"
                            readOnly
                          />
                          <input
                            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50"
                            value="X-1234567-Z"
                            readOnly
                          />
                          <input
                            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50"
                            value={
                              lang === "en"
                                ? "Moroccan"
                                : lang === "darija"
                                ? "مغربي"
                                : "Marroquí"
                            }
                            readOnly
                          />
                          <input
                            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50"
                            value="Madrid"
                            readOnly
                          />
                          <input
                            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50 col-span-2"
                            value="C/ Gran Vía 12, 28013 Madrid"
                            readOnly
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={handleEnviarSolicitud}
                            className="bg-green-600 text-white text-sm font-bold px-6 py-2.5 rounded hover:bg-green-700 transition-colors"
                            type="button"
                          >
                            {ui.sendApplication}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-10 gap-5"
                >
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-[#003366] mb-1">
                      {ui.requestSent}
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      {lang === "en"
                        ? "Regularization 2026 · Work Rootedness"
                        : lang === "darija"
                        ? "التسوية 2026 · أرايغو مهني"
                        : "Regularización 2026 · Arraigo Laboral"}
                    </p>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2 max-w-sm mx-auto">
                      <p className="text-sm">
                        <span className="font-bold text-gray-500">
                          {ui.fullName}:
                        </span>{" "}
                        Ahmed Benali
                      </p>
                      <p className="text-sm">
                        <span className="font-bold text-gray-500">
                          {ui.reference}:
                        </span>{" "}
                        <span className="font-mono text-green-700">
                          REG2026-ES-087341
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-bold text-gray-500">
                          {ui.sendDate}:
                        </span>{" "}
                        {new Date().toLocaleDateString(
                          lang === "en" ? "en-GB" : "es-ES"
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="font-bold text-gray-500">
                          {ui.status}:
                        </span>{" "}
                        <span className="text-amber-600 font-semibold">
                          {ui.inProcess}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-bold text-gray-500">
                          {ui.resolution}:
                        </span>{" "}
                        3-6 meses
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-sm text-primary font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {ui.receiptGenerated}
                    </div>

                    <button
                      type="button"
                      className="flex items-center gap-2 bg-[#003366] text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#002244]"
                    >
                      <FileText className="w-4 h-4" />
                      {ui.downloadPdf}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="sticky bottom-0 z-30 glass-panel-heavy border-t border-white/10 py-3">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <button
              onClick={() => setMuted(!muted)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                muted
                  ? "bg-destructive/20 border-destructive/40 text-destructive"
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
              }`}
              type="button"
            >
              {muted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {muted ? ui.withoutAudio : ui.mute}
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDocs(true);
                  setShowForms(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  showDocs
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
                type="button"
              >
                <FileText className="w-4 h-4 text-primary" />
                {ui.documents}
              </button>

              <button
                onClick={() => {
                  setShowForms(true);
                  setShowDocs(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  showForms
                    ? "bg-secondary/20 border-secondary/40 text-secondary"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
                type="button"
              >
                <Settings className="w-4 h-4 text-secondary" />
                {ui.formsLabel}
              </button>

              <button
                onClick={() => setShowChat(!showChat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  showChat
                    ? "bg-secondary/20 border-secondary/40 text-secondary"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
                type="button"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
            </div>

            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60">
              © 2026 GestoriaCitaIA
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showDocs && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <div
                className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
                style={{ background: "#1a2236" }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-white">
                      {ui.requiredDocuments}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowDocs(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-5 py-4 space-y-2.5 max-h-72 overflow-y-auto">
                  {DOCS_REQUERIDOS.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          doc.estado === "ok"
                            ? "bg-green-500/20 text-green-400"
                            : doc.estado === "warn"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {doc.estado === "ok"
                          ? "✓"
                          : doc.estado === "warn"
                          ? "!"
                          : "✗"}
                      </span>

                      <span className="text-sm text-white/90">{doc.nombre}</span>

                      <span
                        className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          doc.estado === "ok"
                            ? "bg-green-500/15 text-green-400"
                            : doc.estado === "warn"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {doc.estado === "ok"
                          ? ui.ready
                          : doc.estado === "warn"
                          ? ui.review
                          : ui.pending}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showForms && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <div
                className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
                style={{ background: "#1a2236" }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-secondary" />
                    <span className="font-bold text-sm text-white">
                      {ui.officialForms}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowForms(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {FORMULARIOS.map((form, i) => (
                    <a
                      key={i}
                      href={form.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary">
                          {form.codigo}
                        </p>
                        <p className="text-sm text-white/80 truncate">
                          {form.nombre}
                        </p>
                      </div>

                      <span className="text-[10px] font-semibold text-white/40 group-hover:text-primary transition-colors shrink-0">
                        PDF ↓
                      </span>
                    </a>
                  ))}

                  <p className="text-[10px] text-white/30 text-center pt-1">
                    {ui.source}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
