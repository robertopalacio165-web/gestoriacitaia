import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { PaymentModal } from "@/components/PaymentModal";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Settings, Mic, MicOff, RefreshCw, Shield, Bell, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { useScheduleAppointment } from "@/hooks/use-appointments";

interface ChatMsg { from: "agent" | "user"; text: string; }
const CHAT_REPLIES: Record<string, string> = {
  default: "Entendido. ¿Tienes más preguntas sobre tu trámite?",
  hola: "¡Hola! Soy Sara. ¿En qué trámite te puedo ayudar hoy?",
  documentos: "Para la mayoría de trámites necesitas: NIE/pasaporte, empadronamiento y fotografías. ¿Cuál es tu trámite?",
  cita: "Te busco una cita automáticamente. Solo selecciona el trámite arriba y te guío paso a paso.",
  precio: "Nuestros planes empiezan desde $12.99/mes. Incluye guía paso a paso y confirmación por WhatsApp.",
};

const AGENT_STEPS = [
  {
    text: "Hola, soy Sara. Selecciona tu trámite y yo me encargo de guiarte paso a paso. Vamos a pulsar «Renovación de Tarjeta de Identidad de Extranjero (TIE)»",
    highlight: "Renovación de Tarjeta de Identidad de Extranjero (TIE)",
  },
  {
    text: "Perfecto. He rellenado tus datos automáticamente. Ahora haz clic en «Aceptar» para buscar la cita disponible.",
    highlight: "Aceptar",
  },
  {
    text: "¡Excelente! He encontrado una cita disponible. Haz clic en «Confirmar» y te enviaré la confirmación por WhatsApp con el PDF.",
    highlight: "",
  },
];

const TRAMITES = [
  { value: "tie", label: "Renovación de Tarjeta de Identidad de Extranjero (TIE')" },
  { value: "regreso", label: "Autorización de Regreso" },
  { value: "nie", label: "Certificados y Asignación NIE" },
  { value: "ue", label: "Certificados UE" },
  { value: "estudiantes", label: "Estudiantes" },
  { value: "trabajo", label: "Autorización de Trabajo" },
  { value: "arraigo", label: "Arraigo Social / Laboral / Familiar" },
  { value: "familiar", label: "Reagrupación Familiar" },
];

const DOCS_BY_TRAMITE: Record<string, { nombre: string; estado: "ok" | "warn" | "missing" }[]> = {
  tie:        [{ nombre: "Pasaporte o NIE vigente", estado: "ok" }, { nombre: "Empadronamiento actual", estado: "ok" }, { nombre: "Tarjeta TIE caducada o próxima a caducar", estado: "ok" }, { nombre: "Fotografías recientes (2)", estado: "ok" }, { nombre: "Formulario EX-17", estado: "warn" }],
  regreso:    [{ nombre: "Pasaporte vigente", estado: "ok" }, { nombre: "TIE vigente", estado: "ok" }, { nombre: "Justificación del viaje", estado: "warn" }],
  nie:        [{ nombre: "Pasaporte vigente", estado: "ok" }, { nombre: "Justificación solicitud NIE", estado: "warn" }, { nombre: "Formulario EX-15", estado: "missing" }, { nombre: "Fotografías recientes (2)", estado: "ok" }],
  ue:         [{ nombre: "Pasaporte UE vigente", estado: "ok" }, { nombre: "Empadronamiento", estado: "ok" }, { nombre: "Formulario EU", estado: "warn" }],
  estudiantes:[{ nombre: "Pasaporte vigente", estado: "ok" }, { nombre: "Carta de admisión universitaria", estado: "warn" }, { nombre: "Seguro médico", estado: "ok" }, { nombre: "Justificante económico", estado: "missing" }],
  trabajo:    [{ nombre: "Pasaporte vigente", estado: "ok" }, { nombre: "Contrato de trabajo", estado: "warn" }, { nombre: "Alta en Seguridad Social", estado: "missing" }, { nombre: "Formulario EX-07", estado: "missing" }],
  arraigo:    [{ nombre: "Pasaporte vigente", estado: "ok" }, { nombre: "Empadronamiento (3 años)", estado: "ok" }, { nombre: "Certificado antecedentes penales", estado: "warn" }, { nombre: "Formulario EX-10", estado: "missing" }],
  familiar:   [{ nombre: "Pasaporte vigente", estado: "ok" }, { nombre: "Certificado familiar UE/español", estado: "ok" }, { nombre: "Libro de familia / acta matrimonial", estado: "warn" }, { nombre: "Formulario EX-19", estado: "missing" }],
};

const FORMS_BY_TRAMITE: Record<string, { nombre: string; codigo: string; url: string }[]> = {
  tie:        [{ nombre: "Renovación de Tarjeta de Identidad (TIE)", codigo: "EX-17", url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/17-Formulario_TIE.pdf" }],
  regreso:    [{ nombre: "Autorización de Regreso", codigo: "EX-13", url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/13-Autorizacion_de_regreso.pdf" }],
  nie:        [{ nombre: "Asignación número de identidad extranjero", codigo: "EX-15", url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/15-Solicitud_NIE.pdf" }],
  ue:         [{ nombre: "Registro de ciudadano UE", codigo: "EU", url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/EU-Cert_registro_ciudadano_UE.pdf" }],
  estudiantes:[{ nombre: "Estancia por estudios", codigo: "EX-01", url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/01-Formulario_estancia_estudios.pdf" }],
  trabajo:    [{ nombre: "Autorización de trabajo", codigo: "EX-07", url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/07-Autorizacion_residencia_trabajo.pdf" }],
  arraigo:    [{ nombre: "Arraigo Social / Laboral", codigo: "EX-10", url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf" }],
  familiar:   [{ nombre: "Reagrupación Familiar", codigo: "EX-02", url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/02-Reagrupacion_familiar.pdf" }],
};

export default function BuscarCitas() {
  const [selectedTramite, setSelectedTramite] = useState("tie");
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { from: "agent", text: "Hola, soy Sara. ¿Prefieres escribir? Aquí puedo responderte cualquier duda sobre tu trámite." }
  ]);
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();
  const { toast } = useToast();
  const scheduleMutation = useScheduleAppointment();

  useEffect(() => {
    const timer = setTimeout(() => setShowWhatsapp(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleTramiteClick = (value: string) => {
    setSelectedTramite(value);
    if (step === 0) {
      if (!planActivo) {
        setTimeout(() => setShowPayment(true), 1000);
      } else {
        setStep(1);
      }
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim().toLowerCase();
    setChatMessages(prev => [...prev, { from: "user", text: chatInput.trim() }]);
    setChatInput("");
    setTimeout(() => {
      const key = Object.keys(CHAT_REPLIES).find(k => userMsg.includes(k)) || "default";
      setChatMessages(prev => [...prev, { from: "agent", text: CHAT_REPLIES[key] }]);
    }, 700);
  };

  const handleSelectPlan = (plan: string) => {
    setPlanActivo(plan);
    setShowPayment(false);
    setStep(1);
    toast({ title: `Plan ${plan} activado ✓`, description: "¡Continuemos con tu cita!" });
  };

  const handleAceptar = () => {
    if (!selectedTramite) return;
    scheduleMutation.mutate({ type: selectedTramite }, {
      onSuccess: () => {
        setStep(2);
        toast({ title: "✅ ¡Cita encontrada!", description: "Confirma para reservarla." });
      }
    });
  };

  const handleConfirm = () => {
    setConfirmed(true);
    toast({ title: "🎉 ¡Cita confirmada!", description: "PDF enviado por WhatsApp." });
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,197,94,0.08), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.07), transparent)"
        }}
      />

      <Navbar />

      {/* WhatsApp banner */}
      <AnimatePresence>
        {showWhatsapp && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pt-2"
          >
            <div className="flex items-center gap-3 bg-[#25d366] text-white px-5 py-3 rounded-2xl shadow-xl max-w-lg w-full">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">GestoriaCitaIA vía WhatsApp</p>
                <p className="text-xs opacity-90 truncate">🎉 ¡Hay una cita disponible! Haz clic para reservarla con la agente Sara.</p>
              </div>
              <button onClick={() => setShowWhatsapp(false)} className="text-white/70 hover:text-white text-lg shrink-0">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={handleSelectPlan}
        agentMessage="Para reservar tu cita y continuar con el proceso, activa tu plan. ¡Yo me encargo de todo paso a paso!"
      />

      <main className="flex-1 relative z-10 flex flex-col pt-16 pb-0">

        {/* Title */}
        <h1 className="text-xl font-display font-bold px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full">{t("buscar_title")}</h1>

        {/* ── DESKTOP: side-by-side | MOBILE: stacked ── */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full pb-4">

          {/* ── LEFT: AGENT VIDEO (Sara) ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-3"
          >
            {/* Video window */}
            <div
              className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)] bg-black"
              style={{ height: "280px" }}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                alt="Sara"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

              {/* Online badge */}
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-medium text-white">En línea</span>
              </div>

              {/* Bell */}
              <div className="absolute top-3 right-3 relative">
                <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full border border-black text-[8px] text-white flex items-center justify-center font-bold">1</span>
              </div>

              {/* Sound waves */}
              {!muted && (
                <div className="absolute bottom-14 left-4 flex items-end gap-0.5 h-5">
                  {[3,6,4,8,5,7,3].map((h, i) => (
                    <motion.div key={i} className="w-1 bg-primary rounded-full"
                      animate={{ height: [`${h}px`, `${h*2}px`, `${h}px`] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }}
                    />
                  ))}
                </div>
              )}

              {/* BOTTOM: just mic button, no name card */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors ${muted ? "bg-destructive/80 border-destructive" : "bg-black/50 border-white/20 hover:bg-black/70"}`}
                >
                  {muted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
                </button>
              </div>

              {/* Agent name top-left on desktop inside overlay */}
              <div className="absolute bottom-14 right-3 text-right">
                <p className="text-white font-bold text-sm drop-shadow-lg">Sara</p>
                <p className="text-white/70 text-xs drop-shadow-lg">Asesora de Citas</p>
              </div>
            </div>

            {/* Chat toggle button */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all ${showChat ? "bg-secondary/20 border-secondary/40 text-secondary" : "glass-panel border-white/10 text-white/70 hover:text-white hover:border-white/20"}`}
            >
              <MessageSquare className="w-4 h-4" />
              {showChat ? t("buscar_chat_close") : t("buscar_chat_open")}
            </button>

            {/* CHAT PANEL */}
            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                  style={{ maxHeight: "200px" }}
                >
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.from === "agent" && (
                          <img src={`${import.meta.env.BASE_URL}images/avatar-sara.png`} className="w-6 h-6 rounded-full object-cover object-top shrink-0" alt="" />
                        )}
                        <div className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${msg.from === "agent" ? "bg-white/8 text-white/90 border border-white/10" : "bg-primary text-primary-foreground"}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="border-t border-white/10 p-2 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder={t("buscar_chat_placeholder")}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                    />
                    <button onClick={handleSendChat} className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0">
                      <Send className="w-3.5 h-3.5 text-primary-foreground" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent voice bubble */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="glass-panel-heavy border border-primary/25 rounded-2xl rounded-tl-sm p-3 flex gap-3 shadow-lg relative overflow-hidden"
              >
                {/* scanning line removed */}
                <div className="relative shrink-0">
                  <img src={`${import.meta.env.BASE_URL}images/avatar-sara.png`} className="w-9 h-9 rounded-full object-cover object-top border border-primary/40" alt="Sara" />
                  {!muted && (
                    <motion.div className="absolute -inset-1 rounded-full border border-primary/40"
                      animate={{ scale: [1,1.3,1], opacity: [0.6,0,0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/90 leading-relaxed">
                    {(() => {
                      const s = AGENT_STEPS[Math.min(step, AGENT_STEPS.length - 1)];
                      const parts = s.text.split(s.highlight);
                      return parts.map((part, i, arr) =>
                        i < arr.length - 1 ? (
                          <span key={i}>{part}<span className="font-bold text-primary">{s.highlight}</span></span>
                        ) : part
                      );
                    })()}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Confirm button */}
            <AnimatePresence>
              {step === 2 && !confirmed && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleConfirm}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {t("buscar_confirmar")}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Bottom toolbar (mobile only on left column) */}
            <div className="lg:hidden glass-panel-heavy border border-white/10 rounded-2xl py-2.5 px-4 flex items-center justify-between">
              <button onClick={() => setMuted(!muted)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${muted ? "bg-destructive/20 border-destructive/40 text-destructive" : "bg-white/5 border-white/10 text-white/80"}`}>
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                Mute
              </button>
              <button onClick={() => { setShowDocs(true); setShowForms(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${showDocs ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-white/80"}`}>
                <FileText className="w-4 h-4 text-primary" /> Documentos
              </button>
              <button onClick={() => { setShowForms(true); setShowDocs(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${showForms ? "bg-secondary/20 border-secondary/40 text-secondary" : "bg-white/5 border-white/10 text-white/80"}`}>
                <Settings className="w-4 h-4 text-secondary" /> Formularios
              </button>
              <button className="w-8 h-8 rounded-xl bg-[#25d366]/20 border border-[#25d366]/40 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </button>
            </div>
          </motion.div>

          {/* ── RIGHT: BROWSER WINDOW ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-gray-300 shadow-2xl bg-white min-h-[400px]"
          >
            {/* Browser address bar */}
            <div className="bg-[#f1f3f4] border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 flex-1 border border-gray-200 shadow-sm min-w-0">
                <Shield className="w-3 h-3 text-green-600 shrink-0" />
                <span className="text-xs text-gray-600 font-medium truncate">sede.administracionespublicas.gob.es</span>
              </div>
              <button className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-primary shrink-0">
                <img src={`${import.meta.env.BASE_URL}images/avatar-sara.png`} alt="Sara" className="w-full h-full object-cover object-top" />
              </div>
            </div>

            {/* Page content */}
            <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 text-black">
              {!confirmed ? (
                <>
                  {/* Gov header */}
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-200">
                    <div className="flex items-center border border-gray-200 rounded overflow-hidden shrink-0">
                      <div className="w-7 h-12 bg-red-600"></div>
                      <div className="w-7 h-12 bg-yellow-400"></div>
                      <div className="w-7 h-12 bg-red-600"></div>
                    </div>
                    <div className="text-[9px] leading-tight text-gray-600 font-medium uppercase shrink-0">
                      <div>COMISARÍA GENERAL</div>
                      <div>DE EXTRANJERÍA</div>
                      <div>E INMIGRACIÓN</div>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <div className="text-[10px] text-gray-500">extranjería:</div>
                      <div className="text-sm sm:text-base font-black text-[#003366]">CITA PREVIA</div>
                    </div>
                  </div>

                  {/* TRÁMITE */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">TRÁMITE</p>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedTramite}
                      onChange={(e) => handleTramiteClick(e.target.value)}
                    >
                      <option value="">Seleccione el trámite entre los relacionados</option>
                      {TRAMITES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* List */}
                  <div className="border border-gray-200 rounded overflow-hidden divide-y divide-gray-100 mb-5">
                    {TRAMITES.map((t) => (
                      <div
                        key={t.value}
                        onClick={() => handleTramiteClick(t.value)}
                        className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${selectedTramite === t.value ? "bg-yellow-300 font-semibold text-gray-900" : "text-gray-700 hover:bg-blue-50"}`}
                      >
                        {t.label}
                      </div>
                    ))}
                  </div>

                  {/* Personal data (appears after tramite selected) */}
                  <AnimatePresence>
                    {step >= 1 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5 space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">DATOS PERSONALES</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50" value="X-1234567-Z" readOnly placeholder="NIE" />
                          <input className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50" value="Ahmed Benali" readOnly placeholder="Nombre" />
                          <input className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50" value="+34 612 345 678" readOnly placeholder="Teléfono" />
                          <input className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50" value="ahmed@email.com" readOnly placeholder="Email" />
                        </div>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1"><Shield className="w-3 h-3 text-green-500" /> Datos rellenados automáticamente por el agente IA</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-end">
                    <button
                      onClick={handleAceptar}
                      disabled={scheduleMutation.isPending || !selectedTramite}
                      className="bg-[#003366] text-white text-sm font-bold px-6 py-2.5 rounded hover:bg-[#002244] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {scheduleMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Aceptar
                    </button>
                  </div>
                </>
              ) : (
                /* CONFIRMATION */
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-10 gap-5">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#003366] mb-1">¡CITA CONFIRMADA!</h2>
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2">
                      <p className="text-sm"><span className="font-bold text-gray-500">Trámite:</span> <span className="text-gray-800">Renovación TIE</span></p>
                      <p className="text-sm"><span className="font-bold text-gray-500">Fecha:</span> <span className="text-gray-800">Martes, 24 de Marzo 2026</span></p>
                      <p className="text-sm"><span className="font-bold text-gray-500">Hora:</span> <span className="text-gray-800">10:30</span></p>
                      <p className="text-sm"><span className="font-bold text-gray-500">Oficina:</span> <span className="text-gray-800">Comisaría de Extranjería - Madrid</span></p>
                      <p className="text-sm"><span className="font-bold text-gray-500">Nº Cita:</span> <span className="font-mono text-green-700">ESP-2026-034821</span></p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-[#25d366]/10 border border-[#25d366]/30 rounded-xl px-4 py-2 text-sm text-green-700 font-medium">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Confirmación enviada por WhatsApp
                    </div>
                    <button className="flex items-center gap-2 bg-[#003366] text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#002244] transition-colors">
                      <FileText className="w-4 h-4" /> Descargar PDF
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── DESKTOP BOTTOM TOOLBAR ── */}
        <div className="hidden lg:block sticky bottom-0 z-30 glass-panel-heavy border-t border-white/10 py-3">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <button onClick={() => setMuted(!muted)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${muted ? "bg-destructive/20 border-destructive/40 text-destructive" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"}`}>
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {muted ? "Sin audio" : "Mute"}
            </button>
            <div className="flex gap-3">
              <button onClick={() => { setShowDocs(true); setShowForms(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${showDocs ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"}`}>
                <FileText className="w-4 h-4 text-primary" /> Documentos
              </button>
              <button onClick={() => { setShowForms(true); setShowDocs(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${showForms ? "bg-secondary/20 border-secondary/40 text-secondary" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"}`}>
                <Settings className="w-4 h-4 text-secondary" /> Formularios
              </button>
            </div>
            <button className="w-9 h-9 rounded-xl bg-[#25d366]/20 border border-[#25d366]/40 flex items-center justify-center hover:bg-[#25d366]/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          </div>
          <p className="text-center text-[9px] text-muted-foreground mt-1">© 2026 GestoriaCitaIA</p>
        </div>

        {/* ── DOCUMENTOS PANEL ── */}
        <AnimatePresence>
          {showDocs && (
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
              <div className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden" style={{ background: "#1a2236" }}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-white">Documentos requeridos</span>
                  </div>
                  <button onClick={() => setShowDocs(false)} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs">✕</button>
                </div>
                <div className="px-5 py-4 space-y-2.5 max-h-72 overflow-y-auto">
                  {(DOCS_BY_TRAMITE[selectedTramite] ?? DOCS_BY_TRAMITE.tie).map((doc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${doc.estado === "ok" ? "bg-green-500/20 text-green-400" : doc.estado === "warn" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {doc.estado === "ok" ? "✓" : doc.estado === "warn" ? "!" : "✗"}
                      </span>
                      <span className="text-sm text-white/90">{doc.nombre}</span>
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${doc.estado === "ok" ? "bg-green-500/15 text-green-400" : doc.estado === "warn" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                        {doc.estado === "ok" ? "Listo" : doc.estado === "warn" ? "Revisar" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FORMULARIOS PANEL ── */}
        <AnimatePresence>
          {showForms && (
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
              <div className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden" style={{ background: "#1a2236" }}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-secondary" />
                    <span className="font-bold text-sm text-white">Formularios oficiales</span>
                  </div>
                  <button onClick={() => setShowForms(false)} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs">✕</button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {(FORMS_BY_TRAMITE[selectedTramite] ?? FORMS_BY_TRAMITE.tie).map((form, i) => (
                    <a key={i} href={form.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary">{form.codigo}</p>
                        <p className="text-sm text-white/80 truncate">{form.nombre}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-white/40 group-hover:text-primary transition-colors shrink-0">PDF ↓</span>
                    </a>
                  ))}
                  <p className="text-[10px] text-white/30 text-center pt-1">Fuente: extranjeros.inclusion.gob.es</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
