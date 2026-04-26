import { useEffect, useMemo, useRef, useState } from "react";
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
import { supabase } from "@/lib/supabaseClient";

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
  uploadedAt?: string;
  storagePath?: string;
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

type UserFormRow = {
  id: string;
  user_id: string;
  case_id: string | null;
  form_type: string;
  title: string | null;
  form_data: Record<string, any> | null;
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
    uploadedAt: "",
    storagePath: "",
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

function slugifyFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
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
  const [savingForm, setSavingForm] = useState(false);
  const [waitingForDocument, setWaitingForDocument] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [formConfirmed, setFormConfirmed] = useState(false);
  const [pendingAutomationPrompt, setPendingAutomationPrompt] = useState("");

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
  const dcOpenedRef = useRef(false);
  const introAlreadySentRef = useRef(false);
  const pendingAutomationPromptRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const assistantBusyRef = useRef(false);

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as
    | "darija"
    | "es"
    | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  // Eliminado el return null para evitar romper el renderizado si se pega mal

  const voiceTexts = useMemo(
    () => ({
      initialVoice:
        "السلام عليكم، أنا محمد. غادي نعاونك خطوة بخطوة باش نراجع الملف ديالك. عمر ليا الفورمولار الأول، ومن بعد نكمل معاك الهدرة.",
      voiceBlocked:
        "عافاك عمر ليا الفورمولار الأول ومن بعد ضغط على الميكروفون باش نكمل معاك.",
      savedLeadReply:
        "مزيان. المعطيات ديالك تحفظات فالنظام. دابا نكمل معاك ونسولك على الوثائق خطوة بخطوة.",
      passportVerified:
        "مزيان. راجعت وثيقة الهوية ديالك. الاسم والبيانات باينين مزيان. دابا نكملو للخطوة اللي من بعدها.",
      stayProofVerified:
        "مزيان. راجعت بروفات السكن أو البقاء. هادشي كيعطينا أساس مزيان. دابا نشوفو شنو خاص من بعد.",
      uploadWarn:
        "توصلت بالوثيقة، ولكن خاصها شوية مراجعة أو نسخة أوضح.",
      uploadUnknown:
        "توصلت بالوثيقة، ولكن مازال خاصني نربطها مزيان مع الملف. صيفط ليا الوثيقة اللي طلبت منك بشكل واضح.",
      mohamedFinal:
        "مزيان. كلشي واجد ومراجع. دابا غادي نجهزو ليك الملف النهائي باش يتبعث ليك فـ واتساب.",
      realtimeError: "وقع مشكل فالاتصال المباشر مع محمد. عاود حاول من بعد.",
    }),
    []
  );

  const ui = useMemo(() => {
    if (safeLang === "darija") {
      return {
        online: "متصل الآن",
        role: "مختص فالهجرة",
        voiceButton: "تكلم مع محمد",
        stopButton: "وقف الميكروفون",
        saveLeadButton: savingForm ? "كيتحفظ..." : "حفظ المعطيات والمتابعة مع محمد",
        saveLeadTitle: "تحفظات المعطيات",
        saveLeadDesc: "محمد يقدر دابا يبدا معاك بالصوت.",
        formTitle: "لوحة رسمية مدمجة",
        formDesc:
          "عمر المعطيات الأساسية باش محمد يبدا يراجع الملف ديالك بالصوت.",
        uploadGeneral: generalUploading ? "كيترفع..." : "رفع الوثائق",
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

    return {
      online: "En línea",
      role: "Especialista en Extranjería",
      voiceButton: "Hablar con Mohamed",
      stopButton: "Parar micrófono",
      saveLeadButton: savingForm ? "Guardando..." : "Guardar datos y continuar con Mohamed",
      saveLeadTitle: "Datos guardados",
      saveLeadDesc: "Mohamed ya puede empezar contigo por voz.",
      formTitle: "Panel oficial integrado",
      formDesc:
        "Rellena los datos básicos para que Mohamed empiece a revisar tu caso por voz.",
      uploadGeneral: generalUploading ? "Subiendo..." : "Subir documentos",
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
  }, [safeLang, savingForm, generalUploading]);

  const [docs, setDocs] = useState<StoredDocItem[]>(
    buildInitialDocs(selectedSituacion)
  );

  const historyStorageKey = useMemo(
    () => `gestoriacitaia_mohamed_voice_history_${selectedSituacion}`,
    [selectedSituacion]
  );
  const formStorageKey = useMemo(
    () => `gestoriacitaia_mohamed_form_${selectedSituacion}`,
    [selectedSituacion]
  );
  const leadSavedStorageKey = useMemo(
    () => `gestoriacitaia_mohamed_lead_saved_${selectedSituacion}`,
    [selectedSituacion]
  );
  const docsStorageKey = useMemo(
    () => `gestoriacitaia_mohamed_docs_${selectedSituacion}`,
    [selectedSituacion]
  );

  const leadFormReady =
    !!leadForm.nombre.trim() &&
    !!leadForm.telefono.trim() &&
    !!leadForm.ciudad.trim();

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      typeof window.RTCPeerConnection !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;

    setVoiceSupported(Boolean(supported));
  }, []);

  useEffect(() => {
    let active = true;

    const loadAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;
        setCurrentUserId(session?.user?.id || "");
        setAuthChecked(true);
      } catch (error) {
        console.error("Error cargando sesión:", error);
        if (!active) return;
        setCurrentUserId("");
        setAuthChecked(true);
      }
    };

    loadAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || "");
      setAuthChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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
      const saved = rawLeadSaved === "true";
      setLeadSaved(saved);
      setFormConfirmed(saved);

      const rawDocs = localStorage.getItem(docsStorageKey);
      if (rawDocs) {
        const parsedDocs = JSON.parse(rawDocs) as StoredDocItem[];
        if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
          setDocs(parsedDocs);
        }
      }
    } catch (error) {
      console.error("Error cargando estado de Mohamed:", error);
    }
  }, [formStorageKey, leadSavedStorageKey, docsStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(formStorageKey, JSON.stringify(leadForm));
    } catch (error) {
      console.error("Error guardando formulario de Mohamed:", error);
    }
  }, [leadForm, formStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        leadSavedStorageKey,
        leadSaved || formConfirmed ? "true" : "false"
      );
    } catch (error) {
      console.error("Error guardando leadSaved:", error);
    }
  }, [leadSaved, formConfirmed, leadSavedStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(docsStorageKey, JSON.stringify(docs));
    } catch (error) {
      console.error("Error guardando docs:", error);
    }
  }, [docs, docsStorageKey]);

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
            (m) => m.from === "agent" && m.text.includes("المعطيات ديالك تحفظات")
          );

          setCompletionMessageSent(completionAlreadySent);
          setLeadSaved((prev) => prev || leadAlreadySaved);
          setFormConfirmed((prev) => prev || leadAlreadySaved);
          return;
        }
      }

      setVoiceHistory([
        {
          from: "agent",
          text: voiceTexts.initialVoice,
          ts: Date.now(),
        },
      ]);
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
  }, [historyStorageKey, voiceTexts.initialVoice, voiceTexts.mohamedFinal]);

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
      note.includes("empadronamiento") ||
      note.includes("stay proof") ||
      note.includes("prueba de permanencia")
    );
  });

  const formCompletedStatus: DocStatus =
    leadSaved || formConfirmed ? "ok" : "missing";

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
    { id: "form_completed", nombre: ui.docStepForm, estado: formCompletedStatus },
    { id: "stay_proof", nombre: ui.docStepStayProof, estado: stayProofStatus },
    { id: "identity_document", nombre: ui.docStepIdentity, estado: identityStatus },
    { id: "final_file", nombre: ui.docStepFinal, estado: finalFileStatus },
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

  const pushAgentMessage = (text: string) => {
    if (!text?.trim()) return;
    setVoiceHistory((prev) => [
      ...prev,
      { from: "agent", text, ts: Date.now() },
    ]);
    lastAssistantTextRef.current = text;
  };

  const pushUserMessage = (text: string) => {
    if (!text?.trim()) return;
    setVoiceHistory((prev) => [
      ...prev,
      { from: "user", text, ts: Date.now() },
    ]);
  };

  const buildSavedFormSpeech = () => {
    return "مزيان. المعطيات ديالك تحفظات فالنظام. دابا غادي نكمل معاك ونسولك على الوثائق خطوة بخطوة.";
  };

  const buildDocSpeech = (
    matchedDocName: string,
    result: VerifyDocumentResult,
    nextStatus: DocStatus
  ) => {
    const parts: string[] = [];
    const docName = matchedDocName || "الوثيقة";
    parts.push(`مزيان. توصلت بـ ${docName}.`);

    if (result.document_type === "passport") {
      parts.push("هاد الوثيقة هي الباسبور.");
    } else if (result.document_type === "nie") {
      parts.push("هاد الوثيقة هي NIE.");
    } else if (result.document_type === "tie") {
      parts.push("هاد الوثيقة هي TIE.");
    } else if (result.document_type === "empadronamiento") {
      parts.push("هاد الوثيقة هي empadronamiento.");
    } else if (result.document_type === "stay_proof") {
      parts.push("هاد الوثيقة كتنفع كبرهان ديال البقاء.");
    }

    if (result.full_name) {
      parts.push(`الاسم اللي باين هو ${result.full_name}.`);
    }
    if (result.birth_date) {
      parts.push(`تاريخ الازدياد الباين هو ${result.birth_date}.`);
    }
    if (result.passport_number) {
      parts.push(`رقم الباسبور الباين هو ${result.passport_number}.`);
    } else if (result.document_number) {
      parts.push(`الرقم الباين هو ${result.document_number}.`);
    }

    if (nextStatus === "ok") {
      parts.push("الوثيقة باينة مزيان ومقبولة.");
    } else {
      parts.push("الوثيقة توصلت بها ولكن خاصها مراجعة ولا نسخة أوضح.");
    }

    const lowerName = (matchedDocName || "").toLowerCase();
    if (
      lowerName.includes("pasaporte") ||
      lowerName.includes("passport") ||
      lowerName.includes("nie")
    ) {
      parts.push("دابا صيفط ليا بروفات ديال 5 شهور إلا باقي ما صيفطتيهمش.");
    } else if (
      lowerName.includes("empadronamiento") ||
      lowerName.includes("padron") ||
      lowerName.includes("padrón") ||
      lowerName.includes("prueba de permanencia")
    ) {
      parts.push("دابا صيفط ليا الباسبور ولا NIE إلا باقي.");
    } else {
      parts.push("دابا غادي نطلب منك الوثيقة اللي من بعدها.");
    }

    return parts.join(" ");
  };

  const finalizeAssistantBuffer = () => {
    const text = assistantTextBufferRef.current.trim();
    if (!text) return;
    assistantTextBufferRef.current = "";
    if (text === "..." || text === "…") return;
    if (text === lastAssistantTextRef.current) return;
    pushAgentMessage(text);

    const lower = text.toLowerCase();
    const asksForDocument =
      lower.includes("صيفط") ||
      lower.includes("الوثيقة") ||
      lower.includes("الباسبور") ||
      lower.includes("passport") ||
      lower.includes("nie") ||
      lower.includes("pdf") ||
      lower.includes("empadronamiento") ||
      lower.includes("padrón") ||
      lower.includes("padron") ||
      lower.includes("pruebas") ||
      lower.includes("بروفات");

    setWaitingForDocument(asksForDocument);
  };

  const saveFullStateToSupabase = async (nextDocs?: StoredDocItem[]) => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      throw new Error("No hay usuario conectado en Supabase");
    }

    const docsToSave = nextDocs || docs;

    const payload = {
      applicant: {
        nombre: leadForm.nombre || "",
        telefono: leadForm.telefono || "",
        nie_pasaporte: leadForm.niePasaporte || "",
        ciudad: leadForm.ciudad || "",
        nacionalidad: leadForm.nacionalidad || "",
        fecha_llegada: leadForm.fechaLlegada || "",
        cumple_5_meses: leadForm.cumple5Meses || "",
        asilo: leadForm.asilo || "",
        penales: leadForm.penales || "",
      },
      procedure: {
        key: selectedSituacion,
        name: currentProcedure?.name || "",
      },
      documents: docsToSave,
      progress: {
        formCompletedStatus:
          leadSaved || formConfirmed || leadFormReady ? "ok" : "missing",
        stayProofStatus:
          docsToSave.some(
            (doc) =>
              (normalizeDocType(doc.expectedType) === "empadronamiento" ||
                normalizeDocType(doc.expectedType) === "stay_proof") &&
              doc.estado === "ok"
          )
            ? "ok"
            : "missing",
        identityStatus:
          docsToSave.some(
            (doc) =>
              (normalizeDocType(doc.expectedType) === "passport" ||
                normalizeDocType(doc.expectedType) === "nie" ||
                normalizeDocType(doc.expectedType) === "tie") &&
              doc.estado === "ok"
          )
            ? "ok"
            : "missing",
      },
      updated_at: new Date().toISOString(),
    };

    const { data: existingForm } = await supabase
      .from("user_forms")
      .select("id")
      .eq("user_id", user.id)
      .eq("form_type", "regularizacion_2026")
      .limit(1)
      .maybeSingle<UserFormRow>();

    const rowData = {
      user_id: user.id,
      case_id: null,
      form_type: "regularizacion_2026",
      title: "Formulario Mohamed Regularización 2026",
      form_data: payload,
      status: "draft",
      updated_at: new Date().toISOString(),
    };

    if (existingForm?.id) {
      const { error: updateError } = await supabase
        .from("user_forms")
        .update(rowData)
        .eq("id", existingForm.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase
        .from("user_forms")
        .insert(rowData);
      if (insertError) throw new Error(insertError.message);
    }

    return user.id;
  };

  const askMohamedToSpeak = async (instruction: string) => {
    try {
      if (!realtimeDcRef.current) return false;
      if (realtimeDcRef.current.readyState !== "open") return false;

      setWaitingMohamed(true);
      assistantTextBufferRef.current = "";

      realtimeDcRef.current.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: instruction }],
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

      return true;
    } catch (error) {
      console.error("Error pidiendo respuesta realtime:", error);
      return false;
    }
  };

  const flushPendingAutomation = async (retries = 0) => {
    const prompt = pendingAutomationPromptRef.current;
    if (!prompt) return;
    if (!realtimeDcRef.current) return;
    if (realtimeDcRef.current.readyState !== "open") return;

    if (assistantBusyRef.current) {
      if (retries < 6) {
        setTimeout(() => flushPendingAutomation(retries + 1), 300);
      }
      return;
    }

    const ok = await askMohamedToSpeak(prompt);
    if (ok) {
      pendingAutomationPromptRef.current = null;
      setPendingAutomationPrompt("");
    }
  };

  const maybeSendIntroToMohamed = async () => {
    if (!dcOpenedRef.current) return;
    if (!realtimeDcRef.current) return;
    if (realtimeDcRef.current.readyState !== "open") return;
    if (introAlreadySentRef.current) return;
    if (pendingAutomationPromptRef.current) return;

    introAlreadySentRef.current = true;

    const intro =
      leadSaved || formConfirmed
        ? "ابدأ أنت الكلام الآن مباشرة. لا تنتظر العميل. قل له الآن: مزيان. توصلت بالمعطيات ديالك. دابا غادي نكمل معاك ونسولك على الوثائق خطوة بخطوة."
        : "ابدأ أنت الكلام الآن مباشرة. لا تنتظر العميل. قل له الآن: السلام عليكم، أنا محمد. غادي نعاونك خطوة بخطوة باش نراجع الملف ديالك. عمر ليا الفورمولار الأول، ومن بعد نكمل معاك الهدرة.";

    await askMohamedToSpeak(intro);
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
      dcOpenedRef.current = false;
      introAlreadySentRef.current = false;
      assistantBusyRef.current = false;
      isConnectingRef.current = false;
      setIsListening(false);
      setWaitingMohamed(false);
    }
  };

  const startListening = async () => {
    if (!voiceSupported) {
      toast({
        title: "Error",
        description: ui.micNotSupported,
        variant: "destructive",
      });
      return;
    }

    if (isConnectingRef.current) return;
    if (realtimeDcRef.current && realtimeDcRef.current.readyState === "open") return;

    try {
      isConnectingRef.current = true;
      setWaitingMohamed(true);

      const sessionRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant: "mohamed" }),
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
          remoteAudioRef.current.volume = muted ? 0 : 1;
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

      dc.onopen = async () => {
        dcOpenedRef.current = true;
        isConnectingRef.current = false;
        setIsListening(true);
        setWaitingMohamed(false);

        const capturedPending = pendingAutomationPromptRef.current;

        if (capturedPending) {
          pendingAutomationPromptRef.current = null;
          setPendingAutomationPrompt("");
          setTimeout(() => {
            void askMohamedToSpeak(capturedPending);
          }, 400);
          return;
        }

        setTimeout(() => {
          void maybeSendIntroToMohamed();
        }, 500);
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
          }

          if (msg.type === "response.created") {
            assistantBusyRef.current = true;
            setWaitingMohamed(true);
          }

          if (msg.type === "response.done") {
            assistantBusyRef.current = false;
            finalizeAssistantBuffer();
            setWaitingMohamed(false);
            pendingAutomationPromptRef.current = null;
            setPendingAutomationPrompt("");

            setTimeout(() => {
              void flushPendingAutomation();
            }, 150);
          }
        } catch (err) {
          console.error("Realtime event parse error:", err);
        }
      };

      dc.onerror = (err) => {
        console.error("Realtime data channel error:", err);
      };

      dc.onclose = () => {
        dcOpenedRef.current = false;
        isConnectingRef.current = false;
        assistantBusyRef.current = false;
        setIsListening(false);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

    } catch (err) {
      console.error("Error iniciando voz:", err);
      isConnectingRef.current = false;
      setWaitingMohamed(false);
    }
  };

  // --- LAS DOS FUNCIONES QUE ARREGLAN TU PROBLEMA ---

  // 1. Cuando se confirma el formulario
  const onFormSubmit = async () => {
    setSavingForm(true);
    try {
      await saveFullStateToSupabase();
      setLeadSaved(true);
      setFormConfirmed(true);
      
      const textoMohamed = "SISTEMA: El usuario ha guardado sus datos personales correctamente. Salúdale en Darija, dile que ya tienes sus datos y pídele ahora que suba las pruebas de permanencia de los últimos 5 meses.";
      
      if (isListening) {
        await askMohamedToSpeak(textoMohamed);
      } else {
        pendingAutomationPromptRef.current = textoMohamed;
        setPendingAutomationPrompt(textoMohamed);
      }
      
      toast({ title: ui.saveLeadTitle, description: ui.saveLeadDesc });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    } finally {
      setSavingForm(false);
    }
  };

  // 2. Cuando se sube un documento (TIENES QUE USAR ESTA EN TU INPUT FILE)
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeneralUploading(true);
    try {
      const result = await verifyDocument(file);
      if (result.success) {
        const nextDocs = docs.map(d => d.id === docId ? { ...d, estado: "ok" as DocStatus, archivo: file.name } : d);
        setDocs(nextDocs);
        await saveFullStateToSupabase(nextDocs);

        const speech = buildDocSpeech(file.name, result, "ok");
        const promptSist = `SISTEMA: El usuario ha subido el documento ${file.name} con éxito. Di esto: ${speech}`;
        
        if (isListening) {
          await askMohamedToSpeak(promptSist);
        } else {
          pendingAutomationPromptRef.current = promptSist;
          setPendingAutomationPrompt(promptSist);
        }
        toast({ title: ui.uploadSuccessTitle });
      }
    } catch (err) {
      toast({ title: ui.uploadErrorTitle, variant: "destructive" });
    } finally {
      setGeneralUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <audio ref={remoteAudioRef} style={{ display: "none" }} />
      {/* Tu código de interfaz aquí abajo... usa onFormSubmit y onFileChange */}
      <div className="p-8">
         <h1 className="text-2xl font-bold">{ui.formTitle}</h1>
         {/* Ejemplo de botón de formulario */}
         <button onClick={onFormSubmit} className="bg-blue-500 text-white p-2 mt-4 rounded">
            {ui.saveLeadButton}
         </button>

         {/* Ejemplo de inputs de documentos */}
         <div className="mt-8 space-y-4">
            {docs.map(doc => (
               <div key={doc.id} className="border p-4 rounded flex justify-between">
                  <span>{doc.nombre} - {doc.estado}</span>
                  <input type="file" onChange={(e) => onFileChange(e, doc.id)} />
               </div>
            ))}
         </div>
         
         <div className="mt-10">
            <button 
              onClick={isListening ? stopListening : startListening}
              className={`p-4 rounded-full ${isListening ? 'bg-red-500' : 'bg-green-500'} text-white`}
            >
              {isListening ? ui.stopButton : ui.voiceButton}
            </button>
         </div>
      </div>
    </div>
  );
}
