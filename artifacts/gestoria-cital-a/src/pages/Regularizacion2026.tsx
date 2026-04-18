import { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { PaymentModal } from "@/components/PaymentModal";
import { useLang } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Bell,
  MessageSquare,
  Send,
  Upload,
  Star,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyDocument, type VerifyDocumentResult } from "@/lib/verifyDocument";
import {
  EXTRANJERIA_PROCEDURES,
  getProcedureByKey,
} from "@/lib/extranjeriaProcedures";

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

type StoredDocItem = {
  id: string;
  nombre: string;
  archivo: string;
  estado: DocStatus;
  kb: string;
  expectedType?: string;
  detectedType?: string;
  note?: string;
};

type LeadFormState = {
  nombre: string;
  telefono: string;
  email: string;
  niePasaporte: string;
  ciudad: string;
  nacionalidad: string;
  fechaLlegada: string;
  cumple5Meses: string;
  asilo: string;
  penales: string;
};

function buildInitialDocs(procedureKey: string): StoredDocItem[] {
  const procedure = getProcedureByKey(procedureKey) || EXTRANJERIA_PROCEDURES[0];

  return procedure.requiredDocuments.map((doc) => ({
    id: doc.id,
    nombre: doc.name,
    archivo: "",
    estado: "missing" as DocStatus,
    kb: "",
    expectedType: doc.expectedType || "auto",
    detectedType: "",
    note: doc.notes || "",
  }));
}

function normalizeDocType(value?: string) {
  return (value || "").trim().toLowerCase();
}

export default function Regularizacion2026() {
  const [selectedSituacion, setSelectedSituacion] = useState(
    "regularizacion_2026_laboral"
  );
  const [muted, setMuted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState<string | null>(null);
  const [sendingChat, setSendingChat] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [paymentTriggered, setPaymentTriggered] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatBootstrapped, setChatBootstrapped] = useState(false);
  const [generalUploading, setGeneralUploading] = useState(false);
  const [completionMessageSent, setCompletionMessageSent] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);

  const [leadForm, setLeadForm] = useState<LeadFormState>({
    nombre: "",
    telefono: "",
    email: "",
    niePasaporte: "",
    ciudad: "",
    nacionalidad: "",
    fechaLlegada: "",
    cumple5Meses: "",
    asilo: "",
    penales: "",
  });

  const { t, lang } = useLang();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as
    | "darija"
    | "es"
    | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

  const ui = useMemo(() => {
    if (safeLang === "darija") {
      return {
        initialChat:
          "السلام، لباس عليك. إلا بغيتي باش نوجدّ لك الوراق ديالك ديال regularización 2026، عافاك عمّر ليا هاد الفورمولار الأول، ومن بعد نكمل معاك البروسيجير.",
        online: "متصل الآن",
        role: "مختص فالهجرة",
        paymentMessage:
          "باش نكملو فالملف ديالك ونخدمو على الوثائق، فعل الخطة ديالك.",
        paymentTriggerMessage:
          "باش نكملو معاك بشكل كامل، خاصك تفعّل الخدمة.",
        planActivated: "تفعلات الخطة",
        planContinue: "مزيان. نكملو فالملف ديالك.",
        openChat: "سد الشات",
        closeChat: "فتح الشات",
        writeQuestion: "عمر الفورمولار الأول باش نكمل معاك",
        uploadGeneral: "رفع الوثائق",
        uploadGeneralDesc:
          "من هنا تقدر ترفع جميع الوثائق اللي طلب منك محمد، سواء كانت صورة أو PDF.",
        withoutAudio: "بلا صوت",
        mute: "كتم",
        activePlanLabel: "الخطة",
        active: "نشطة",
        uploading: "كيترفع...",
        uploadSuccessTitle: "تقبلات الوثيقة",
        uploadSuccessDesc: "راجعنا الوثيقة وربطناها مع الملف.",
        uploadErrorTitle: "خطأ فالوثيقة",
        uploadErrorDesc: "ما قدرناش نربط هاد الوثيقة مع الملف.",
        mohamedDocOk: (fileName: string, docName: string) =>
          `مزيان. توصلت بــ ${fileName} وراجعتو. حطيناه دابا فخانة «${docName}».`,
        mohamedDocWarn: (fileName: string) =>
          `توصلت بــ ${fileName} ولكن مازال خاصني نسخة أوضح ولا الوثيقة المناسبة باش نكمل المراجعة.`,
        mohamedDocUnknown: (fileName: string) =>
          `توصلت بــ ${fileName}، ولكن ما قدرناش نربطو أوتوماتيكياً مع وثيقة معينة. زيد رفع الوثائق الباقية وأنا نكمل المراجعة.`,
        mohamedFinal:
          "مزيان. راجعنا الوثائق ديالك ووجدنا الملف ديالك. إلى بغيتي دابا نكملو بالموعد، تقدر تدخل لسارة وغادي تعاونك.",
        goSara: "المرور إلى سارة",
        goSaraDesc: "إلى بغيتي تكمل بالموعد، سارة غادي تعاونك.",
        formTitle: "لوحة رسمية مدمجة",
        formDesc:
          "عمر المعطيات الأساسية باش محمد يبدا معاك التحقق من 5 شهور والوثائق.",
        saveLeadButton: "حفظ المعطيات والمتابعة مع محمد",
        savedLeadReply:
          "مزيان. خديت المعطيات ديالك. دابا صيفط ليا الوثائق ديالك، سواء كانوا صور أو PDF، ونبدا نراجعهم خطوة بخطوة.",
        formBlockedReply:
          "عافاك عمّر ليا الفورمولار الأول، ومن بعد نكمل معاك البروسيجير ديال regularización 2026.",
        saveLeadTitle: "تحفظات المعطيات",
        saveLeadDesc: "محمد قدر يبدا يراجع معاك الوثائق.",
        missingTitle: "كاينين بيانات ناقصين",
        missingDesc:
          "عمر الاسم والهاتف والمدينة والجنسية وتاريخ الدخول قبل ما تكمل.",
        labels: {
          nombre: "الاسم الكامل",
          telefono: "الهاتف",
          email: "الإيميل",
          niePasaporte: "NIE / الباسبور",
          ciudad: "المدينة",
          nacionalidad: "الجنسية",
          fechaLlegada: "تاريخ الدخول لإسبانيا",
          cumple5Meses: "واش عندك 5 شهور متواصلة؟",
          asilo: "واش عندك طلب لجوء؟",
          penales: "سوابق عدلية",
          select: "اختر",
          yes: "نعم",
          no: "لا",
          dontKnow: "ما عرفت",
        },
      };
    }

    if (safeLang === "en") {
      return {
        initialChat:
          "Hello, how are you? If you want me to prepare your 2026 regularization documents, please fill in this form first and then I will continue with the process.",
        online: "Online",
        role: "Immigration Specialist",
        paymentMessage:
          "To continue with your case and document review, activate your plan.",
        paymentTriggerMessage:
          "To continue fully with your case, activate the service.",
        planActivated: "Plan activated",
        planContinue: "Perfect. Let’s continue with your case.",
        openChat: "Close chat",
        closeChat: "Open chat",
        writeQuestion: "Fill in the form first to continue",
        uploadGeneral: "Upload documents",
        uploadGeneralDesc:
          "Use this button to upload all documents Mohamed requests, as images or PDFs.",
        withoutAudio: "No audio",
        mute: "Mute",
        activePlanLabel: "Plan",
        active: "active",
        uploading: "Uploading...",
        uploadSuccessTitle: "Document received",
        uploadSuccessDesc: "The document was reviewed and linked to the case.",
        uploadErrorTitle: "Document error",
        uploadErrorDesc: "We could not link that document to the case.",
        mohamedDocOk: (fileName: string, docName: string) =>
          `Perfect. I received ${fileName} and linked it to “${docName}”.`,
        mohamedDocWarn: (fileName: string) =>
          `I received ${fileName}, but I still need a clearer version or the correct document to continue.`,
        mohamedDocUnknown: (fileName: string) =>
          `I received ${fileName}, but I could not match it automatically to a required document yet.`,
        mohamedFinal:
          "Perfect. We have reviewed your documents and prepared your case. If you want to continue with the appointment, Sara will help you.",
        goSara: "Go to Sara",
        goSaraDesc:
          "If you want to continue with the appointment, Sara will help you.",
        formTitle: "Integrated official panel",
        formDesc:
          "Fill in the basic details so Mohamed can start checking the 5 months and your documents.",
        saveLeadButton: "Save details and continue with Mohamed",
        savedLeadReply:
          "Perfect. I already have your details. Now send me your documents, as images or PDFs, and I will review them step by step.",
        formBlockedReply:
          "Please fill in the form first, then I will continue with your 2026 regularization process.",
        saveLeadTitle: "Details saved",
        saveLeadDesc: "Mohamed can now start reviewing your documents.",
        missingTitle: "Missing data",
        missingDesc:
          "Please fill in name, phone, city, nationality and arrival date before continuing.",
        labels: {
          nombre: "Full name",
          telefono: "Phone",
          email: "Email",
          niePasaporte: "NIE / Passport",
          ciudad: "City",
          nacionalidad: "Nationality",
          fechaLlegada: "Arrival date in Spain",
          cumple5Meses: "Do you have 5 continuous months?",
          asilo: "Do you have an asylum application?",
          penales: "Criminal record",
          select: "Select",
          yes: "Yes",
          no: "No",
          dontKnow: "I don't know",
        },
      };
    }

    return {
      initialChat:
        "Hola, ¿qué tal? Si quieres que te prepare los papeles de la regularización 2026, relléname primero este formulario y después continúo contigo con el proceso.",
      online: "En línea",
      role: "Especialista en Extranjería",
      paymentMessage:
        "Para continuar con tu trámite y la revisión de documentos, activa tu plan.",
      paymentTriggerMessage:
        "Para seguir contigo de forma completa, activa el servicio.",
      planActivated: "Plan activado",
      planContinue: "Perfecto. Continuamos con tu trámite.",
      openChat: "Cerrar chat",
      closeChat: "Abrir chat",
      writeQuestion: "Rellena primero el formulario para continuar",
      uploadGeneral: "Subir documentos",
      uploadGeneralDesc:
        "Usa este botón para subir todos los documentos que te pida Mohamed, en foto o en PDF.",
      withoutAudio: "Sin audio",
      mute: "Mute",
      activePlanLabel: "Plan",
      active: "activo",
      uploading: "Subiendo...",
      uploadSuccessTitle: "Documento recibido",
      uploadSuccessDesc: "El documento se ha revisado y vinculado al expediente.",
      uploadErrorTitle: "Error en documento",
      uploadErrorDesc: "No se pudo vincular ese documento al expediente.",
      mohamedDocOk: (fileName: string, docName: string) =>
        `Perfecto. Ya he recibido ${fileName} y lo he colocado en «${docName}».`,
      mohamedDocWarn: (fileName: string) =>
        `He recibido ${fileName}, pero todavía necesito una versión más clara o el documento correcto para seguir.`,
      mohamedDocUnknown: (fileName: string) =>
        `He recibido ${fileName}, pero no he podido relacionarlo automáticamente con un documento concreto del expediente.`,
      mohamedFinal:
        "Perfecto. Ya hemos revisado tu documentación y hemos dejado preparado tu expediente. Si ahora quieres continuar con la cita, Sara te ayudará.",
      goSara: "Ir con Sara",
      goSaraDesc: "Si quieres seguir con la cita, Sara te ayuda.",
      formTitle: "Panel oficial integrado",
      formDesc:
        "Rellena los datos básicos para que Mohamed empiece a comprobar los 5 meses y tus documentos.",
      saveLeadButton: "Guardar datos y continuar con Mohamed",
      savedLeadReply:
        "Perfecto. Ya tengo tus datos. Ahora súbeme tus documentos, en foto o en PDF, y empezaré a revisarlos paso a paso.",
      formBlockedReply:
        "Relléname primero este formulario y después continúo contigo con el proceso de la regularización 2026.",
      saveLeadTitle: "Datos guardados",
      saveLeadDesc: "Mohamed ya puede empezar a revisar tus documentos.",
      missingTitle: "Faltan datos",
      missingDesc:
        "Rellena nombre, teléfono, ciudad, nacionalidad y fecha de llegada antes de continuar.",
      labels: {
        nombre: "Nombre completo",
        telefono: "Teléfono",
        email: "Email",
        niePasaporte: "NIE / Pasaporte",
        ciudad: "Ciudad",
        nacionalidad: "Nacionalidad",
        fechaLlegada: "Fecha llegada a España",
        cumple5Meses: "¿Cumples 5 meses continuos?",
        asilo: "¿Tienes solicitud de asilo?",
        penales: "Antecedentes penales",
        select: "Selecciona",
        yes: "Sí",
        no: "No",
        dontKnow: "No sé",
      },
    };
  }, [safeLang]);

  const [docs, setDocs] = useState<StoredDocItem[]>(
    buildInitialDocs(selectedSituacion)
  );

  const chatStorageKey = useMemo(() => {
    return `gestoriacitaia_mohamed_chat_procedure_${safeLang}_${selectedSituacion}`;
  }, [safeLang, selectedSituacion]);

  const formStorageKey = useMemo(() => {
    return `gestoriacitaia_mohamed_form_${safeLang}_${selectedSituacion}`;
  }, [safeLang, selectedSituacion]);

  const leadSavedStorageKey = useMemo(() => {
    return `gestoriacitaia_mohamed_lead_saved_${safeLang}_${selectedSituacion}`;
  }, [safeLang, selectedSituacion]);

  const leadFormReady =
    !!leadForm.nombre.trim() &&
    !!leadForm.telefono.trim() &&
    !!leadForm.ciudad.trim() &&
    !!leadForm.nacionalidad.trim() &&
    !!leadForm.fechaLlegada.trim();

  useEffect(() => {
    setDocs(buildInitialDocs(selectedSituacion));
    setCompletionMessageSent(false);
  }, [selectedSituacion]);

  useEffect(() => {
    try {
      const rawForm = localStorage.getItem(formStorageKey);
      if (rawForm) {
        const parsed = JSON.parse(rawForm) as LeadFormState;
        setLeadForm({
          nombre: parsed?.nombre || "",
          telefono: parsed?.telefono || "",
          email: parsed?.email || "",
          niePasaporte: parsed?.niePasaporte || "",
          ciudad: parsed?.ciudad || "",
          nacionalidad: parsed?.nacionalidad || "",
          fechaLlegada: parsed?.fechaLlegada || "",
          cumple5Meses: parsed?.cumple5Meses || "",
          asilo: parsed?.asilo || "",
          penales: parsed?.penales || "",
        });
      }

      const rawLeadSaved = localStorage.getItem(leadSavedStorageKey);
      setLeadSaved(rawLeadSaved === "true");
    } catch (error) {
      console.error("Error cargando formulario de Mohamed:", error);
    }
  }, [formStorageKey, leadSavedStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(formStorageKey, JSON.stringify(leadForm));
    } catch (error) {
      console.error("Error guardando formulario de Mohamed:", error);
    }
  }, [leadForm, formStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(leadSavedStorageKey, leadSaved ? "true" : "false");
    } catch (error) {
      console.error("Error guardando estado leadSaved de Mohamed:", error);
    }
  }, [leadSaved, leadSavedStorageKey]);

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

          const completionAlreadySent = parsed.some(
            (m) => m.from === "agent" && m.text === ui.mohamedFinal
          );

          const leadAlreadySaved = parsed.some(
            (m) => m.from === "agent" && m.text === ui.savedLeadReply
          );

          setPaymentTriggered(paymentAlreadyTriggered);
          setCompletionMessageSent(completionAlreadySent);
          setLeadSaved((prev) => prev || leadAlreadySaved);
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
      setCompletionMessageSent(false);
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
      setCompletionMessageSent(false);
      setChatBootstrapped(true);
    }
  }, [
    chatStorageKey,
    ui.initialChat,
    ui.paymentTriggerMessage,
    ui.mohamedFinal,
    ui.savedLeadReply,
  ]);

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
  }, [chatMessages, sendingChat, generalUploading]);

  const docsOk = docs.filter((d) => d.estado === "ok").length;
  const acceptedDocs = docs.filter((d) => d.estado === "ok");
const rejectedDocs = docs.filter((d) => d.estado === "warn");

const stayProofDocs = acceptedDocs.filter((d) => {
  const txt = `${d.nombre} ${d.detectedType} ${d.note}`.toLowerCase();

  return (
    txt.includes("stay") ||
    txt.includes("estancia") ||
    txt.includes("empadron") ||
    txt.includes("factura") ||
    txt.includes("banco") ||
    txt.includes("transfer") ||
    txt.includes("ticket") ||
    txt.includes("medico") ||
    txt.includes("hospital") ||
    txt.includes("cita") ||
    txt.includes("proof")
  );
});

const strongProofs = stayProofDocs.filter((d) => {
  const txt = `${d.nombre} ${d.detectedType} ${d.note}`.toLowerCase();

  return (
    txt.includes("empadron") ||
    txt.includes("bank") ||
    txt.includes("banco") ||
    txt.includes("hospital") ||
    txt.includes("oficial")
  );
});

const estimatedMonthsCovered = Math.min(
  5,
  Math.max(1, Math.ceil(stayProofDocs.length / 2))
);
  const docsTotal = docs.length;
  const allReady = docsOk >= Math.max(1, docsTotal - 1);

  const SITUACIONES: SituationItem[] = EXTRANJERIA_PROCEDURES.map((p) => ({
    value: p.key,
    label: p.name,
  }));

  const handleSelectPlan = (plan: string) => {
    setPlanActivo(plan);
    setShowPayment(false);

    toast({
      title: ui.planActivated,
      description: ui.planContinue,
    });
  };

  const updateLeadForm = (field: keyof LeadFormState, value: string) => {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveLeadForm = () => {
    if (!leadFormReady) {
      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
      return;
    }

    setLeadSaved(true);

    const alreadyExists = chatMessages.some(
      (msg) => msg.from === "agent" && msg.text === ui.savedLeadReply
    );

    if (!alreadyExists) {
      setChatMessages((prev) => [
        ...prev,
        {
          from: "agent",
          text: ui.savedLeadReply,
          ts: Date.now(),
        },
      ]);
    }

    toast({
      title: ui.saveLeadTitle,
      description: ui.saveLeadDesc,
    });
  };

const getBestDocMatch = (
  result: VerifyDocumentResult,
  currentDocs: StoredDocItem[],
  fileName?: string
): StoredDocItem | null => {
  const detectedType = normalizeDocType(result?.document_type || "");
  const bucket = (result?.recommended_bucket || "").toLowerCase();
  const lowerFileName = (fileName || "").toLowerCase();

  const combinedText = [
    result?.summary || "",
    result?.stay_proof_reason || "",
    ...(result?.visible_fields || []),
    ...(result?.missing_or_unclear_fields || []),
    ...(result?.warnings || []),
    lowerFileName,
  ]
    .join(" ")
    .toLowerCase();

  const includesAny = (words: string[]) =>
    words.some((word) => combinedText.includes(word));

  if (bucket === "identity_document") {
    if (detectedType === "passport") {
      const passportDoc =
        currentDocs.find(
          (doc) =>
            doc.estado !== "ok" &&
            normalizeDocType(doc.expectedType) === "passport"
        ) ||
        currentDocs.find(
          (doc) => normalizeDocType(doc.expectedType) === "passport"
        );

      if (passportDoc) return passportDoc;
    }

    if (detectedType === "nie") {
      const nieDoc =
        currentDocs.find(
          (doc) =>
            doc.estado !== "ok" && normalizeDocType(doc.expectedType) === "nie"
        ) ||
        currentDocs.find((doc) => normalizeDocType(doc.expectedType) === "nie");

      if (nieDoc) return nieDoc;
    }

    if (detectedType === "tie") {
      const tieDoc =
        currentDocs.find(
          (doc) =>
            doc.estado !== "ok" && normalizeDocType(doc.expectedType) === "tie"
        ) ||
        currentDocs.find((doc) => normalizeDocType(doc.expectedType) === "tie");

      if (tieDoc) return tieDoc;
    }
  }

  if (
    detectedType === "criminal_record" ||
    includesAny([
      "antecedentes",
      "antecedentes penales",
      "criminal",
      "criminal record",
      "penales",
      "registro de antecedentes",
      "casier",
    ])
  ) {
    const criminalDoc =
      currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          normalizeDocType(doc.expectedType) === "criminal_record"
      ) ||
      currentDocs.find(
        (doc) => normalizeDocType(doc.expectedType) === "criminal_record"
      );

    if (criminalDoc) return criminalDoc;
  }

  if (
    detectedType === "empadronamiento" ||
    includesAny(["empadronamiento", "padron", "padrón", "volante"])
  ) {
    const empDoc =
      currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          normalizeDocType(doc.expectedType) === "empadronamiento"
      ) ||
      currentDocs.find(
        (doc) => normalizeDocType(doc.expectedType) === "empadronamiento"
      );

    if (empDoc) return empDoc;
  }

  if (
    detectedType === "official_form" ||
    bucket === "official_form" ||
    includesAny(["formulario", "official form", "solicitud", "modelo ex"])
  ) {
    const formDoc =
      currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          normalizeDocType(doc.expectedType) === "official_form"
      ) ||
      currentDocs.find(
        (doc) => normalizeDocType(doc.expectedType) === "official_form"
      );

    if (formDoc) return formDoc;
  }

  if (
    detectedType === "stay_proof" ||
    bucket === "stay_proof" ||
    result?.is_stay_proof
  ) {
    const firstMissing = currentDocs.find((doc) => doc.estado === "missing");
    if (firstMissing) return firstMissing;

    const firstWarn = currentDocs.find((doc) => doc.estado === "warn");
    if (firstWarn) return firstWarn;
  }

  if (lowerFileName) {
    const byNameMissing = currentDocs.find((doc) => {
      const expected = normalizeDocType(doc.expectedType);
      return (
        doc.estado !== "ok" &&
        expected &&
        expected !== "auto" &&
        lowerFileName.includes(expected)
      );
    });

    if (byNameMissing) return byNameMissing;
  }

  const firstMissing = currentDocs.find((doc) => doc.estado === "missing");
  if (firstMissing) return firstMissing;

  const firstWarn = currentDocs.find((doc) => doc.estado === "warn");
  if (firstWarn) return firstWarn;

  return null;
};

  const pushAgentMessage = (text: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        from: "agent",
        text,
        ts: Date.now(),
      },
    ]);
  };

  const maybeSendCompletionMessage = (nextDocs: StoredDocItem[]) => {
    const okCount = nextDocs.filter((d) => d.estado === "ok").length;
    const total = nextDocs.length;
    const readyNow = okCount >= Math.max(1, total - 1);

    if (readyNow && !completionMessageSent) {
      pushAgentMessage(ui.mohamedFinal);
      setCompletionMessageSent(true);
    }
  };

const handleGeneralUpload = async () => {
  if (!leadSaved) {
    pushAgentMessage(ui.formBlockedReply);

    toast({
      title: ui.missingTitle,
      description: ui.missingDesc,
      variant: "destructive",
    });
    return;
  }

  if (!planActivo) {
    setShowPayment(true);
    return;
  }

  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      setGeneralUploading(true);

      try {
        for (const file of files) {
          try {
            const result: VerifyDocumentResult = await verifyDocument({
              file,
              expectedDocumentType: "auto",
              lang: safeLang,
            });

            let matchedDocSnapshot: StoredDocItem | null = null;
            let nextDocsSnapshot: StoredDocItem[] = [];

            setDocs((prev) => {
              const matchedDoc = getBestDocMatch(result, prev, file.name);
              matchedDocSnapshot = matchedDoc;

              if (!matchedDoc) {
                nextDocsSnapshot = [...prev];
                return prev;
              }

              const nextStatus: DocStatus =
                result.status === "invalid" ||
                result.match_expected_type === false
                  ? "warn"
                  : "ok";

              const updatedDocs = prev.map((doc) =>
                doc.id === matchedDoc.id
                  ? {
                      ...doc,
                      estado: nextStatus,
                      archivo: file.name,
                      kb: `${Math.round(file.size / 1024)} KB`,
                      detectedType: result.document_type || "",
                      note: result.summary || "",
                    }
                  : doc
              );

              nextDocsSnapshot = updatedDocs;
              return updatedDocs;
            });

            const bucket = (result?.recommended_bucket || "").toLowerCase();
            const detectedType = (result?.document_type || "").toLowerCase();
            const stayStrength = (result?.stay_proof_strength || "").toLowerCase();

            if (!matchedDocSnapshot) {
              let smartMessage = "";

              if (bucket === "identity_document" || detectedType === "passport" || detectedType === "nie" || detectedType === "tie") {
                smartMessage =
                  safeLang === "darija"
                    ? `توصلت بــ ${file.name}. هاد الوثيقة باينة وثيقة هوية وتمت قراءتها، غادي نضيفها للملف.`
                    : safeLang === "en"
                    ? `I received ${file.name}. This looks like an identity document and it was read correctly. I will add it to the case.`
                    : `He recibido ${file.name}. Parece un documento de identidad y se ha leído correctamente. Lo añadiré al expediente.`;
              } else if (result?.is_stay_proof || bucket === "stay_proof") {
                smartMessage =
                  safeLang === "darija"
                    ? stayStrength === "strong"
                      ? `توصلت بــ ${file.name}. هادي باينة prueba قوية ديال التواجد أو الإقامة فإسبانيا، وغادي نحتافظ بها ضمن pruebas de los 5 meses.`
                      : `توصلت بــ ${file.name}. هادي باينة prueba إضافية ديال التواجد فإسبانيا، وغادي نخليها ضمن الملف ونراجعها مع باقي البروفات.`
                    : safeLang === "en"
                    ? stayStrength === "strong"
                      ? `I received ${file.name}. This looks like a strong proof of stay in Spain, and I will keep it inside the 5-month evidence.`
                      : `I received ${file.name}. This looks like an additional proof of stay in Spain, and I will keep it in the file to review it with the other proofs.`
                    : stayStrength === "strong"
                    ? `He recibido ${file.name}. Parece una prueba fuerte de estancia en España y la guardaré dentro de las pruebas de los 5 meses.`
                    : `He recibido ${file.name}. Parece una prueba adicional de estancia en España y la guardaré en el expediente para revisarla con las demás pruebas.`;
              } else if (bucket === "official_form") {
                smartMessage =
                  safeLang === "darija"
                    ? `توصلت بــ ${file.name}. هادي باينة formulario oficial وغادي نضيفو للملف.`
                    : safeLang === "en"
                    ? `I received ${file.name}. This looks like an official form and I will add it to the file.`
                    : `He recibido ${file.name}. Parece un formulario oficial y lo añadiré al expediente.`;
              } else if (bucket === "personal_photo") {
                smartMessage =
                  safeLang === "darija"
                    ? `توصلت بــ ${file.name}. هادي باينة صورة شخصية، وغادي نخليها ضمن الملف باش نراجع واش صالحة للتصاريح والإجراءات.`
                    : safeLang === "en"
                    ? `I received ${file.name}. This looks like a personal photo, and I will keep it in the file to review whether it is suitable for the procedure.`
                    : `He recibido ${file.name}. Parece una foto personal y la guardaré en el expediente para revisar si sirve para el trámite.`;
              } else {
                smartMessage =
                  safeLang === "darija"
                    ? `توصلت بــ ${file.name}. قريت الوثيقة وغادي نخليها ضمن otros documentos ونكمل الترتيب مع باقي الملف.`
                    : safeLang === "en"
                    ? `I received ${file.name}. I read the document and I will keep it under other documents while I continue organizing the case.`
                    : `He recibido ${file.name}. He leído el documento y lo guardaré en otros documentos mientras sigo organizando el expediente.`;
              }

              pushAgentMessage(smartMessage);

              toast({
                title: ui.uploadSuccessTitle,
                description: result?.summary || ui.uploadSuccessDesc,
              });

              continue;
            }

            const isWarn =
              result.status === "invalid" ||
              result.match_expected_type === false;

            if (isWarn) {
              pushAgentMessage(ui.mohamedDocWarn(file.name));
            } else if (detectedType === "passport") {
              pushAgentMessage(
                safeLang === "darija"
                  ? `مزيان. توصلت بــ ${file.name} وهادي باينة بوضوح باسبور. ضفتو للملف.`
                  : safeLang === "en"
                  ? `Perfect. I received ${file.name} and it clearly looks like a passport. I added it to the file.`
                  : `Perfecto. He recibido ${file.name} y se ve claramente que es un pasaporte. Lo he añadido al expediente.`
              );
            } else if (detectedType === "nie") {
              pushAgentMessage(
                safeLang === "darija"
                  ? `مزيان. توصلت بــ ${file.name} وهادي باينة NIE. ضفتها للملف.`
                  : safeLang === "en"
                  ? `Perfect. I received ${file.name} and it looks like a NIE. I added it to the file.`
                  : `Perfecto. He recibido ${file.name} y parece un NIE. Lo he añadido al expediente.`
              );
            } else if (detectedType === "tie") {
              pushAgentMessage(
                safeLang === "darija"
                  ? `مزيان. توصلت بــ ${file.name} وهادي باينة TIE. ضفتها للملف.`
                  : safeLang === "en"
                  ? `Perfect. I received ${file.name} and it looks like a TIE. I added it to the file.`
                  : `Perfecto. He recibido ${file.name} y parece una TIE. La he añadido al expediente.`
              );
            } else if (detectedType === "empadronamiento") {
              pushAgentMessage(
                safeLang === "darija"
                  ? `مزيان. توصلت بــ ${file.name} وهادي باينة empadronamiento. ضفتو للملف.`
                  : safeLang === "en"
                  ? `Perfect. I received ${file.name} and it looks like an empadronamiento document. I added it to the file.`
                  : `Perfecto. He recibido ${file.name} y parece un empadronamiento. Lo he añadido al expediente.`
              );
            } else if (detectedType === "criminal_record") {
              pushAgentMessage(
                safeLang === "darija"
                  ? `مزيان. توصلت بــ ${file.name} وهادي باينة شهادة السوابق العدلية. ضفتها للملف.`
                  : safeLang === "en"
                  ? `Perfect. I received ${file.name} and it looks like a criminal record certificate. I added it to the file.`
                  : `Perfecto. He recibido ${file.name} y parece un certificado de antecedentes penales. Lo he añadido al expediente.`
              );
            } else if (result?.is_stay_proof || bucket === "stay_proof") {
              pushAgentMessage(
                safeLang === "darija"
                  ? stayStrength === "strong"
                    ? `مزيان. توصلت بــ ${file.name} وهادي باينة prueba قوية ديال الإقامة أو التواجد فإسبانيا. غادي نعتمدها ضمن بروفات 5 شهور.`
                    : `توصلت بــ ${file.name} وهادي باينة prueba إضافية ديال التواجد فإسبانيا. غادي نخليها ضمن الملف ونراجعها مع باقي البروفات.`
                  : safeLang === "en"
                  ? stayStrength === "strong"
                    ? `Perfect. I received ${file.name} and it looks like a strong proof of stay in Spain. I will count it within the 5-month evidence.`
                    : `I received ${file.name} and it looks like an additional proof of stay in Spain. I will keep it in the file and review it together with the other proofs.`
                  : stayStrength === "strong"
                  ? `Perfecto. He recibido ${file.name} y parece una prueba fuerte de estancia en España. La tendré en cuenta dentro de las pruebas de los 5 meses.`
                  : `He recibido ${file.name} y parece una prueba adicional de estancia en España. La guardaré en el expediente y la revisaré junto con las demás pruebas.`
              );
            } else if (bucket === "official_form") {
              pushAgentMessage(
                safeLang === "darija"
                  ? `مزيان. توصلت بــ ${file.name} وهادي باينة formulario oficial. ضفتو للملف.`
                  : safeLang === "en"
                  ? `Perfect. I received ${file.name} and it looks like an official form. I added it to the file.`
                  : `Perfecto. He recibido ${file.name} y parece un formulario oficial. Lo he añadido al expediente.`
              );
            } else if (bucket === "personal_photo") {
              pushAgentMessage(
                safeLang === "darija"
                  ? `توصلت بــ ${file.name}. هادي باينة صورة شخصية، وغادي نخليها ضمن الملف باش نراجع واش صالحة للتصاريح والإجراءات.`
                  : safeLang === "en"
                  ? `I received ${file.name}. This looks like a personal photo, and I will keep it in the file to review whether it is suitable for the procedure.`
                  : `He recibido ${file.name}. Parece una foto personal, y la guardaré en el expediente para revisar si sirve para el trámite.`
              );
            } else {
              pushAgentMessage(ui.mohamedDocOk(file.name, matchedDocSnapshot.nombre));
            }

            toast({
              title: ui.uploadSuccessTitle,
              description: result?.summary || ui.uploadSuccessDesc,
            });

            if (nextDocsSnapshot.length > 0) {
              maybeSendCompletionMessage(nextDocsSnapshot);
            }
          } catch (err: any) {
            console.error("Error IA documento:", err);

            pushAgentMessage(
              safeLang === "darija"
                ? `وقع مشكل فمراجعة الوثيقة: ${err?.message || "خطأ غير معروف"}`
                : safeLang === "en"
                ? `There was a problem reviewing the document: ${err?.message || "Unknown error"}`
                : `Ha habido un problema revisando el documento: ${err?.message || "Error desconocido"}`
            );

            toast({
              title:
                safeLang === "darija"
                  ? "خطأ فالتحليل"
                  : safeLang === "en"
                  ? "Verification error"
                  : "Error de verificación",
              description:
                err?.message ||
                (safeLang === "darija"
                  ? "ما قدرناش نحللو الوثيقة."
                  : safeLang === "en"
                  ? "Could not analyze the document."
                  : "No se pudo analizar el documento."),
              variant: "destructive",
            });
          }
        }
      } finally {
        setGeneralUploading(false);
      }
    };

    input.click();
  } catch (error: any) {
    console.error("Error general handleGeneralUpload:", error);
    setGeneralUploading(false);

    toast({
      title:
        safeLang === "darija"
          ? "خطأ"
          : safeLang === "en"
          ? "Error"
          : "Error",
      description:
        error?.message ||
        (safeLang === "darija"
          ? "وقع مشكل غير متوقع."
          : safeLang === "en"
          ? "An unexpected error occurred."
          : "Ocurrió un error inesperado."),
      variant: "destructive",
    });
  }
};

  const handleSendChat = async () => {
    if (!chatInput.trim() || sendingChat || !chatBootstrapped) return;

    if (!leadSaved) {
      setChatInput("");
      pushAgentMessage(ui.formBlockedReply);

      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
      return;
    }

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
          context: "multi_extranjeria_procedure",
          procedureKey: selectedSituacion,
          procedureLabel: currentProcedure.name,
          lang: safeLang,
          history: historyToSend,
          leadForm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error en Mohamed");
      }

      const finalReply =
        data?.reply ||
        (safeLang === "darija"
          ? "سمح ليا، ما قدرتش نجاوب دابا."
          : safeLang === "en"
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
          safeLang === "darija"
            ? "وقع مشكل فالاتصال مع محمد، عاود حاول."
            : safeLang === "en"
            ? "There was a connection error with Mohamed. Please try again."
            : "Error conectando con Mohamed, intenta otra vez.",
        ts: Date.now(),
      };

      setChatMessages((prev) => [...prev, errorReply]);
    } finally {
      setSendingChat(false);
    }
  };

  const goToSara = () => {
    window.location.href = "/citas";
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

      <main className="flex-1 relative z-10 pt-16 pb-8">
        <div className="px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
              {t("reg_title")}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Star className="w-2.5 h-2.5" />
                {t("reg_new")}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentProcedure.name}
            </p>
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

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-3">
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
                <span className="text-xs font-medium text-white">
                  {ui.online}
                </span>
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
              {showChat ? ui.openChat : ui.closeChat}
            </button>

            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                >
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[340px]">
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

                    {(sendingChat || generalUploading) && (
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
                      disabled={!leadSaved}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={sendingChat || !leadSaved}
                      className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-60"
                      type="button"
                    >
                      <Send className="w-3.5 h-3.5 text-primary-foreground" />
                    </button>
                  </div>

                  <div className="border-t border-white/10 p-3">
                    <button
                      onClick={handleGeneralUpload}
                      disabled={generalUploading || !leadSaved}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold text-xs px-4 py-3 transition-colors"
                      type="button"
                    >
                      {generalUploading ? (
                        <>
                          <motion.div
                            className="w-3.5 h-3.5 border border-primary-foreground border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 0.7,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          {ui.uploading}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {ui.uploadGeneral}
                        </>
                      )}
                    </button>

                    <p className="mt-2 text-[10px] text-white/50 text-center">
                      {ui.uploadGeneralDesc}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
  <p className="text-sm font-bold text-white">
    Estado del expediente
  </p>

  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-white/60">Pruebas válidas</p>
      <p className="text-white font-bold text-lg">
        {stayProofDocs.length}
      </p>
    </div>

    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-white/60">Pruebas fuertes</p>
      <p className="text-white font-bold text-lg">
        {strongProofs.length}
      </p>
    </div>

    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-white/60">Meses cubiertos</p>
      <p className="text-white font-bold text-lg">
        {estimatedMonthsCovered}/5
      </p>
    </div>

    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-white/60">Rechazados</p>
      <p className="text-white font-bold text-lg">
        {rejectedDocs.length}
      </p>
    </div>
  </div>

  <p className="mt-3 text-xs text-white/70">
    {estimatedMonthsCovered >= 5
      ? "Expediente fuerte para regularización."
      : "Sigue subiendo pruebas para completar los 5 meses."}
  </p>
</div>
            <div className="rounded-[28px] border border-white/10 bg-white shadow-xl overflow-hidden">
              <div className="bg-[#f8fafc] border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {ui.formTitle}
                    </p>
                    <p className="text-[11px] text-slate-500">{ui.formDesc}</p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-4 space-y-3 bg-white">
                <FieldLabel label={ui.labels.nombre} />
                <FieldInput
                  value={leadForm.nombre}
                  onChange={(v) => updateLeadForm("nombre", v)}
                  placeholder={ui.labels.nombre}
                />

                <FieldLabel label={ui.labels.telefono} />
                <FieldInput
                  value={leadForm.telefono}
                  onChange={(v) => updateLeadForm("telefono", v)}
                  placeholder={ui.labels.telefono}
                />

                <FieldLabel label={ui.labels.email} />
                <FieldInput
                  value={leadForm.email}
                  onChange={(v) => updateLeadForm("email", v)}
                  placeholder="email@example.com"
                />

                <FieldLabel label={ui.labels.niePasaporte} />
                <FieldInput
                  value={leadForm.niePasaporte}
                  onChange={(v) => updateLeadForm("niePasaporte", v)}
                  placeholder={ui.labels.niePasaporte}
                />

                <FieldLabel label={ui.labels.ciudad} />
                <FieldInput
                  value={leadForm.ciudad}
                  onChange={(v) => updateLeadForm("ciudad", v)}
                  placeholder={ui.labels.ciudad}
                />

                <FieldLabel label={ui.labels.nacionalidad} />
                <FieldInput
                  value={leadForm.nacionalidad}
                  onChange={(v) => updateLeadForm("nacionalidad", v)}
                  placeholder={ui.labels.nacionalidad}
                />

                <FieldLabel label={ui.labels.fechaLlegada} />
                <FieldInput
                  value={leadForm.fechaLlegada}
                  onChange={(v) => updateLeadForm("fechaLlegada", v)}
                  placeholder="DD/MM/AAAA"
                />

                <FieldLabel label={ui.labels.cumple5Meses} />
                <FieldSelect
                  value={leadForm.cumple5Meses}
                  onChange={(v) => updateLeadForm("cumple5Meses", v)}
                  options={[
                    { value: "", label: ui.labels.select },
                    { value: "si", label: ui.labels.yes },
                    { value: "no", label: ui.labels.no },
                    { value: "nose", label: ui.labels.dontKnow },
                  ]}
                />

                <FieldLabel label={ui.labels.asilo} />
                <FieldSelect
                  value={leadForm.asilo}
                  onChange={(v) => updateLeadForm("asilo", v)}
                  options={[
                    { value: "", label: ui.labels.select },
                    { value: "no", label: ui.labels.no },
                    { value: "si", label: ui.labels.yes },
                    { value: "nose", label: ui.labels.dontKnow },
                  ]}
                />

                <FieldLabel label={ui.labels.penales} />
                <FieldSelect
                  value={leadForm.penales}
                  onChange={(v) => updateLeadForm("penales", v)}
                  options={[
                    { value: "", label: ui.labels.select },
                    { value: "no", label: ui.labels.no },
                    { value: "si", label: ui.labels.yes },
                  ]}
                />

                <button
                  onClick={handleSaveLeadForm}
                  className="w-full rounded-[18px] bg-[#003b82] hover:bg-[#002f69] text-white font-bold text-sm py-3 transition-colors"
                  type="button"
                >
                  {ui.saveLeadButton}
                </button>
              </div>
            </div>

            {allReady && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-bold text-white">{ui.goSara}</p>
                <p className="mt-1 text-xs text-white/70">{ui.goSaraDesc}</p>

                <button
                  onClick={goToSara}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 text-sm font-bold transition-colors"
                  type="button"
                >
                  {ui.goSara}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="block text-[12px] font-semibold text-slate-600 mb-1">
      {label}
    </label>
  );
}

function FieldInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
      placeholder={placeholder}
    />
  );
}

function FieldSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
    >
      {options.map((opt) => (
        <option key={`${opt.value}-${opt.label}`} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
