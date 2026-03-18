import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { PaymentModal } from "@/components/PaymentModal";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Settings, Mic, MicOff, RefreshCw, Shield, Bell, CheckCircle2, MessageSquare, Send, X, Upload, AlertTriangle, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AGENT_STEPS = [
  {
    text: "Hola, soy Mohamed. Te voy a ayudar con la Regularización 2026. Primero, selecciona tu situación actual para encontrar el trámite correcto.",
    highlight: "Regularización 2026",
  },
  {
    text: "Perfecto. He encontrado tu trámite. Ahora voy a verificar tus documentos. Necesito: NIE/pasaporte, empadronamiento de 2 años, y contrato de trabajo.",
    highlight: "verificar tus documentos",
  },
  {
    text: "¡Documentos verificados! Todo está correcto. Ahora vamos a rellenar la solicitud en la sede oficial. Yo me encargo de los datos.",
    highlight: "¡Documentos verificados!",
  },
  {
    text: "¡Solicitud enviada con éxito! Recibirás la confirmación en tu WhatsApp con el resguardo en PDF. ¡Felicidades, has completado la Regularización 2026!",
    highlight: "¡Solicitud enviada con éxito!",
  },
];

const SITUACIONES = [
  { value: "laboral", label: "Arraigo Laboral (2+ años en España, contrato de trabajo)" },
  { value: "social", label: "Arraigo Social (3+ años en España, vínculos familiares/sociales)" },
  { value: "familiar", label: "Arraigo Familiar (familiar de ciudadano español/UE)" },
  { value: "ampliado", label: "Arraigo Social Ampliado (formación laboral homologada)" },
  { value: "retorno", label: "Retorno de Personas Emigrantes" },
  { value: "excep_trabajo", label: "Autorización por Circunstancias Excepcionales (trabajo)" },
];

const DOCS_REQUERIDOS = [
  { nombre: "Pasaporte o NIE vigente", estado: "ok" },
  { nombre: "Empadronamiento (2 años mínimo)", estado: "ok" },
  { nombre: "Contrato de trabajo firmado", estado: "ok" },
  { nombre: "Certificado de antecedentes penales", estado: "warn" },
  { nombre: "Formulario EX-10 / EX-11", estado: "missing" },
  { nombre: "Fotografías recientes (2 unidades)", estado: "ok" },
];

interface ChatMsg {
  from: "agent" | "user";
  text: string;
}

const CHAT_RESPONSES: Record<string, string> = {
  default: "Entendido. ¿Tienes alguna pregunta sobre los documentos necesarios?",
  hola: "¡Hola! Soy Mohamed, tu especialista en Regularización 2026. ¿En qué te puedo ayudar?",
  documentos: "Para la Regularización 2026 necesitas: pasaporte/NIE, empadronamiento de 2 años, contrato de trabajo y certificado de antecedentes penales.",
  precio: "El proceso de regularización es gratuito en la sede oficial. Nuestro servicio de gestoría tiene planes desde $12.99/mes.",
  tiempo: "El plazo de resolución es de 3 a 6 meses. Te avisaremos de cada actualización por WhatsApp.",
  cita: "Para la Regularización 2026 no siempre se necesita cita previa, pero en algunas provincias sí. Yo te ayudo a verificarlo.",
};

export default function Regularizacion2026() {
  const [selectedSituacion, setSelectedSituacion] = useState("laboral");
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { from: "agent", text: "Hola, soy Mohamed. Escríbeme cualquier pregunta sobre la Regularización 2026. Estoy aquí para ayudarte." }
  ]);
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSituacionClick = (value: string) => {
    setSelectedSituacion(value);
    if (step === 0) {
      if (!planActivo) {
        setTimeout(() => setShowPayment(true), 1200);
      } else {
        setStep(1);
      }
    }
  };

  const handleVerificarDocs = () => {
    if (!planActivo) { setShowPayment(true); return; }
    setStep(2);
  };

  const handleEnviarSolicitud = () => {
    if (!planActivo) { setShowPayment(true); return; }
    setStep(3);
    setTimeout(() => setSubmitted(true), 800);
    toast({ title: "✅ ¡Solicitud enviada!", description: "Recibirás el resguardo en WhatsApp." });
  };

  const handleSelectPlan = (plan: string) => {
    setPlanActivo(plan);
    setShowPayment(false);
    setStep(1);
    toast({ title: `Plan ${plan} activado`, description: "¡Bienvenido! Continuemos con tu regularización." });
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim().toLowerCase();
    setChatMessages(prev => [...prev, { from: "user", text: chatInput.trim() }]);
    setChatInput("");
    setTimeout(() => {
      const key = Object.keys(CHAT_RESPONSES).find(k => userMsg.includes(k)) || "default";
      setChatMessages(prev => [...prev, { from: "agent", text: CHAT_RESPONSES[key] }]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <div className="fixed inset-0 z-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 40% at 30% 20%, rgba(34,197,94,0.1), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.08), transparent)"
        }}
      />

      <Navbar />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={handleSelectPlan}
        agentMessage="Para continuar con tu Regularización 2026 y presentar tu solicitud en la sede oficial, activa tu plan. ¡Yo me encargo de todo!"
      />

      <main className="flex-1 relative z-10 flex flex-col pt-16 pb-0">
        {/* Title bar */}
        <div className="px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
              Regularización 2026
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Star className="w-2.5 h-2.5" /> NUEVO
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">Tramita tu regularización en España con ayuda del agente IA</p>
          </div>
          {planActivo ? (
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium">
              Plan {planActivo} activo ✓
            </span>
          ) : (
            <button onClick={() => setShowPayment(true)} className="text-xs px-3 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors">
              Activar plan
            </button>
          )}
        </div>

        {/* Main layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full pb-4">

          {/* LEFT: AGENT VIDEO (Mohamed) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-3"
          >
            {/* Video window */}
            <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)] bg-black" style={{ height: "260px" }}>
              <img src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`} alt="Mohamed" className="w-full h-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-medium text-white">En línea</span>
              </div>

              <div className="absolute top-3 right-3">
                <div className="relative w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">!</span>
                </div>
              </div>

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

              <div className="absolute bottom-12 right-3 text-right">
                <p className="text-white font-bold text-sm drop-shadow-lg">Mohamed</p>
                <p className="text-white/70 text-[11px] drop-shadow-lg">Especialista en Extranjería</p>
              </div>

              {/* Mic button */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors ${muted ? "bg-destructive/80 border-destructive" : "bg-black/50 border-white/20 hover:bg-black/70"}`}
                >
                  {muted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>

            {/* Chat toggle button */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all ${showChat ? "bg-secondary/20 border-secondary/40 text-secondary" : "glass-panel border-white/10 text-white/70 hover:text-white hover:border-white/20"}`}
            >
              <MessageSquare className="w-4 h-4" />
              {showChat ? "Cerrar chat" : "Prefiero escribir · Abrir chat"}
            </button>

            {/* CHAT PANEL */}
            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                  style={{ maxHeight: "220px" }}
                >
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.from === "agent" && (
                          <img src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`} className="w-6 h-6 rounded-full object-cover object-top shrink-0" alt="" />
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
                      placeholder="Escribe tu pregunta..."
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
                {!muted && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60">
                    <motion.div className="h-full bg-primary" animate={{ x: ["-100%","100%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                  </div>
                )}
                <div className="relative shrink-0">
                  <img src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`} className="w-9 h-9 rounded-full object-cover object-top border border-primary/40" alt="Mohamed" />
                  {!muted && (
                    <motion.div className="absolute -inset-1 rounded-full border border-primary/40"
                      animate={{ scale: [1,1.3,1], opacity: [0.6,0,0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>
                <p className="text-[11px] text-white/90 leading-relaxed flex-1">
                  {(() => {
                    const s = AGENT_STEPS[Math.min(step, AGENT_STEPS.length - 1)];
                    const parts = s.text.split(s.highlight);
                    return parts.map((part, i, arr) =>
                      i < arr.length - 1
                        ? <span key={i}>{part}<span className="font-bold text-primary">{s.highlight}</span></span>
                        : part
                    );
                  })()}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* RIGHT: BROWSER WINDOW */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-gray-300 shadow-2xl bg-white min-h-[400px]"
          >
            {/* Browser bar */}
            <div className="bg-[#f1f3f4] border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 flex-1 border border-gray-200 shadow-sm min-w-0">
                <Shield className="w-3 h-3 text-green-600 shrink-0" />
                <span className="text-xs text-gray-600 font-medium truncate">sede.administracionespublicas.gob.es/procedimientoini/</span>
              </div>
              <button className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-primary shrink-0">
                <img src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`} className="w-full h-full object-cover object-top" alt="" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 text-black">
              {!submitted ? (
                <>
                  {/* Gov header */}
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-200">
                    <div className="flex items-center border border-gray-200 rounded overflow-hidden shrink-0">
                      <div className="w-7 h-12 bg-red-600"></div>
                      <div className="w-7 h-12 bg-yellow-400"></div>
                      <div className="w-7 h-12 bg-red-600"></div>
                    </div>
                    <div className="text-[9px] leading-tight text-gray-600 font-medium uppercase shrink-0">
                      <div>MINISTERIO DEL INTERIOR</div>
                      <div>SECRETARÍA DE ESTADO</div>
                      <div>DE INMIGRACIÓN</div>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <div className="text-[10px] text-gray-500">Procedimiento:</div>
                      <div className="text-sm font-black text-[#003366]">REGULARIZACIÓN 2026</div>
                    </div>
                  </div>

                  {/* Alert banner */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Regularización Extraordinaria 2026.</strong> El agente IA verificará tus documentos y rellenará la solicitud automáticamente. Solo tendrás que confirmar.
                    </p>
                  </div>

                  {/* SITUACIÓN */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">SITUACIÓN ACTUAL</p>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedSituacion}
                      onChange={(e) => handleSituacionClick(e.target.value)}
                    >
                      {SITUACIONES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  {/* List */}
                  <div className="border border-gray-200 rounded overflow-hidden divide-y divide-gray-100 mb-5">
                    {SITUACIONES.map((s) => (
                      <div
                        key={s.value}
                        onClick={() => handleSituacionClick(s.value)}
                        className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${selectedSituacion === s.value ? "bg-yellow-300 font-semibold text-gray-900" : "text-gray-700 hover:bg-blue-50"}`}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>

                  {/* Documents verification (step 1+) */}
                  <AnimatePresence>
                    {step >= 1 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">VERIFICACIÓN DE DOCUMENTOS</p>
                        <div className="space-y-2">
                          {DOCS_REQUERIDOS.map((doc, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                              <span className="text-sm text-gray-700">{doc.nombre}</span>
                              {doc.estado === "ok" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              {doc.estado === "warn" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                              {doc.estado === "missing" && (
                                <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                  <Upload className="w-3 h-3" /> Subir
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button onClick={handleVerificarDocs} className="mt-3 w-full bg-[#003366] text-white text-sm font-bold py-2.5 rounded hover:bg-[#002244] transition-colors">
                          Verificar todos los documentos con IA
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Auto-fill form (step 2+) */}
                  <AnimatePresence>
                    {step >= 2 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5 space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">DATOS DE LA SOLICITUD <span className="text-green-600 font-normal normal-case">(rellenado automáticamente)</span></p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50" value="Ahmed Benali" readOnly />
                          <input className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50" value="X-1234567-Z" readOnly />
                          <input className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50" value="Marroquí" readOnly />
                          <input className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50" value="Madrid" readOnly />
                          <input className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50 col-span-2" value="C/ Gran Vía 12, 28013 Madrid" readOnly />
                        </div>
                        <div className="flex justify-end">
                          <button onClick={handleEnviarSolicitud} className="bg-green-600 text-white text-sm font-bold px-6 py-2.5 rounded hover:bg-green-700 transition-colors">
                            Enviar solicitud
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                /* SUCCESS */
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-10 gap-5">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#003366] mb-1">¡SOLICITUD ENVIADA!</h2>
                    <p className="text-sm text-gray-600 mb-4">Regularización 2026 · Arraigo Laboral</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2 max-w-sm mx-auto">
                      <p className="text-sm"><span className="font-bold text-gray-500">Nombre:</span> Ahmed Benali</p>
                      <p className="text-sm"><span className="font-bold text-gray-500">Referencia:</span> <span className="font-mono text-green-700">REG2026-ES-087341</span></p>
                      <p className="text-sm"><span className="font-bold text-gray-500">Fecha envío:</span> {new Date().toLocaleDateString("es-ES")}</p>
                      <p className="text-sm"><span className="font-bold text-gray-500">Estado:</span> <span className="text-amber-600 font-semibold">En tramitación</span></p>
                      <p className="text-sm"><span className="font-bold text-gray-500">Resolución:</span> 3-6 meses</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2 bg-[#25d366]/10 border border-[#25d366]/30 rounded-xl px-4 py-2 text-sm text-green-700 font-medium">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Resguardo enviado por WhatsApp
                    </div>
                    <button className="flex items-center gap-2 bg-[#003366] text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#002244]">
                      <FileText className="w-4 h-4" /> Descargar PDF
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom toolbar */}
        <div className="sticky bottom-0 z-30 glass-panel-heavy border-t border-white/10 py-3">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <button onClick={() => setMuted(!muted)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${muted ? "bg-destructive/20 border-destructive/40 text-destructive" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"}`}>
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {muted ? "Sin audio" : "Mute"}
            </button>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10">
                <FileText className="w-4 h-4 text-primary" /> Documentos
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10">
                <Settings className="w-4 h-4 text-secondary" /> Formularios
              </button>
              <button
                onClick={() => setShowChat(!showChat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${showChat ? "bg-secondary/20 border-secondary/40 text-secondary" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"}`}
              >
                <MessageSquare className="w-4 h-4" /> Chat
              </button>
            </div>
            <button className="w-9 h-9 rounded-xl bg-[#25d366]/20 border border-[#25d366]/40 flex items-center justify-center hover:bg-[#25d366]/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          </div>
          <p className="text-center text-[9px] text-muted-foreground mt-1">© 2026 GestoriaCitaIA</p>
        </div>
      </main>
    </div>
  );
}
