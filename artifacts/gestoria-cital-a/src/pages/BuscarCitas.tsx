import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, FileText, Settings, Maximize2, Globe, MicOff, Search, Bell } from "lucide-react";
import { useScheduleAppointment } from "@/hooks/use-appointments";

export default function BuscarCitas() {
  const [selectedTramite, setSelectedTramite] = useState("tie");
  const [googleQuery, setGoogleQuery] = useState("cita previa extranjería");
  const [showAgentBubble, setShowAgentBubble] = useState(true);
  const { toast } = useToast();
  const scheduleMutation = useScheduleAppointment();

  const handleAceptar = () => {
    if (!selectedTramite) {
      toast({ title: "Error", description: "Por favor, selecciona un trámite primero.", variant: "destructive" });
      return;
    }
    scheduleMutation.mutate({ type: selectedTramite }, {
      onSuccess: () => {
        toast({ title: "¡Proceso iniciado!", description: "La IA está buscando citas disponibles." });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-galaxy.png)`, backgroundSize: "cover" }}
      />

      <Navbar />

      <main className="flex-1 relative z-10 pt-20 pb-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">

        <h1 className="text-2xl font-display font-bold mb-4 mt-2">Buscar Citas</h1>

        {/* MAIN LAYOUT: Agent window left, Google window right */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[500px]">

          {/* LEFT: AGENT VIDEO WINDOW */}
          <div className="flex flex-col gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden glass-panel-heavy border border-primary/20 flex-1 min-h-[260px] shadow-[0_0_25px_-5px_hsl(var(--primary)/0.3)]"
            >
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                alt="Mohamed"
                className="w-full h-full object-cover object-top opacity-90"
                style={{ minHeight: "260px" }}
              />
              {/* Online badge */}
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <span className="text-xs font-medium text-white">En línea</span>
              </div>
              {/* Name overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8">
                <p className="text-white font-bold text-base">Mohamed</p>
                <p className="text-white/70 text-xs">Especialista en Extranjería</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <span className="text-[10px] text-accent">En línea</span>
                </div>
              </div>
            </motion.div>

            {/* Agent chat bubble */}
            <AnimatePresence>
              {showAgentBubble && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.8, type: "spring" }}
                >
                  <Card className="glass-panel-heavy border-primary/40 shadow-lg shadow-primary/10 p-3 rounded-2xl rounded-tl-sm relative">
                    <button
                      onClick={() => setShowAgentBubble(false)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-white text-xs"
                    >✕</button>
                    <div className="flex gap-2.5">
                      <img
                        src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-primary/40"
                        alt="AI"
                      />
                      <div>
                        <p className="text-xs text-white/90 leading-relaxed">
                          Primero, <span className="font-bold text-white">selecciona tu trámite.</span> Vamos a pulsar{" "}
                          <span className="text-accent font-bold">"Renovación de Tarjeta de Identidad de Extranjero (TIE)"</span>
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-3 right-6">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                      </span>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: GOOGLE CHROME BROWSER SIMULATION */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden glass-panel border border-white/15 shadow-2xl flex flex-col bg-[#f0f2f5]"
          >
            {/* Chrome top bar */}
            <div className="bg-[#dee1e6] flex flex-col shrink-0">
              {/* Tab bar */}
              <div className="flex items-center px-3 pt-2 gap-2">
                <div className="flex gap-1.5 mr-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                {/* Tab */}
                <div className="bg-white rounded-t-lg px-3 py-1.5 flex items-center gap-2 text-xs text-gray-700 max-w-[240px] border-x border-t border-gray-300">
                  <Globe className="w-3 h-3 text-gray-500 shrink-0" />
                  <span className="truncate">sede.administracionespublicas.gob.es</span>
                </div>
                <button className="ml-1 w-6 h-6 rounded-full hover:bg-gray-300 flex items-center justify-center text-gray-500 text-lg leading-none">+</button>
              </div>
              {/* Address bar */}
              <div className="flex items-center px-3 pb-2 pt-1 gap-2">
                <div className="flex gap-1">
                  <button className="w-6 h-6 rounded hover:bg-gray-300 flex items-center justify-center text-gray-500 text-sm">←</button>
                  <button className="w-6 h-6 rounded hover:bg-gray-300 flex items-center justify-center text-gray-500 text-sm">→</button>
                  <button className="w-6 h-6 rounded hover:bg-gray-300 flex items-center justify-center text-gray-500 text-sm">↻</button>
                </div>
                <div className="flex-1 bg-white rounded-full h-7 flex items-center px-3 gap-2 text-xs text-gray-600 border border-gray-300 shadow-inner">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <span className="truncate text-green-700 font-medium">sede.administracionespublicas.gob.es</span>
                </div>
                <div className="flex gap-1">
                  <button className="w-6 h-6 rounded hover:bg-gray-300 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#666"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Page content */}
            <div className="flex-1 overflow-y-auto bg-white text-black flex flex-col">

              {/* Google Search bar at top */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-full px-4 h-9 gap-2 hover:shadow-md transition-shadow focus-within:shadow-md">
                  <input
                    type="text"
                    value={googleQuery}
                    onChange={(e) => setGoogleQuery(e.target.value)}
                    className="flex-1 text-sm outline-none bg-transparent text-gray-800"
                    placeholder="Buscar en Google"
                  />
                  <Search className="w-4 h-4 text-blue-500 shrink-0" />
                </div>
              </div>

              {/* Extranjería CITA PREVIA form */}
              <div className="p-5">
                {/* Spain gov header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-8 h-5 bg-red-600 rounded-sm"></div>
                    <div className="w-8 h-5 bg-yellow-400 rounded-sm"></div>
                    <div className="w-8 h-5 bg-red-600 rounded-sm"></div>
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-gray-700 text-[10px] uppercase tracking-wide leading-tight">COMISARÍA GENERAL</div>
                    <div className="font-bold text-gray-700 text-[10px] uppercase tracking-wide leading-tight">DE EXTRANJERÍA</div>
                    <div className="font-bold text-gray-700 text-[10px] uppercase tracking-wide leading-tight">E INMIGRACIÓN</div>
                  </div>
                  <div className="ml-auto text-sm font-bold text-[#003366]">extranjería: <span className="font-black">CITA PREVIA</span></div>
                </div>

                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">TRÁMITE</h3>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedTramite}
                    onChange={(e) => setSelectedTramite(e.target.value)}
                  >
                    <option value="">Seleccione el trámite entre los relacionados</option>
                    <option value="tie">Renovación de Tarjeta de Identidad de Extranjero (TIE)</option>
                    <option value="regreso">Autorización de Regreso</option>
                    <option value="nie">Certificados y Asignación NIE</option>
                    <option value="ue">Certificados UE</option>
                    <option value="estudiantes">Estudiantes</option>
                  </select>
                </div>

                {/* List of tramites */}
                <div className="border border-gray-200 rounded overflow-hidden text-sm divide-y divide-gray-100">
                  {[
                    { value: "tie", label: "Renovación de Tarjeta de Identidad de Extranjero (TIE')", highlight: true },
                    { value: "regreso", label: "Autorización de Regreso", highlight: false },
                    { value: "nie", label: "Certificados y Asignación NIE", highlight: false },
                    { value: "ue", label: "Certificados UE", highlight: false },
                    { value: "estudiantes", label: "Estudiantes", highlight: false },
                  ].map((t) => (
                    <div
                      key={t.value}
                      onClick={() => setSelectedTramite(t.value)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between group transition-colors ${
                        t.highlight || selectedTramite === t.value
                          ? "bg-yellow-300 font-medium text-gray-900"
                          : "text-gray-700 hover:bg-blue-50"
                      }`}
                    >
                      <span>{t.label}</span>
                      {selectedTramite === t.value && (
                        <span className="text-[#003366] text-xs font-bold ml-2">✓</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleAceptar}
                    disabled={scheduleMutation.isPending}
                    className="bg-[#003366] text-white text-sm font-semibold px-6 py-2 rounded hover:bg-[#002244] transition-colors disabled:opacity-60"
                  >
                    {scheduleMutation.isPending ? "Procesando..." : "Aceptar"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* BOTTOM TOOLBAR */}
      <div className="relative z-20 glass-panel-heavy border-t border-white/10 p-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-white w-9 h-9">
              <MicOff className="w-4 h-4 text-destructive" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-white w-9 h-9 hidden sm:flex">
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Button variant="glass" className="rounded-xl px-4 border-white/20 hover:border-primary/50 text-white text-xs h-9">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Documentos
            </Button>
            <Button variant="glass" className="rounded-xl px-4 border-white/20 hover:border-primary/50 text-white text-xs h-9">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Formularios
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-white w-9 h-9">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
