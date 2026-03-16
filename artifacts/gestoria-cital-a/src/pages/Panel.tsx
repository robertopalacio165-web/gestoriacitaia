import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneOff, Mic, MicOff, FileText, CheckCircle2, XCircle, Search, Clock, Home, HelpCircle, Bell, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function Panel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <div
        className="fixed inset-0 z-0 opacity-30 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-galaxy.png)`, backgroundSize: "cover" }}
      />

      <Navbar />

      <main className="flex-1 relative z-10 pt-22 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

        <h1 className="text-2xl font-display font-bold mb-6 mt-4">Panel Personal de Cliente</h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">

          {/* LEFT: VIDEO CALL AGENT WINDOW */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden glass-panel-heavy border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]"
              style={{ aspectRatio: "4/3" }}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`}
                alt="Khalid - Agente en videollamada"
                className="w-full h-full object-cover object-top opacity-90"
              />

              {/* Online badge */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <span className="text-sm font-medium text-white">En línea</span>
              </div>

              {/* Name overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-16 pb-4 px-6 flex items-end justify-between">
                <div>
                  <p className="text-white font-bold text-lg">Khalid</p>
                  <p className="text-white/80 text-sm">Especialista en Extranjería</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    <span className="text-xs text-accent">En línea</span>
                  </div>
                </div>
                {/* Call controls */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10">
                  <Button variant="destructive" size="icon" className="rounded-xl h-11 w-11 hover:bg-red-600">
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                  <Button variant="secondary" size="icon" className="rounded-xl h-11 w-11 bg-white/10 hover:bg-white/20 text-white border-none">
                    <MicOff className="w-5 h-5" />
                  </Button>
                  <Button variant="secondary" size="icon" className="rounded-xl h-11 w-11 bg-accent hover:bg-accent/80 text-accent-foreground border-none shadow-[0_0_12px_hsl(var(--accent)/0.6)]">
                    <Mic className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-4">

            {/* Agent card - Khalid mini + Hablar con Miriam */}
            <Card className="glass-panel border-white/10 overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="relative">
                  <img
                    src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`}
                    alt="Khalid"
                    className="w-14 h-14 rounded-full object-cover object-top border-2 border-primary/50"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm">Khalid</h4>
                  <p className="text-xs text-muted-foreground">Especialista en Extranjería</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div className="border-t border-white/5 p-3">
                <Button
                  size="sm"
                  className="w-full rounded-xl text-xs h-9 gap-2"
                  variant="outline"
                  onClick={() => {}}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Hablar con Miriam
                </Button>
              </div>
            </Card>

            {/* Documentos */}
            <Card className="glass-panel border-white/10">
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-semibold text-base">Mis Documentos</h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2">Añadir</Button>
              </div>
              <div className="p-2">
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-white">Contrato_de_trabajo.pdf</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-white">Certificado_In...</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  </div>
                </div>
              </div>
              <div className="px-4 py-2.5 bg-accent/5 rounded-b-2xl border-t border-white/5 text-center">
                <p className="text-xs font-medium text-accent flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Los documentos están verificados
                </p>
              </div>
            </Card>

            {/* Estado de cita */}
            <Card className="glass-panel border-white/10 p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Estado de cita</h3>
              <p className="text-muted-foreground text-xs mb-4">No hay citas programadas</p>
              <Button className="w-full rounded-xl text-xs h-9 mb-2" onClick={() => setLocation("/buscar-citas")}>
                <Search className="w-3.5 h-3.5 mr-1.5" /> Buscar cita automaticamente
              </Button>
            </Card>

            {/* Renovacion NIE Progress */}
            <Card className="glass-panel border-white/10 p-4">
              <h4 className="text-sm font-semibold text-white mb-4">Renovación NIE</h4>
              {/* Horizontal stepper */}
              <div className="relative">
                <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-white/10 z-0"></div>
                <div className="absolute top-3.5 left-4 h-0.5 bg-accent z-0" style={{ width: "35%" }}></div>
                <div className="flex justify-between relative z-10">
                  {[
                    { label: "En progreso", done: true },
                    { label: "Documentos Verificados", done: true, current: true },
                    { label: "Cita Programada", done: false },
                    { label: "Trámite Completado", done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 max-w-[64px]">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                        step.done
                          ? "bg-accent border-accent shadow-[0_0_8px_hsl(var(--accent)/0.6)]"
                          : "bg-background border-white/20"
                      }`}>
                        {step.done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-accent-foreground" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                        )}
                      </div>
                      <p className={`text-[9px] text-center leading-tight ${step.current ? "text-accent font-bold" : step.done ? "text-white/70" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4 rounded-xl text-xs h-8 border-white/10 text-muted-foreground hover:text-white">
                Ver historial de citas
              </Button>
            </Card>

          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full z-50 glass-panel-heavy border-t border-white/10 sm:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          <button className="flex flex-col items-center gap-1 text-primary p-2">
            <FileText className="w-5 h-5" />
            <span className="text-[9px] font-medium">Documentos</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white p-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[9px] font-medium">Verificación</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white p-2" onClick={() => setLocation("/buscar-citas")}>
            <Clock className="w-5 h-5" />
            <span className="text-[9px] font-medium">Citas</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white p-2">
            <HelpCircle className="w-5 h-5" />
            <span className="text-[9px] font-medium">Soporte</span>
          </button>
        </div>
      </nav>

      {/* Privacy notice */}
      <div className="hidden sm:flex items-center justify-center py-3 text-[10px] text-muted-foreground relative z-10 bg-black/50 gap-1.5 border-t border-white/5">
        <Shield className="w-3 h-3" />
        Los documentos se almacenan de forma segura y cifrada según la Ley Orgánica General de Protección de Datos (RGPD).
        <span className="ml-4">© 2026 GestoriaCitalA</span>
      </div>
    </div>
  );
}
