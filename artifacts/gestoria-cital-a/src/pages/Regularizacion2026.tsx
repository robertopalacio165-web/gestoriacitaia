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

function getStatusLabel(
  status: DocStatus,
  done: string,
  review: string,
  missing: string
) {
  if (status === "ok") return done;
  if (status === "warn") return review;
  return missing;
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

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const realtimePcRef = useRef<RTCPeerConnection | null>(null);
  const realtimeDcRef = useRef<RTCDataChannel | null>(null);
  const realtimeLocalStreamRef = useRef<MediaStream | null>(null);
  const assistantTextBufferRef = useRef("");
  const lastUserTranscriptRef = useRef("");
  const lastAssistantTextRef = useRef("");
  const shouldKickoffMohamedRef = useRef(false);

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as
    | "darija"
    | "es"
    | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

  const voiceTexts = useMemo(
    () => ({
      initialVoice:
        "السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نصيبو ليك الميلف ديال التسوية الجماعية، عمر ليا الفورمولار الأول، ومن بعد نكمل معاك. ملي تسالي، ضغط على الميكروفون وغادي نكمل معاك.",
      voiceBlocked:
        "عافاك عمّر ليا الفورمولار الأول ومن بعد ضغط على الميكروفون باش نكمل معاك.",
      savedLeadReply:
        "مزيان. خديت المعطيات ديالك. دابا ضغط على زر الميكروفون وغادي نكمل معاك خطوة بخطوة، ونسولك غير على المعلومات المهمة ديال الملف.",
      passportVerified:
        "مزيان. توصلت بالهوية ديالك وبانت مزيان. دابا نكملو الخطوة اللي من بعدها.",
      mohamedFinal:
        "مزيان. كلشي واجد ومراجع. دابا غادي نبعثو ليك الملف ديالك فـ PDF عبر WhatsApp.",
      realtimeIntro: [
        "جاوب ديما غير بالدارجة المغربية وبالحروف العربية.",
        "أنت محمد من GestoriaCitaIA.",
        "أنت خبير فالتسوية الجماعية 2026 وملفات extranjería فإسبانيا.",
        `الإجراء الحالي هو: ${currentProcedure.name}.`,
        `المعطيات اللي عندك دابا: الاسم ${leadForm.nombre || "ما متسجلش"}, الهاتف ${
          leadForm.telefono || "ما متسجلش"
        }, الهوية ${leadForm.niePasaporte || "ما متسجلش"}, المدينة ${
          leadForm.ciudad || "ما متسجلش"
        }, الجنسية ${leadForm.nacionalidad || "ما متسجلش"}, تاريخ الدخول ${
          leadForm.fechaLlegada || "ما متسجلش"
        }, 5 شهور ${leadForm.cumple5Meses || "ما متسجلش"}, asilo ${
          leadForm.asilo || "ما متسجلش"
        }, السوابق ${leadForm.penales || "ما متسجلش"}.`,
        "ابدأ دابا مباشرة بجواب طبيعي وقصير، وعرف براسك باختصار، ومن بعد سول غير السؤال الجاي المناسب باش تكمل الملف.",
        "سول سؤال واحد فقط فكل مرة.",
      ].join(" "),
      realtimeError: "وقع مشكل فالاتصال المباشر مع محمد. عاود حاول من بعد.",
      uploadUnknown:
        "توصلت بالوثيقة، ولكن مازال خاصني نربطها مزيان بالملف. صيفط ليا أولاً بروفات ديال 5 شهور، ومن بعد الباسبور ولا NIE بواضح.",
      uploadWarn:
        "توصلت بالوثيقة ولكن مازال خاصني نسخة أوضح باش نكمل المراجعة.",
      uploadOk: "توصلت بالوثيقة وربطتها مع الملف ديالك.",
    }),
    [currentProcedure.name, leadForm]
  );

  const ui = useMemo(() => {
    if (safeLang === "darija") {
      return {
        online: "متصل الآن",
        role: "مختص فالهجرة",
        voiceButton: "تكلم مع محمد",
        stopButton: "وقف الميكروفون",
        saveLeadButton: "حفظ المعطيات والمتابعة مع محمد",
        saveLeadTitle: "تحفظات المعطيات",
        saveLeadDesc: "محمد يقدر دابا يبدا معاك بالصوت.",
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
          "هاد المتصفح ما كيدعمش الصوت المباشر. استعمل Chrome حديث.",
        docStatusTitle: "حالة الملف ديالك",
        docStatusDone: "جاهز",
        docStatusReview: "مراجعة",
        docStatusMissing: "ناقص",
        docStepForm: "الفورمولار معمر",
        docStepStayProof: "بروفات ديال 5 شهور",
        docStepIdentity: "الباسبور أو NIE",
        docStepFinal: "الملف النهائي واجد",
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
        online: "Online",
        role: "Immigration Specialist",
        voiceButton: "Talk to Mohamed",
        stopButton: "Stop microphone",
        saveLeadButton: "Save details and continue with Mohamed",
        saveLeadTitle: "Details saved",
        saveLeadDesc: "Mohamed can now start with you by voice.",
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
        listening: "Mohamed is listening now...",
        latestReply: "Mohamed's latest reply",
        yourVoice: "Your latest voice answer",
        micNotSupported:
          "This browser does not support realtime voice. Use modern Chrome.",
        docStatusTitle: "Your file status",
        docStatusDone: "Ready",
        docStatusReview: "Review",
        docStatusMissing: "Missing",
        docStepForm: "Form completed",
        docStepStayProof: "5-month proof",
        docStepIdentity: "Passport or NIE",
        docStepFinal: "Final file ready",
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
      online: "En línea",
      role: "Especialista en Extranjería",
      voiceButton: "Hablar con Mohamed",
      stopButton: "Parar micrófono",
      saveLeadButton: "Guardar datos y continuar con Mohamed",
      saveLeadTitle: "Datos guardados",
      saveLeadDesc: "Mohamed ya puede empezar contigo por voz.",
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
        "Este navegador no soporta voz en tiempo real. Usa Chrome moderno.",
      docStatusTitle: "Estado de tu expediente",
      docStatusDone: "Listo",
      docStatusReview: "Revisar",
      docStatusMissing: "Falta",
      docStepForm: "Formulario completado",
      docStepStayProof: "Pruebas de 5 meses",
      docStepIdentity: "Pasaporte o NIE",
      docStepFinal: "Expediente final listo",
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
    return `gestoriacitaia_mohamed_voice_history_${selectedSituacion}`;
  }, [selectedSituacion]);

  const formStorageKey = useMemo(() => {
    return `gestoriacitaia_mohamed_form_${selectedSituacion}`;
  }, [selectedSituacion]);

  const leadSavedStorageKey = useMemo(() => {
    return `gestoriacitaia_mohamed_lead_saved_${selectedSituacion}`;
  }, [selectedSituacion]);

  const leadFormReady =
    !!leadForm.nombre.trim() &&
    !!leadForm.telefono.trim() &&
    !!leadForm.ciudad.trim();

  useEffect(() => {
    setDocs(buildInitialDocs(selectedSituacion));
    setCompletionMessageSent(false);
  }, [selectedSituacion]);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      typeof window.RTCPeerConnection !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;

    setVoiceSupported(Boolean(supported));
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
            (m) => m.from === "agent" && m.text === voiceTexts.mohamedFinal
          );
          const leadAlreadySaved = parsed.some(
            (m) => m.from === "agent" && m.text === voiceTexts.savedLeadReply
          );

          setCompletionMessageSent(completionAlreadySent);
          setLeadSaved((prev) => prev || leadAlreadySaved);
          return;
        }
      }

      const freshHistory: ChatMsg[] = [
        {
          from: "agent",
          text: voiceTexts.initialVoice,
          ts: Date.now(),
        },
      ];
      setVoiceHistory(freshHistory);
    } catch (error) {
      console.error("Error cargando historial de Mohamed:", error);
      setVoiceHistory([
        {
          from: "agent",
          text: voiceTexts.initialVoice,
          ts: Date.now(),
        },
      ]);
    }
  }, [
    historyStorageKey,
    voiceTexts.initialVoice,
    voiceTexts.mohamedFinal,
    voiceTexts.savedLeadReply,
  ]);

  useEffect(() => {
    if (voiceHistory.length === 0) return;
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(voiceHistory));
    } catch (error) {
      console.error("Error guardando historial de Mohamed:", error);
    }
  }, [voiceHistory, historyStorageKey]);

  const identityDocs = docs.filter((doc) => {
    const expected = normalizeDocType(doc.expectedType);
    const detected = normalizeDocType(doc.detectedType);
    const name = doc.nombre.toLowerCase();

    return (
      expected === "passport" ||
      expected === "nie" ||
      expected === "tie" ||
      detected === "passport" ||
      detected === "nie" ||
      detected === "tie" ||
      name.includes("pasaporte") ||
      name.includes("passport") ||
      name.includes("nie")
    );
  });

  const stayProofDocs = docs.filter((doc) => {
    const expected = normalizeDocType(doc.expectedType);
    const detected = normalizeDocType(doc.detectedType);
    const name = doc.nombre.toLowerCase();
    const note = (doc.note || "").toLowerCase();

    return (
      expected === "empadronamiento" ||
      expected === "stay_proof" ||
      detected === "empadronamiento" ||
      detected === "stay_proof" ||
      name.includes("empadronamiento") ||
      name.includes("padron") ||
      name.includes("padrón") ||
      name.includes("prueba de permanencia") ||
      name.includes("prueba permanencia") ||
      note.includes("empadronamiento") ||
      note.includes("stay proof") ||
      note.includes("prueba de permanencia")
    );
  });

  const formCompletedStatus: DocStatus = leadSaved ? "ok" : "missing";

  const stayProofStatus: DocStatus =
    stayProofDocs.some((doc) => doc.estado === "ok")
      ? "ok"
      : stayProofDocs.some((doc) => doc.estado === "warn")
      ? "warn"
      : "missing";

  const identityStatus: DocStatus =
    identityDocs.some((doc) => doc.estado === "ok")
      ? "ok"
      : identityDocs.some((doc) => doc.estado === "warn")
      ? "warn"
      : "missing";

  const finalFileStatus: DocStatus =
    formCompletedStatus === "ok" &&
    stayProofStatus === "ok" &&
    identityStatus === "ok"
      ? "ok"
      : formCompletedStatus === "warn" ||
        stayProofStatus === "warn" ||
        identityStatus === "warn"
      ? "warn"
      : "missing";

  const progressCards = [
    {
      id: "form_completed",
      nombre: ui.docStepForm,
      estado: formCompletedStatus,
    },
    {
      id: "stay_proof",
      nombre: ui.docStepStayProof,
      estado: stayProofStatus,
    },
    {
      id: "identity_document",
      nombre: ui.docStepIdentity,
      estado: identityStatus,
    },
    {
      id: "final_file",
      nombre: ui.docStepFinal,
      estado: finalFileStatus,
    },
  ];

  const progressOk = progressCards.filter((item) => item.estado === "ok").length;
  const progressTotal = progressCards.length;
  const allReady = finalFileStatus === "ok";

  const updateLeadForm = (field: keyof LeadFormState, value: string) => {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const pushAgentMessage = (text: string, _speak = false) => {
    if (!text?.trim()) return;

    setVoiceHistory((prev) => [
      ...prev,
      {
        from: "agent",
        text,
        ts: Date.now(),
      },
    ]);

    lastAssistantTextRef.current = text;
  };

  const pushUserMessage = (text: string) => {
    if (!text?.trim()) return;

    setVoiceHistory((prev) => [
      ...prev,
      {
        from: "user",
        text,
        ts: Date.now(),
      },
    ]);
  };

  const sendRealtimeSystemUpdate = (text: string) => {
    try {
      if (!realtimeDcRef.current) return;
      if (realtimeDcRef.current.readyState !== "open") return;
      if (!realtimePcRef.current?.remoteDescription) return;

      realtimeDcRef.current.send(
        JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio", "text"],
            instructions: [
              voiceTexts.realtimeIntro,
              "هادشي تحديث جديد على الملف ديال العميل، خاصك تعتمد عليه فجوابك الجاي:",
              text,
              "جاوب دابا باختصار وبالدارجة المغربية وبالحروف العربية، وقل للعميل شنو الخطوة الجاية بالضبط.",
            ].join(" "),
          },
        })
      );
    } catch (error) {
      console.error("Error enviando actualización realtime:", error);
    }
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

    const alreadyExists = voiceHistory.some(
      (msg) => msg.from === "agent" && msg.text === voiceTexts.savedLeadReply
    );

    if (!alreadyExists) {
      pushAgentMessage(voiceTexts.savedLeadReply, false);
    }

    toast({
      title: ui.saveLeadTitle,
      description: ui.saveLeadDesc,
    });

    setTimeout(() => {
      if (
        realtimeDcRef.current &&
        realtimeDcRef.current.readyState === "open" &&
        realtimePcRef.current?.remoteDescription
      ) {
        sendMohamedSpokenMessage(voiceTexts.savedLeadReply);
      }
    }, 150);
  };

  const finalizeAssistantBuffer = () => {
    const text = assistantTextBufferRef.current.trim();
    if (!text) return;
    if (text === lastAssistantTextRef.current) {
      assistantTextBufferRef.current = "";
      return;
    }

    pushAgentMessage(text, false);
    assistantTextBufferRef.current = "";
  };

  const sendMohamedSpokenMessage = (message: string) => {
    if (!message.trim()) return;
    if (!realtimeDcRef.current || realtimeDcRef.current.readyState !== "open") return;
    if (!realtimePcRef.current || !realtimePcRef.current.remoteDescription) return;

    setWaitingMohamed(true);
    assistantTextBufferRef.current = "";

    realtimeDcRef.current.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `ابدأ أنت الكلام الآن مباشرة. لا تنتظر العميل. قل هذا الآن بصوت طبيعي وبشكل بشري: ${message}`,
            },
          ],
        },
      })
    );

    realtimeDcRef.current.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
        },
      })
    );
  };

  const kickoffMohamed = () => {
    setIsListening(true);
    setWaitingMohamed(true);
    setLastUserTranscript("");
    lastUserTranscriptRef.current = "";
    assistantTextBufferRef.current = "";

    const firstMessage = leadSaved
      ? voiceTexts.savedLeadReply
      : voiceTexts.initialVoice;

    sendMohamedSpokenMessage(firstMessage);
  };

  const stopListening = () => {
    try {
      realtimeDcRef.current?.close();
      realtimeDcRef.current = null;

      realtimePcRef.current?.close();
      realtimePcRef.current = null;

      if (realtimeLocalStreamRef.current) {
        realtimeLocalStreamRef.current.getTracks().forEach((track) => track.stop());
        realtimeLocalStreamRef.current = null;
      }

      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      }
    } catch (error) {
      console.error("Error deteniendo realtime:", error);
    } finally {
      setIsListening(false);
      setWaitingMohamed(false);
    }
  };

  const startListening = async () => {
    if (!leadSaved) {
      pushAgentMessage(voiceTexts.voiceBlocked, false);

      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
      return;
    }

    if (!voiceSupported) {
      toast({
        title: "Error",
        description: ui.micNotSupported,
        variant: "destructive",
      });
      return;
    }

    try {
      stopListening();
      assistantTextBufferRef.current = "";
      setWaitingMohamed(true);

      const sessionRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant: "mohamed",
        }),
      });

      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) {
        throw new Error(sessionData?.error || "Error creando sesión realtime");
      }

      const ephemeralKey = sessionData?.value || "";

      if (!ephemeralKey) {
        throw new Error("No llegó value desde realtime-session");
      }

      const pc = new RTCPeerConnection();
      realtimePcRef.current = pc;

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;

        if (remoteStream && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.playsInline = true;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1;

          const playPromise = remoteAudioRef.current.play();
          if (playPromise) {
            playPromise.catch((err) => {
              console.error("Error reproduciendo audio remoto Mohamed:", err);
            });
          }
        }
      };

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      realtimeLocalStreamRef.current = localStream;

      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }

      const dc = pc.createDataChannel("oai-events");
      realtimeDcRef.current = dc;

      dc.onopen = () => {
        shouldKickoffMohamedRef.current = true;
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          const userTranscript =
            msg?.transcript ||
            msg?.item?.transcript ||
            msg?.item?.content?.[0]?.transcript ||
            "";

          if (
            (msg.type === "conversation.item.input_audio_transcription.completed" ||
              msg.type === "input_audio_buffer.transcription.completed") &&
            typeof userTranscript === "string" &&
            userTranscript.trim()
          ) {
            const transcript = userTranscript.trim();

            if (transcript !== lastUserTranscriptRef.current) {
              lastUserTranscriptRef.current = transcript;
              setLastUserTranscript(transcript);
              pushUserMessage(transcript);
            }
          }

          if (
            msg.type === "response.output_text.delta" &&
            typeof msg.delta === "string"
          ) {
            assistantTextBufferRef.current += msg.delta;
          }

          if (
            msg.type === "response.output_text.done" &&
            typeof msg.text === "string" &&
            msg.text.trim()
          ) {
            assistantTextBufferRef.current = msg.text.trim();
            finalizeAssistantBuffer();
          }

          if (msg.type === "response.done") {
            finalizeAssistantBuffer();
            setWaitingMohamed(false);
          }

          if (msg.type === "response.created") {
            setWaitingMohamed(true);
          }
        } catch (err) {
          console.error("Realtime event parse error:", err);
        }
      };

      dc.onerror = (err) => {
        console.error("Realtime data channel error:", err);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(errText || "Error negociando WebRTC con OpenAI");
      }

      const answerSdp = await sdpRes.text();

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      if (shouldKickoffMohamedRef.current) {
        shouldKickoffMohamedRef.current = false;
        setTimeout(() => {
          kickoffMohamed();
        }, 150);
      }
    } catch (error: any) {
      console.error("Error iniciando realtime Mohamed:", error);
      stopListening();

      toast({
        title: "Error realtime",
        description: error?.message || voiceTexts.realtimeError,
        variant: "destructive",
      });
    }
  };

  const getBestDocMatch = (
    result: VerifyDocumentResult,
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
      result?.stay_proof_reason || "",
      lowerFileName,
    ]
      .join(" ")
      .toLowerCase();

    const includesAny = (words: string[]) =>
      words.some((word) => combinedText.includes(word));

    const findIdentityDoc = () =>
      currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          (normalizeDocType(doc.expectedType) === "passport" ||
            normalizeDocType(doc.expectedType) === "nie" ||
            normalizeDocType(doc.expectedType) === "tie" ||
            doc.nombre.toLowerCase().includes("pasaporte o nie") ||
            doc.nombre.toLowerCase().includes("pasaporte") ||
            doc.nombre.toLowerCase().includes("passport") ||
            doc.nombre.toLowerCase().includes("nie vigente"))
      ) ||
      currentDocs.find(
        (doc) =>
          normalizeDocType(doc.expectedType) === "passport" ||
          normalizeDocType(doc.expectedType) === "nie" ||
          normalizeDocType(doc.expectedType) === "tie" ||
          doc.nombre.toLowerCase().includes("pasaporte o nie") ||
          doc.nombre.toLowerCase().includes("pasaporte") ||
          doc.nombre.toLowerCase().includes("passport") ||
          doc.nombre.toLowerCase().includes("nie vigente")
      ) ||
      null;

    const findStayProofDoc = () =>
      currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          (normalizeDocType(doc.expectedType) === "empadronamiento" ||
            normalizeDocType(doc.expectedType) === "stay_proof" ||
            doc.nombre.toLowerCase().includes("empadronamiento") ||
            doc.nombre.toLowerCase().includes("prueba de permanencia") ||
            doc.nombre.toLowerCase().includes("prueba permanencia") ||
            doc.nombre.toLowerCase().includes("padron") ||
            doc.nombre.toLowerCase().includes("padrón"))
      ) ||
      currentDocs.find(
        (doc) =>
          normalizeDocType(doc.expectedType) === "empadronamiento" ||
          normalizeDocType(doc.expectedType) === "stay_proof" ||
          doc.nombre.toLowerCase().includes("empadronamiento") ||
          doc.nombre.toLowerCase().includes("prueba de permanencia") ||
          doc.nombre.toLowerCase().includes("prueba permanencia") ||
          doc.nombre.toLowerCase().includes("padron") ||
          doc.nombre.toLowerCase().includes("padrón")
      ) ||
      null;

    const findCriminalDoc = () =>
      currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          (normalizeDocType(doc.expectedType) === "criminal_record" ||
            doc.nombre.toLowerCase().includes("antecedentes") ||
            doc.nombre.toLowerCase().includes("penales"))
      ) ||
      currentDocs.find(
        (doc) =>
          normalizeDocType(doc.expectedType) === "criminal_record" ||
          doc.nombre.toLowerCase().includes("antecedentes") ||
          doc.nombre.toLowerCase().includes("penales")
      ) ||
      null;

    if (
      detectedType === "passport" ||
      detectedType === "nie" ||
      detectedType === "tie"
    ) {
      const identityDoc = findIdentityDoc();
      if (identityDoc) return identityDoc;
    }

    if (
      detectedType === "empadronamiento" ||
      detectedType === "stay_proof" ||
      result?.recommended_bucket === "stay_proof" ||
      result?.is_stay_proof === true
    ) {
      const stayProofDoc = findStayProofDoc();
      if (stayProofDoc) return stayProofDoc;
    }

    if (detectedType === "criminal_record") {
      const criminalDoc = findCriminalDoc();
      if (criminalDoc) return criminalDoc;
    }

    if (
      includesAny([
        "passport",
        "pasaporte",
        "passeport",
        "documento de viaje",
        "travel document",
        "identity card",
        "documento identidad",
        "documento de identidad",
        "nie",
        "tie",
        "tarjeta de identidad",
        "tarjeta de residencia",
      ])
    ) {
      const identityDoc = findIdentityDoc();
      if (identityDoc) return identityDoc;
    }

    if (
      includesAny([
        "empadronamiento",
        "padron",
        "padrón",
        "volante",
        "certificado de empadronamiento",
        "prueba de permanencia",
        "prueba permanencia",
        "justificante",
        "resguardo",
        "cita médica",
        "ticket",
        "factura",
        "nomina",
        "nómina",
        "receta",
        "stay proof",
      ])
    ) {
      const stayProofDoc = findStayProofDoc();
      if (stayProofDoc) return stayProofDoc;
    }

    if (
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
      const criminalDoc = findCriminalDoc();
      if (criminalDoc) return criminalDoc;
    }

    if (includesAny(["formulario", "official form", "solicitud", "modelo ex"])) {
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
      if (
        lowerFileName.includes("padron") ||
        lowerFileName.includes("padrón") ||
        lowerFileName.includes("empadronamiento")
      ) {
        const stayProofDoc = findStayProofDoc();
        if (stayProofDoc) return stayProofDoc;
      }

      if (
        lowerFileName.includes("pasaporte") ||
        lowerFileName.includes("passport") ||
        lowerFileName.includes("nie") ||
        lowerFileName.includes("tie")
      ) {
        const identityDoc = findIdentityDoc();
        if (identityDoc) return identityDoc;
      }

      if (
        lowerFileName.includes("penales") ||
        lowerFileName.includes("antecedentes")
      ) {
        const criminalDoc = findCriminalDoc();
        if (criminalDoc) return criminalDoc;
      }
    }

    const firstMissing = currentDocs.find((doc) => doc.estado === "missing");
    if (firstMissing) return firstMissing;

    const firstWarn = currentDocs.find((doc) => doc.estado === "warn");
    if (firstWarn) return firstWarn;

    return null;
  };

  const maybeSendCompletionMessage = (nextDocs: StoredDocItem[]) => {
    const nextIdentityDocs = nextDocs.filter((doc) => {
      const expected = normalizeDocType(doc.expectedType);
      const detected = normalizeDocType(doc.detectedType);
      const name = doc.nombre.toLowerCase();

      return (
        expected === "passport" ||
        expected === "nie" ||
        expected === "tie" ||
        detected === "passport" ||
        detected === "nie" ||
        detected === "tie" ||
        name.includes("pasaporte") ||
        name.includes("passport") ||
        name.includes("nie")
      );
    });

    const nextStayProofDocs = nextDocs.filter((doc) => {
      const expected = normalizeDocType(doc.expectedType);
      const detected = normalizeDocType(doc.detectedType);
      const name = doc.nombre.toLowerCase();
      const note = (doc.note || "").toLowerCase();

      return (
        expected === "empadronamiento" ||
        expected === "stay_proof" ||
        detected === "empadronamiento" ||
        detected === "stay_proof" ||
        name.includes("empadronamiento") ||
        name.includes("padron") ||
        name.includes("padrón") ||
        name.includes("prueba de permanencia") ||
        name.includes("prueba permanencia") ||
        note.includes("empadronamiento") ||
        note.includes("stay proof") ||
        note.includes("prueba de permanencia")
      );
    });

    const readyNow =
      leadSaved &&
      nextStayProofDocs.some((doc) => doc.estado === "ok") &&
      nextIdentityDocs.some((doc) => doc.estado === "ok");

    if (readyNow && !completionMessageSent) {
      pushAgentMessage(voiceTexts.mohamedFinal, false);
      setCompletionMessageSent(true);

      setTimeout(() => {
        if (
          realtimeDcRef.current &&
          realtimeDcRef.current.readyState === "open" &&
          realtimePcRef.current?.remoteDescription
        ) {
          sendMohamedSpokenMessage(voiceTexts.mohamedFinal);
        }
      }, 150);
    }
  };

  const handleGeneralUpload = async () => {
    if (!leadSaved) {
      pushAgentMessage(voiceTexts.voiceBlocked, false);

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
        if (!files.length) return;

        setGeneralUploading(true);

        try {
          for (const file of files) {
            try {
              const currentDocs = [...docs];

              const result = await verifyDocument({
                file,
                expectedDocumentType: "auto",
                lang: "darija",
              });

              const matchedDoc = getBestDocMatch(
                result as VerifyDocumentResult,
                currentDocs,
                file.name
              );

              if (!matchedDoc) {
                pushAgentMessage(voiceTexts.uploadUnknown, false);

                sendRealtimeSystemUpdate(
                  [
                    `توصلنا بوثيقة سميتها: ${file.name}.`,
                    `النوع المتشاف: ${result.document_type || "غير واضح"}.`,
                    `الخلاصة: ${result.summary || "ما كايناش خلاصة واضحة"}.`,
                    "الوثيقة ما تقدرش ترتابط دابا مع حتى خانة واضحة فالملف.",
                    "قول للعميل شنو خاصو يصيفط من بعد بشكل واضح.",
                  ].join(" ")
                );

                toast({
                  title: ui.uploadErrorTitle,
                  description: result.summary || ui.uploadErrorDesc,
                  variant: "destructive",
                });

                continue;
              }

              const isWarn =
                result.status === "invalid" ||
                result.match_expected_type === false;

              const nextStatus: DocStatus = isWarn ? "warn" : "ok";

              const updatedDocs = currentDocs.map((doc) =>
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

              setDocs(updatedDocs);

              const matchedName = matchedDoc.nombre.toLowerCase();

              let localReply = voiceTexts.uploadOk;

              if (isWarn) {
                localReply = voiceTexts.uploadWarn;
                pushAgentMessage(localReply, false);
              } else if (
                matchedName.includes("pasaporte") ||
                matchedName.includes("nie") ||
                matchedName.includes("passport")
              ) {
                localReply = voiceTexts.passportVerified;
                pushAgentMessage(localReply, false);
              } else {
                pushAgentMessage(localReply, false);
              }

              const progressSummary = updatedDocs
                .map((doc) => `${doc.nombre}: ${doc.estado}`)
                .join(" | ");

              sendRealtimeSystemUpdate(
                [
                  `توصلنا بوثيقة جديدة من العميل.`,
                  `اسم الوثيقة: ${file.name}.`,
                  `ترابطات مع هاد الخانة: ${matchedDoc.nombre}.`,
                  `النوع المتشاف: ${result.document_type || "غير واضح"}.`,
                  `الحالة: ${nextStatus === "ok" ? "مقبولة مزيان" : "خاصها مراجعة"}.`,
                  `الخلاصة ديال الفحص: ${result.summary || "ما كايناش خلاصة مفصلة"}.`,
                  `واش كتصلح للتسوية 2026: ${
                    result.usable_for_regularizacion_2026
                      ? "نعم"
                      : "لا أو مازال غير واضح"
                  }.`,
                  `الملف دابا فيه هاد الحالة: ${progressSummary}.`,
                  "اعتمد على هاد المعلومات وجاوب العميل على الوثيقة اللي صيفط، وقول ليه شنو الخطوة الجاية.",
                ].join(" ")
              );

              toast({
                title: ui.uploadSuccessTitle,
                description: result.summary || ui.uploadSuccessDesc,
              });

              maybeSendCompletionMessage(updatedDocs);
            } catch (err: any) {
              console.error(err);

              toast({
                title: ui.uploadErrorTitle,
                description: err?.message || ui.uploadErrorDesc,
                variant: "destructive",
              });

              sendRealtimeSystemUpdate(
                [
                  `وقع مشكل فقراءة الوثيقة اللي سميتها ${file.name}.`,
                  `التفاصيل: ${err?.message || "خطأ غير معروف"}.`,
                  "قول للعميل يعاود يصيفط الوثيقة بشكل أوضح أو بصيغة أخرى.",
                ].join(" ")
              );
            }
          }
        } finally {
          setGeneralUploading(false);
        }
      };

      input.click();
    } catch (error: any) {
      setGeneralUploading(false);

      toast({
        title: "Error",
        description: error?.message || "Error inesperado",
        variant: "destructive",
      });
    }
  };

  const goToSara = () => {
    window.location.href = "/buscar-citas";
  };

  const latestAgentMessage =
    [...voiceHistory].reverse().find((msg) => msg.from === "agent")?.text ||
    voiceTexts.initialVoice;

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
            <p className="text-xs text-muted-foreground">{currentProcedure.name}</p>
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
                <span className="text-xs font-medium text-white">{ui.online}</span>
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
                <p className="text-white font-bold text-sm drop-shadow-lg">Mohamed</p>
                <p className="text-white/70 text-[11px] drop-shadow-lg">{ui.role}</p>
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
                  <p className="text-[11px] text-white/50 mb-1">{ui.latestReply}</p>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white/90 leading-relaxed">
                    {latestAgentMessage}
                  </div>
                </div>

                {lastUserTranscript ? (
                  <div>
                    <p className="text-[11px] text-white/50 mb-1">{ui.yourVoice}</p>
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
                    <p className="text-sm font-bold text-slate-800">{ui.formTitle}</p>
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
                      {progressOk}/{progressTotal}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#003b82] rounded-full transition-all"
                      style={{
                        width: `${
                          progressTotal > 0 ? (progressOk / progressTotal) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {progressCards.map((doc) => (
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
                          {getStatusLabel(
                            doc.estado,
                            ui.docStatusDone,
                            ui.docStatusReview,
                            ui.docStatusMissing
                          )}
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
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
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
