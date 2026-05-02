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
  const [generalDocsEnabled, setGeneralDocsEnabled] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [waitingForDocument, setWaitingForDocument] = useState(false);
  const [documentsUnlocked, setDocumentsUnlocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [formConfirmed, setFormConfirmed] = useState(false);
  const [confirmUnlocked, setConfirmUnlocked] = useState(false);
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
const MOHAMED_SYSTEM_PROMPT = `
أنت محمد من GestoriaCitaIA، مستشار مختص في قوانين الهجرة والتسوية في إسبانيا.

مهمتك:
تهضر مع الزبون بالدارجة المغربية فقط، بطريقة طبيعية، احترافية، وواضحة، وتراجع معاه الملف ديالو خطوة بخطوة حتى تعرف واش يقدر يدفع على Regularización 2026 ولا لا.

قواعد مهمة:
- هضر غير بالدارجة المغربية.
- ما تستعملش الإسبانية إلا إذا الزبون هضر بيها.
- ما تستعملش العربية الفصحى.
- ما تكونش روبو.
- هضر بحال إنسان حقيقي.
- سؤال واحد كل مرة.
- ما تطولش.
- جاوب بوضوح.
- إذا الزبون جاوب نعم/لا كمل مباشرة.
- إذا نقص شي وثيقة قولها بوضوح.
- إذا الملف قوي قولها.
- إذا الملف ناقص قول شنو خاص.

الترتيب ديال الأسئلة:

1) سلم على الزبون وقدّم راسك باختصار.
2) سول: واش نتا دابا داخل إسبانيا؟
3) سول: شحال هادي دخلتي لإسبانيا؟
4) سول: واش دخلتي قبل 1 يناير 2026؟
5) سول: واش عندك شي بروفات كيثبتو أنك كنتي هنا؟
6) سول: بحال padrón، تحويلات، فواتير، تيكيات، موعد طبي، مدرسة...
7) سول: واش عندك باسبور؟
8) سول: واش عندك NIE ولا TIE؟
9) سول: واش درتي بصمات من قبل؟
10) سول: واش عندك طلب لجوء؟
11) سول: واش عندك رفض لجوء؟
12) سول: واش عندك سوابق عدلية؟
13) سول: واش خدام دابا؟
14) سول: واش عندك عرض عمل؟
15) سول: واش مزوج؟
16) سول: واش عندك ولاد؟
17) سول: واش عندك عقد كراء؟
18) سول: واش مسجل فالمارياخ؟
19) سول: شنو المدينة اللي ساكن فيها؟
20) سول: واش بغيتي نراجعو الوثائق دابا؟

من بعد التحليل:

إذا الملف قوي:
"مزيان، من اللي بان ليا الملف ديالك عندو حظوظ مزيانة."

إذا ناقص بروفات:
"خاصنا بروفات أكثر باش نقويو الملف."

إذا ناقص باسبور:
"خاص الباسبور ولا وثيقة هوية."

إذا عندو مشكل:
"كاين واحد المشكل خاصنا نخدمو عليه."

إذا كلشي واجد:
"الملف واجد، نقدروا نكملو للمرحلة الجاية."

أسلوبك:
محامي محترف + إنسان قريب + سريع + ذكي.
`;
  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

const voiceTexts = useMemo(
  () => ({
    initialVoice:
      "السلام عليكم، أنا محمد من GestoriaCitaIA. غادي نراجع معاك الملف ديال التسوية الجماعية خطوة بخطوة. جاوبني غير بآه ولا لا. السؤال الأول: واش نتا دابا فإسبانيا؟",

    voiceBlocked:
      "ضغط على الميكروفون باش نبداو.",

    savedLeadReply:
      "مزيان. دابا نكملو. واش عندك باسبور ولا NIE ولا TIE؟",

    passportVerified:
      "توصلت بوثيقة الهوية.",

    stayProofVerified:
      "توصلت بوثائق الإثبات.",

    uploadWarn:
      "الوثيقة وصلت ولكن خاصها مراجعة.",

    uploadUnknown:
      "توصلت بالوثيقة وغادي نراجعها.",

    mohamedFinal:
      "مزيان. الملف ديالك واجد ومراجع. دابا ضغط على Confirm باش توصلك النتيجة فالواتساب.",

    realtimeError:
      "وقع مشكل فالاتصال. عاود حاول."
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
            speakFromAutomation(proactiveMessage);
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
    parts.push("الصورة واضحة.");
  }

  if (result.fraud_risk === "high") {
    parts.push("كاين خطر عالي، خاص مراجعة.");
  } else if (result.fraud_risk === "medium") {
    parts.push("كاين شك متوسط.");
  } else {
    parts.push("ما بان حتى خطر مهم.");
  }

  if (result.final_verdict === "approved") {
    parts.push("الوثيقة مقبولة.");
  } else if (result.final_verdict === "review") {
    parts.push("الوثيقة خاصها مراجعة.");
  } else if (result.final_verdict === "rejected") {
    parts.push("الوثيقة مرفوضة.");
  }

  if (typeof result.verification_score === "number") {
    parts.push(`نسبة التحقق ${result.verification_score} من 100.`);
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
    if (
  lower.includes("زر الوثائق") ||
  lower.includes("صيفط") ||
  lower.includes("رفع الوثائق") ||
  lower.includes("subir documentos")
) {
  setGeneralDocsEnabled(true);
}

    if (
  lower.includes("الملف ديالك واجد") ||
  lower.includes("مراجع") ||
  lower.includes("قوي") ||
  lower.includes("ضعيف") ||
  lower.includes("normal")
) {
  setConfirmUnlocked(true);
}
   if (
  lower.includes("صيفط") ||
  lower.includes("جميع الوثائق") ||
  lower.includes("رفع الوثائق") ||
  lower.includes("نقدروا نراجعو الوثائق") ||
  lower.includes("الملف واجد")
) {
  setDocumentsUnlocked(true);
}
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
      const brainRes = await fetch("/api/mohamed-brain", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    lang: "darija",
    userMessage: instruction,
    documents: docs,
  }),
});

const brainData = await brainRes.json();
const finalText = brainData.reply || instruction;
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
            modalities: ["audio", "text"],
            instructions: prompt 
          },
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

const maybeSendIntroToMohamed = async () => {
  await askMohamedToSpeak(
    "قل حرفياً: السلام عليكم، أنا محمد، مرحبا بك في GestoriaCitaIA. إلى بغيتي نعاونك باش تجهز الملف ديالك ديال التسوية الجماعية كامل، غادي نسولك بعض الأسئلة. جاوبني غير بآه ولا لا، فهمتي؟ السؤال الأول: واش نتا دابا فإسبانيا؟"
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
        pc.addTrack(track, localStream);
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
      instructions: MOHAMED_SYSTEM_PROMPT,
      modalities: ["audio", "text"],
      turn_detection: {
        type: "server_vad",
        threshold: 0.75,
        prefix_padding_ms: 300,
        silence_duration_ms: 800,
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
        assistantTextBufferRef.current = "";
lastAssistantTextRef.current = "";
lastUserTranscriptRef.current = "";
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
 const sdpRes = await fetch(
  "https://api.openai.com/v1/realtime/calls?model=gpt-4o-realtime-preview",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ephemeralKey}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp,
  }
);
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
    
    console.log("🔊 speakExactText llamado:", text);
    pushAgentMessage(text);
    
    pendingAutomationPromptRef.current = text;
    setPendingAutomationPrompt(text);
    
    // ✅ Espera 300ms y DISPARA flush SIEMPRE
    setTimeout(() => {
      console.log("⚡ Forzando flushPendingAutomation...");
      void flushPendingAutomation();
    }, 300);
  };

  const speakFromAutomation = async (instruction: string) => {
    if (!instruction.trim()) return;

    console.log("🎤 Mohamed quiere hablar proactivamente:", instruction);

    if (realtimeDcRef.current && realtimeDcRef.current.readyState === "open" && !assistantBusyRef.current) {
      console.log("✅ Usando sesión existente");
      pendingAutomationPromptRef.current = instruction;
      await flushPendingAutomation();
      return;
    }

    console.log("🔌 Creando sesión temporal...");
    
    try {
      const sessionRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant: "mohamed" }),
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData?.value) {
        throw new Error("No se pudo obtener token");
      }

      const ephemeralKey = sessionData.value;
      const pc = new RTCPeerConnection();

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream && remoteAudioRef.current) {
          console.log("🔊 Audio remoto recibido - Reproduciendo...");
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          
          remoteAudioRef.current.play().catch(err => {
            console.error("❌ Error al reproducir:", err);
            toast({
              title: "Mohamed tiene algo que decir",
              description: instruction.substring(0, 50) + "...",
            });
          });
        }
      };

      const dc = pc.createDataChannel("oai-events");
      
      dc.onopen = () => {
        console.log("✅ Sesión lista - Enviando mensaje");
        dc.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: instruction }],
          },
        }));
        
        dc.send(JSON.stringify({
          type: "response.create",
          response: { modalities: ["audio", "text"] },
        }));
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "response.done") {
            console.log("✅ Respuesta completada - Cerrando en 2s");
            setTimeout(() => {
              dc.close();
              pc.close();
            }, 2000);
          }
        } catch (e) {}
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

      if (!sdpRes.ok) throw new Error("Error en SDP");

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      
      console.log("✅ Conexión WebRTC establecida");

    } catch (error) {
      console.error("❌ Error en speakFromAutomation:", error);
      pushAgentMessage(instruction);
    }
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

      // 🔊 Mohamed habla antes de analizar
      await speakFromAutomation(
        "مزيان، توصلت بالوثائق ديالك. دابا غادي نحللهم واحد بشوية، صبر معايا."
      );

      let results = [];
      let speeches: string[] = [];

      for (const file of files) {
        const safeName = `${Date.now()}_${file.name}`;
        const storagePath = `${user.id}/regularizacion_2026/${safeName}`;

        // 📤 SUBIR
        const { error: uploadError } = await supabase.storage
          .from("user-documents")
          .upload(storagePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        console.log("✅ SUBIDO:", file.name);

        // 🧠 ANALIZAR DOCUMENTO
        const result = await verifyDocument(file);

        results.push({
          fileName: file.name,
          result,
        });

        // 🔊 Mohamed explica cada documento
        const speech = buildDocSpeech(file.name, result, "ok");
speeches.push(speech);
      }
if (speeches.length > 0) {
  await speakFromAutomation(speeches.join(" "));
}
      // 🧠 RESUMEN FINAL INTELIGENTE
      let hasPassport = false;
      let hasStayProof = false;
      let validDocs = 0;

      for (const r of results) {
        const type = (r.result?.document_type || "").toLowerCase();

        if (type.includes("passport") || type.includes("nie")) {
          hasPassport = true;
        }

        if (
          type.includes("empadronamiento") ||
          type.includes("stay_proof")
        ) {
          hasStayProof = true;
        }

        if (r.result?.final_verdict === "approved") {
          validDocs++;
        }
      }

      let finalMessage = "";

      if (hasPassport && hasStayProof) {
        finalMessage =
          "مزيان بزاف. الملف ديالك باين فيه شروط مزيانة. نقدروا نكملو للمرحلة الجاية.";
      } else if (!hasPassport) {
        finalMessage =
          "كاين مشكل. خاصنا الباسبور ولا NIE باش نكملو الملف.";
      } else if (!hasStayProof) {
        finalMessage =
          "خاصنا بروفات ديال 5 شهور باش نقويو الملف ديالك.";
      } else {
        finalMessage =
          "الملف ديالك خاصو شوية مراجعة قبل ما نكملو.";
      }

      // 🔊 Mohamed FINAL
      await speakFromAutomation(finalMessage);

      alert("✅ Documentos analizados correctamente");
    } catch (err) {
      console.error(err);

      await speakFromAutomation(
        "وقع مشكل وأنا كنحلل الوثائق. عاود حاول مرة أخرى."
      );

      alert("❌ Error subiendo archivos");
    } finally {
      setGeneralUploading(false);
    }
  };

  input.click();
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
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }}
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
                {waitingForDocument && !generalUploading && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 px-3 py-3 text-sm text-amber-200">
                    Mohamed está esperando el documento que te pidió.
                  </div>
                )}
              </div>
              <div className="border-t border-white/10 p-3">
    <button
  onClick={handleGeneralUpload}
disabled={false}
  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold text-xs px-4 py-3 transition-colors"
  type="button"
      
>
  {generalUploading ? (
    <>
      <motion.div
        className="w-3.5 h-3.5 border border-primary-foreground border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
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

{!documentsUnlocked && (
  <p className="mt-2 text-[10px] text-amber-300 text-center">
    كمل مع محمد الأسئلة باش يتحل رفع الوثائق
  </p>
)}
                <p className="mt-2 text-[10px] text-white/50 text-center">
                  {ui.uploadGeneralDesc}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
     <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
  <h3 className="text-lg font-bold text-white mb-3">
    Confirmación rápida
  </h3>

  <button
onClick={() => alert("OK")}
   disabled={false}
    className="w-full rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-white py-4 font-bold transition-colors"
    type="button"
  >
    ✅ Confirmar
  </button>
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
