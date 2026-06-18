import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  Upload,
  Star,
  CheckCircle,
  FileCheck,
  Send,
  ChevronDown,
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

// ✅ Países para selector
const COUNTRIES = [
  { code: "+34", flag: "🇪🇸", name: "España" },
  { code: "+212", flag: "🇲🇦", name: "Marruecos" },
  { code: "+33", flag: "🇫🇷", name: "Francia" },
  { code: "+32", flag: "🇧🇪", name: "Bélgica" },
  { code: "+31", flag: "🇳🇱", name: "Holanda" },
  { code: "+49", flag: "🇩🇪", name: "Alemania" },
  { code: "+39", flag: "🇮🇹", name: "Italia" },
  { code: "+44", flag: "🇬🇧", name: "Reino Unido" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+41", flag: "🇨🇭", name: "Suiza" },
];

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
  const [leadSaved, setLeadSaved] = useState(false);
  const [generalUploading, setGeneralUploading] = useState(false);
  const [workflowStep, setWorkflowStep] = useState("idle");
  const [completionMessageSent, setCompletionMessageSent] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<ChatMsg[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [savingForm, setSavingForm] = useState(false);
  const [waitingForDocument, setWaitingForDocument] = useState(false);
  const [documentsUnlocked, setDocumentsUnlocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [formConfirmed, setFormConfirmed] = useState(false);
  const [confirmUnlocked, setConfirmUnlocked] = useState(false);
  
  // ✅ Estado para teléfono con país
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  
  const [questionsDone, setQuestionsDone] = useState(false);
  const [clientQuestionsDone, setClientQuestionsDone] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [expulsionVerified, setExpulsionVerified] = useState(false);
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [docsVerified, setDocsVerified] = useState(false);
  const [sendingToWhatsApp, setSendingToWhatsApp] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ 
    hasPassport: boolean; 
    hasMonths: boolean; 
    days: number; 
    hasExpulsion: boolean; 
    expulsionExpired: boolean; 
    completo: boolean;
    strongProofs: number;
    weakProofs: number;
    docsAnalysis: string[];
    asiloAnalysis: string;
    expulsionAnalysis: string;
    policiaAnalysis: string;
    nombreCliente: string;
  }>({
    hasPassport: false,
    hasMonths: false,
    days: 0,
    hasExpulsion: false,
    expulsionExpired: false,
    completo: false,
    strongProofs: 0,
    weakProofs: 0,
    docsAnalysis: [],
    asiloAnalysis: "No se detectaron documentos de asilo",
    expulsionAnalysis: "No se detectaron documentos de expulsión",
    policiaAnalysis: "No se detectaron documentos policiales",
    nombreCliente: "",
  });

  useEffect(() => {
    localStorage.setItem("questionIndex", questionIndex.toString());
  }, [questionIndex]);

  const questionFlowLockedRef = useRef(false);
  const paymentDoneRef = useRef(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
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

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as "darija" | "es" | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

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
              toast({ title: "✅ Guardado", description: "المعطيات ديالك تحفظات فالنظام" });
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
      console.error("Error cargando estado:", error);
    }
  }, [formStorageKey, leadSavedStorageKey, docsStorageKey]);

  useEffect(() => {
    try { localStorage.setItem(formStorageKey, JSON.stringify(leadForm)); }
    catch (error) { console.error("Error guardando formulario:", error); }
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
          const leadAlreadySaved = parsed.some((m) => m.from === "agent" && m.text.includes("المعطيات ديالك تحفظات"));
          setLeadSaved((prev) => prev || leadAlreadySaved);
          setFormConfirmed((prev) => prev || leadAlreadySaved);
          return;
        }
      }
      setVoiceHistory([{ from: "agent", text: "مرحبا بك", ts: Date.now() }]);
    } catch (error) {
      console.error("Error cargando historial:", error);
      setVoiceHistory([{ from: "agent", text: "مرحبا بك", ts: Date.now() }]);
    }
  }, [historyStorageKey]);

  useEffect(() => {
    if (voiceHistory.length === 0) return;
    try { localStorage.setItem(historyStorageKey, JSON.stringify(voiceHistory)); }
    catch (error) { console.error("Error guardando historial:", error); }
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

  const policiaDocs = docs.filter((doc) => {
    const text = (doc.nombre + " " + (doc.detectedType || "") + " " + (doc.note || "")).toLowerCase();
    return text.includes("policia") || text.includes("policía") || text.includes("comisaria") || text.includes("comisaría") || text.includes("denuncia") || text.includes("atestado");
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
        toast({ title: "سؤال", description: "مزيان. قولي شنو سميتك؟" });
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
        setPaymentRequired(true);
        setShowStripe(true);
        setQuestionsDone(false);
        return next;
      }
      if (next >= questions.length - 1) {
        setDocumentsUnlocked(true);
        setConfirmUnlocked(true);
        setQuestionsDone(true);
        toast({
          title: "📄 Documentos",
          description: "دابا خاصك ترفع جميع الوثائق اللي عندك.",
        });
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
  };

  const pushUserMessage = (text: string) => {
    if (!text?.trim()) return;
    setVoiceHistory((prev) => [...prev, { from: "user", text, ts: Date.now() }]);
  };

  const buildSavedFormSpeech = () => {
    return "مزيان. السؤال الثاني: عندك باسبور ولا NIE ولا TIE؟";
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

  // ============================================
  // ANALIZAR ASILO - INTERNO
  // ============================================
  const analyzeAsilo = async (): Promise<string> => {
    try {
      if (asiloDocs.length === 0) {
        return "Sin solicitud de asilo";
      }
      
      let tieneSolicitudActiva = false;
      let tieneDenegacion = false;
      let tieneResolucionFavorable = false;
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
        
        if (doc.final_verdict === "approved" || text.includes("aprobado") || text.includes("concedido") || text.includes("granted")) {
          tieneResolucionFavorable = true;
        }
      }
      
      if (tieneSolicitudActiva) {
        return `Solicitud activa (${fechaSolicitud || "sin fecha"}) - ${estadoSolicitud || "en trámite"}`;
      } else if (tieneDenegacion) {
        return "Denegado";
      } else if (tieneResolucionFavorable) {
        return "Concedido";
      } else {
        return "Sin solicitud";
      }
    } catch (error) {
      console.error("Error analizando asilo:", error);
      return "Error al analizar";
    }
  };

  // ============================================
  // ANALIZAR EXPULSIÓN - INTERNO
  // ============================================
  const analyzeExpulsion = async (): Promise<{ status: string; expired: boolean }> => {
    try {
      if (expulsionDocs.length === 0) {
        return { status: "Sin expulsión", expired: false };
      }
      
      let tieneExpulsionActiva = false;
      let tieneExpulsionCancelada = false;
      
      for (const doc of expulsionDocs) {
        if ((doc as any).expiry_date) {
          const fechaCaducidad = new Date((doc as any).expiry_date);
          if (fechaCaducidad > new Date()) {
            tieneExpulsionActiva = true;
          } else {
            tieneExpulsionCancelada = true;
          }
        }
        
        const verdict = (doc.final_verdict || "").toLowerCase();
        if (verdict.includes("cancelado") || verdict.includes("canceled") || verdict.includes("resuelto")) {
          tieneExpulsionCancelada = true;
          tieneExpulsionActiva = false;
        }
      }
      
      if (tieneExpulsionActiva) {
        return { status: "Activa", expired: false };
      } else if (tieneExpulsionCancelada) {
        return { status: "Caducada", expired: true };
      } else {
        return { status: "No clara", expired: false };
      }
    } catch (error) {
      console.error("Error analizando expulsión:", error);
      return { status: "Error al analizar", expired: false };
    }
  };

  // ============================================
  // ANALIZAR POLICÍA - INTERNO
  // ============================================
  const analyzePolicia = async (): Promise<string> => {
    try {
      if (policiaDocs.length === 0) {
        return "Sin antecedentes policiales";
      }
      
      let tieneDenuncia = false;
      let tieneAtestado = false;
      let tieneCitacion = false;
      
      for (const doc of policiaDocs) {
        const text = (doc.nombre + " " + (doc.detectedType || "") + " " + (doc.note || "")).toLowerCase();
        if (text.includes("denuncia")) tieneDenuncia = true;
        if (text.includes("atestado")) tieneAtestado = true;
        if (text.includes("citacion") || text.includes("citación")) tieneCitacion = true;
      }
      
      let resultado = "Documentos policiales: ";
      if (tieneDenuncia) resultado += "denuncia, ";
      if (tieneAtestado) resultado += "atestado, ";
      if (tieneCitacion) resultado += "citación, ";
      resultado = resultado.replace(/, $/, "");
      if (resultado === "Documentos policiales: ") resultado = "Documentos policiales detectados";
      
      return resultado;
    } catch (error) {
      console.error("Error analizando policía:", error);
      return "Error al analizar";
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          console.warn("⚠️ Modo prueba sin login");
        }
        setWorkflowStep("waiting_confirm");
        let results = [];
        for (const file of files) {
          const safeName = `${Date.now()}_${file.name}`;
          const storagePath = `${user?.id || "guest"}/regularizacion_2026/${safeName}`;
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

  const handleSaveLeadForm = async () => {
    if (!leadFormReady) { toast({ title: ui.missingTitle, description: ui.missingDesc, variant: "destructive" }); return; }
    if (!authChecked) { toast({ title: "Espera", description: "Estamos comprobando tu sesión.", variant: "destructive" }); return; }
    const savedIndex = localStorage.getItem("questionIndex");
    if (savedIndex) setQuestionIndex(parseInt(savedIndex));
    if (!currentUserId) {
      toast({ title: "Sesión no detectada", description: "Debes entrar con Google antes de confirmar.", variant: "destructive" });
      return;
    }
    try {
      setSavingForm(true);
      await saveFullStateToSupabase();
      setLeadSaved(true);
      setFormConfirmed(true);
      const savedMessage = buildSavedFormSpeech();
      toast({ title: ui.saveLeadTitle, description: "Se han guardado los datos correctamente." });
      toast({ title: "✅ Guardado", description: savedMessage });
    } catch (error: any) {
      console.error("Error guardando formulario:", error);
      toast({ title: "Error guardando formulario", description: error?.message || "No se pudo guardar en Supabase", variant: "destructive" });
    } finally {
      setSavingForm(false);
    }
  };

  // ============================================
  // VERIFICAR DOCUMENTOS - HACE TODO
  // ============================================
  const handleVerifyAll = async () => {
    try {
      setGeneralUploading(true);
      
      if (!docs.length) { 
        toast({ title: "❌ Sin documentos", description: "Primero sube documentos", variant: "destructive" });
        return; 
      }

      const docsWithData = docs.filter(doc => doc.archivo && doc.archivo !== "");
      if (docsWithData.length === 0) {
        toast({ title: "❌ Documentos sin analizar", description: "Sube imágenes o PDFs claros", variant: "destructive" });
        return;
      }

      // === 1. ANALIZAR DOCUMENTOS PRINCIPALES ===
      let hasPassport = false;
      let stayDates: string[] = [];
      let hasExpulsion = false;
      let expulsionExpired = false;
      let docsAnalysis: string[] = [];
      let strongProofs = 0;
      let weakProofs = 0;
      let nombreCliente = "";

      for (const doc of docsWithData) {
        const type = (doc.detectedType || "").toLowerCase();
        const docName = (doc.nombre || "").toLowerCase();

        if ((doc as any).full_name && !nombreCliente) {
          nombreCliente = (doc as any).full_name;
        }

        if (type.includes("passport") || type.includes("nie") || 
            docName.includes("pasaporte") || docName.includes("passport") || 
            docName.includes("nie")) {
          hasPassport = true;
          let info = `✅ ${doc.nombre}: documento de identidad válido`;
          if ((doc as any).expiry_date) {
            const expiry = new Date((doc as any).expiry_date);
            if (expiry > new Date()) {
              info += ` (vigente hasta ${expiry.toLocaleDateString()})`;
            } else {
              info += ` ⚠️ (CADUCADO - renovar)`;
            }
          }
          docsAnalysis.push(info);
        } else if (
          type.includes("empadronamiento") || 
          type.includes("stay_proof") ||
          docName.includes("empadronamiento") ||
          docName.includes("padron") ||
          docName.includes("padrón")
        ) {
          strongProofs++;
          docsAnalysis.push(`✅ ${doc.nombre}: prueba fuerte de estancia`);
        } else {
          weakProofs++;
          docsAnalysis.push(`📄 ${doc.nombre}: documento complementario`);
        }
        
        if ((doc as any).document_date) {
          stayDates.push((doc as any).document_date);
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

      // === 2. ANALIZAR ASILO ===
      const asiloStatus = await analyzeAsilo();
      
      // === 3. ANALIZAR EXPULSIÓN ===
      const expulsionResult = await analyzeExpulsion();
      
      // === 4. ANALIZAR POLICÍA ===
      const policeStatus = await analyzePolicia();

      // === 5. CONSTRUIR RESULTADO ===
      const esApto = hasPassport && hasMonths && (!hasExpulsion || expulsionExpired);
      
      const resultado = {
        hasPassport,
        hasMonths,
        days: stayDays,
        hasExpulsion,
        expulsionExpired,
        completo: esApto,
        strongProofs,
        weakProofs,
        docsAnalysis,
        asiloAnalysis: asiloStatus,
        expulsionAnalysis: expulsionResult.status,
        policiaAnalysis: policeStatus,
        nombreCliente: nombreCliente || leadForm.nombre || "Cliente",
      };
      setAnalysisResult(resultado);

      // === 6. CONSTRUIR INFORME COMPLETO ===
      const passportTexto = hasPassport ? "✅ Documento de identidad válido" : "❌ Documento de identidad NO DETECTADO";
      const mesesTexto = hasMonths ? `✅ ${stayDays} días de estancia (más de 5 meses)` : `❌ ${stayDays} días de estancia (menos de 150 días)`;
      const expulsionTexto = hasExpulsion ? (expulsionExpired ? "⚠️ Expulsión caducada" : "🚨 EXPULSIÓN ACTIVA") : "✅ Sin expulsión";

      const analisisDocumentos = docsAnalysis.join("\n");

      const informeCompleto = `
📋 INFORME PROFESIONAL - REGULARIZACIÓN 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 CLIENTE: ${resultado.nombreCliente}
📅 FECHA ANÁLISIS: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 DOCUMENTOS ANALIZADOS

${analisisDocumentos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ESTADÍSTICAS

📁 Pruebas fuertes de estancia: ${strongProofs}
📄 Documentos complementarios: ${weakProofs}
📅 Días acreditados: ${stayDays}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ ANÁLISIS DE ASILO

${asiloStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 ANÁLISIS DE EXPULSIÓN

${expulsionResult.status} ${expulsionResult.expired ? "(caducada)" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👮 ANÁLISIS POLICIAL

${policeStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 RESUMEN FINAL

${passportTexto}
${mesesTexto}
${expulsionTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ CONCLUSIÓN

${esApto 
  ? "✅ EL EXPEDIENTE ES APTO PARA REGULARIZACIÓN 2026"
  : "❌ EL EXPEDIENTE NO ES APTO PARA REGULARIZACIÓN 2026"
}

${esApto 
  ? "El cliente cumple con los requisitos necesarios para la regularización."
  : "Faltan requisitos: asegurar documento de identidad, 150 días de estancia o resolver expulsión."
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 Para recibir el resultado completo, introduce tu número de WhatsApp y pulsa ENVIAR.
`;

      // === 7. GUARDAR EN LOCALSTORAGE ===
      localStorage.setItem("soufiane_analysis", informeCompleto);
      
      // === 8. GUARDAR EN SUPABASE - soufiane_analyses ===
      let analysisId = null;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: analysisData, error: analysisError } = await supabase
            .from("soufiane_analyses")
            .insert({
              user_id: user.id,
              telefono: getFullPhoneNumber(),
              nombre: resultado.nombreCliente || "",
              expediente_status: esApto ? "APTO" : "NO APTO",
              has_passport: hasPassport,
              has_150_days: hasMonths,
              stay_days: stayDays,
              has_expulsion: hasExpulsion,
              expulsion_expired: expulsionExpired,
              has_asilo: asiloDocs.length > 0,
              asilo_status: asiloStatus,
              police_status: policeStatus,
              recommendation: esApto 
                ? "Puede presentar Regularización 2026" 
                : "Faltan requisitos para presentar",
              analysis_text: informeCompleto,
              whatsapp_sent: false,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          
          if (analysisError) {
            console.error("Error guardando análisis:", analysisError);
          } else if (analysisData) {
            analysisId = analysisData.id;
            console.log(`✅ Análisis guardado en soufiane_analyses con ID: ${analysisId}`);

            // === 9. GUARDAR DOCUMENTOS VINCULADOS ===
            for (const doc of docsWithData) {
              const textToCheck = (doc.nombre + " " + (doc.detectedType || "") + " " + (doc.note || "") + " " + (doc.final_verdict || "")).toLowerCase();
              const affectsRegularizacion = 
                textToCheck.includes("expulsion") ||
                textToCheck.includes("expulsión") ||
                textToCheck.includes("denegado") ||
                textToCheck.includes("rechazado") ||
                textToCheck.includes("antecedente") ||
                textToCheck.includes("policia") ||
                textToCheck.includes("policía") ||
                textToCheck.includes("asilo") ||
                textToCheck.includes("deportacion") ||
                (doc.final_verdict && doc.final_verdict.toLowerCase().includes("rejected"));

              const { error: docError } = await supabase
                .from("soufiane_documents")
                .insert({
                  analysis_id: analysisId,
                  document_name: doc.nombre || "",
                  document_type: doc.detectedType || "",
                  document_date: doc.document_date || "",
                  expiry_date: doc.expiry_date || "",
                  full_name: doc.full_name || "",
                  document_number: doc.document_number || "",
                  verdict: doc.final_verdict || "",
                  affects_regularizacion: affectsRegularizacion,
                  notes: doc.note || "",
                  created_at: new Date().toISOString(),
                });
              
              if (docError) {
                console.error("Error guardando documento:", docError);
              }
            }
            console.log(`✅ ${docsWithData.length} documentos guardados en soufiane_documents vinculados al análisis ${analysisId}`);
          }
        }
      } catch (error) {
        console.error("Error guardando en Supabase:", error);
      }

      // === 10. MARCAR COMO VERIFICADO ===
      setDocsVerified(true);
      
      toast({
        title: "✅ Análisis completado",
        description: esApto ? "El expediente es APTO para Regularización 2026" : "El expediente NO es apto. Faltan requisitos.",
      });
      
    } catch (err) {
      console.error("Error en handleVerifyAll:", err);
      toast({ 
        title: "❌ Error", 
        description: "Ocurrió un error al verificar los documentos",
        variant: "destructive" 
      });
    } finally {
      setGeneralUploading(false);
    }
  };

  // ============================================
  // OBTENER NÚMERO COMPLETO
  // ============================================
  const getFullPhoneNumber = (): string => {
    const cleanNumber = phoneNumber.replace(/\s/g, "");
    const countryCodeWithoutPlus = selectedCountry.code.replace("+", "");
    const numberWithoutPrefix = cleanNumber
      .replace(/^\+/, "")
      .replace(/^00/, "")
      .replace(new RegExp(`^${countryCodeWithoutPlus}`), "");
    return `${countryCodeWithoutPlus}${numberWithoutPrefix}`;
  };

  // ============================================
  // ENVIAR A WHATSAPP VIA MAKE
  // ============================================
  const handleSendWhatsApp = async () => {
    try {
      const fullPhone = getFullPhoneNumber();
      
      if (!fullPhone || fullPhone.length < 8) { 
        toast({ title: "❌ Número incorrecto", description: "Introduce un número de teléfono válido", variant: "destructive" });
        return; 
      }
      
      setSendingToWhatsApp(true);
      
      const analysis = localStorage.getItem("soufiane_analysis") || "";
      
      if (!analysis) {
        toast({ title: "❌ Sin análisis", description: "Primero verifica los documentos", variant: "destructive" });
        setSendingToWhatsApp(false);
        return;
      }
      
      const webhookUrl = "https://hook.eu1.make.com/wkowicwqx3lpufxlay8yu6762bpvhk7b";
      
      const payload = {
        telefono: fullPhone,
        analysis: analysis,
        nombre: analysisResult.nombreCliente || leadForm?.nombre || "Cliente",
        days: analysisResult.days || 0,
        hasPassport: analysisResult.hasPassport || false,
        hasMonths: analysisResult.hasMonths || false,
        hasExpulsion: analysisResult.hasExpulsion || false,
        hasAsilo: asiloDocs.length > 0,
        isApto: analysisResult.completo || false,
        timestamp: new Date().toISOString(),
      };
      
      console.log("📤 Enviando a Make:", payload);
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const resultText = await response.text();
      console.log("📥 MAKE RESPONSE:", resultText);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${resultText}`);
      }
      
      toast({ 
        title: "✅ Enviado", 
        description: "El análisis se ha enviado. Recibirás el resultado por WhatsApp en breve." 
      });
      
    } catch (error) {
      console.error("WhatsApp error:", error);
      toast({ 
        title: "❌ Error", 
        description: "Ocurrió un error al enviar. Intenta de nuevo.", 
        variant: "destructive" 
      });
    } finally {
      setSendingToWhatsApp(false);
    }
  };

  // ✅ REFERENCIA para el dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
                  <p className="text-white/70 text-[13px] leading-relaxed mb-3">Acceso ilimitado a Soufiane IA, análisis de documentos y generación automática del expediente.</p>
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
                  <p className="text-white/80 text-sm leading-relaxed">Especialista profesional en extranjería española para marroquíes en España.</p>
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
                    <><FileCheck className="w-5 h-5 text-green-400" /> ✅ Análisis completado</>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#d4a94d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      {generalUploading ? "Verificando..." : "Verificar documentos"}
                    </>
                  )}
                </button>

                {/* ✅ WhatsApp con selector de país - UNA SOLA FILA */}
                <div className="w-[92%] mx-auto flex items-center overflow-hidden rounded-[20px] border border-[#c6922f]/40 bg-[#050816] shadow-lg">
                  {/* Selector de país */}
                  <div className="relative flex-shrink-0" ref={dropdownRef}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowCountryDropdown(!showCountryDropdown);
                      }}
                      className="flex items-center gap-1 px-3 py-3 h-[52px] bg-transparent text-white text-sm font-medium hover:bg-white/5 transition-colors"
                    >
                      <span className="text-lg">{selectedCountry.flag}</span>
                      <span className="hidden sm:inline">{selectedCountry.code}</span>
                      <span className="sm:hidden">{selectedCountry.code}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showCountryDropdown ? "rotate-180" : ""}`} />
                    </button>
                    
                    {/* Dropdown países */}
                    {showCountryDropdown && (
                      <div className="absolute left-0 top-full mt-1 w-[220px] max-h-[220px] overflow-y-auto rounded-lg border border-[#c6922f]/30 bg-[#0a0f1a] shadow-xl z-50">
                        {COUNTRIES.map((country) => (
                          <button
                            key={country.code}
                            onClick={() => {
                              setSelectedCountry(country);
                              setShowCountryDropdown(false);
                            }}
                            className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-white/10 transition-colors ${
                              country.code === selectedCountry.code ? "bg-white/5 text-[#d4a94d]" : "text-white"
                            }`}
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="font-medium">{country.code}</span>
                            <span className="text-white/50 text-xs">{country.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Separador */}
                  <div className="w-px h-8 bg-[#c6922f]/30 flex-shrink-0" />

                  {/* Input número */}
                  <input 
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setPhoneNumber(value);
                    }}
                    placeholder="Número WhatsApp"
                    className="flex-1 h-full bg-transparent px-3 text-white placeholder:text-white/40 outline-none text-[16px] min-w-[80px]"
                  />
                </div>

                {/* Botón Enviar - debajo del input */}
                <button 
                  onClick={handleSendWhatsApp}
                  disabled={!docsVerified || sendingToWhatsApp}
                  className={`w-[92%] mx-auto h-[52px] rounded-[20px] text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition-all shadow-lg ${
                    !docsVerified || sendingToWhatsApp 
                      ? "bg-gray-600 cursor-not-allowed" 
                      : "bg-gradient-to-r from-[#16a34a] to-[#22c55e] hover:opacity-90"
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {sendingToWhatsApp ? "Enviando..." : "Enviar resultado"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
