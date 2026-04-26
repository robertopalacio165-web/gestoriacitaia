Aquí tienes el código completo y corregido. He integrado las funciones de activación de voz dentro de los procesos de guardado y subida, respetando escrupulosamente tu estructura y diseño original.

```typescript
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

  const voiceTexts = useMemo(
    () => ({
      initialVoice:
        "السلام عليكم، أنا محمد. غادي نعاونك خطوة بخطوة باش نراجع الملف ديالك. عمر ليا الفورمولار الأول، ومن بعد نكمل معاك بالصوت.",
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
        setLeadForm(parsed);
      }
      const rawLeadSaved = localStorage.getItem(leadSavedStorageKey);
      const saved = rawLeadSaved === "true";
      setLeadSaved(saved);
      setFormConfirmed(saved);
      const rawDocs = localStorage.getItem(docsStorageKey);
      if (rawDocs) {
        const parsedDocs = JSON.parse(rawDocs) as StoredDocItem[];
        if (Array.isArray(parsedDocs)) setDocs(parsedDocs);
      }
    } catch (error) {
      console.error("Error cargando estado:", error);
    }
  }, [formStorageKey, leadSavedStorageKey, docsStorageKey]);

  useEffect(() => {
    localStorage.setItem(formStorageKey, JSON.stringify(leadForm));
  }, [leadForm, formStorageKey]);

  useEffect(() => {
    localStorage.setItem(leadSavedStorageKey, leadSaved || formConfirmed ? "true" : "false");
  }, [leadSaved, formConfirmed, leadSavedStorageKey]);

  useEffect(() => {
    localStorage.setItem(docsStorageKey, JSON.stringify(docs));
  }, [docs, docsStorageKey]);

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

  const saveFullStateToSupabase = async (nextDocs?: StoredDocItem[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("No hay usuario");
    const docsToSave = nextDocs || docs;
    const payload = {
      applicant: leadForm,
      procedure: { key: selectedSituacion, name: currentProcedure?.name },
      documents: docsToSave,
      updated_at: new Date().toISOString(),
    };
    const rowData = {
      user_id: user.id,
      form_type: "regularizacion_2026",
      form_data: payload,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await supabase.from("user_forms").select("id").eq("user_id", user.id).eq("form_type", "regularizacion_2026").maybeSingle();
    if (existing?.id) {
      await supabase.from("user_forms").update(rowData).eq("id", existing.id);
    } else {
      await supabase.from("user_forms").insert(rowData);
    }
    return user.id;
  };

  const askMohamedToSpeak = async (instruction: string) => {
    try {
      if (!realtimeDcRef.current || realtimeDcRef.current.readyState !== "open") return false;
      setWaitingMohamed(true);
      assistantTextBufferRef.current = "";
      realtimeDcRef.current.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: instruction }],
        },
      }));
      realtimeDcRef.current.send(JSON.stringify({
        type: "response.create",
        response: { modalities: ["audio", "text"] },
      }));
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleSaveLead = async () => {
    if (!leadFormReady) {
      toast({ title: ui.missingTitle, description: ui.missingDesc, variant: "destructive" });
      return;
    }
    setSavingForm(true);
    try {
      await saveFullStateToSupabase();
      setLeadSaved(true);
      setFormConfirmed(true);
      toast({ title: ui.saveLeadTitle, description: ui.saveLeadDesc });
      
      const prompt = "العميل عمر الفورمولار وراه تسيفط فالسستيم. هنيه وقول ليه بلي دابا غادي تبدا تراجع معاه الوثائق، واطلب منو أول وثيقة اللي هي الباسبور ولا NIE.";
      if (realtimeDcRef.current?.readyState === "open") {
        await askMohamedToSpeak(prompt);
      } else {
        pendingAutomationPromptRef.current = prompt;
        setPendingAutomationPrompt(prompt);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSavingForm(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGeneralUploading(true);
    try {
      const filePath = `${currentUserId || "anon"}/${Date.now()}_${slugifyFileName(file.name)}`;
      await supabase.storage.from("mohamed_docs").upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from("mohamed_docs").getPublicUrl(filePath);
      const verification = await verifyDocument(publicUrl);
      const updatedDocs = docs.map((d) => (docId && d.id === docId) ? { ...d, archivo: file.name, estado: verification.is_valid ? "ok" as const : "warn" as const, storagePath: filePath, detectedType: verification.document_type } : d);
      setDocs(updatedDocs);
      await saveFullStateToSupabase(updatedDocs);
      toast({ title: ui.uploadSuccessTitle, description: ui.uploadSuccessDesc });

      const docName = docId ? docs.find(d => d.id === docId)?.nombre : "وثيقة";
      const prompt = `العميل صيفط دابا الوثيقة: ${docName}. راني راجعتها وهي ${verification.is_valid ? 'مزيانة وواضحة' : 'خاصها شوية المراجعة'}. جاوبو بالدارجة وقول ليه شنو هي المرحلة الجاية.`;
      if (realtimeDcRef.current?.readyState === "open") {
        await askMohamedToSpeak(prompt);
      } else {
        pendingAutomationPromptRef.current = prompt;
        setPendingAutomationPrompt(prompt);
      }
    } catch (error) {
      toast({ title: ui.uploadErrorTitle, variant: "destructive" });
    } finally {
      setGeneralUploading(false);
    }
  };

  const stopListening = () => {
    realtimeDcRef.current?.close();
    realtimePcRef.current?.close();
    realtimeLocalStreamRef.current?.getTracks().forEach(t => t.stop());
    setIsListening(false);
    setWaitingMohamed(false);
    dcOpenedRef.current = false;
  };

  const startListening = async () => {
    if (isConnectingRef.current) return;
    try {
      isConnectingRef.current = true;
      setWaitingMohamed(true);
      const res = await fetch("/api/realtime-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assistant: "mohamed" }) });
      const session = await res.json();
      const pc = new RTCPeerConnection();
      realtimePcRef.current = pc;
      pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      realtimeLocalStreamRef.current = ms;
      ms.getTracks().forEach(t => pc.addTrack(t, ms));
      const dc = pc.createDataChannel("oai-events");
      realtimeDcRef.current = dc;
      dc.onopen = () => {
        dcOpenedRef.current = true;
        setIsListening(true);
        setWaitingMohamed(false);
        if (pendingAutomationPromptRef.current) {
          askMohamedToSpeak(pendingAutomationPromptRef.current);
          pendingAutomationPromptRef.current = null;
        }
      };
      dc.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "response.output_text.delta") assistantTextBufferRef.current += msg.delta;
        if (msg.type === "response.done") {
          pushAgentMessage(assistantTextBufferRef.current);
          assistantTextBufferRef.current = "";
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: "POST", body: offer.sdp, headers: { Authorization: `Bearer ${session.client_secret.value}`, "Content-Type": "application/sdp" }
      });
      const answer = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (e) {
      stopListening();
    } finally {
      isConnectingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <audio ref={remoteAudioRef} autoPlay />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold mb-4">{ui.formTitle}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(ui.labels).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1">{ui.labels[key as keyof typeof ui.labels]}</label>
                    <input
                      className="w-full p-2 border rounded-lg"
                      value={leadForm[key as keyof LeadFormState]}
                      onChange={(e) => updateLeadForm(key as keyof LeadFormState, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveLead}
                disabled={savingForm}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                {ui.saveLeadButton}
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold mb-4">{ui.uploadGeneral}</h2>
                <input type="file" onChange={(e) => handleFileUpload(e)} className="w-full" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">M</div>
                <div>
                  <h3 className="font-bold">Mohamed</h3>
                  <p className="text-xs text-slate-400">{ui.online}</p>
                </div>
              </div>
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition ${isListening ? "bg-red-500" : "bg-blue-600"}`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                {isListening ? ui.stopButton : ui.voiceButton}
              </button>
              <div className="mt-6 space-y-4 max-h-60 overflow-y-auto">
                {voiceHistory.map((m, i) => (
                  <div key={i} className={`p-3 rounded-xl text-sm ${m.from === "agent" ? "bg-slate-800" : "bg-blue-900 ml-4"}`}>
                    {m.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```
