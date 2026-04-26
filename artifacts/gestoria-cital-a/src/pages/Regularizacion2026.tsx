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

// --- TIPOS ---
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

// --- HELPERS ---
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
  // --- ESTADOS ---
  const [selectedSituacion] = useState("regularizacion_2026_laboral");
  const [muted, setMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [leadSaved, setLeadSaved] = useState(false);
  const [generalUploading, setGeneralUploading] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<ChatMsg[]>([]);
  const [lastUserTranscript, setLastUserTranscript] = useState("");
  const [waitingMohamed, setWaitingMohamed] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [formConfirmed, setFormConfirmed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

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

  // --- REFS REALTIME ---
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

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as "darija" | "es" | "en";
  const currentProcedure = getProcedureByKey(selectedSituacion);

  // --- TEXTOS UI ---
  const ui = useMemo(() => {
    const isDar = safeLang === "darija";
    return {
      online: isDar ? "متصل الآن" : "En línea",
      voiceButton: isDar ? "تكلم مع محمد" : "Hablar con Mohamed",
      stopButton: isDar ? "وقف الميكروفون" : "Parar micrófono",
      saveLeadButton: savingForm ? (isDar ? "كيتحفظ..." : "Guardando...") : (isDar ? "حفظ المعطيات والمتابعة" : "Guardar y continuar"),
      uploadGeneral: isDar ? "رفع الوثائق" : "Subir documentos",
      docStepForm: isDar ? "الفورمولار" : "Formulario",
      docStepStayProof: isDar ? "بروفات 5 شهور" : "Pruebas 5 meses",
      docStepIdentity: isDar ? "الباسبور" : "Pasaporte/NIE",
      labels: {
        nombre: isDar ? "الاسم الكامل" : "Nombre completo",
        telefono: isDar ? "الهاتف" : "Teléfono",
        ciudad: isDar ? "المدينة" : "Ciudad",
      }
    };
  }, [safeLang, savingForm]);

  const [docs, setDocs] = useState<StoredDocItem[]>(buildInitialDocs(selectedSituacion));

  // --- LOGICA DE DOCUMENTOS ---
  const formCompletedStatus = leadSaved || formConfirmed ? "ok" : "missing";
  const identityStatus = docs.some(d => /pasaporte|nie/i.test(d.nombre) && d.estado === "ok") ? "ok" : "missing";
  const stayProofStatus = docs.some(d => /padron|pruebas/i.test(d.nombre) && d.estado === "ok") ? "ok" : "missing";

  // --- FUNCION CENTRAL: HACER QUE MOHAMED HABLE ---
  const askMohamedToSpeak = async (instruction: string) => {
    if (realtimeDcRef.current && realtimeDcRef.current.readyState === "open") {
      setWaitingMohamed(true);
      assistantTextBufferRef.current = "";
      
      // Enviamos la instrucción como un evento de sistema
      realtimeDcRef.current.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: `INSTRUCCIÓN DE SISTEMA: ${instruction}` }],
        },
      }));

      // Forzamos la respuesta de audio
      realtimeDcRef.current.send(JSON.stringify({
        type: "response.create",
        response: { modalities: ["audio", "text"] },
      }));
      return true;
    }
    return false;
  };

  // --- MANEJADORES DE ACCIÓN (EL CORAZÓN DEL ARREGLO) ---
  
  const handleConfirmForm = async () => {
    setSavingForm(true);
    try {
      await saveFullStateToSupabase();
      setLeadSaved(true);
      setFormConfirmed(true);
      
      const msg = "المعطيات ديالك تحفظات. دابا صيفط ليا بروفات ديال 5 شهور باش نراجعوهم.";
      if (!(await askMohamedToSpeak(`El usuario guardó sus datos. Dile exactamente: ${msg}`))) {
        pendingAutomationPromptRef.current = msg;
      }
      toast({ title: "Guardado" });
    } catch (err) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSavingForm(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    if (!e.target.files?.[0]) return;
    setGeneralUploading(true);
    const file = e.target.files[0];

    try {
      const result = await verifyDocument(file);
      if (result.success) {
        const nextDocs = docs.map(d => d.id === docId ? { ...d, estado: "ok" as DocStatus, archivo: file.name } : d);
        setDocs(nextDocs);
        await saveFullStateToSupabase(nextDocs);

        const speech = `مزيان، توصلت بـ ${file.name}. الاسم هو ${result.full_name || 'صحيح'}. دابا كمل للوثيقة اللي من بعد.`;
        if (!(await askMohamedToSpeak(`El usuario subió un documento. Di en Darija: ${speech}`))) {
          pendingAutomationPromptRef.current = speech;
        }
        toast({ title: "Documento recibido" });
      }
    } catch (err) {
      toast({ title: "Error en subida", variant: "destructive" });
    } finally {
      setGeneralUploading(false);
    }
  };

  // --- CONEXIÓN REALTIME (COPIA TAL CUAL) ---
  const startListening = async () => {
    if (isConnectingRef.current) return;
    try {
      isConnectingRef.current = true;
      setWaitingMohamed(true);

      const res = await fetch("/api/realtime-session", {
        method: "POST",
        body: JSON.stringify({ assistant: "mohamed" }),
      });
      const { value: ephemeralKey } = await res.json();

      const pc = new RTCPeerConnection();
      realtimePcRef.current = pc;

      // Audio remoto
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
      };

      // Audio local
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      realtimeLocalStreamRef.current = ms;
      ms.getTracks().forEach(t => pc.addTrack(t, ms));

      // Data Channel
      const dc = pc.createDataChannel("oai-events");
      realtimeDcRef.current = dc;

      dc.onopen = () => {
        setIsListening(true);
        isConnectingRef.current = false;
        setWaitingMohamed(false);
        if (pendingAutomationPromptRef.current) {
          askMohamedToSpeak(pendingAutomationPromptRef.current);
          pendingAutomationPromptRef.current = null;
        }
      };

      dc.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "response.output_text.done") {
          setVoiceHistory(prev => [...prev, { from: "agent", text: msg.text, ts: Date.now() }]);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });
      const answer = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });

    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    realtimePcRef.current?.close();
    realtimeLocalStreamRef.current?.getTracks().forEach(t => t.stop());
    setIsListening(false);
  };

  // --- SUPABASE SAVE ---
  const saveFullStateToSupabase = async (nextDocs?: StoredDocItem[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { leadForm, documents: nextDocs || docs };
    await supabase.from("user_forms").upsert({
      user_id: user.id,
      form_type: "regularizacion_2026",
      form_data: payload,
      updated_at: new Date().toISOString(),
    });
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <audio ref={remoteAudioRef} hidden />

      <main className="max-w-4xl mx-auto px-4 pt-10">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          
          {/* Cabecera Mohamed */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Mohamed <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              </h1>
              <p className="text-blue-100 text-sm">{ui.online}</p>
            </div>
            <button 
              onClick={isListening ? stopListening : startListening}
              className={`p-4 rounded-full transition-all ${isListening ? 'bg-red-500' : 'bg-white text-blue-600'}`}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Formulario */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">{ui.docStepForm}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  placeholder={ui.labels.nombre}
                  className="p-3 border rounded-xl"
                  value={leadForm.nombre}
                  onChange={(e) => setLeadForm({...leadForm, nombre: e.target.value})}
                />
                <input 
                  placeholder={ui.labels.telefono}
                  className="p-3 border rounded-xl"
                  value={leadForm.telefono}
                  onChange={(e) => setLeadForm({...leadForm, telefono: e.target.value})}
                />
              </div>
              <button 
                onClick={handleConfirmForm}
                className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                {ui.saveLeadButton}
              </button>
            </section>

            {/* Documentos */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">{ui.uploadGeneral}</h2>
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                    <div>
                      <p className="font-medium">{doc.nombre}</p>
                      <span className={`text-xs ${doc.estado === 'ok' ? 'text-green-600' : 'text-amber-600'}`}>
                        {doc.estado === 'ok' ? '✓ Recibido' : '⚠ Pendiente'}
                      </span>
                    </div>
                    <label className="cursor-pointer bg-white p-2 rounded-lg border shadow-sm hover:bg-slate-100">
                      <Upload size={20} className="text-slate-600" />
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, doc.id)} />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
