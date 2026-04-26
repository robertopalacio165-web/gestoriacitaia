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
  form_:Record<string, any> | null;
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
  const isConnectingRef = useRef(false);
  const assistantBusyRef = useRef(false);

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as
    | "darija"
    | "es"
    | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

  const voiceTexts = useMemo(
    () => ({
      initialVoice:
        "السلام عليكم، أنا محمد. غادي نعاونك خطوة بخطوة باش نراجع الملف ديالك. عمر ليا الفورمولار الأول، ومن بعد نكمل معاك بالصوت.",
      savedLeadReply:
        "مزيان. المعطيات ديالك تحفظات فالنظام. دابا نكمل معاك ونسولك على الوثائق خطوة بخطوة.",
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
        const {  { session } } = await supabase.auth.getSession();
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
    const {  { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const handleSaveLeadForm = async () => {
    console.log("🔵 INICIANDO GUARDADO DE FORMULARIO");
    
    if (!leadFormReady) {
      console.log("❌ Formulario incompleto");
      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
      return;
    }
    
    if (!authChecked) {
      console.log("⏳ Esperando autenticación...");
      toast({
        title: "Espera",
        description: "Estamos comprobando tu sesión.",
        variant: "destructive",
      });
      return;
    }
    
    if (!currentUserId) {
      console.log("❌ No hay usuario autenticado");
      toast({
        title: "Sesión no detectada",
        description: "Debes entrar con Google antes de confirmar.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSavingForm(true);
      console.log("✅ Iniciando guardado en Supabase...");
      
      const payload = {
        applicant: {
          nombre: leadForm.nombre,
          telefono: leadForm.telefono,
          nie_pasaporte: leadForm.niePasaporte,
          ciudad: leadForm.ciudad,
          nacionalidad: leadForm.nacionalidad,
          fecha_llegada: leadForm.fechaLlegada,
          cumple_5_meses: leadForm.cumple5Meses,
          asilo: leadForm.asilo,
          penales: leadForm.penales,
        },
        procedure: {
          key: selectedSituacion,
          name: currentProcedure.name,
        },
        updated_at: new Date().toISOString(),
      };

      const rowData = {
        user_id: currentUserId,
        case_id: null,
        form_type: "regularizacion_2026",
        title: "Formulario Mohamed Regularización 2026",
        form_ payload,
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      console.log("📤 Enviando a Supabase:", rowData);

      const {  existingForm } = await supabase
        .from("formularios_de_usuario")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("form_type", "regularizacion_2026")
        .limit(1)
        .maybeSingle<UserFormRow>();

      let error;
      if (existingForm?.id) {
        console.log("✏️ Actualizando formulario existente:", existingForm.id);
        const { error: updateError } = await supabase
          .from("formularios_de_usuario")
          .update(rowData)
          .eq("id", existingForm.id);
        error = updateError;
      } else {
        console.log("➕ Insertando nuevo formulario");
        const { error: insertError } = await supabase
          .from("formularios_de_usuario")
          .insert(rowData);
        error = insertError;
      }

      if (error) {
        console.error("❌ Error en Supabase:", error);
        throw new Error(error.message);
      }

      console.log("✅ Formulario guardado correctamente");
      setLeadSaved(true);
      setFormConfirmed(true);
      
      toast({
        title: ui.saveLeadTitle,
        description: "Se han guardado los datos correctamente.",
      });
      
      pushAgentMessage(voiceTexts.savedLeadReply);
      
    } catch (error: any) {
      console.error("❌ ERROR CRÍTICO:", error);
      toast({
        title: "Error guardando formulario",
        description: error?.message || "No se pudo guardar en Supabase",
        variant: "destructive",
      });
    } finally {
      setSavingForm(false);
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
                  onClick={() => {
                    console.log("🔵 Botón de micrófono clickeado");
                  }}
                  className="w-12 h-12 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors bg-black/50 border-white/20 hover:bg-black/70"
                  type="button"
                >
                  <Mic className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            <div className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <button
                  disabled={!voiceSupported}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm px-4 py-3 transition-colors"
                  type="button"
                >
                  <Mic className="w-4 h-4" />
                  {ui.voiceButton}
                </button>
                {!voiceSupported && (
                  <p className="mt-2 text-xs text-red-400 text-center">
                    {ui.micNotSupported}
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
              </div>
              <div className="border-t border-white/10 p-3">
                <button
                  disabled={generalUploading || !leadSaved || !formConfirmed}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold text-xs px-4 py-3 transition-colors"
                  type="button"
                >
                  <Upload className="w-4 h-4" />
                  {ui.uploadGeneral}
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
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.nombre}
                </label>
                <input
                  value={leadForm.nombre}
                  onChange={(e) => updateLeadForm("nombre", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                  placeholder={ui.labels.nombre}
                />
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.telefono}
                </label>
                <input
                  value={leadForm.telefono}
                  onChange={(e) => updateLeadForm("telefono", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                  placeholder={ui.labels.telefono}
                />
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.niePasaporte}
                </label>
                <input
                  value={leadForm.niePasaporte}
                  onChange={(e) => updateLeadForm("niePasaporte", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                  placeholder={ui.labels.niePasaporte}
                />
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.ciudad}
                </label>
                <input
                  value={leadForm.ciudad}
                  onChange={(e) => updateLeadForm("ciudad", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                  placeholder={ui.labels.ciudad}
                />
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.nacionalidad}
                </label>
                <input
                  value={leadForm.nacionalidad}
                  onChange={(e) => updateLeadForm("nacionalidad", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                  placeholder={ui.labels.nacionalidad}
                />
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.fechaLlegada}
                </label>
                <input
                  value={leadForm.fechaLlegada}
                  onChange={(e) => updateLeadForm("fechaLlegada", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                  placeholder="DD/MM/AAAA"
                />
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.cumple5Meses}
                </label>
                <select
                  value={leadForm.cumple5Meses}
                  onChange={(e) => updateLeadForm("cumple5Meses", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="">{ui.labels.select}</option>
                  <option value="si">{ui.labels.yes}</option>
                  <option value="no">{ui.labels.no}</option>
                  <option value="nose">{ui.labels.dontKnow}</option>
                </select>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.asilo}
                </label>
                <select
                  value={leadForm.asilo}
                  onChange={(e) => updateLeadForm("asilo", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="">{ui.labels.select}</option>
                  <option value="no">{ui.labels.no}</option>
                  <option value="si">{ui.labels.yes}</option>
                  <option value="nose">{ui.labels.dontKnow}</option>
                </select>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1">
                  {ui.labels.penales}
                </label>
                <select
                  value={leadForm.penales}
                  onChange={(e) => updateLeadForm("penales", e.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="">{ui.labels.select}</option>
                  <option value="no">{ui.labels.no}</option>
                  <option value="si">{ui.labels.yes}</option>
                </select>
                <button
                  onClick={handleSaveLeadForm}
                  disabled={savingForm || !authChecked}
                  className="w-full rounded-[18px] bg-[#003b82] hover:bg-[#002f69] disabled:opacity-60 text-white font-bold text-sm py-3 transition-colors"
                  type="button"
                >
                  {ui.saveLeadButton}
                </button>
              </div>
            </div>
          </div>
        </div>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      </main>
    </div>
  );
}
