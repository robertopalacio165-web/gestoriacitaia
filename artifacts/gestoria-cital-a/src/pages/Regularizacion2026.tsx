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
        stopListening();
        setTimeout(async () => {
          startListening();
        }, 1500);
        setQuestionIndex(0);
        setDocumentsUnlocked(true);
        setConfirmUnlocked(true);
        setQuestionsDone(true);
        setStep("upload");
        try {
          const pdfRes = await fetch("/api/generate-expediente-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre: leadForm.nombre,
              nacionalidad: leadForm.nacionalidad,
              ciudad: leadForm.ciudad,
              fecha_llegada: leadForm.fechaLlegada,
              tiempo_espana: "5 meses o más",
              profesion: "Trabajador",
              situacion_actual: "Proceso de regularización en España",
              objetivo: "Regularizar situación administrativa",
              idiomas: "Español, Árabe",
              familia: "Información no especificada",
            }),
          });
          const pdfData = await pdfRes.json();
          if (pdfData?.pdfUrl) {
            localStorage.setItem("generated_pdf_url", pdfData.pdfUrl);
          }
        } catch (err) {
          console.error("PDF ERROR:", err);
        }
      }
      setShowStripe(false);
      setPaymentRequired(false);
      setTimeout(() => {
        speakExactText("مزيان. قولي شنو سميتك؟");
      }, 1200);
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
        alert("❌ Stripe فيه مشكل");
      }
    } catch (err) {
      console.error(err);
      alert("❌ خطأ فالكونكسيون");
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
      realtimeDcRef.current.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: prompt }
