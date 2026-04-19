import { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Upload,
  Star,
  ArrowRight,
  Bell,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyDocument, type VerifyDocumentResult } from "@/lib/verifyDocument";
import {
  EXTRANJERIA_PROCEDURES,
  getProcedureByKey,
} from "@/lib/extranjeriaProcedures";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface ChatMsg {
  from: "agent" | "user";
  text: string;
  ts?: number;
}

type DocStatus = "ok" | "warn" | "missing";

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
  const [selectedSituacion] = useState("regularizacion_2026_laboral");
  const [muted, setMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [leadSaved, setLeadSaved] = useState(false);
  const [generalUploading, setGeneralUploading] = useState(false);
  const [completionMessageSent, setCompletionMessageSent] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<ChatMsg[]>([]);
  const [lastUserTranscript, setLastUserTranscript] = useState("");
  const [waitingMohamed, setWaitingMohamed] = useState(false);

  const [leadForm, setLeadForm] = useState<LeadFormState>({
    nombre: "",
    telefono: "",
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
  const recognitionRef = useRef<any>(null);

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as
    | "darija"
    | "es"
    | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

  const ui = useMemo(() => {
    if (safeLang === "darija") {
      return {
        initialVoice:
          "السلام عليكم، مرحبا بك في Gestoria Cita IA. إلا بغيتي نوجد ليك الملف ديال regularización 2026، عمر أولاً الفورمولار اللي على اليمين ومن بعد ضغط على زر الميكروفون باش نكمل معاك بالصوت.",
        online: "متصل الآن",
        role: "مختص فالهجرة",
        voiceButton: "تكلم مع محمد",
        stopButton: "وقف الميكروفون",
        voiceBlocked:
          "عافاك عمّر ليا الفورمولار الأول ومن بعد ضغط على زر الميكروفون باش نكمل معاك.",
        saveLeadButton: "حفظ المعطيات والمتابعة مع محمد",
        saveLeadTitle: "تحفظات المعطيات",
        saveLeadDesc: "محمد يقدر دابا يبدا معاك بالصوت.",
        savedLeadReply:
          "مزيان. خديت المعطيات ديالك. دابا ضغط على زر الميكروفون ونجاوبك سؤال بسؤال، ومن بعد تقدر تطلع الوثائق ديالك.",
        formTitle: "لوحة رسمية مدمجة",
        formDesc:
          "عمر المعطيات الأساسية باش محمد يبدا يراجع الملف ديالك بالصوت.",
        uploadGeneral: "رفع الوثائق",
        uploadGeneralDesc:
          "من هنا تقدر ترفع جميع الوثائق اللي طلب منك محمد، سواء كانت صورة أو PDF.",
        uploading: "كيترفع...",
        uploadSuccessTitle: "تقبلات الوثيقة",
        uploadSuccessDesc: "راجعنا الوثيقة وربطناها مع الملف.",
        uploadErrorTitle: "خطأ فالوثيقة",
        uploadErrorDesc: "ما قدرناش نربط هاد الوثيقة مع الملف.",
        missingTitle: "كاينين بيانات ناقصين",
        missingDesc: "عمر الاسم والهاتف والمدينة قبل ما تكمل.",
        listening: "محمد كيسمع ليك دابا...",
        latestReply: "آخر جواب ديال محمد",
        yourVoice: "آخر جواب ديالك بالصوت",
        micNotSupported:
          "هاد المتصفح ما كيدعمش التعرف على الصوت. استعمل Chrome.",
        docStatusTitle: "حالة الملف ديالك",
        docStatusDone: "جاهز",
        docStatusReview: "مراجعة",
        docStatusMissing: "ناقص",
        mohamedDocOk: (fileName: string, docName: string) =>
          `مزيان. توصلت بــ ${fileName} وراجعتو. حطيناه دابا فخانة «${docName}».`,
        mohamedDocWarn: (fileName: string) =>
          `توصلت بــ ${fileName} ولكن مازال خاصني نسخة أوضح ولا الوثيقة المناسبة باش نكمل المراجعة.`,
        mohamedDocUnknown: (fileName: string) =>
          `توصلت بــ ${fileName}، ولكن ما قدرناش نربطو أوتوماتيكياً مع وثيقة معينة.`,
        mohamedFinal:
          "مزيان. راجعنا الوثائق ديالك ووجدنا الملف ديالك. إلا بغيتي دابا تكمل مع سارة فالسيطة، تقدر تدوز ليها.",
        goSara: "المرور إلى سارة",
        goSaraDesc: "إلى بغيتي تكمل بالموعد، سارة غادي تعاونك.",
        labels: {
          nombre: "الاسم الكامل",
          telefono: "الهاتف",
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
        initialVoice:
          "Hello, welcome to Gestoria Cita IA. If you want me to prepare your 2026 regularization file, first complete the form on the right and then press the microphone button so I can continue with you by voice.",
        online: "Online",
        role: "Immigration Specialist",
        voiceButton: "Talk to Mohamed",
        stopButton: "Stop microphone",
        voiceBlocked:
          "Please complete the form first, then press the microphone button so I can continue with you.",
        saveLeadButton: "Save details and continue with Mohamed",
        saveLeadTitle: "Details saved",
        saveLeadDesc: "Mohamed can now start with you by voice.",
        savedLeadReply:
          "Perfect. I already have your details. Now press the microphone button and I will guide you question by question. After that, you can upload your documents.",
        formTitle: "Integrated official panel",
        formDesc:
          "Fill in the basic details so Mohamed can start reviewing your case by voice.",
        uploadGeneral: "Upload documents",
        uploadGeneralDesc:
          "Use this button to upload all documents Mohamed asks for, as images or PDFs.",
        uploading: "Uploading...",
        uploadSuccessTitle: "Document received",
        uploadSuccessDesc: "The document was reviewed and linked to the file.",
        uploadErrorTitle: "Document error",
        uploadErrorDesc: "We could not link that document to the file.",
        missingTitle: "Missing data",
        missingDesc: "Fill in name, phone and city before continuing.",
        listening: "Mohamed is listening to you now...",
        latestReply: "Mohamed's latest reply",
        yourVoice: "Your latest voice answer",
        micNotSupported:
          "This browser does not support voice recognition. Use Chrome.",
        docStatusTitle: "Your file status",
        docStatusDone: "Ready",
        docStatusReview: "Review",
        docStatusMissing: "Missing",
        mohamedDocOk: (fileName: string, docName: string) =>
          `Perfect. I received ${fileName} and placed it in "${docName}".`,
        mohamedDocWarn: (fileName: string) =>
          `I received ${fileName}, but I still need a clearer version or the correct document.`,
        mohamedDocUnknown: (fileName: string) =>
          `I received ${fileName}, but I could not automatically match it to a specific document.`,
        mohamedFinal:
          "Perfect. We reviewed your documents and prepared your file. If you want to continue with Sara for the appointment, you can go now.",
        goSara: "Go to Sara",
        goSaraDesc:
          "If you want to continue with the appointment, Sara will help you.",
        labels: {
          nombre: "Full name",
          telefono: "Phone",
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
      initialVoice:
        "Hola, bienvenido a Gestoria Cita IA. Si quieres que te prepare el expediente de regularización 2026, primero rellena el formulario de la derecha y después pulsa el botón del micrófono para continuar por voz conmigo.",
      online: "En línea",
      role: "Especialista en Extranjería",
      voiceButton: "Hablar con Mohamed",
      stopButton: "Parar micrófono",
      voiceBlocked:
        "Rellena primero el formulario y después pulsa el botón del micrófono para continuar conmigo.",
      saveLeadButton: "Guardar datos y continuar con Mohamed",
      saveLeadTitle: "Datos guardados",
      saveLeadDesc: "Mohamed ya puede empezar contigo por voz.",
      savedLeadReply:
        "Perfecto. Ya tengo tus datos. Ahora pulsa el botón del micrófono y te iré guiando pregunta por pregunta. Después podrás subir tus documentos.",
      formTitle: "Panel oficial integrado",
      formDesc:
        "Rellena los datos básicos para que Mohamed empiece a revisar tu caso por voz.",
      uploadGeneral: "Subir documentos",
      uploadGeneralDesc:
        "Usa este botón para subir todos los documentos que te pida Mohamed, en foto o en PDF.",
      uploading: "Subiendo...",
      uploadSuccessTitle: "Documento recibido",
      uploadSuccessDesc: "El documento se ha revisado y vinculado al expediente.",
      uploadErrorTitle: "Error en documento",
      uploadErrorDesc: "No se pudo vincular ese documento al expediente.",
      missingTitle: "Faltan datos",
      missingDesc: "Rellena nombre, teléfono y ciudad antes de continuar.",
      listening: "Mohamed te está escuchando ahora...",
      latestReply: "Última respuesta de Mohamed",
      yourVoice: "Tu última respuesta por voz",
      micNotSupported:
        "Este navegador no soporta reconocimiento de voz. Usa Chrome.",
      docStatusTitle: "Estado de tu expediente",
      docStatusDone: "Listo",
      docStatusReview: "Revisar",
      docStatusMissing: "Falta",
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
      labels: {
        nombre: "Nombre completo",
        telefono: "Teléfono",
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

  const historyStorageKey = useMemo(() => {
    return `gestoriacitaia_mohamed_voice_history_${safeLang}_${selectedSituacion}`;
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
    !!leadForm.ciudad.trim();

  useEffect(() => {
    setDocs(buildInitialDocs(selectedSituacion));
    setCompletionMessageSent(false);
  }, [selectedSituacion]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    try {
      const rawForm = localStorage.getItem(formStorageKey);
      if (rawForm) {
        const parsed = JSON.parse(rawForm) as LeadFormState;
        setLeadForm({
          nombre: parsed?.nombre || "",
          telefono: parsed?.telefono || "",
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
    try {
      const raw = localStorage.getItem(historyStorageKey);

      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVoiceHistory(parsed);

          const completionAlreadySent = parsed.some(
            (m) => m.from === "agent" && m.text === ui.mohamedFinal
          );
          const leadAlreadySaved = parsed.some(
            (m) => m.from === "agent" && m.text === ui.savedLeadReply
          );

          setCompletionMessageSent(completionAlreadySent);
          setLeadSaved((prev) => prev || leadAlreadySaved);
          return;
        }
      }

      const freshHistory: ChatMsg[] = [
        {
          from: "agent",
          text: ui.initialVoice,
          ts: Date.now(),
        },
      ];
      setVoiceHistory(freshHistory);
    } catch (error) {
      console.error("Error cargando historial de Mohamed:", error);
      setVoiceHistory([
        {
          from: "agent",
          text: ui.initialVoice,
          ts: Date.now(),
        },
      ]);
    }
  }, [historyStorageKey, ui.initialVoice, ui.mohamedFinal, ui.savedLeadReply]);

  useEffect(() => {
    if (voiceHistory.length === 0) return;
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(voiceHistory));
    } catch (error) {
      console.error("Error guardando historial de Mohamed:", error);
    }
  }, [voiceHistory, historyStorageKey]);

  const docsOk = docs.filter((d) => d.estado === "ok").length;
  const docsTotal = docs.length;
  const allReady = docsOk >= Math.max(1, docsTotal - 1);

  const updateLeadForm = (field: keyof LeadFormState, value: string) => {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const speakText = (text: string) => {
    if (muted) return;
    if (!("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (safeLang === "darija") {
        utterance.lang = "ar-MA";
      } else if (safeLang === "en") {
        utterance.lang = "en-US";
      } else {
        utterance.lang = "es-ES";
      }

      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error reproduciendo voz:", error);
    }
  };

  const pushAgentMessage = (text: string, speak = false) => {
    setVoiceHistory((prev) => [
      ...prev,
      {
        from: "agent",
        text,
        ts: Date.now(),
      },
    ]);

    if (speak) {
      setTimeout(() => {
        speakText(text);
      }, 150);
    }
  };

  const pushUserMessage = (text: string) => {
    setVoiceHistory((prev) => [
      ...prev,
      {
        from: "user",
        text,
        ts: Date.now(),
      },
    ]);
  };

  useEffect(() => {
    if (voiceHistory.length === 1 && voiceHistory[0]?.text === ui.initialVoice) {
      const timer = setTimeout(() => {
        speakText(ui.initialVoice);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [voiceHistory, ui.initialVoice]);

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

    const alreadyExists = voiceHistory.some(
      (msg) => msg.from === "agent" && msg.text === ui.savedLeadReply
    );

    if (!alreadyExists) {
      pushAgentMessage(ui.savedLeadReply, true);
    }

    toast({
      title: ui.saveLeadTitle,
      description: ui.saveLeadDesc,
    });
  };

  const getRecognitionLang = () => {
    if (safeLang === "darija") return "ar-MA";
    if (safeLang === "en") return "en-US";
    return "es-ES";
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch (error) {
      console.error("Error deteniendo micro:", error);
    } finally {
      setIsListening(false);
    }
  };

  const handleVoiceConversation = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    pushUserMessage(spokenText);
    setLastUserTranscript(spokenText);
    setWaitingMohamed(true);

    try {
      const historyToSend = voiceHistory.slice(-8).map((msg) => ({
        from: msg.from,
        text: msg.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant: "mohamed",
          message: spokenText,
          context: "voice_regularizacion_2026",
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

      pushAgentMessage(finalReply, true);
    } catch (error) {
      console.error("Error conectando con Mohamed:", error);

      const errorReply =
        safeLang === "darija"
          ? "وقع مشكل فالاتصال مع محمد، عاود حاول."
          : safeLang === "en"
          ? "There was a connection error with Mohamed. Please try again."
          : "Error conectando con Mohamed, intenta otra vez.";

      pushAgentMessage(errorReply, true);
    } finally {
      setWaitingMohamed(false);
    }
  };

  const startListening = () => {
    if (!leadSaved) {
      pushAgentMessage(ui.voiceBlocked, true);

      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      toast({
        title: "Micrófono no compatible",
        description: ui.micNotSupported,
        variant: "destructive",
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = getRecognitionLang();
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);

        toast({
          title: "Error de micrófono",
          description:
            safeLang === "darija"
              ? "وقع مشكل فالمايكروفون، عاود حاول."
              : safeLang === "en"
              ? "There was a microphone error. Please try again."
              : "Hubo un error con el micrófono. Inténtalo otra vez.",
          variant: "destructive",
        });
      };

      recognition.onresult = async (event: any) => {
        const transcript =
          event?.results?.[0]?.[0]?.transcript?.trim?.() || "";

        if (!transcript) return;
        await handleVoiceConversation(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Error iniciando reconocimiento:", error);
      setIsListening(false);
    }
  };

  const getBestDocMatch = (
    result: {
      document_type?: string | null;
      summary?: string;
      visible_fields?: string[];
      missing_or_unclear_fields?: string[];
      warnings?: string[];
    },
    currentDocs: StoredDocItem[],
    fileName?: string
  ): StoredDocItem | null => {
    const detectedType = normalizeDocType(result?.document_type || "");
    const lowerFileName = (fileName || "").toLowerCase();

    const combinedText = [
      result?.summary || "",
      ...(result?.visible_fields || []),
      ...(result?.missing_or_unclear_fields || []),
      ...(result?.warnings || []),
      lowerFileName,
    ]
      .join(" ")
      .toLowerCase();

    const includesAny = (words: string[]) =>
      words.some((word) => combinedText.includes(word));

    if (detectedType && detectedType !== "unknown" && detectedType !== "photo") {
      const exactMissing = currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          normalizeDocType(doc.expectedType) === detectedType
      );
      if (exactMissing) return exactMissing;

      const exactWarn = currentDocs.find(
        (doc) =>
          doc.estado === "warn" &&
          normalizeDocType(doc.expectedType) === detectedType
      );
      if (exactWarn) return exactWarn;
    }

    if (
      includesAny([
        "passport",
        "pasaporte",
        "passeport",
        "documento de viaje",
        "travel document",
        "passaporte",
        "numero de pasaporte",
        "passport number",
      ])
    ) {
      const passportDoc =
        currentDocs.find(
          (doc) =>
            doc.estado !== "ok" &&
            (normalizeDocType(doc.expectedType) === "passport" ||
              doc.nombre.toLowerCase().includes("pasaporte") ||
              doc.nombre.toLowerCase().includes("passport") ||
              doc.nombre.toLowerCase().includes("nie vigente") ||
              doc.nombre.toLowerCase().includes("pasaporte o nie"))
        ) ||
        currentDocs.find(
          (doc) =>
            normalizeDocType(doc.expectedType) === "passport" ||
            doc.nombre.toLowerCase().includes("pasaporte") ||
            doc.nombre.toLowerCase().includes("passport") ||
            doc.nombre.toLowerCase().includes("nie vigente") ||
            doc.nombre.toLowerCase().includes("pasaporte o nie")
        );

      if (passportDoc) return passportDoc;
    }

    if (
      includesAny([
        "passport",
        "pasaporte",
        "nie",
        "identity card",
        "documento identidad",
        "documento de identidad",
      ])
    ) {
      const identityDoc =
        currentDocs.find(
          (doc) =>
            doc.estado !== "ok" &&
            (doc.nombre.toLowerCase().includes("pasaporte o nie") ||
              doc.nombre.toLowerCase().includes("pasaporte") ||
              doc.nombre.toLowerCase().includes("nie vigente"))
        ) ||
        currentDocs.find(
          (doc) =>
            doc.nombre.toLowerCase().includes("pasaporte o nie") ||
            doc.nombre.toLowerCase().includes("pasaporte") ||
            doc.nombre.toLowerCase().includes("nie vigente")
        );

      if (identityDoc) return identityDoc;
    }

    if (includesAny(["nie"])) {
      const nieDoc =
        currentDocs.find(
          (doc) =>
            doc.estado !== "ok" && normalizeDocType(doc.expectedType) === "nie"
        ) ||
        currentDocs.find((doc) => normalizeDocType(doc.expectedType) === "nie");

      if (nieDoc) return nieDoc;
    }

    if (includesAny(["tie", "tarjeta de identidad de extranjero"])) {
      const tieDoc =
        currentDocs.find(
          (doc) =>
            doc.estado !== "ok" && normalizeDocType(doc.expectedType) === "tie"
        ) ||
        currentDocs.find((doc) => normalizeDocType(doc.expectedType) === "tie");

      if (tieDoc) return tieDoc;
    }

    if (includesAny(["empadronamiento", "padron", "padrón", "volante"])) {
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

  const maybeSendCompletionMessage = (nextDocs: StoredDocItem[]) => {
    const okCount = nextDocs.filter((d) => d.estado === "ok").length;
    const total = nextDocs.length;
    const readyNow = okCount >= Math.max(1, total - 1);

    if (readyNow && !completionMessageSent) {
      pushAgentMessage(ui.mohamedFinal, true);
      setCompletionMessageSent(true);
    }
  };

  const handleGeneralUpload = async () => {
    if (!leadSaved) {
      pushAgentMessage(ui.voiceBlocked, true);

      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
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

              if (!matchedDocSnapshot) {
                const unknownText =
                  safeLang === "darija"
                    ? `توصلت بــ ${file.name}. قريت الوثيقة ولكن ما قدرتش نربطها أوتوماتيكياً مع خانة محددة.`
                    : safeLang === "en"
                    ? `I received ${file.name}. I could read the document, but I could not automatically assign it to a specific slot yet.`
                    : `He recibido ${file.name}. He podido leer el documento, pero todavía no he podido asignarlo automáticamente a una casilla concreta del expediente.`;

                pushAgentMessage(unknownText, true);

                toast({
                  title: ui.uploadErrorTitle,
                  description: result?.summary || ui.uploadErrorDesc,
                  variant: "destructive",
                });

                continue;
              }

              const isWarn =
                result.status === "invalid" ||
                result.match_expected_type === false;

              if (isWarn) {
                pushAgentMessage(ui.mohamedDocWarn(file.name), true);
              } else {
                const matchedName = matchedDocSnapshot.nombre.toLowerCase();

                let successMessage = ui.mohamedDocOk(
                  file.name,
                  matchedDocSnapshot.nombre
                );

                if (
                  matchedName.includes("pasaporte o nie") ||
                  matchedName.includes("pasaporte") ||
                  matchedName.includes("nie vigente")
                ) {
                  successMessage =
                    safeLang === "darija"
                      ? "الباسبور ديالك متحقق مزيان. دابا نمرّو للوثيقة اللي من بعد."
                      : safeLang === "en"
                      ? "Your passport has been verified correctly. Now let's continue with the next document."
                      : "Tu pasaporte ha sido verificado correctamente. Ahora seguimos con el siguiente documento.";
                }

                pushAgentMessage(successMessage, true);
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

              const errText =
                safeLang === "darija"
                  ? `وقع مشكل فمراجعة الوثيقة: ${
                      err?.message || "خطأ غير معروف"
                    }`
                  : safeLang === "en"
                  ? `There was a problem reviewing the document: ${
                      err?.message || "Unknown error"
                    }`
                  : `Ha habido un problema revisando el documento: ${
                      err?.message || "Error desconocido"
                    }`;

              pushAgentMessage(errText, true);

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

  const goToSara = () => {
    window.location.href = "/citas";
  };

  const latestAgentMessage =
    [...voiceHistory].reverse().find((msg) => msg.from === "agent")?.text ||
    ui.initialVoice;

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

              <div className="absolute top-3 right-3 flex items-center gap-2">
                <div className="relative w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                    !
                  </span>
                </div>

                <button
                  onClick={() => setMuted(!muted)}
                  className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center"
                  type="button"
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </button>
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
                  onClick={isListening ? stopListening : startListening}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors ${
                    isListening
                      ? "bg-destructive/80 border-destructive"
                      : "bg-black/50 border-white/20 hover:bg-black/70"
                  }`}
                  type="button"
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5 text-white" />
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>

            <div className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={!voiceSupported}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm px-4 py-3 transition-colors"
                  type="button"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      {ui.stopButton}
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      {ui.voiceButton}
                    </>
                  )}
                </button>

                {!voiceSupported && (
                  <p className="mt-2 text-xs text-red-400 text-center">
                    {ui.micNotSupported}
                  </p>
                )}

                {isListening && (
                  <p className="mt-2 text-xs text-primary text-center">
                    {ui.listening}
                  </p>
                )}
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[11px] text-white/50 mb-1">
                    {ui.latestReply}
                  </p>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white/90 leading-relaxed">
                    {latestAgentMessage}
                  </div>
                </div>

                {lastUserTranscript ? (
                  <div>
                    <p className="text-[11px] text-white/50 mb-1">
                      {ui.yourVoice}
                    </p>
                    <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-white leading-relaxed">
                      {lastUserTranscript}
                    </div>
                  </div>
                ) : null}

                {waitingMohamed && (
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white/70">
                    ...
                  </div>
                )}
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
            </div>
          </div>

          <div className="flex flex-col gap-4">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-slate-800">
                      {ui.docStatusTitle}
                    </p>
                    <span className="text-xs font-bold text-slate-700">
                      {docsOk}/{docsTotal}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#003b82] rounded-full transition-all"
                      style={{
                        width: `${docsTotal > 0 ? (docsOk / docsTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {docs.slice(0, 4).map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded-xl px-3 py-2 border border-slate-200 text-slate-700 bg-white flex items-center justify-between gap-2"
                      >
                        <span className="text-[11px] font-medium leading-tight">
                          {doc.nombre}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            doc.estado === "ok"
                              ? "bg-green-100 text-green-700"
                              : doc.estado === "warn"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {doc.estado === "ok"
                            ? ui.docStatusDone
                            : doc.estado === "warn"
                            ? ui.docStatusReview
                            : ui.docStatusMissing}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

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
