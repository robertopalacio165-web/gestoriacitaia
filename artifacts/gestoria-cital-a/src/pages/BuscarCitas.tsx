import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Settings, Mic, MicOff, RefreshCw, Shield, Bell, CheckCircle2 } from "lucide-react";
import { useScheduleAppointment } from "@/hooks/use-appointments";

const AGENT_STEPS = [
  {
    text: "Primero, selecciona tu trámite. Vamos a pulsar «Renovación de Tarjeta de Identidad de Extranjero (TIE)»",
    highlight: "Renovación de Tarjeta de Identidad de Extranjero (TIE)",
  },
  {
    text: "Perfecto. Ahora haz clic en «Aceptar» para continuar con tu solicitud de cita.",
    highlight: "Aceptar",
  },
  {
    text: "¡Excelente! He encontrado una cita disponible. Selecciona la fecha y confirma. ¡Ya casi lo tienes!",
    highlight: "",
  },
];

const TRAMITES = [
  { value: "tie", label: "Renovación de Tarjeta de Identidad de Extranjero (TIE')", highlight: true },
  { value: "regreso", label: "Autorización de Regreso", highlight: false },
  { value: "nie", label: "Certificados y Asignación NIE", highlight: false },
  { value: "ue", label: "Certificados UE", highlight: false },
  { value: "estudiantes", label: "Estudiantes", highlight: false },
];

export default function BuscarCitas() {
  const [selectedTramite, setSelectedTramite] = useState("tie");
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();
  const scheduleMutation = useScheduleAppointment();

  useEffect(() => {
    const timer = setTimeout(() => setShowWhatsapp(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleTramiteClick = (value: string) => {
    setSelectedTramite(value);
    if (step === 0) setStep(1);
  };

  const handleAceptar = () => {
    if (!selectedTramite) {
      toast({ title: "Selecciona un trámite primero", variant: "destructive" });
      return;
    }
    scheduleMutation.mutate({ type: selectedTramite }, {
      onSuccess: () => {
        setStep(2);
        toast({ title: "✅ ¡Cita encontrada!", description: "El avatar ha reservado tu cita automáticamente." });
      }
    });
  };

  const handleConfirm = () => {
    setConfirmed(true);
    toast({ title: "🎉 ¡Cita confirmada!", description: "Recibirás los detalles por WhatsApp." });
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      {/* Galaxy background */}
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-galaxy.png)`, backgroundSize: "cover" }}
      />

      <Navbar />

      {/* WhatsApp notification banner */}
      <AnimatePresence>
        {showWhatsapp && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4"
          >
            <div className="flex items-center gap-3 bg-[#25d366] text-white px-5 py-3 rounded-2xl shadow-xl max-w-md w-full mt-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">GestoriaCitalA vía WhatsApp</p>
                <p className="text-xs opacity-90 truncate">🎉 ¡Hay una cita disponible! Haz clic para reservarla ahora con el agente.</p>
              </div>
              <button onClick={() => setShowWhatsapp(false)} className="text-white/70 hover:text-white text-lg leading-none shrink-0">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 relative z-10 flex flex-col pt-16 pb-0 max-w-2xl mx-auto w-full px-4 sm:px-6">

        {/* Title */}
        <h1 className="text-xl font-display font-bold py-3">Buscar Citas</h1>

        {/* ── AGENT VIDEO WINDOW ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden border border-primary/25 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.35)] mb-3 bg-black"
          style={{ height: "220px" }}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
            alt="Mohamed"
            className="w-full h-full object-cover object-top"
          />
          {/* Online badge */}
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs font-medium text-white">En línea</span>
          </div>

          {/* Notification bell */}
          <div className="absolute top-3 right-3">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border border-black text-[8px] text-white flex items-center justify-center font-bold">1</span>
            </div>
          </div>

          {/* Sound wave indicator */}
          {!muted && (
            <div className="absolute bottom-14 left-3 flex items-end gap-0.5 h-5">
              {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-green-400 rounded-full"
                  animate={{ height: [`${h}px`, `${h * 2}px`, `${h}px`] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }}
                />
              ))}
            </div>
          )}

          {/* Agent name card */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-3 px-4">
            <div className="bg-black/50 backdrop-blur-md rounded-xl px-4 py-2 inline-flex flex-col items-start border border-white/10">
              <p className="text-white font-bold text-sm">Mohamed</p>
              <p className="text-white/70 text-xs">Especialista en Extranjería</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                <span className="text-[10px] text-green-400">En línea</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── BROWSER WINDOW: sede.administracionespublicas.gob.es ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden border border-gray-300 shadow-xl flex flex-col bg-white mb-3"
          style={{ minHeight: "280px" }}
        >
          {/* Browser address bar */}
          <div className="bg-[#f1f3f4] border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 flex-1 border border-gray-200 shadow-sm min-w-0">
              <Shield className="w-3 h-3 text-green-600 shrink-0" />
              <span className="text-xs text-gray-600 font-medium truncate">sede.administracionespublicas.gob.es</span>
            </div>
            <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded shrink-0">
              <RefreshCw className="w-3 h-3" />
            </button>
            {/* Mini avatar indicator */}
            <div className="w-6 h-6 rounded-full overflow-hidden border border-green-400 shrink-0">
              <img src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`} alt="AI" className="w-full h-full object-cover object-top" />
            </div>
          </div>

          {/* Gov page content */}
          <div className="flex-1 overflow-y-auto bg-white p-4 text-black">
            {!confirmed ? (
              <>
                {/* Gov header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-200">
                  <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                    <div className="w-6 h-10 bg-red-600"></div>
                    <div className="w-6 h-10 bg-yellow-400"></div>
                    <div className="w-6 h-10 bg-red-600"></div>
                  </div>
                  <div className="text-[9px] leading-tight text-gray-600 font-medium uppercase">
                    <div>COMISARÍA GENERAL</div>
                    <div>DE EXTRANJERÍA</div>
                    <div>E INMIGRACIÓN</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[10px] text-gray-500">extranjería:</div>
                    <div className="text-sm font-black text-[#003366]">CITA PREVIA</div>
                  </div>
                </div>

                {/* TRÁMITE section */}
                <div className="mb-3">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">TRÁMITE</p>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedTramite}
                    onChange={(e) => handleTramiteClick(e.target.value)}
                  >
                    <option value="">Seleccione el trámite entre los relacionados</option>
                    {TRAMITES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* List items */}
                <div className="border border-gray-200 rounded overflow-hidden divide-y divide-gray-100 mb-4">
                  {TRAMITES.map((t) => (
                    <div
                      key={t.value}
                      onClick={() => handleTramiteClick(t.value)}
                      className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        selectedTramite === t.value
                          ? "bg-yellow-300 font-semibold text-gray-900"
                          : "text-gray-700 hover:bg-blue-50"
                      }`}
                    >
                      <span>{t.label}</span>
                    </div>
                  ))}
                </div>

                {/* Date fields shown after step 1 */}
                <AnimatePresence>
                  {step >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mb-4 space-y-2"
                    >
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">DATOS PERSONALES</p>
                      <input
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-500 bg-gray-50"
                        placeholder="NIE / Número de identificación"
                        defaultValue="X-1234567-Z"
                        readOnly
                      />
                      <input
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-500 bg-gray-50"
                        placeholder="Nombre completo"
                        defaultValue="Ahmed Benali"
                        readOnly
                      />
                      <input
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-500 bg-gray-50"
                        placeholder="Teléfono"
                        defaultValue="+34 612 345 678"
                        readOnly
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Aceptar button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleAceptar}
                    disabled={scheduleMutation.isPending || !selectedTramite}
                    className="bg-[#003366] text-white text-xs font-bold px-5 py-2 rounded hover:bg-[#002244] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {scheduleMutation.isPending && (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    )}
                    Aceptar
                  </button>
                </div>
              </>
            ) : (
              /* CONFIRMATION PAGE */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-6 gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#003366] mb-1">¡CITA CONFIRMADA!</h2>
                  <p className="text-xs text-gray-600">Renovación TIE</p>
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3 text-left space-y-1.5">
                    <p className="text-xs"><span className="font-bold text-gray-500">Fecha:</span> <span className="text-gray-800">Martes, 24 de Marzo 2026</span></p>
                    <p className="text-xs"><span className="font-bold text-gray-500">Hora:</span> <span className="text-gray-800">10:30</span></p>
                    <p className="text-xs"><span className="font-bold text-gray-500">Oficina:</span> <span className="text-gray-800">Comisaría de Extranjería - Madrid</span></p>
                    <p className="text-xs"><span className="font-bold text-gray-500">Nº Cita:</span> <span className="font-mono text-green-700">ESP-2026-034821</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#25d366]/10 border border-[#25d366]/30 rounded-xl px-4 py-2 text-xs text-green-700 font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Detalles enviados por WhatsApp
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── AGENT VOICE BUBBLE (bottom of browser) ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-3"
          >
            <div className="glass-panel-heavy border border-primary/30 rounded-2xl rounded-bl-sm p-3 flex gap-3 shadow-lg shadow-primary/10 relative overflow-hidden">
              {/* Speaking animation bar */}
              {!muted && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60">
                  <motion.div
                    className="h-full bg-primary"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              )}

              {/* Avatar thumbnail */}
              <div className="relative shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                  className="w-10 h-10 rounded-full object-cover object-top border border-primary/40"
                  alt="Mohamed"
                />
                {/* Sound waves around avatar */}
                {!muted && (
                  <motion.div
                    className="absolute -inset-1 rounded-full border border-primary/40"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/90 leading-relaxed">
                  {AGENT_STEPS[Math.min(step, AGENT_STEPS.length - 1)].text.split(
                    AGENT_STEPS[Math.min(step, AGENT_STEPS.length - 1)].highlight
                  ).map((part, i, arr) =>
                    i < arr.length - 1 ? (
                      <span key={i}>
                        {part}
                        <span className="font-bold text-accent">
                          {AGENT_STEPS[Math.min(step, AGENT_STEPS.length - 1)].highlight}
                        </span>
                      </span>
                    ) : part
                  )}
                </p>
              </div>

              {/* Notification bell */}
              <div className="relative shrink-0">
                <Bell className="w-4 h-4 text-yellow-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full text-[7px] text-white flex items-center justify-center">1</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Confirm button (step 2) */}
        <AnimatePresence>
          {step === 2 && !confirmed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3"
            >
              <button
                onClick={handleConfirm}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar mi cita
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ── BOTTOM TOOLBAR ── */}
      <div className="sticky bottom-0 z-30 glass-panel-heavy border-t border-white/10 py-3">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
          {/* Mute button */}
          <button
            onClick={() => setMuted(!muted)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors border ${
              muted
                ? "bg-destructive/20 border-destructive/40 text-destructive"
                : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
            }`}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {muted ? "Sin audio" : "Mute"}
          </button>

          {/* Center buttons */}
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors">
              <FileText className="w-4 h-4 text-primary" />
              Documentos
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors">
              <Settings className="w-4 h-4 text-secondary" />
              Formularios
            </button>
          </div>

          {/* WhatsApp mini button */}
          <button className="w-9 h-9 rounded-xl bg-[#25d366]/20 border border-[#25d366]/40 flex items-center justify-center hover:bg-[#25d366]/30 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </button>
        </div>

        {/* Footer text */}
        <p className="text-center text-[9px] text-muted-foreground mt-2">© 2026 GestoriaCitalA</p>
      </div>
    </div>
  );
}
