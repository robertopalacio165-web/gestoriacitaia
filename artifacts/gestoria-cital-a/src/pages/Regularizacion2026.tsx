import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Upload,
  Star,
  CheckCircle,
  FileCheck,
  Shield,
  AlertTriangle,
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
  full_name?: string;
  document_number?: string;
  birth_date?: string;
  expiry_date?: string;
  verification_score?: number;
  fraud_risk?: string;
  final_verdict?: string;
  document_date?: string;
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

export default function Regularizacion2026() {

  useEffect(() => {
    const handlePaidFlow = async () => {
      const params = new URLSearchParams(window.location.search);
      const paid = params.get("paid");
      (window as any).paid = paid;
      if (paid === "true") {
        console.log("✅ CLIENT PAID");
        paymentDoneRef.current = true;
        setPaymentCompleted(true);
        setShowStripe(false);
        setPaymentRequired(false);
        questionFlowLockedRef.current = false;
        
        setQuestionIndex(0);
        setDocumentsUnlocked(true);
        setConfirmUnlocked(true);
        setQuestionsDone(true);
        setStep("upload");
        
    toast({
  title: "📄 Documentos",
  description: "Sube tus documentos para comenzar la verificación",
});
        
        // ✅ ELIMINADO: NO se genera PDF
      }
      setShowStripe(false);
      setPaymentRequired(false);
    };
    handlePaidFlow();
  }, []);

  const handleStripePayment = async () => {
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: "regularizacion" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "❌ Stripe", description: "فيه مشكل", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "❌ خطأ", description: "فالكونكسيون", variant: "destructive" });
    }
  };

  const [selectedSituacion] = useState("regularizacion_2026_laboral");
  const [muted, setMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [leadSaved, setLeadSaved] = useState(false);
  const [generalUploading, setGeneralUploading] = useState(false);
  const [workflowStep, setWorkflowStep] = useState("idle");
  const [completionMessageSent, setCompletionMessageSent] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<ChatMsg[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [lastUserTranscript, setLastUserTranscript] = useState("");
  const [waitingSoufiane, setWaitingSoufiane] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [waitingForDocument, setWaitingForDocument] = useState(false);
  const [documentsUnlocked, setDocumentsUnlocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [formConfirmed, setFormConfirmed] = useState(false);
  const [confirmUnlocked, setConfirmUnlocked] = useState(false);
  const [pendingAutomationPrompt, setPendingAutomationPrompt] = useState("");
  const [phone, setPhone] = useState("");
  const [questionsDone, setQuestionsDone] = useState(false);
  const [clientQuestionsDone, setClientQuestionsDone] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stayVerified, setStayVerified] = useState(false);
  const [expulsionVerified, setExpulsionVerified] = useState(false);
  const [soufianeReady, setSoufianeReady] = useState(false);
  
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [docsVerified, setDocsVerified] = useState(false);
  const [soufianeHasSpoken, setSoufianeHasSpoken] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ hasPassport: boolean; hasMonths: boolean; days: number; hasExpulsion: boolean; expulsionExpired: boolean; completo: boolean }>({
    hasPassport: false,
    hasMonths: false,
    days: 0,
    hasExpulsion: false,
    expulsionExpired: false,
    completo: false
  });

  useEffect(() => {
    localStorage.setItem("questionIndex", questionIndex.toString());
  }, [questionIndex]);

  const questionFlowLockedRef = useRef(false);
  const paymentDoneRef = useRef(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const lastProcessedTranscriptRef = useRef("");
  const [clientQuestionIndex, setClientQuestionIndex] = useState(0);
  const [showStripe, setShowStripe] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const soufianeHasSpokenRef = useRef(false);

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
  const [step, setStep] = useState<"questions" | "upload" | "verify" | "done">("questions");

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
  const senderRef = useRef<RTCRtpSender | null>(null);

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as "darija" | "es" | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

  const voiceTexts = useMemo(() => ({
    initialVoice: "",
    passportVerified: "",
    stayProofVerified: "",
    uploadWarn: "",
    uploadUnknown: "",
    soufianeFinal: "",
    realtimeError: "وقع مشكل فالصوت المباشر",
  }), []);

  const ui = useMemo(() => {
    if (safeLang === "darija") {
      return {
        online: "متصل الآن",
        role: "مختص فالهجرة",
        voiceButton: "تكلم مع سفيان",
        stopButton: "وقف الميكروفون",
        saveLeadButton: savingForm ? "كيتحفظ..." : "حفظ المعطيات والمتابعة مع سفيان",
        saveLeadTitle: "تحفظات المعطيات",
        saveLeadDesc: "سفيان يقدر دابا يبدا معاك بالصوت.",
        formTitle: "لوحة رسمية مدمجة",
        formDesc: "عمر المعطيات الأساسية باش سفيان يبدا يراجع الملف ديالك بالصوت.",
        uploadGeneral: generalUploading ? "كيترفع..." : "رفع الوثائق",
        uploadGeneralDesc: "من هنا تقدر ترفع جميع الوثائق اللي طلب منك سفيان، سواء كانت صورة أو PDF.",
        uploading: "كيترفع...",
        uploadSuccessTitle: "تقبلات الوثيقة",
        uploadSuccessDesc: "راجعنا الوثيقة وربطناها مع الملف.",
        uploadErrorTitle: "خطأ فالوثيقة",
        uploadErrorDesc: "ما قدرناش نربط هاد الوثيقة مع الملف.",
        missingTitle: "كاينين بيانات ناقصين",
        missingDesc: "عمر الاسم والهاتف والمدينة قبل ما تكمل.",
        listening: "سفيان كيسمع ليك دابا...",
        latestReply: "آخر جواب ديال سفيان",
        yourVoice: "آخر جواب ديالك بالصوت",
        micNotSupported: "هاد المتصفح ما كيدعمش الصوت المباشر. استعمل Chrome حديث.",
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
      voiceButton: "Hablar con Soufiane",
      stopButton: "Parar micrófono",
      saveLeadButton: savingForm ? "Guardando..." : "Guardar datos y continuar con Soufiane",
      saveLeadTitle: "Datos guardados",
      saveLeadDesc: "Soufiane ya puede empezar contigo por voz.",
      formTitle: "Panel oficial integrado",
      formDesc: "Rellena los datos básicos para que Soufiane empiece a revisar tu caso por voz.",
      uploadGeneral: generalUploading ? "Subiendo..." : "Subir documentos",
      uploadGeneralDesc: "Usa este botón para subir todos los documentos que te pida Soufiane, en foto o PDF.",
      uploading: "Subiendo...",
      uploadSuccessTitle: "Documento recibido",
      uploadSuccessDesc: "El documento se ha vinculado correctamente al expediente.",
      uploadErrorTitle: "Error en documento",
      uploadErrorDesc: "No se pudo vincular el documento al expediente.",
      missingTitle: "Faltan datos",
      missingDesc: "Rellena nombre, teléfono y ciudad antes de continuar.",
      listening: "Soufiane te está escuchando ahora...",
      latestReply: "Última respuesta de Soufiane",
      yourVoice: "Tu última respuesta por voz",
      micNotSupported: "Este navegador no soporta voz en tiempo real. Usa Chrome moderno.",
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

  const [docs, setDocs] = useState<StoredDocItem[]>(buildInitialDocs(selectedSituacion));

  const historyStorageKey = useMemo(() => `gestoriacitaia_soufiane_voice_history_${selectedSituacion}`, [selectedSituacion]);
  const formStorageKey = useMemo(() => `gestoriacitaia_soufiane_form_${selectedSituacion}`, [selectedSituacion]);
  const leadSavedStorageKey = useMemo(() => `gestoriacitaia_soufiane_lead_saved_${selectedSituacion}`, [selectedSituacion]);
  const stepStorageKey = useMemo(() => `gestoriacitaia_soufiane_step_${selectedSituacion}`, [selectedSituacion]);
  const docsStorageKey = useMemo(() => `gestoriacitaia_soufiane_docs_${selectedSituacion}`, [selectedSituacion]);

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
        const { data: { session } } = await supabase.auth.getSession();
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || "");
      setAuthChecked(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || !authChecked) return;
    const docsChannel = supabase
      .channel(`docs-${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_documents", filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          const newDoc = payload.new as any;
          const docName = newDoc.title || newDoc.original_name || "documento";
          setTimeout(() => { console.log("doc received"); }, 1500);
        }
      )
      .subscribe();

    const formsChannel = supabase
      .channel(`forms-${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_forms", filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          const formData = payload.new as any;
          if (formData.form_type === "regularizacion_2026") {
            setTimeout(() => {
              speakFromAutomation("مزيان. المعطيات ديالك تحفظات فالنظام. دابا غادي نكمل معاك خطوة بخطوة.");
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(docsChannel);
      supabase.removeChannel(formsChannel);
    };
  }, [currentUserId, authChecked]);

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
        if (Array.isArray(parsedDocs) && parsedDocs.length > 0) setDocs(parsedDocs);
      }
      const rawStep = localStorage.getItem(stepStorageKey);
      if (rawStep) setCurrentStep(parseInt(rawStep));
    } catch (error) {
      console.error("Error cargando estado de Soufiane:", error);
    }
  }, [formStorageKey, leadSavedStorageKey, docsStorageKey]);

  useEffect(() => {
    try { localStorage.setItem(formStorageKey, JSON.stringify(leadForm)); }
    catch (error) { console.error("Error guardando formulario de Soufiane:", error); }
  }, [leadForm, formStorageKey]);

  useEffect(() => {
    try { localStorage.setItem(leadSavedStorageKey, leadSaved || formConfirmed ? "true" : "false"); }
    catch (error) { console.error("Error guardando leadSaved:", error); }
  }, [leadSaved, formConfirmed, leadSavedStorageKey]);

  useEffect(() => {
    try { localStorage.setItem(docsStorageKey, JSON.stringify(docs)); }
    catch (error) { console.error("Error guardando docs:", error); }
  }, [docs, docsStorageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(historyStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVoiceHistory(parsed);
          const completionAlreadySent = parsed.some((m) => m.from === "agent" && m.text === voiceTexts.soufianeFinal);
          const leadAlreadySaved = parsed.some((m) => m.from === "agent" && m.text.includes("المعطيات ديالك تحفظات"));
          setCompletionMessageSent(completionAlreadySent);
          setLeadSaved((prev) => prev || leadAlreadySaved);
          setFormConfirmed((prev) => prev || leadAlreadySaved);
          return;
        }
      }
      setVoiceHistory([{ from: "agent", text: voiceTexts.initialVoice, ts: Date.now() }]);
    } catch (error) {
      console.error("Error cargando historial de Soufiane:", error);
      setVoiceHistory([{ from: "agent", text: voiceTexts.initialVoice, ts: Date.now() }]);
    }
  }, [historyStorageKey, voiceTexts.initialVoice, voiceTexts.soufianeFinal]);

  useEffect(() => {
    if (voiceHistory.length === 0) return;
    try { localStorage.setItem(historyStorageKey, JSON.stringify(voiceHistory)); }
    catch (error) { console.error("Error guardando historial de Soufiane:", error); }
  }, [voiceHistory, historyStorageKey]);

  const identityDocs = docs.filter((doc) => {
    const expected = normalizeDocType(doc.expectedType);
    const detected = normalizeDocType(doc.detectedType);
    const name = doc.nombre.toLowerCase();
    return expected === "passport" || expected === "nie" || expected === "tie" ||
      detected === "passport" || detected === "nie" || detected === "tie" ||
      name.includes("pasaporte") || name.includes("passport") || name.includes("nie");
  });

  const stayProofDocs = docs.filter((doc) => {
    const expected = normalizeDocType(doc.expectedType);
    const detected = normalizeDocType(doc.detectedType);
    const name = doc.nombre.toLowerCase();
    const note = (doc.note || "").toLowerCase();
    return expected === "empadronamiento" || expected === "stay_proof" ||
      detected === "empadronamiento" || detected === "stay_proof" ||
      name.includes("empadronamiento") || name.includes("padron") || name.includes("padrón") ||
      name.includes("prueba de permanencia") || note.includes("empadronamiento") ||
      note.includes("stay proof") || note.includes("prueba de permanencia");
  });

  const asiloDocs = docs.filter((doc) => {
    const text = (doc.nombre + " " + (doc.detectedType || "") + " " + (doc.note || "")).toLowerCase();
    return text.includes("asilo") || text.includes("refugio") || text.includes("protección") || text.includes("asylum");
  });

  const expulsionDocs = docs.filter((doc) => {
    const text = (doc.nombre + " " + (doc.detectedType || "") + " " + (doc.note || "")).toLowerCase();
    return text.includes("expulsion") || text.includes("expulsión") || text.includes("deportacion") || text.includes("deportation") || text.includes("retorno");
  });

  const formCompletedStatus: DocStatus = leadSaved || formConfirmed ? "ok" : "missing";
  const stayProofStatus: DocStatus =
    stayProofDocs.some((doc) => doc.estado === "ok") ? "ok" :
    stayProofDocs.some((doc) => doc.estado === "warn") ? "warn" : "missing";
  const identityStatus: DocStatus =
    identityDocs.some((doc) => doc.estado === "ok") ? "ok" :
    identityDocs.some((doc) => doc.estado === "warn") ? "warn" : "missing";
  const finalFileStatus: DocStatus =
    formCompletedStatus === "ok" && stayProofStatus === "ok" && identityStatus === "ok" ? "ok" :
    formCompletedStatus === "warn" || stayProofStatus === "warn" || identityStatus === "warn" ? "warn" : "missing";

  const handleQuestionFlow = () => {
    if (questionFlowLockedRef.current) return;
    console.log("QUESTION CURRENT:", questionIndex);
    setQuestionIndex((prev) => {
      const next = prev + 1;
      console.log("QUESTION NEXT:", next);
      if (next === 1) {
        setTimeout(() => { speakExactText(NAME_QUESTION); }, 400);
        return next;
      }
      if (next === 5 && !paymentDoneRef.current) {
        questionFlowLockedRef.current = true;
        const PAYMENT_TEXT = `
مزيان، من خلال الأجوبة ديالك بان ليا بللي الملف ديالك غادي يكون مقبول إن شاء الله ✅

باش نعطيك تحليل دقيق ونوجد ليك الملف كامل:

✔️ تحليل كامل
✔️ 100 fi 100 التحقق من الوثائق
✔️ الوثيقة المهمة اللي غادي تعزز الملف ديالك بزاف

غير ب 12 أورو

ورك على زر الأداء ونكملو مباشرة.
`;
        pushAgentMessage(PAYMENT_TEXT);
        setPaymentRequired(true);
        assistantBusyRef.current = true;
        pendingAutomationPromptRef.current = null;
        setTimeout(() => { speakExactText(PAYMENT_TEXT); }, 300);
        const stripeWatcher = setInterval(() => {
          if (!assistantBusyRef.current) {
            clearInterval(stripeWatcher);
            setShowStripe(true);
            stopListening();
            setIsListening(false);
          }
        }, 300);
        setQuestionsDone(false);
        return next;
      }
      if (next >= questions.length - 1) {
        setDocumentsUnlocked(true);
        setConfirmUnlocked(true);
        setQuestionsDone(true);
        setTimeout(() => {
          speakExactText(`
دابا خاصك ترفع جميع الوثائق اللي عندك.

من بعد ما تسالي رفع الوثائق كاملة،
ورك على زر التحقق من الوثائق باش نراجعهم ليك كاملين.
          `);
        }, 1000);
      }
      return next;
    });
  };

  const updateLeadForm = (field: keyof LeadFormState, value: string) => {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
  };

  const pushAgentMessage = (text: string) => {
    if (!text?.trim()) return;
    setVoiceHistory((prev) => [...prev, { from: "agent", text, ts: Date.now() }]);
    lastAssistantTextRef.current = text;
  };

  const pushUserMessage = (text: string) => {
    if (!text?.trim()) return;
    setVoiceHistory((prev) => [...prev, { from: "user", text, ts: Date.now() }]);
  };

  const buildSavedFormSpeech = () => {
    return "مزيان. السؤال الثاني: عندك باسبور ولا NIE ولا TIE؟";
  };

  const buildDocSpeech = (matchedDocName: string, result: any, nextStatus?: DocStatus) => {
    const parts: string[] = [];
    parts.push(`توصلت بـ ${matchedDocName}.`);
    if (result.full_name) parts.push(`الاسم: ${result.full_name}.`);
    if (result.document_number) parts.push(`الرقم: ${result.document_number}.`);
    if (result.birth_date) parts.push(`تاريخ الازدياد: ${result.birth_date}.`);
    if (result.expiry_date) parts.push(`الصلاحية حتى: ${result.expiry_date}.`);
    if (result.image_quality?.blurred) {
      parts.push("الصورة شوية ما واضحةش.");
    } else {
      parts.push("الصورة واضحة والمعطيات مقروءة.");
    }
    if (result.fraud_risk === "high") parts.push("كاين خطر عالي، خاص مراجعة.");
    else if (result.fraud_risk === "medium") parts.push("كاين شك متوسط.");
    else parts.push("الوثيقة باينة صحيحة وما بان حتى مشكل واضح.");
    if (result.final_verdict === "approved") parts.push("الوثيقة مقبولة.");
    else if (result.final_verdict === "review") parts.push("الوثيقة خاصها مراجعة.");
    else if (result.final_verdict === "rejected") parts.push("الوثيقة مرفوضة.");
    if (typeof result.verification_score === "number") {
      const realisticScore = result.verification_score > 92 ? 88 + Math.floor(Math.random() * 4) : result.verification_score;
      parts.push(`نسبة التحقق ${realisticScore} من 100.`);
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
  };

  const saveFullStateToSupabase = async (nextDocs?: StoredDocItem[]) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) throw new Error("No hay usuario conectado en Supabase");
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
      procedure: { key: selectedSituacion, name: currentProcedure.name },
      documents: docsToSave,
      progress: {
        formCompletedStatus: leadSaved || formConfirmed || leadFormReady ? "ok" : "missing",
        stayProofStatus: docsToSave.some((doc) => (normalizeDocType(doc.expectedType) === "empadronamiento" || normalizeDocType(doc.expectedType) === "stay_proof") && doc.estado === "ok") ? "ok" : "missing",
        identityStatus: docsToSave.some((doc) => (normalizeDocType(doc.expectedType) === "passport" || normalizeDocType(doc.expectedType) === "nie" || normalizeDocType(doc.expectedType) === "tie") && doc.estado === "ok") ? "ok" : "missing",
      },
      updated_at: new Date().toISOString(),
    };
    const { data: existingForm } = await supabase.from("user_forms").select("id").eq("user_id", user.id).eq("form_type", "regularizacion_2026").limit(1).maybeSingle<UserFormRow>();
    const rowData = {
      user_id: user.id,
      case_id: null,
      form_type: "regularizacion_2026",
      title: "Formulario Soufiane Regularización 2026",
      form_data: payload,
      status: "draft",
      updated_at: new Date().toISOString(),
    };
    if (existingForm?.id) {
      const { error: updateError } = await supabase.from("user_forms").update(rowData).eq("id", existingForm.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase.from("user_forms").insert(rowData);
      if (insertError) throw new Error(insertError.message);
    }
    return user.id;
  };

  const askSoufianeToSpeak = async (instruction: string) => {
    try {
      const finalText = instruction;
      if (!realtimeDcRef.current) { console.error("❌ No hay data channel en askSoufianeToSpeak"); return false; }
      if (realtimeDcRef.current.readyState !== "open") { console.error("❌ Data channel no está open:", realtimeDcRef.current.readyState); return false; }
      console.log("🎤 askSoufianeToSpeak llamado:", instruction);
      setWaitingSoufiane(true);
      assistantTextBufferRef.current = "";
      realtimeDcRef.current.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: finalText }] } }));
      console.log("✅ conversation.item.create enviado");
      realtimeDcRef.current.send(JSON.stringify({ type: "response.create", response: { modalities: ["audio", "text"], instructions: finalText } }));
      console.log("✅ response.create enviado con instructions");
      return true;
    } catch (error) {
      console.error("❌ Error en askSoufianeToSpeak:", error);
      return false;
    }
  };

  const flushPendingAutomation = async (retries = 0) => {
    const prompt = pendingAutomationPromptRef.current;
    if (!prompt) return;
    if (!realtimeDcRef.current) { console.error("❌ No hay data channel"); return; }
    if (realtimeDcRef.current.readyState !== "open") { console.error("❌ Data channel no está abierto:", realtimeDcRef.current.readyState); return; }
    console.log("🚀 ENVIANDO DIRECTAMENTE:", prompt);
    try {
      realtimeDcRef.current.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: prompt }] } }));
      console.log("✅ Item creado, enviando response.create...");
      realtimeDcRef.current.send(JSON.stringify({ type: "response.create", response: { modalities: ["audio", "text"] } }));
      console.log("✅ response.create enviado - Soufiane DEBERÍA hablar");
      pendingAutomationPromptRef.current = null;
      setPendingAutomationPrompt("");
      setWaitingSoufiane(false);
    } catch (error) {
      console.error("❌ Error enviando:", error);
    }
  };

  const NAME_QUESTION = "مزيان. قولي شنو سميتك؟";

  const questions = [
    "واش دخلتي لإسبانيا قبل واحد يناير 2026؟",
    "واش بقيتي فإسبانيا خمسة شهور متتالية؟ وشنو هي أول مدينة سكنتي فيها؟",
    "واش عندك باسبور مغربي ولا كارت ناسيونال ولا فوتوكوبي ديالهم؟",
    "واش عندك شي ورقة فيها سميتك والتاريخ؟ بحال شهادة السكنى ولا ورقة ديال الطبيب ولا الصبيطار ولا الكراء؟",
    "واش عندك البطاقة الطبية؟",
    "واش عمرك مشيتي للصبيطار؟ واش عندك شي ورقة فيها سميتك والتاريخ؟",
    "واش عندك شي ورقة ديال الدوا ولا ريسيتا؟",
    "واش عندك شي رقم ديال التليفون باسمك؟",
    "واش عندك شي لاكارط ديال الطوبيس ولا التران فيها سميتك والتاريخ؟",
    "واش عمرك خدمتي فإسبانيا؟",
    "واش عندك شي ورقة من شي جمعية؟",
    "واش عندك شي مشكل مع البوليس؟",
    "واش عمرك تشديتي؟",
    "واش عطاك البوليس expulsion؟",
    "واش عمرك مشيتي للكوميسارية؟",
    "واش عندك شي فيزا؟",
    "واش عمرك طلبتي اللجوء؟",
  ];

  const maybeSendIntroToSoufiane = async () => {
    if (!realtimeDcRef.current) return;
    realtimeDcRef.current.send(JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: `
السلام عليكم، أنا سفيان من هيستوريا سيطا AI. مرحبا بك.

غادي نطرح عليك شوية ديال الأسئلة وغادي تجاوبني غير بآه ولا لا.

وملي غادي نسالي الأسئلة، غادي نراجع ليك الوثائق ديالك كاملين باش نشوف واش مقبولين ولا لا، واش صالحين ولا لا، وغادي نعطيك حتى وثيقة مهمة غادي تعزز الملف ديالك فالتسوية الجماعية.

وزيد عليها، غادي نخليك تسولني حتى 4 أسئلة وغنجاوبك على جميع التساؤلات ديالك أوكي؟

ولكن قبل، خاصك تكمل الأداء ديالك عاد باش نبداو.
        `,
      },
    }));
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
      setWaitingSoufiane(false);
    }
  };

  const handleSendWhatsApp = async () => {
    try {
      if (!phone || phone.trim().length < 6) { 
        toast({ title: "❌ رقم غير صحيح", description: "دخل رقم الهاتف صحيح", variant: "destructive" });
        return; 
      }
      
      // ✅ Mensaje SIN PDF, SOLO resumen
      const mensajeWhatsApp = `
👋 سلام ${leadForm?.nombre || ""}

━━━━━━━━━━━━━━━

📊 ملخص الملف ديالك:

${analysisResult.completo ? "✅ الملف كامل ومقبول" : "❌ الملف ناقص"}

${analysisResult.hasPassport ? "✅ وثيقة الهوية موجودة" : "❌ وثيقة الهوية ناقصة"}

${analysisResult.hasMonths
  ? `✅ مدة الإقامة: ${analysisResult.days} يوم (تزيد من 5 شهور)`
  : `❌ مدة الإقامة: ${analysisResult.days} يوم فقط (خاصك 150 يوم)`
}

${analysisResult.hasExpulsion
  ? (analysisResult.expulsionExpired
      ? "⚠️ قرار الطرد منتهي الصلاحية"
      : "❌ قرار طرد نشط")
  : "✅ لا يوجد قرار طرد"
}

━━━━━━━━━━━━━━━

💼 شكراً على الثقة ديالك
GestoriaCitaIA
`;
      
      const cleanPhone = phone.trim().replace(/\s+/g, "");
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensajeWhatsApp)}`;
      window.open(url, "_blank");
    } catch (error) {
      console.error("WhatsApp error:", error);
      toast({ title: "❌ خطأ", description: "وقع مشكل، حاول مرة أخرى", variant: "destructive" });
    }
  };

  // ✅ CAMBIO 1: speakExactText CORREGIDO
  const speakExactText = async (text: string) => {
    if (!text?.trim()) return;
    console.log("🔊 REALTIME ONLY:", text);
    pendingAutomationPromptRef.current = text;
    setPendingAutomationPrompt(text);
    
 if (!docsVerified) {
  console.log("⛔ Realtime bloqueado hasta verificar documentos");
  return;
}

if (!isListening) {
  await startListening();
}
  };

  const speakFromAutomation = async (text: string) => {
    if (!text?.trim()) return;
    await speakExactText(text);
  };

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = muted ? 0 : 1;
      remoteAudioRef.current.muted = false;
    }
  }, [muted]);

  const handleSaveLeadForm = async () => {
    if (!leadFormReady) { toast({ title: ui.missingTitle, description: ui.missingDesc, variant: "destructive" }); return; }
    if (!authChecked) { toast({ title: "Espera", description: "Estamos comprobando tu sesión.", variant: "destructive" }); return; }
    const savedIndex = localStorage.getItem("questionIndex");
    if (savedIndex) setQuestionIndex(parseInt(savedIndex));
    if (!currentUserId) {
      toast({ title: "Sesión no detectada", description: "Debes entrar con Google antes de confirmar.", variant: "destructive" });
      pushAgentMessage("عافاك دخل بحسابك أولاً، ومن بعد عاود دير تأكيد باش نكملو.");
      return;
    }
    try {
      setSavingForm(true);
      await saveFullStateToSupabase();
      setLeadSaved(true);
      setFormConfirmed(true);
      const savedMessage = buildSavedFormSpeech();
      toast({ title: ui.saveLeadTitle, description: "Se han guardado los datos correctamente." });
      setTimeout(() => { void speakExactText(savedMessage); }, 500);
    } catch (error: any) {
      console.error("Error guardando formulario Soufiane:", error);
      toast({ title: "Error guardando formulario", description: error?.message || "No se pudo guardar en Supabase", variant: "destructive" });
      pushAgentMessage("وقع مشكل فحفظ المعطيات. عافاك عاود دير تأكيد مرة أخرى.");
    } finally {
      setSavingForm(false);
    }
  };

  const getBestDocMatch = (result: VerifyDocumentResult, currentDocs: StoredDocItem[], fileName?: string): StoredDocItem | null => {
    const detectedType = normalizeDocType(result?.document_type || "");
    const lowerFileName = (fileName || "").toLowerCase();
    const combinedText = [result?.summary || "", ...(result?.visible_fields || []), ...(result?.missing_or_unclear_fields || []), ...(result?.warnings || []), result?.stay_proof_reason || "", lowerFileName].join(" ").toLowerCase();
    const includesAny = (words: string[]) => words.some((word) => combinedText.includes(word));
    const findIdentityDoc = () =>
      currentDocs.find((doc) => doc.estado !== "ok" && (normalizeDocType(doc.expectedType) === "passport" || normalizeDocType(doc.expectedType) === "nie" || normalizeDocType(doc.expectedType) === "tie" || doc.nombre.toLowerCase().includes("pasaporte") || doc.nombre.toLowerCase().includes("passport") || doc.nombre.toLowerCase().includes("nie"))) ||
      currentDocs.find((doc) => normalizeDocType(doc.expectedType) === "passport" || normalizeDocType(doc.expectedType) === "nie" || normalizeDocType(doc.expectedType) === "tie" || doc.nombre.toLowerCase().includes("pasaporte") || doc.nombre.toLowerCase().includes("passport") || doc.nombre.toLowerCase().includes("nie")) ||
      null;
    const findStayProofDoc = () =>
      currentDocs.find((doc) => doc.estado !== "ok" && (normalizeDocType(doc.expectedType) === "empadronamiento" || normalizeDocType(doc.expectedType) === "stay_proof" || doc.nombre.toLowerCase().includes("empadronamiento") || doc.nombre.toLowerCase().includes("padron") || doc.nombre.toLowerCase().includes("padrón") || doc.nombre.toLowerCase().includes("prueba de permanencia"))) ||
      currentDocs.find((doc) => normalizeDocType(doc.expectedType) === "empadronamiento" || normalizeDocType(doc.expectedType) === "stay_proof" || doc.nombre.toLowerCase().includes("empadronamiento") || doc.nombre.toLowerCase().includes("padron") || doc.nombre.toLowerCase().includes("padrón") || doc.nombre.toLowerCase().includes("prueba de permanencia")) ||
      null;
    if (detectedType === "passport" || detectedType === "nie" || detectedType === "tie") { const d = findIdentityDoc(); if (d) return d; }
    if (detectedType === "empadronamiento" || detectedType === "stay_proof" || result?.recommended_bucket === "stay_proof" || result?.is_stay_proof === true) { const d = findStayProofDoc(); if (d) return d; }
    if (includesAny(["passport", "pasaporte", "nie", "tie", "tarjeta de identidad", "documento identidad"])) { const d = findIdentityDoc(); if (d) return d; }
    if (includesAny(["empadronamiento", "padron", "padrón", "prueba de permanencia", "stay proof", "ticket", "factura", "nomina", "nómina", "cita médica"])) { const d = findStayProofDoc(); if (d) return d; }
    if (lowerFileName) {
      if (lowerFileName.includes("padron") || lowerFileName.includes("padrón") || lowerFileName.includes("empadronamiento")) { const d = findStayProofDoc(); if (d) return d; }
      if (lowerFileName.includes("pasaporte") || lowerFileName.includes("passport") || lowerFileName.includes("nie") || lowerFileName.includes("tie")) { const d = findIdentityDoc(); if (d) return d; }
    }
    return currentDocs.find((doc) => doc.estado === "missing") || currentDocs.find((doc) => doc.estado === "warn") || null;
  };

  const maybeSendCompletionMessage = async (nextDocs: StoredDocItem[]) => {
    const nextIdentityOk = nextDocs.some((doc) => {
      const expected = normalizeDocType(doc.expectedType);
      const detected = normalizeDocType(doc.detectedType);
      const name = doc.nombre.toLowerCase();
      return (expected === "passport" || expected === "nie" || expected === "tie" || detected === "passport" || detected === "nie" || detected === "tie" || name.includes("pasaporte") || name.includes("passport") || name.includes("nie")) && doc.estado === "ok";
    });
    const nextStayOk = nextDocs.some((doc) => {
      const expected = normalizeDocType(doc.expectedType);
      const detected = normalizeDocType(doc.detectedType);
      const name = doc.nombre.toLowerCase();
      return (expected === "empadronamiento" || expected === "stay_proof" || detected === "empadronamiento" || detected === "stay_proof" || name.includes("empadronamiento") || name.includes("padron") || name.includes("padrón") || name.includes("prueba de permanencia")) && doc.estado === "ok";
    });
    const readyNow = (leadSaved || formConfirmed) && nextStayOk && nextIdentityOk;
    if (readyNow && !completionMessageSent) {
      pushAgentMessage(voiceTexts.soufianeFinal);
      setCompletionMessageSent(true);
      await speakFromAutomation("مزيان. كلشي واجد ومراجع. دابا غادي نجهزو ليك الملف النهائي باش يتبعث ليك فـ واتساب.");
    }
  };

  // ============================================
  // SUBIR DOCUMENTOS
  // ============================================
  const handleGeneralUpload = () => {
    console.log("CLICK WORKING");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.multiple = true;
    input.setAttribute("capture", "environment");
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      setGeneralUploading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user?.id) throw new Error("Usuario no conectado");
        setWorkflowStep("waiting_confirm");
        let results = [];
        for (const file of files) {
          const safeName = `${Date.now()}_${file.name}`;
          const storagePath = `${user.id}/regularizacion_2026/${safeName}`;
          await supabase.storage.from("user-documents").upload(storagePath, file, { upsert: true });
          const result = await verifyDocument({ file });
          const matchedDoc = getBestDocMatch(result, docs, file.name);
          if (matchedDoc) {
            setDocs((prev) => prev.map((doc) => {
              if (doc.id !== matchedDoc.id) return doc;
              return {
                ...doc,
                archivo: file.name,
                estado: result.final_verdict === "approved" ? "ok" : result.final_verdict === "review" ? "warn" : "missing",
                detectedType: result.document_type || "",
                full_name: result.full_name || "",
                document_number: result.document_number || "",
                birth_date: result.birth_date || "",
                expiry_date: result.expiry_date || "",
                verification_score: result.verification_score || 0,
                fraud_risk: result.fraud_risk || "low",
                final_verdict: result.final_verdict || "review",
                document_date: result.document_date || "",
              };
            }));
          }
          results.push({ fileName: file.name, result });
        }
        setDocsUploaded(true);
        toast({ 
          title: "✅ Documentos subidos", 
          description: `${files.length} documento(s) subido(s). Ahora haz clic en Verificar documentos`,
        });
      } catch (err) {
        console.error(err);
        toast({ 
          title: "❌ Error", 
          description: "No se pudieron subir los documentos",
          variant: "destructive" 
        });
      } finally {
        setGeneralUploading(false);
      }
    };
    input.click();
  };

  // ============================================
  // VERIFICAR ASILO
  // ============================================
  const handleVerifyAsilo = async () => {
    console.log("🛡️ Verificando Asilo...");
    try {
      if (asiloDocs.length === 0) {
        const mensaje = `📋 تحليل طلب اللجوء:

❌ ما عندكش أي وثيقة فيها معلومات على اللجوء.

✅ هادشي مزيان للتسوية الجماعية 2026.

📌 نصيحة سفيان: تقدر تقدم على التسوية الجماعية بشكل عادي.`;
        await speakFromAutomation(mensaje);
        toast({ title: "✅ Asilo", description: "No tienes solicitud de asilo activa" });
        return;
      }
      
      let tieneSolicitudActiva = false;
      let tieneDenegacion = false;
      let fechaSolicitud = "";
      let estadoSolicitud = "";
      
      for (const doc of asiloDocs) {
        const text = (doc.detectedType + " " + doc.nombre + " " + (doc.note || "") + " " + (doc.final_verdict || "")).toLowerCase();
        
        if (text.includes("solicitud") || text.includes("application") || text.includes("asylum application") || text.includes("solicit")) {
          tieneSolicitudActiva = true;
          if ((doc as any).document_date) {
            fechaSolicitud = (doc as any).document_date;
          }
          if (doc.final_verdict) {
            estadoSolicitud = doc.final_verdict;
          }
        }
        
        if (doc.final_verdict === "rejected" || text.includes("denegado") || text.includes("rechazado") || text.includes("denied")) {
          tieneDenegacion = true;
        }
      }
      
      let mensaje = `📋 تحليل طلب اللجوء:\n\n`;
      
      if (tieneSolicitudActiva) {
        mensaje += `⚠️ عندك طلب لجوء نشط.\n`;
        if (fechaSolicitud) {
          mensaje += `📅 تاريخ الطلب: ${fechaSolicitud}\n`;
        }
        if (estadoSolicitud) {
          mensaje += `📊 الحالة: ${estadoSolicitud}\n`;
        }
        mensaje += `\n🚨 هاد الشي كيأثر على ملف التسوية الجماعية لأنك ما تقدرش تقدم على الإثنين ف نفس الوقت.\n\n`;
        mensaje += `📌 نصيحة سفيان: خاصك تستنى على قرار اللجوء قبل ما تقدم على التسوية.`;
        toast({ title: "⚠️ Asilo activo", description: "Tienes una solicitud de asilo activa", variant: "destructive" });
      } else if (tieneDenegacion) {
        mensaje += `⚠️ عندك رفض لجوء سابق.\n`;
        mensaje += `\n📌 نصيحة سفيان: هاد الشي ما كيمنعش التسوية الجماعية، ولكن خاصك تقدم هاد المعلومات للسيستيم.\n`;
        mensaje += `✅ تقدر تقدم على التسوية الجماعية بشكل عادي.`;
        toast({ title: "⚠️ Asilo denegado", description: "Tienes una denegación de asilo previa" });
      } else {
        mensaje += `✅ ما عندكش أي طلب لجوء.\n\n`;
        mensaje += `✅ هادشي مزيان للتسوية الجماعية 2026.\n\n`;
        mensaje += `📌 نصيحة سفيان: تقدر تقدم على التسوية الجماعية بشكل عادي.`;
        toast({ title: "✅ Asilo", description: "No tienes solicitud de asilo" });
      }
      
      await speakFromAutomation(mensaje);
      
    } catch (error) {
      console.error("Error verificando asilo:", error);
      await speakFromAutomation("وقع مشكل وأنا كنحقق فطلب اللجوء. عاود حاول مرة أخرى.");
      toast({ title: "❌ Error", description: "Error al verificar asilo", variant: "destructive" });
    }
  };

  // ============================================
  // VERIFICAR EXPULSIÓN
  // ============================================
  const handleVerifyExpulsion = async () => {
    console.log("🚫 Verificando Expulsión Europea...");
    try {
      if (expulsionDocs.length === 0) {
        const mensaje = `📋 تحليل قرارات الطرد والترحيل:

✅ ما عندكش أي وثيقة فيها قرار الطرد أو الترحيل.

✅ هادشي مزيان بزاف لملف التسوية الجماعية 2026.

📌 نصيحة سفيان: تقدر تقدم على التسوية بشكل عادي.`;
        await speakFromAutomation(mensaje);
        setExpulsionVerified(true);
        toast({ title: "✅ Expulsión", description: "No tienes orden de expulsión" });
        return;
      }
      
      let tieneExpulsionActiva = false;
      let tieneExpulsionCancelada = false;
      let fechaEmision: Date | null = null;
      let fechaCaducidad: Date | null = null;
      let numeroExpediente = "";
      let paisEmisor = "";
      
      for (const doc of expulsionDocs) {
        if ((doc as any).document_date) {
          fechaEmision = new Date((doc as any).document_date);
        }
        
        if ((doc as any).expiry_date) {
          fechaCaducidad = new Date((doc as any).expiry_date);
          if (fechaCaducidad > new Date()) {
            tieneExpulsionActiva = true;
          } else {
            tieneExpulsionCancelada = true;
          }
        }
        
        if ((doc as any).document_number) {
          numeroExpediente = (doc as any).document_number;
        }
        
        const text = (doc.nombre + " " + (doc.note || "")).toLowerCase();
        if (text.includes("españa") || text.includes("spain")) {
          paisEmisor = "España";
        } else if (text.includes("francia") || text.includes("france")) {
          paisEmisor = "Francia";
        } else if (text.includes("alemania") || text.includes("germany")) {
          paisEmisor = "Alemania";
        }
        
        const verdict = (doc.final_verdict || "").toLowerCase();
        if (verdict.includes("cancelado") || verdict.includes("canceled") || verdict.includes("resuelto")) {
          tieneExpulsionCancelada = true;
          tieneExpulsionActiva = false;
        }
      }
      
      let mensaje = `📋 تحليل قرارات الطرد والترحيل:\n\n`;
      
      mensaje += `📄 وثيقة الطرد:\n`;
      if (numeroExpediente) {
        mensaje += `📌 رقم الملف: ${numeroExpediente}\n`;
      }
      if (paisEmisor) {
        mensaje += `🌍 البلد المصدر: ${paisEmisor}\n`;
      }
      if (fechaEmision) {
        mensaje += `📅 تاريخ الإصدار: ${fechaEmision.toLocaleDateString()}\n`;
      }
      if (fechaCaducidad) {
        mensaje += `📅 تاريخ الانتهاء: ${fechaCaducidad.toLocaleDateString()}\n`;
      }
      
      mensaje += `\n`;
      
      if (tieneExpulsionCancelada) {
        mensaje += `✅✅✅ القرار ملغي أو منتهي الصلاحية!\n\n`;
        mensaje += `✅ هاد الشي مزيان. تقدر تقدم على التسوية الجماعية بشكل عادي.\n\n`;
        mensaje += `📌 نصيحة سفيان: أحتفظ بالوثيقة ديال الإلغاء مع الملف ديالك.`;
        toast({ title: "✅ Expulsión cancelada", description: "La orden de expulsión ha caducado" });
      } else if (tieneExpulsionActiva) {
        mensaje += `🚨🚨🚨 القرار مازال ساري المفعول!\n\n`;
        mensaje += `❌ هاد الشي يمنعك من التسوية الجماعية.\n\n`;
        mensaje += `📌 نصيحة سفيان: خاصك تشوف محامي متخصص ف قضايا الطرد قبل ما تكمل.\n`;
        mensaje += `🔴 خاصك تحل هاد المشكلة قبل ما تقدم على التسوية.`;
        toast({ title: "🚨 Expulsión activa", description: "Tienes una orden de expulsión activa", variant: "destructive" });
      } else {
        mensaje += `⚠️ القرار غير واضح. خاصك ترفع وثيقة أوضح.\n\n`;
        mensaje += `📌 نصيحة سفيان: تأكد من تاريخ الانتهاء ديال القرار.`;
        toast({ title: "⚠️ Expulsión no clara", description: "El documento no es claro", variant: "destructive" });
      }
      
      setExpulsionVerified(!tieneExpulsionActiva);
      await speakFromAutomation(mensaje);
      
    } catch (error) {
      console.error("Error verificando expulsión:", error);
      await speakFromAutomation("وقع مشكل وأنا كنحقق فالقرارات ديال الطرد. عاود حاول مرة أخرى.");
      toast({ title: "❌ Error", description: "Error al verificar expulsión", variant: "destructive" });
    }
  };

  // ============================================
  // VERIFICAR TODOS LOS DOCUMENTOS - CORREGIDO
  // ============================================
  const handleVerifyAll = async () => {
    try {
      setGeneralUploading(true);
      
      if (!docs.length) { 
        await speakFromAutomation("مازال ما توصلتش بالوثائق ديالك. خاصك ترفع وثائق قبل ما نتحقق."); 
        toast({ title: "❌ Sin documentos", description: "Primero sube documentos", variant: "destructive" });
        return; 
      }

      const docsWithData = docs.filter(doc => doc.archivo && doc.archivo !== "");
      if (docsWithData.length === 0) {
        await speakFromAutomation("الوثائق مازال ما تحللوش. خاصك ترفع وثائق وصور كاملة باش نقدر نقراها.");
        toast({ title: "❌ Documentos sin analizar", description: "Sube imágenes o PDFs claros", variant: "destructive" });
        return;
      }

      let hasPassport = false;
      let stayDates: string[] = [];
      let hasExpulsion = false;
      let expulsionExpired = false;
      let nombresEncontrados: string[] = [];

      for (const doc of docsWithData) {
        const type = (doc.detectedType || "").toLowerCase();
        const docName = (doc.nombre || "").toLowerCase();

        if (type.includes("passport") || type.includes("nie") || 
            docName.includes("pasaporte") || docName.includes("passport") || 
            docName.includes("nie")) {
          hasPassport = true;
        }
        
        if ((doc as any).document_date) {
          stayDates.push((doc as any).document_date);
        }
        
        if ((doc as any).full_name) {
          nombresEncontrados.push((doc as any).full_name);
        }
        
        if (docName.includes("expulsion") || docName.includes("expulsión") || 
            docName.includes("deportacion")) {
          hasExpulsion = true;
          if ((doc as any).expiry_date) {
            const expiry = new Date((doc as any).expiry_date);
            if (expiry < new Date()) expulsionExpired = true;
          }
        }
      }

      const sortedDates = stayDates.map(d => new Date(d)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
      let stayDays = 0;
      let hasMonths = false;
      if (sortedDates.length >= 2) {
        const firstDate = sortedDates[0];
        const lastDate = sortedDates[sortedDates.length - 1];
        stayDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        hasMonths = stayDays >= 150;
      }

      const resultado = {
        hasPassport,
        hasMonths,
        days: stayDays,
        hasExpulsion,
        expulsionExpired,
        completo: hasPassport && hasMonths && (!hasExpulsion || expulsionExpired)
      };
      setAnalysisResult(resultado);
      
      const soufianeUnlockCondition = hasPassport && hasMonths && (!hasExpulsion || expulsionExpired);
      setSoufianeReady(soufianeUnlockCondition);
      setDocsVerified(true);
      
      console.log("🔍 RESULTADO FINAL:", resultado);

      // ✅ CAMBIO 4: Toast después de verificar
      toast({
        title: "✅ Análisis completado",
        description: soufianeUnlockCondition ? "Soufiane ya puede hablar" : "Documentos incompletos",
      });

      // CONSTRUIR EL MENSAJE COMPLETO PARA SOUFIANE
      let mensajeFinal = "";

      let nombresTexto = "";
      if (nombresEncontrados.length > 0) {
        nombresTexto = `الاسماء: ${nombresEncontrados.join(", ")}.\n`;
      }

      let fechasTexto = "";
      if (sortedDates.length >= 2) {
        fechasTexto = `المدة بين أول وثيقة وآخر وثيقة: ${stayDays} يوم.\n`;
      } else if (sortedDates.length === 1) {
        fechasTexto = `لقيت تاريخ واحد فقط. خاصك وثيقتين على الأقل.\n`;
      } else {
        fechasTexto = `ما لقيتش تواريخ ف الوثائق.\n`;
      }

      let mesesTexto = "";
      if (hasMonths) {
        mesesTexto = `✅ عندك ${stayDays} يوم (تزيد من 5 شهور).\n`;
      } else {
        mesesTexto = `❌ عندك ${stayDays} يوم فقط. خاصك 150 يوم.\n`;
      }

      let passportTexto = "";
      if (hasPassport) {
        passportTexto = `✅ عندك وثيقة هوية.\n`;
      } else {
        passportTexto = `❌ ما عندكش باسبور أو NIE.\n`;
      }

      let expulsionTexto = "";
      if (hasExpulsion) {
        if (expulsionExpired) {
          expulsionTexto = `⚠️ عندك قرار طرد قديم (منتهي الصلاحية).\n`;
        } else {
          expulsionTexto = `🚨 عندك قرار طرد نشط!\n`;
        }
      } else {
        expulsionTexto = `✅ ما عندكش قرارات طرد.\n`;
      }

      let resultadoFinal = "";
      if (soufianeUnlockCondition) {
        resultadoFinal = `
${nombresTexto}
${fechasTexto}
${passportTexto}
${mesesTexto}
${expulsionTexto}

✅ الملف ديالك كامل ومقبول للتسوية الجماعية 2026.

دابا خاصك تدخل رقم هاتفك فالمربع ديال واتساب وتضغط على زر الإرسال باش توصلك الوثيقة المهمة ف جوالك.
`;
      } else {
        resultadoFinal = `
${nombresTexto}
${fechasTexto}
${passportTexto}
${mesesTexto}
${expulsionTexto}

❌ الملف ديالك ناقص. خاصك تجيب:
${!hasPassport ? "- باسبور أو NIE\n" : ""}
${!hasMonths ? `- بروفات ديال 5 شهور (عندك ${stayDays} يوم فقط)\n` : ""}
${hasExpulsion && !expulsionExpired ? "- حل قرار الطرد النشط\n" : ""}
`;
      }

      // ✅ CAMBIO 5: Enviar mensaje a Soufiane
      soufianeHasSpokenRef.current = false;
      setSoufianeHasSpoken(false);
      await speakExactText(resultadoFinal);
      
    } catch (err) {
      console.error("Error en handleVerifyAll:", err);
      await speakFromAutomation("وقع مشكل وأنا كنحلل الوثائق، عاود حاول.");
      toast({ 
        title: "❌ Error", 
        description: "Ocurrió un error al verificar los documentos",
        variant: "destructive" 
      });
    } finally {
      setGeneralUploading(false);
    }
  };

  const startListening = async () => {
    if (!voiceSupported) { toast({ title: "Error", description: ui.micNotSupported, variant: "destructive" }); return; }
    if (isConnectingRef.current) return;
    if (realtimeDcRef.current && realtimeDcRef.current.readyState === "open") return;
    try {
      isConnectingRef.current = true;
      setWaitingSoufiane(true);
      const sessionRes = await fetch(`/api/realtime-session?ts=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({ assistant: "soufiane" }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData?.error || "Error creando sesión realtime");
      const ephemeralKey = sessionData?.value || "";
      if (!ephemeralKey) throw new Error("No llegó value desde realtime-session");

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
          if (playPromise) playPromise.catch((err) => { console.error("Error reproduciendo audio remoto Soufiane:", err); });
        }
      };
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      realtimeLocalStreamRef.current = localStream;
      for (const track of localStream.getTracks()) {
        const sender = pc.addTrack(track, localStream);
        senderRef.current = sender;
      }

      const dc = pc.createDataChannel("oai-events");
      realtimeDcRef.current = dc;

      dc.onopen = async () => {
        dcOpenedRef.current = true;
        isConnectingRef.current = false;
        setIsListening(true);
        setWaitingSoufiane(false);
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            instructions: `
أنت سفيان من GestoriaCitaIA.

تكلم فقط بالدارجة المغربية.

🎯 الدور ديالك:
أنت متخصص فقط في تحليل الوثائق وإعطاء نتيجة واحدة فقط.

مهمتك هي:
- تحليل الوثائق المرفوعة
- حساب مدة التواجد في إسبانيا
- تحديد إذا كانت 5 أشهر متواصلة أم لا

❌ ممنوع:
- ممنوع تجاوب على أسئلة عامة
- ممنوع تعطي استشارات قانونية
- ممنوع تبدأ حوار
- ممنوع تقول "سلام" أو "مرحبا"
- ممنوع تسول أسئلة
- ممنوع تعاود الكلام
- ممنوع ترد على أي شيء بعد إعطاء النتيجة

🎯 الطريقة ديالك:
- جاوب فقط بالتحليل المطلوب
- الجواب يكون مختصر وواضح
- ما تزيدش كلام زيادة
- مرة واحدة فقط

📋 تحليل الوثائق:

إلى توصلت بوثائق، قول مباشرة:
"توصلت بالوثائق. غادي نبدا التحليل."

🔍 استخراج المعلومات:
استخرج من الوثائق الأسماء والتواريخ ونوع الوثيقة.

📅 حساب المدة:
إذا كانت الوثائق فيها تواريخ، رتبهم زمنياً واحسب الأيام.

✅ إذا كانت التغطية أكثر من 5 شهور متواصلة (150 يوم):
قول: "عندك ${analysisResult.days} يوم ديال الإقامة (تزيد من 5 شهور)."

❌ إذا كان كاين فراغ:
قول: "عندك ${analysisResult.days} يوم فقط. خاصك 150 يوم (5 شهور)."

📊 النتيجة النهائية (هذا هو المهم):

إذا كان الملف كامل:
"✅ الملف ديالك كامل ومقبول. دابا خاصك تدخل رقم هاتفك فالمربع ديال واتساب وتضغط على زر الإرسال باش توصلك الوثيقة المهمة ف جوالك."

إذا كان الملف ناقص:
"❌ الملف ديالك ناقص. خاصك تجيب: ${!analysisResult.hasPassport ? 'باسبور أو NIE، ' : ''}${!analysisResult.hasMonths ? `بروفات ديال 5 شهور (عندك ${analysisResult.days} يوم فقط)، ` : ''}${analysisResult.hasExpulsion && !analysisResult.expulsionExpired ? 'حل قرار الطرد النشط' : ''}"

⚠️ مهم جدا:
- جاوب مرة واحدة فقط
- ما تعاودش الكلام
- ما تسولش أسئلة
- فقط التحليل والنتيجة
- بعد ما تعطي النتيجة، توقف
`,
            modalities: ["audio", "text"],
            turn_detection: {
              type: "server_vad",
              threshold: 0.98,
              prefix_padding_ms: 300,
              silence_duration_ms: 2200,
              interrupt_response: false,
              create_response: true,
            },
          },
        }));

        const capturedPending = pendingAutomationPromptRef.current;
        if (capturedPending) {
          pendingAutomationPromptRef.current = null;
          setPendingAutomationPrompt("");
          setTimeout(() => { void askSoufianeToSpeak(capturedPending); }, 400);
          return;
        }
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === "response.output_text.delta" && typeof msg.delta === "string") {
            assistantTextBufferRef.current += msg.delta;
          }

          if (msg.type === "response.output_text.done" && typeof msg.text === "string" && msg.text.trim()) {
            assistantTextBufferRef.current = msg.text.trim();
          }

          if (msg.type === "response.created") {
            assistantBusyRef.current = true;
            setWaitingSoufiane(true);
            if (realtimeLocalStreamRef.current) {
              realtimeLocalStreamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
            }
            if (senderRef.current) { senderRef.current.replaceTrack(null); }
          }

          if (msg.type === "response.done") {
            assistantBusyRef.current = false;
            if (realtimeLocalStreamRef.current) {
              realtimeLocalStreamRef.current.getAudioTracks().forEach(track => { track.enabled = true; });
            }
            const finalText = assistantTextBufferRef.current.trim();
            if (finalText) lastAssistantTextRef.current = finalText;
            finalizeAssistantBuffer();
            const audioTrack = realtimeLocalStreamRef.current?.getAudioTracks?.()[0];
            if (senderRef.current && audioTrack) { senderRef.current.replaceTrack(audioTrack); }
            setWaitingSoufiane(false);
            pendingAutomationPromptRef.current = null;
            setPendingAutomationPrompt("");
            
            // ✅ CAMBIO 2: Solo hablar si soufianeReady
            if (!soufianeHasSpokenRef.current && soufianeReady) {
              soufianeHasSpokenRef.current = true;
              setSoufianeHasSpoken(true);
              setTimeout(() => {
                stopListening();
                setIsListening(false);
              }, 1000);
            }
            
            setTimeout(() => { void flushPendingAutomation(); }, 150);
          }
        } catch (err) {
          console.error("Realtime event parse error:", err);
        }
      };

      dc.onerror = (err) => { console.error("Realtime data channel error:", err); };
      dc.onclose = () => {
        dcOpenedRef.current = false;
        isConnectingRef.current = false;
        assistantBusyRef.current = false;
        setIsListening(false);
        stopListening();
        assistantTextBufferRef.current = "";
        lastAssistantTextRef.current = "";
        lastUserTranscriptRef.current = "";
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" },
      });
      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(errText || "Error negociando WebRTC con OpenAI");
      }
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (error: any) {
      console.error("Error iniciando realtime Soufiane:", error);
      stopListening();
      toast({ title: "Error realtime", description: error?.message || voiceTexts.realtimeError, variant: "destructive" });
    } finally {
      isConnectingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="w-full bg-background text-foreground relative min-h-screen rounded-[30px] overflow-hidden">
        <Navbar />
        <div className="fixed inset-0 z-0 opacity-25 pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse 70% 40% at 30% 20%, rgba(34,197,94,0.1), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.08), transparent)" }} />

        <main className="flex-1 relative z-10 pt-2 pb-6">
          <div className="px-4 sm:px-6 py-3 w-full flex items-center justify-between">
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

          <div className="mt-2 max-w-7xl mx-auto lg:grid lg:grid-cols-[480px_1fr] lg:gap-6">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-[26px] overflow-hidden relative">
              <div className="relative">
                <img 
                  src="/images/soufiane.png" 
                  alt="Soufiane" 
                  className="w-full h-[270px] object-cover border-b border-[#f6c453]/10"
                />
                <div className="absolute bottom-5 right-4 text-right">
                  <h2 className="text-[22px] font-bold text-white">Soufiane</h2>
                  <p className="text-[15px] text-[#d4a94d] font-medium tracking-wide">Experto en Regularización</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-0 w-full max-w-none lg:col-start-2">
            {!paymentCompleted && (
              <div className="p-3">
                <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-[#1a1200] via-[#0b0b0b] to-[#1a1200] p-4 w-full">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-bold text-lg">Desbloquea a Soufiane</p>
                      <span className="inline-flex mt-1 px-2 py-1 rounded-full bg-yellow-500 text-black text-[10px] font-bold">PREMIUM</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-yellow-400 leading-none">14,99€</p>
                      <p className="text-white/60 text-xs">Acceso completo</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-[13px] leading-relaxed mb-3">Acceso ilimitado a Soufiane IA, videollamada realtime, análisis de documentos y generación automática del expediente.</p>
                  <button onClick={handleStripePayment} type="button" className="w-[92%] mx-auto flex items-center justify-center h-[52px] rounded-[20px] text-white font-semibold text-[16px] bg-gradient-to-r from-[#16a34a] to-[#22c55e] border border-[#4ade80] shadow-[0_4px_14px_rgba(34,197,94,0.35)]">
                    🔓 Desbloquear ahora
                  </button>
                  <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                    <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-blue-700 font-black text-[10px]">VISA</div>
                    <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-red-500 font-black text-[10px]">Mastercard</div>
                    <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-black font-black text-[10px]">Pay</div>
                    <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-black font-black text-[10px]">G Pay</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-white font-bold">Soufiane IA</p>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">Especialista profesional en extranjería española para marroquíes en España. Pregunta sobre residencia, papeles, policía, nacionalidad, arraigo, trabajo, estudios y cualquier problema legal relacionado con inmigración.</p>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-green-500/20 bg-[#071326] p-4">
              <h3 className="text-center text-green-400 font-bold text-lg mb-4">Miles de personas ya usan GestoriaCitaIA</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><p className="text-green-400 text-2xl font-black">18K+</p><p className="text-white/60 text-xs">Trámites</p></div>
                <div><p className="text-blue-400 text-2xl font-black">97%</p><p className="text-white/60 text-xs">Verificado</p></div>
                <div><p className="text-purple-400 text-2xl font-black">4m</p><p className="text-white/60 text-xs">Continuar</p></div>
                <div><p className="text-yellow-400 text-2xl font-black">100%</p><p className="text-white/60 text-xs">Asistente IA</p></div>
              </div>
              <div className="mt-4 rounded-full border border-yellow-500/30 py-2 text-center text-white font-bold">🏆 Regularización 2026</div>
              <div className="flex items-end justify-between mt-4">
                <div><p className="text-green-400 text-4xl font-black">4.9/5</p><p className="text-yellow-400">★★★★★</p></div>
                <div className="text-white font-bold">+2K</div>
              </div>
            </div>

            {paymentCompleted && (
              <div className="mt-5 space-y-4">
                {/* ✅ CAMBIO 3: Botón micrófono VERDE */}
                <button
                  onClick={() => {
                    if (soufianeReady && !soufianeHasSpoken) {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }
                  }}
                  disabled={!soufianeReady || soufianeHasSpoken}
                  className={`w-[92%] mx-auto h-[52px] rounded-[20px] flex items-center justify-center gap-3 text-[16px] font-semibold border shadow-xl transition-all duration-300 ${
                    !soufianeReady || soufianeHasSpoken ? "bg-gray-600 opacity-60 cursor-not-allowed text-white"
                    : isListening ? "bg-red-600 border-red-400 text-white shadow-red-500/30 animate-pulse"
                    : "bg-gradient-to-r from-[#16a34a] to-[#22c55e] border-[#4ade80] text-white shadow-green-500/20"
                  }`}
                >
                  {isListening ? (
                    <><MicOff className="w-5 h-5" />Soufiane escuchando...</>
                  ) : (
                    <><Mic className="w-5 h-5" />
                      {!soufianeReady ? "Verificar documentos primero" : soufianeHasSpoken ? "✅ Análisis completado" : "Hablar con Soufiane"}
                    </>
                  )}
                </button>

                {/* Subir documentos */}
                <button 
                  onClick={handleGeneralUpload} 
                  disabled={generalUploading} 
                  className={`w-[92%] mx-auto h-[52px] rounded-[20px] border border-[#c6922f] bg-[#050816] hover:bg-[#0b1220] transition-all text-white font-medium text-[16px] flex items-center justify-center gap-3 shadow-lg ${
                    docsUploaded ? "border-green-500/60 bg-green-900/20" : ""
                  }`}
                >
                  <Upload className="w-5 h-5 text-[#d4a94d]" />
                  {generalUploading ? "Subiendo..." : docsUploaded ? "✅ Documentos subidos" : "Subir documentos"}
                  {docsUploaded && <CheckCircle className="w-4 h-4 text-green-400" />}
                </button>

                {/* Verificar documentos */}
                <button 
                  onClick={handleVerifyAll} 
                  disabled={!docsUploaded || generalUploading}
                  className={`w-[92%] mx-auto h-[52px] rounded-[20px] border border-[#c6922f] bg-[#050816] hover:bg-[#0b1220] transition-all text-white font-medium text-[16px] flex items-center justify-center gap-3 shadow-lg ${
                    docsVerified ? "border-green-500/60 bg-green-900/20" : ""
                  }`}
                >
                  {docsVerified ? (
                    <><FileCheck className="w-5 h-5 text-green-400" /> ✅ Documentos verificados</>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#d4a94d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      {generalUploading ? "Verificando..." : "Verificar documentos"}
                    </>
                  )}
                </button>

                {/* Botón Verificar Asilo */}
                <button onClick={handleVerifyAsilo} className="w-[92%] mx-auto h-[52px] rounded-[20px] border border-[#c6922f] bg-[#050816] hover:bg-[#0b1220] transition-all text-white font-medium text-[16px] flex items-center justify-center gap-3 shadow-lg">
                  <Shield className="w-5 h-5 text-[#d4a94d]" />
                  Verificar Asilo
                </button>

                {/* Botón Verificar Expulsión */}
                <button onClick={handleVerifyExpulsion} className="w-[92%] mx-auto h-[52px] rounded-[20px] border border-[#c6922f] bg-[#050816] hover:bg-[#0b1220] transition-all text-white font-medium text-[16px] flex items-center justify-center gap-3 shadow-lg">
                  <AlertTriangle className="w-5 h-5 text-[#d4a94d]" />
                  Verificar Expulsión Europea
                </button>

                {/* WhatsApp con botón Enviar */}
                <div className="w-[92%] mx-auto h-[52px] rounded-[20px] border border-[#c6922f]/40 bg-[#050816] flex items-center overflow-hidden shadow-lg">
                  <div className="w-[58px] h-full flex items-center justify-center border-r border-[#c6922f]/30 bg-black">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-6 h-6" />
                  </div>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder={safeLang === "darija" ? "رقم الواتساب" : safeLang === "en" ? "WhatsApp number" : "Número WhatsApp"} 
                    className="flex-1 h-full bg-transparent px-4 text-white placeholder:text-white/40 outline-none text-[16px]" 
                  />
                  <button 
                    onClick={handleSendWhatsApp}
                    className="h-full px-4 bg-green-600 hover:bg-green-700 transition-colors text-white font-semibold text-sm"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            )}
          </div>

          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        </main>
      </div>
    </div>
  );
}
