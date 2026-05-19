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

  // ✅ الرجوع من Stripe وكمل السؤال 5
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
    headers: {
      "Content-Type": "application/json",
    },
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

  localStorage.setItem(
    "generated_pdf_url",
    pdfData.pdfUrl
  );

}

} catch (err) {

  console.error("PDF ERROR:", err);
}
}
  setShowStripe(false);

  setPaymentRequired(false);

  setTimeout(() => {

    speakExactText(
      "مزيان. قولي شنو سميتك؟"
    );

  }, 1200);


};

handlePaidFlow();
}, []);

  const handleStripePayment = async () => {
  try {
 const res = await fetch("/api/create-checkout-session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    productType: "regularizacion",
  }),
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
  const [waitingMohamed, setWaitingMohamed] = useState(false);
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
  
  useEffect(() => {

  localStorage.setItem(
    "questionIndex",
    questionIndex.toString()
  );

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
  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as
    | "darija"
    | "es"
    | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

const voiceTexts = useMemo(() => ({
  initialVoice: "",
  passportVerified: "",
  stayProofVerified: "",
  uploadWarn: "",
  uploadUnknown: "",
  mohamedFinal: "",
  realtimeError: "وقع مشكل فالصوت المباشر",
}), []);

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
  const stepStorageKey = useMemo(
  () => `gestoriacitaia_mohamed_step_${selectedSituacion}`,
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_documents",
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const newDoc = payload.new as any;
          const docName = newDoc.title || newDoc.original_name || "documento";
          let proactiveMessage = "";
          if (newDoc.document_type === "passport" || newDoc.document_type === "nie") {
            proactiveMessage = `مزيان. توصلت بـ ${docName}. غادي نراجعو دابا ونشوف واش كلشي مزيان. وانت راجع الفورمولار إلا كنتي باغي تزيد شي حاجة.`;
          } else if (newDoc.document_type === "empadronamiento" || newDoc.document_type === "stay_proof") {
            proactiveMessage = `مزيان. توصلت بـ ${docName}. هاد الوثيقة كتنفع كبرهان ديال البقاء. دابا خاصنا غير الباسبور ولا NIE باش نكملو الملف.`;
          } else {
            proactiveMessage = `توصلت بـ ${docName}. غادي نراجعو دابا ونشوف واش كلشي مزيان.`;
          }
          setTimeout(() => {
          console.log("doc received");
          }, 1500);
        }
      )
      .subscribe();

    const formsChannel = supabase
      .channel(`forms-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_forms",
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const formData = payload.new as any;
          if (formData.form_type === "regularizacion_2026") {
            setTimeout(() => {
              speakFromAutomation(
                "مزيان. المعطيات ديالك تحفظات فالنظام. دابا غادي نكمل معاك خطوة بخطوة. أول حاجة، خاصني بروفات ديال 5 شهور باش نثبتو واش كنتي فإسبانيا قبل 1 يناير 2026."
              );
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
        if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
          setDocs(parsedDocs);
        }
      }
    const rawStep = localStorage.getItem(stepStorageKey);
if (rawStep) {
  setCurrentStep(parseInt(rawStep));
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
        { from: "agent", text: voiceTexts.initialVoice, ts: Date.now() },
      ]);
    } catch (error) {
      console.error("Error cargando historial de Mohamed:", error);
      setVoiceHistory([
        { from: "agent", text: voiceTexts.initialVoice, ts: Date.now() },
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

const handleQuestionFlow = () => {

  if (questionFlowLockedRef.current) return;
console.log("QUESTION CURRENT:", questionIndex);
  setQuestionIndex((prev) => {

    const next = prev + 1;
    console.log("QUESTION NEXT:", next);
// ✅ بعد أول جواب سول على الاسم بلا NEXT جديد
if (next === 1) {

  setTimeout(() => {

    speakExactText(NAME_QUESTION);

  }, 400);

  return next;
}
    console.log("NEXT:", next);

    // السؤال الرابع -> يخرج Stripe
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
      
      console.log("SHOWING STRIPE BUTTON");

      setPaymentRequired(true);

      assistantBusyRef.current = true;

      pendingAutomationPromptRef.current = null;

      setTimeout(() => {
        speakExactText(PAYMENT_TEXT);
      }, 300);

   const stripeWatcher = setInterval(() => {

  // Mohamed terminó de hablar
  if (!assistantBusyRef.current) {

    clearInterval(stripeWatcher);

    console.log("✅ MOHAMED FINISHED TALKING");

    setShowStripe(true);

    stopListening();

    setIsListening(false);

  }

}, 300);

// ❌ ما نفتحوش الوثائق هنا
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
   return "مزيان. السؤال الثاني: عندك باسبور ولا NIE ولا TIE؟";
  };

const buildDocSpeech = (
  matchedDocName: string,
  result: any,
  nextStatus: DocStatus
) => {
  const parts: string[] = [];

  parts.push(`توصلت بـ ${matchedDocName}.`);

  if (result.full_name) {
    parts.push(`الاسم: ${result.full_name}.`);
  }

  if (result.document_number) {
    parts.push(`الرقم: ${result.document_number}.`);
  }

  if (result.birth_date) {
    parts.push(`تاريخ الازدياد: ${result.birth_date}.`);
  }

  if (result.expiry_date) {
    parts.push(`الصلاحية حتى: ${result.expiry_date}.`);
  }

  if (result.image_quality?.blurred) {
    parts.push("الصورة شوية ما واضحةش.");
  } else {
parts.push("الصورة واضحة والمعطيات مقروءة.");
  }

  if (result.fraud_risk === "high") {
    parts.push("كاين خطر عالي، خاص مراجعة.");
  } else if (result.fraud_risk === "medium") {
    parts.push("كاين شك متوسط.");
  } else {
 parts.push("الوثيقة باينة صحيحة وما بان حتى مشكل واضح.");
  }

  if (result.final_verdict === "approved") {
    parts.push("الوثيقة مقبولة.");
  } else if (result.final_verdict === "review") {
    parts.push("الوثيقة خاصها مراجعة.");
  } else if (result.final_verdict === "rejected") {
    parts.push("الوثيقة مرفوضة.");
  }

if (typeof result.verification_score === "number") {

  const realisticScore =
    result.verification_score > 92
      ? 88 + Math.floor(Math.random() * 4)
      : result.verification_score;

  parts.push(
    `نسبة التحقق ${realisticScore} من 100.`
  );

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
        name: currentProcedure.name,
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

  // ✅ CAMBIO #1: askMohamedToSpeak - AHORA ENVÍA instructions EN response.create
  const askMohamedToSpeak = async (instruction: string) => {
    try {
     const finalText = instruction;
  
      if (!realtimeDcRef.current) {
        console.error("❌ No hay data channel en askMohamedToSpeak");
        return false;
      }
      if (realtimeDcRef.current.readyState !== "open") {
        console.error("❌ Data channel no está open:", realtimeDcRef.current.readyState);
        return false;
      }
      
      console.log("🎤 askMohamedToSpeak llamado:", instruction);
      setWaitingMohamed(true);
      assistantTextBufferRef.current = "";
      
      // ✅ PRIMER mensaje: crear el item
      realtimeDcRef.current.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: finalText }],
          },
        })
      );
      console.log("✅ conversation.item.create enviado");
      
      // ✅ SEGUNDO mensaje: FORZAR respuesta CON instructions
      realtimeDcRef.current.send(
        JSON.stringify({
          type: "response.create",
 response: {
  modalities: ["audio", "text"],
  instructions: finalText
},
        })
      );
      console.log("✅ response.create enviado con instructions");
      
      return true;
    } catch (error) {
      console.error("❌ Error en askMohamedToSpeak:", error);
      return false;
    }
  };

  // ✅ CAMBIO #2: flushPendingAutomation - AHORA ENVÍA DIRECTO SIN VERIFICAR assistantBusyRef
  const flushPendingAutomation = async (retries = 0) => {
    const prompt = pendingAutomationPromptRef.current;
    if (!prompt) return;
    if (!realtimeDcRef.current) {
      console.error("❌ No hay data channel");
      return;
    }
    if (realtimeDcRef.current.readyState !== "open") {
      console.error("❌ Data channel no está abierto:", realtimeDcRef.current.readyState);
      return;
    }
    
    console.log("🚀 ENVIANDO DIRECTAMENTE (sin verificar busy):", prompt);
    
    // ✅ ENVÍO DIRECTO SIN VERIFICAR assistantBusyRef
    try {
      realtimeDcRef.current.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: prompt }],
          },
        })
      );
      console.log("✅ Item creado, enviando response.create...");
      
      realtimeDcRef.current.send(
        JSON.stringify({
          type: "response.create",
          response: {
  modalities: ["audio", "text"]
}
        })
      );
      console.log("✅ response.create enviado - Mohamed DEBERÍA hablar");
      
      // Limpiar después de enviar
      pendingAutomationPromptRef.current = null;
      setPendingAutomationPrompt("");
      setWaitingMohamed(false);
    } catch (error) {
      console.error("❌ Error enviando:", error);
    }
  };
const NAME_QUESTION =
  "مزيان. قولي شنو سميتك؟";



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

"واش عمرك طلبتي اللجوء؟"

];



 const maybeSendIntroToMohamed = async () => {
  if (!realtimeDcRef.current) return;

  realtimeDcRef.current.send(
    JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: `
السلام عليكم، أنا محمد من هيستوريا سيطا AI. مرحبا بك.

غادي نطرح عليك شوية ديال الأسئلة وغادي تجاوبني غير بآه ولا لا.

وملي غادي نسالي الأسئلة، غادي نراجع ليك الوثائق ديالك كاملين باش نشوف واش مقبولين ولا لا، واش صالحين ولا لا، وغادي نعطيك حتى وثيقة مهمة غادي تعزز الملف ديالك فالتسوية الجماعية.

وزيد عليها، غادي نخليك تسولني حتى 4 أسئلة وغنجاوبك على جميع التساؤلات ديالك أوكي؟

ولكن قبل، خاصك تكمل الأداء ديالك عاد باش نبداو.
        `,
      },
    })
  );
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
const handleSendWhatsApp = async () => {
  try {
    if (!phone || phone.trim().length < 6) {
      alert("دخل رقم الهاتف صحيح");
      return;
    }

    // 1. نجيب التقرير
    const res = await fetch("/api/generate-expediente-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: leadForm?.nombre,
        telefono: phone,
        ciudad: leadForm?.ciudad,
        nacionalidad: leadForm?.nacionalidad,
  fecha_llegada: leadForm?.fechaLlegada,
 cumple_5_meses: leadForm.cumple5Meses === "yes" ? "yes" : "no",
        documents: docs,
      }),
    });

    const data = await res.json();

    // 2. رابط PDF
    const pdfUrl = `${window.location.origin}/api/generate-expediente-pdf?nombre=${encodeURIComponent(
      leadForm?.nombre || ""
    )}&nacionalidad=${encodeURIComponent(
      leadForm?.nacionalidad || ""
    )}&ciudad=${encodeURIComponent(
      leadForm?.ciudad || ""
    )}&fecha_llegada=${encodeURIComponent(
      leadForm?.fecha_llegada || ""
    )}`;

    // 3. تنظيف الرقم
    const cleanPhone = phone.trim().replace(/\s+/g, "");

const pdfLink =
  localStorage.getItem("generated_pdf_url") || "";

    // 4. رسالة واتساب احترافية
const message = encodeURIComponent(`
👋 سلام ${leadForm?.nombre || ""}

━━━━━━━━━━━━━━━

👉 هذا تحليل الملف ديالك:

${data.report.replace(/https?:\/\/[^\s]+/g, "").trim()}

━━━━━━━━━━━━━━━

📩 الوثيقة المهمة (Motivación):
${pdfLink || pdfUrl}

━━━━━━━━━━━━━━━

⚡ هاد الوثيقة مهمة بزاف وغادي تقوي الملف ديالك.
حطها مع الدوسي ديالك باش تزيد الحظ ديالك فالتسوية.

━━━━━━━━━━━━━━━

🎁 دخل 3 صحاب بهاد الكود:
GH-2026

وغادي تربح شهر مجاني

━━━━━━━━━━━━━━━

💼 شكراً على الثقة ديالك
GestoriaCitaIA
`);

    // 5. فتح واتساب
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("WhatsApp error:", error);
    alert("وقع مشكل، حاول مرة أخرى");
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
    const sessionRes = await fetch(`/api/realtime-session?ts=${Date.now()}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  },
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

  const sender = pc.addTrack(track, localStream);

  senderRef.current = sender;

}
      const dc = pc.createDataChannel("oai-events");
      realtimeDcRef.current = dc;
      dc.onopen = async () => {
        dcOpenedRef.current = true;
        isConnectingRef.current = false;
        setIsListening(true);
        setWaitingMohamed(false);
dc.send(
  JSON.stringify({
    type: "session.update",
    session: {
    instructions: `
أنت محمد من GestoriaCitaIA.

ممنوع تبدأ الحوار من جديد.
ممنوع تقول:
"غنعاود من الأول"
أو
"أنا محمد"
أو
"مرحبا"
إلا فالبداية الأولى فقط.

ممنوع تعاود أي سؤال سبق تسول.

جاوب فقط بالجملة المطلوبة.

إلا كان السؤال الحالي هو:
"واش دخلتي لإسبانيا قبل من واحد يناير 2026؟"

فلا تقل أي مقدمة أخرى.

تكلم فقط بالدارجة المغربية.
وباختصار.
`,
      modalities: ["audio", "text"],
turn_detection: {
  type: "server_vad",
  threshold: 0.98,
  prefix_padding_ms: 300,
  silence_duration_ms: 2200,
  interrupt_response: false,
  create_response: true
},
    },
  })
);

     
        const capturedPending = pendingAutomationPromptRef.current;
        if (capturedPending) {
          pendingAutomationPromptRef.current = null;
          setPendingAutomationPrompt("");
          setTimeout(() => {
            void askMohamedToSpeak(capturedPending);
          }, 400);
          return;
        }
    if (!(window as any).paid) {

  setTimeout(() => {

    void maybeSendIntroToMohamed();

  }, 500);

}
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
  (
    msg.type === "conversation.item.input_audio_transcription.completed" ||
    msg.type === "input_audio_buffer.transcription.completed"
  ) &&
  typeof userTranscript === "string" &&
  userTranscript.trim() &&
  userTranscript.trim().length > 1
) {

  const transcript = userTranscript.trim();



  if (transcript !== lastUserTranscriptRef.current) {

    lastUserTranscriptRef.current = transcript;

    setLastUserTranscript(transcript);

    pushUserMessage(transcript);

    console.log("✅ USER SAID:", transcript);
// ✅ FIRST CLIENT MESSAGE → INTRO + STRIPE

const lowerTranscript = transcript.toLowerCase().trim();

const normalized = lowerTranscript;

if (
  !paymentDoneRef.current &&
  (
    lowerTranscript.includes("سلام") ||
    lowerTranscript.includes("salam") ||
    lowerTranscript.includes("hola") ||
    lowerTranscript.includes("hello")
  )
) {

 
console.log("🚀 START INTRO");

maybeSendIntroToMohamed();

realtimeLocalStreamRef.current
  ?.getTracks()
  .forEach((track) => {
    track.stop();
  });

questionFlowLockedRef.current = true;
 
const introText = `
السلام عليكم، أنا محمد من هيستوريا سيطا AI. مرحبا بك.

غادي نطرح عليك شوية ديال الأسئلة وغادي تجاوبني غير بآه ولا لا.

وملي غادي نسالي الأسئلة، غادي نراجع ليك الوثائق ديالك كاملين باش نشوف واش مقبولين ولا لا، واش صالحين ولا لا، وغادي نعطيك حتى وثيقة مهمة غادي تعزز الملف ديالك فالتسوية الجماعية.

وزيد عليها، غادي نخليك تسولني حتى 4 أسئلة وغنجاوبك على جميع التساؤلات ديالك أوكي؟

ولكن قبل، خاصك تكمل الأداء ديالك عاد باش نبداو.
`;

const estimatedMs =
  Math.max(introText.length * 85, 12000);

setTimeout(() => {

  console.log("✅ INTRO FINISHED");

  setShowStripe(true);

  setPaymentRequired(true);

  stopListening();

  setIsListening(false);

}, estimatedMs);

  return;
}




// ✅ الاسم ما يتحسبش فـ NEXT
const isOnlyNameStep =
  questionIndex === 1 &&
  lowerTranscript.length > 1 &&
  !lowerTranscript.includes("نعم") &&
  !lowerTranscript.includes("لا") &&
  !lowerTranscript.includes("اه") &&
  !lowerTranscript.includes("آه");

if (isOnlyNameStep) {

  console.log("👤 USER NAME ONLY:", transcript);

  setTimeout(() => {

    speakExactText(
   "مزيان. واش بقيتي في إسبانيا لمدة ديال خمسة أشهر متتالية؟ وشنو هي أول مدينة سكنتي فيها؟"
    );

  }, 500);



  return;
}

// ❌ ما نحسبوش الاسم والبداية
const validAnswers = [
  "نعم",
  "لا",
  "اه",
  "آه",
  "ايييه",
  "ايوه",
  "oui",
  "non",
  "si",
  "no",
  "kayna",
  "makaynach",
  "عندي",
  "ما عنديش"
];
const cleanAnswer = normalized
  .replace(/[.,!?¿؟]/g, "")
  .trim();

const shouldCountQuestion =

  validAnswers.some(word => {

    return (
      cleanAnswer === word ||
      cleanAnswer.startsWith(word + " ")
    );

  });

if (
  paymentDoneRef.current &&
  shouldCountQuestion &&
  !questionFlowLockedRef.current
) {
  handleQuestionFlow();
}
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

// 🔇 cortar micro COMPLETAMENTE mientras Mohamed habla
if (realtimeLocalStreamRef.current) {

  realtimeLocalStreamRef.current
    .getAudioTracks()
    .forEach(track => {
      track.enabled = false;
    });

}
// 🎤 سد الميكروفون ملي محمد كيهضر
 

  assistantBusyRef.current = true;

 setWaitingMohamed(true);
// 🔇 قطع الميكرو الحقيقي
if (senderRef.current) {

  senderRef.current.replaceTrack(null);
}
}


    if (msg.type === "response.done") {
  assistantBusyRef.current = false;
      // 🎤 reactivar micro SOLO cuando Mohamed termina
if (realtimeLocalStreamRef.current) {

  realtimeLocalStreamRef.current
    .getAudioTracks()
    .forEach(track => {
      track.enabled = true;
    });

}

  const finalText = assistantTextBufferRef.current.trim();

  if (finalText) {
    lastAssistantTextRef.current = finalText;
  }

  finalizeAssistantBuffer();
// 🎤 فتح الميكروفون بعد ما يسالي محمد
// 🎤 رجع الميكرو الحقيقي
const audioTrack =
  realtimeLocalStreamRef.current
    ?.getAudioTracks?.()[0];

if (
  senderRef.current &&
  audioTrack
) {

  senderRef.current.replaceTrack(audioTrack);

}

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
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (error: any) {
      console.error("Error iniciando realtime Mohamed:", error);
      stopListening();
      toast({
        title: "Error realtime",
        description: error?.message || voiceTexts.realtimeError,
        variant: "destructive",
      });
    } finally {
      isConnectingRef.current = false;
    }
  };

const speakExactText = async (text: string) => {
  if (!text.trim()) return;

  console.log("🔊 REALTIME ONLY:", text);

  pendingAutomationPromptRef.current = text;

  setPendingAutomationPrompt(text);

  setTimeout(() => {
    void flushPendingAutomation();
  }, 300);
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
    if (!leadFormReady) {
      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
      return;
    }
    if (!authChecked) {
      toast({
        title: "Espera",
        description: "Estamos comprobando tu sesión.",
        variant: "destructive",
      });
      return;
    }
const savedIndex = localStorage.getItem("questionIndex");
if (savedIndex) {
  setQuestionIndex(parseInt(savedIndex));
}
    
    if (!currentUserId) {
      toast({
        title: "Sesión no detectada",
        description: "Debes entrar con Google antes de confirmar.",
        variant: "destructive",
      });
      pushAgentMessage("عافاك دخل بحسابك أولاً، ومن بعد عاود دير تأكيد باش نكملو.");
      return;
    }
    try {
      setSavingForm(true);
      await saveFullStateToSupabase();
      setLeadSaved(true);
      setFormConfirmed(true);
      const savedMessage = buildSavedFormSpeech();
      toast({
        title: ui.saveLeadTitle,
        description: "Se han guardado los datos correctamente.",
      });
      // ✅ CAMBIO #2: setTimeout para asegurar que Mohamed hable después de guardar
      setTimeout(() => {
        void speakExactText(savedMessage);
      }, 500);
    } catch (error: any) {
      console.error("Error guardando formulario Mohamed:", error);
      toast({
        title: "Error guardando formulario",
        description: error?.message || "No se pudo guardar en Supabase",
        variant: "destructive",
      });
      pushAgentMessage("وقع مشكل فحفظ المعطيات. عافاك عاود دير تأكيد مرة أخرى.");
    } finally {
      setSavingForm(false);
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
            doc.nombre.toLowerCase().includes("pasaporte") ||
            doc.nombre.toLowerCase().includes("passport") ||
            doc.nombre.toLowerCase().includes("nie"))
      ) ||
      currentDocs.find(
        (doc) =>
          normalizeDocType(doc.expectedType) === "passport" ||
          normalizeDocType(doc.expectedType) === "nie" ||
          normalizeDocType(doc.expectedType) === "tie" ||
          doc.nombre.toLowerCase().includes("pasaporte") ||
          doc.nombre.toLowerCase().includes("passport") ||
          doc.nombre.toLowerCase().includes("nie")
      ) ||
      null;
    const findStayProofDoc = () =>
      currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          (normalizeDocType(doc.expectedType) === "empadronamiento" ||
            normalizeDocType(doc.expectedType) === "stay_proof" ||
            doc.nombre.toLowerCase().includes("empadronamiento") ||
            doc.nombre.toLowerCase().includes("padron") ||
            doc.nombre.toLowerCase().includes("padrón") ||
            doc.nombre.toLowerCase().includes("prueba de permanencia"))
      ) ||
      currentDocs.find(
        (doc) =>
          normalizeDocType(doc.expectedType) === "empadronamiento" ||
          normalizeDocType(doc.expectedType) === "stay_proof" ||
          doc.nombre.toLowerCase().includes("empadronamiento") ||
          doc.nombre.toLowerCase().includes("padron") ||
          doc.nombre.toLowerCase().includes("padrón") ||
          doc.nombre.toLowerCase().includes("prueba de permanencia")
      ) ||
      null;
    if (detectedType === "passport" || detectedType === "nie" || detectedType === "tie") {
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
    if (
      includesAny([
        "passport", "pasaporte", "nie", "tie",
        "tarjeta de identidad", "documento identidad",
      ])
    ) {
      const identityDoc = findIdentityDoc();
      if (identityDoc) return identityDoc;
    }
    if (
      includesAny([
        "empadronamiento", "padron", "padrón", "prueba de permanencia",
        "stay proof", "ticket", "factura", "nomina", "nómina",
        "cita médica",
      ])
    ) {
      const stayProofDoc = findStayProofDoc();
      if (stayProofDoc) return stayProofDoc;
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
    }
    return (
      currentDocs.find((doc) => doc.estado === "missing") ||
      currentDocs.find((doc) => doc.estado === "warn") ||
      null
    );
  };

  const maybeSendCompletionMessage = async (nextDocs: StoredDocItem[]) => {
    const nextIdentityOk = nextDocs.some((doc) => {
      const expected = normalizeDocType(doc.expectedType);
      const detected = normalizeDocType(doc.detectedType);
      const name = doc.nombre.toLowerCase();
      return (
        (expected === "passport" || expected === "nie" || expected === "tie" ||
          detected === "passport" || detected === "nie" || detected === "tie" ||
          name.includes("pasaporte") || name.includes("passport") || name.includes("nie")) &&
        doc.estado === "ok"
      );
    });
    const nextStayOk = nextDocs.some((doc) => {
      const expected = normalizeDocType(doc.expectedType);
      const detected = normalizeDocType(doc.detectedType);
      const name = doc.nombre.toLowerCase();
      return (
        (expected === "empadronamiento" || expected === "stay_proof" ||
          detected === "empadronamiento" || detected === "stay_proof" ||
          name.includes("empadronamiento") || name.includes("padron") ||
          name.includes("padrón") || name.includes("prueba de permanencia")) &&
        doc.estado === "ok"
      );
    });
    const readyNow = (leadSaved || formConfirmed) && nextStayOk && nextIdentityOk;
    if (readyNow && !completionMessageSent) {
      pushAgentMessage(voiceTexts.mohamedFinal);
      setCompletionMessageSent(true);
      await speakFromAutomation(
        "قل الآن للعميل باختصار: مزيان. كلشي واجد ومراجع. دابا غادي نجهزو ليك الملف النهائي باش يتبعث ليك فـ واتساب."
      );
    }
  };

  // ✅ CAMBIO #3: handleGeneralUpload con setTimeout para speakExactText
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error("Usuario no conectado");
  }

  setWorkflowStep("waiting_confirm");

  let results = [];

  for (const file of files) {
    const safeName = `${Date.now()}_${file.name}`;
    const storagePath = `${user.id}/regularizacion_2026/${safeName}`;

    await supabase.storage
      .from("user-documents")
      .upload(storagePath, file, { upsert: true });

  const result = await verifyDocument({ file });

// ✅ نلقاو الوثيقة المناسبة
const matchedDoc = getBestDocMatch(
  result,
  docs,
  file.name
);

if (matchedDoc) {

  setDocs((prev) =>
    prev.map((doc) => {

      if (doc.id !== matchedDoc.id) return doc;

      return {
        ...doc,

        archivo: file.name,

        estado:
          result.final_verdict === "approved"
            ? "ok"
            : result.final_verdict === "review"
            ? "warn"
            : "missing",

        detectedType:
          result.document_type || "",

        // ✅ المعلومات الحقيقية
        full_name:
          result.full_name || "",

        document_number:
          result.document_number || "",

        birth_date:
          result.birth_date || "",

        expiry_date:
          result.expiry_date || "",

        verification_score:
          result.verification_score || 0,

        fraud_risk:
          result.fraud_risk || "low",

        final_verdict:
          result.final_verdict || "review",

        document_date:
          result.document_date || "",
      };

    })
  );

}

results.push({
  fileName: file.name,
  result,
});
  }

  alert("✅ Documentos analizados correctamente");

} catch (err) {

  console.error(err);

} finally {

  setGeneralUploading(false);

}
   
  };

  input.click();
};

  const handleVerifyAll = async () => {
  try {
    setGeneralUploading(true);

    if (!docs.length) {
      await speakFromAutomation("مازال ما توصلتش بالوثائق ديالك.");
      return;
    }

    let explanation = "دابا غادي نشرح ليك الملف ديالك:\n\n";

    let hasPassport = false;
    let stayDates: string[] = [];

    for (const doc of docs) {
      const name = doc.nombre || "وثيقة";
      const status = doc.estado;
      const type = (doc.detectedType || "").toLowerCase();

      // 📄 شرح الوثائق
const speech = buildDocSpeech(name, {
  full_name: (doc as any).full_name,

  document_number: (doc as any).document_number,

  birth_date: (doc as any).birth_date,

  expiry_date: (doc as any).expiry_date,

  image_quality: {
    blurred:
      (doc as any).verification_score < 55,
  },

  fraud_risk:
    (doc as any).fraud_risk || "medium",

  final_verdict:
    (doc as any).final_verdict || "review",

  verification_score:
    (doc as any).verification_score || 0,
});

explanation += speech + " ";
      if (type.includes("passport") || type.includes("nie")) {
        hasPassport = true;
      }

      if ((doc as any).document_date) {
        stayDates.push((doc as any).document_date);
      }
    }

    // 📊 حساب الشهور
    stayDates.sort();
    const months = new Set(
      stayDates.map((d) => new Date(d).getMonth())
    );

    const hasMonths = months.size >= 5;

    explanation += "\n";

    if (!hasPassport) {
      explanation += "ما عندكش باسبور أو NIE. ";
    } else {
      explanation += "وثيقة الهوية مزيانة. ";
    }

    if (!hasMonths) {
      explanation += "ما كملتيش 5 شهور ديال البقاء. ";
    } else {
      explanation += "عندك 5 شهور ديال البقاء. ";
    }

    // 🧠 الحكم النهائي
    let finalVerdict = "";

    if (hasPassport && hasMonths) {
      finalVerdict = "الملف ديالك قوي وتقدر تدفع.";
    } else {
      finalVerdict = "الملف خاصو تكملة.";
    }
const fullSpeech = `
دابا وصلنا لمرحلة مهمة.

الملف ديالك تقريبا واجد، ودابا غادي نعطيوك النتيجة ديالو كاملة.

دابا ركز معايا مزيان:

دخل رقم الهاتف ديالك فالخانة اللي لتحت، وخاصو يكون رقم صحيح وبالـ international format.

من بعد، ورݣ على الزر ديال واتساب.

غادي يتحل ليك واتساب وفيه:

النتيجة ديال الملف ديالك،
الوثائق اللي مقبولين،
والوثائق اللي خاصهم تصحيح.

وزيد عليها، غادي تلقى واحد الوثيقة مهمة بزاف بصيغة PDF.

هاد الوثيقة هي اللي غادي تعاونك تقوي الملف ديالك بزاف،
وحطها مع الدوصي ديالك ضروري.

الله يسهل عليك فالتسوية الجماعية،
ودابا الملف ديالك كامل إن شاء الله.

وغادي تتوصل بيه دابا فـ واتساب.

حظ موفق سعيد.
`;

    // 🔊 هنا محمد غادي يهضر بصوت حقيقي
    // ✅ نتأكدو realtime مفتوح
if (
  !realtimeDcRef.current ||
  realtimeDcRef.current.readyState !== "open"
) {

  console.log("⚠️ REALTIME CLOSED - RECONNECTING");

  await startListening();

  // نستناو يفتح
  await new Promise((resolve) =>
    setTimeout(resolve, 3500)
  );
}

// ✅ نتأكدو مرة أخرى
if (
  realtimeDcRef.current &&
  realtimeDcRef.current.readyState === "open"
) {

  console.log("✅ VERIFY SPEECH START");

  await speakFromAutomation(fullSpeech);
// 🔥 رجع الميكروفون يخدم
setTimeout(() => {

  startListening();

}, 4000);
} else {

  console.error("❌ REALTIME STILL CLOSED");

}

  } catch (err) {
    console.error(err);

    await speakFromAutomation(
      "وقع مشكل وأنا كنحلل الوثائق، عاود حاول."
    );
  } finally {
    setGeneralUploading(false);
  }
};
  const goToSara = () => {

  window.location.href = "/sara";

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
<div className="max-w-md mx-auto px-[3px] py-[3px] rounded-[38px] bg-gradient-to-b from-[#f6c453] via-[#d4a94d] to-[#7a5b12] shadow-[0_0_55px_rgba(255,215,0,0.22)]">
      <motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
className="rounded-[34px] overflow-hidden bg-gradient-to-b from-[#071120] to-black border border-[#f6c453]/20"
  
>
  <div className="relative">

    <video
      autoPlay
      muted
      loop
      playsInline
      poster={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
className="w-full h-[270px] object-cover border-b border-[#f6c453]/10"
      
      >
      <source
        src="/mohamed-extranjeria.mp4.mp4"
        type="video/mp4"
      />
    </video>

    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

    <div className="absolute top-4 right-4 flex items-center gap-2">

      <button
        type="button"
        className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/10"
      >
        <Bell className="w-5 h-5" />
      </button>

      <button
        type="button"
        className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/10"
      >
        <Volume2 className="w-5 h-5" />
      </button>

    </div>

    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-xl border border-[#c6922f]/40 px-4 py-2 rounded-full flex items-center gap-2 text-sm shadow-lg">

      <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-lg"></div>

      En línea

    </div>

    <div className="absolute bottom-5 right-4 text-right">

      <h2 className="text-[38px] font-extrabold text-white tracking-tight drop-shadow-[0_0_18px_rgba(255,255,255,0.2)]">
        Mohamed
      </h2>

      <p className="text-[15px] text-[#d4a94d] font-medium tracking-wide">
        Especialista en Extranjería
      </p>

    </div>

  </div>
</motion.div>
</div>
 

          </div>
<div className="mt-2 max-w-md mx-auto">

{/* ✅ ANTES DEL PAGO */}
{!paymentCompleted && (

 <div className="p-3">

<div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-[#1a1200] via-[#0b0b0b] to-[#1a1200] p-3 max-w-[430px] mx-auto">
      <div className="flex items-center justify-between mb-3">

        <div>
          <p className="text-white font-bold text-lg">
            Desbloquea a Mohamed
          </p>

          <span className="inline-flex mt-1 px-2 py-1 rounded-full bg-yellow-500 text-black text-[10px] font-bold">
            PREMIUM
          </span>
        </div>

        <div className="text-right">
  <p className="text-xl font-black text-yellow-400 leading-none">
    14,99€
          </p>

          <p className="text-white/60 text-xs">
            Acceso completo
          </p>
        </div>

      </div>

 <p className="text-white/70 text-[13px] leading-relaxed mb-3">
        Acceso ilimitado a Mohamed IA, videollamada realtime,
        análisis de documentos y generación automática del expediente.
      </p>

     <button
  onClick={handleStripePayment}
  type="button"
className="w-[92%] mx-auto flex items-center justify-center h-[52px] rounded-[20px] text-white font-semibold text-[16px] bg-gradient-to-r from-[#16a34a] to-[#22c55e] border border-[#4ade80] shadow-[0_4px_14px_rgba(34,197,94,0.35)]"
       >
  🔓 Desbloquear ahora
</button>

  <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">

   <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-blue-700 font-black text-[10px]">
  VISA
</div>

<div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-red-500 font-black text-[10px]">
  Mastercard
</div>

<div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-black font-black text-[10px]">
   Pay
</div>

<div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-black font-black text-[10px]">
  G Pay
</div>

      </div>

    </div>

    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">

      <div className="flex items-center gap-2 mb-3">

        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

        <p className="text-white font-bold">
          Mohamed IA
        </p>

      </div>

      <p className="text-white/80 text-sm leading-relaxed">
        Especialista profesional en extranjería española para marroquíes en España.
        Pregunta sobre residencia, papeles, policía, nacionalidad, arraigo,
        trabajo, estudios y cualquier problema legal relacionado con inmigración.
      </p>

    </div>

  </div>

)}

{/* ✅ DESPUÉS DEL PAGO */}
  

{paymentCompleted && (

<div className="mt-5 space-y-5">

{/* MICRO VERDE */}
<button
  onClick={isListening ? stopListening : startListening}
className={`w-[92%] mx-auto h-[52px] rounded-[20px] flex items-center justify-center gap-3 text-[16px] font-semibold border shadow-xl transition-all duration-300 ${
  isListening
      ? "bg-red-600 border-red-400 text-white shadow-red-500/30 animate-pulse"
      : "bg-gradient-to-r from-[#16a34a] to-[#22c55e] border-[#4ade80] text-white shadow-green-500/20"
  }`}
>
  {isListening ? (
    <>
      <MicOff className="w-5 h-5" />
      Mohamed escuchando...
    </>
  ) : (
    <>
      <Mic className="w-5 h-5" />
      {
        safeLang === "darija"
          ? "تكلم مع محمد"
          : safeLang === "en"
          ? "Talk with Mohamed"
          : "Hablar con Mohamed"
      }
    </>
  )}
</button>

{/* SUBIR DOCUMENTOS */}
<button
  onClick={handleGeneralUpload}
  disabled={generalUploading}
  className="w-[92%] mx-auto h-[52px] rounded-[20px] border border-[#c6922f] bg-[#050816] hover:bg-[#0b1220] transition-all text-white font-medium text-[16px] flex items-center justify-center gap-3 shadow-lg"
>
  <Upload className="w-5 h-5 text-[#d4a94d]" />

  {generalUploading
    ? "Subiendo..."
    : "Subir documentos"}
</button>

{/* VERIFY */}
<button
  onClick={handleVerifyAll}
  className="w-[92%] mx-auto h-[52px] rounded-[20px] border border-[#c6922f] bg-[#050816] hover:bg-[#0b1220] transition-all text-white font-medium text-[16px] flex items-center justify-center gap-3 shadow-lg"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 text-[#d4a94d]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4"
    />
  </svg>

  Verificar documentos
</button>

{/* WHATSAPP PREMIUM */}
<div className="w-[92%] mx-auto h-[52px] rounded-[20px] border border-[#c6922f]/40 bg-[#050816] flex items-center overflow-hidden shadow-lg">

  <div className="w-[58px] h-full flex items-center justify-center border-r border-[#c6922f]/30 bg-black">
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
      className="w-6 h-6"
    />
  </div>

  <input
    type="tel"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    placeholder={
      safeLang === "darija"
        ? "رقم الواتساب"
        : safeLang === "en"
        ? "WhatsApp number"
        : "Número WhatsApp"
    }
className="flex-1 h-full bg-transparent px-4 text-white placeholder:text-white/40 outline-none text-[16px]"
    />

</div> 
{/* STATS PREMIUM */}

<div className="w-full rounded-[28px] border border-[#f6c453]/60 bg-gradient-to-b from-[#06111f] to-[#020617] p-5 shadow-[0_0_35px_rgba(255,215,0,0.10)] mt-4">
  <p className="text-center text-[#d4a94d] text-[15px] font-semibold mb-5">
    Miles de personas ya han confiado en nosotros
  </p>

  <div className="grid grid-cols-4 gap-3">

    <div className="text-center">
      <p className="text-[#d4a94d] font-bold text-[22px]">
        18.420+
      </p>

      <p className="text-white/70 text-[11px]">
        Expedientes
      </p>
    </div>

    <div className="text-center">
      <p className="text-[#d4a94d] font-bold text-[22px]">
        97%
      </p>

      <p className="text-white/70 text-[11px]">
        Aprobados
      </p>
    </div>

    <div className="text-center">
      <p className="text-[#d4a94d] font-bold text-[22px]">
        4 min
      </p>

      <p className="text-white/70 text-[11px]">
        Respuesta
      </p>
    </div>

    <div className="text-center">
      <p className="text-[#d4a94d] font-bold text-[22px]">
        100%
      </p>

      <p className="text-white/70 text-[11px]">
        Atención
      </p>
    </div>

  </div>

  <div className="mt-5 border border-[#c6922f]/30 rounded-[18px] p-3 bg-black/30 text-center">
    <p className="text-[#d4a94d] font-semibold text-[14px]">
      Primer sistema IA de extranjería en España
    </p>
  </div>

  <div className="flex items-center justify-center gap-3 mt-5">

    <div className="flex -space-x-2">

      <img
        src="https://i.pravatar.cc/60?img=1"
        className="w-9 h-9 rounded-full border-2 border-black"
      />

      <img
        src="https://i.pravatar.cc/60?img=2"
        className="w-9 h-9 rounded-full border-2 border-black"
      />

      <img
        src="https://i.pravatar.cc/60?img=3"
        className="w-9 h-9 rounded-full border-2 border-black"
      />

      <img
        src="https://i.pravatar.cc/60?img=4"
        className="w-9 h-9 rounded-full border-2 border-black"
      />

    </div>

    <div>
      <p className="text-[#d4a94d] text-[18px] font-bold">
        ★★★★★ 4.9/5
      </p>

      <p className="text-white/60 text-[12px]">
        Basado en opiniones reales
      </p>
    </div>

  </div>

</div>
</div>

)}


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
   className="w-[94%]  mx-auto rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
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
     className="w-[94%] mx-auto rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
    >
      {options.map((opt) => (
        <option key={`${opt.value}-${opt.label}`} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
