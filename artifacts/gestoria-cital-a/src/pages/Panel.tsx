import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, FileText, CheckCircle2, XCircle, Search, Clock, HelpCircle, Bell, Shield, AlertCircle, Upload, Download, ChevronRight, Globe, Home, Briefcase, Users, GraduationCap, Heart, Car, Building2, Wallet, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

const DOCS = [
  { name: "Pasaporte (vigente)", status: "ok", date: "Ene 2026" },
  { name: "Contrato de trabajo", status: "ok", date: "Feb 2026" },
  { name: "Empadronamiento", status: "ok", date: "Mar 2026" },
  { name: "Certificado de antecedentes", status: "warn", date: "Pendiente" },
  { name: "Fotografías carnet (4u)", status: "missing", date: "Falta" },
  { name: "Formulario EX17", status: "ok", date: "Ene 2026" },
];

const TRAMITES_DISPONIBLES = [
  { icon: FileText, label: "Renovación TIE", color: "text-blue-400", status: "Activo" },
  { icon: Globe, label: "Visado Nacional", color: "text-indigo-400", status: null },
  { icon: Shield, label: "Asignación NIE", color: "text-green-400", status: null },
  { icon: Home, label: "Empadronamiento", color: "text-yellow-400", status: null },
  { icon: Briefcase, label: "Autorización Trabajo", color: "text-orange-400", status: null },
  { icon: Users, label: "Reagrupación Familiar", color: "text-pink-400", status: null },
  { icon: GraduationCap, label: "Visado Estudiante", color: "text-cyan-400", status: null },
  { icon: Heart, label: "Arraigo Social/Familiar", color: "text-red-400", status: null },
  { icon: Car, label: "Canje Permiso Conducir", color: "text-purple-400", status: null },
  { icon: Building2, label: "Residencia Larga Duración", color: "text-teal-400", status: null },
  { icon: Globe, label: "Autorización de Regreso", color: "text-blue-300", status: null },
  { icon: Globe, label: "Certificado UE", color: "text-emerald-400", status: null },
];

const DOC_STATUS = {
  ok: { icon: CheckCircle2, color: "text-accent", bg: "bg-accent/10" },
  warn: { icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  missing: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

export default function Panel() {
  const [, setLocation] = useLocation();
  const [muted, setMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<"tramites" | "documentos" | "citas">("tramites");

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <Navbar />

      <main className="flex-1 relative z-10 pt-20 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

        {/* Page title + client info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 mt-4">
          <div>
            <h1 className="text-xl font-display font-bold text-white">Panel Personal</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Bienvenido, Ahmed Benali · Plan <span className="text-primary font-medium">Estándar</span></p>
          </div>
          <div className="flex items-center gap-2">
            <div className="glass-panel border border-white/[0.07] rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span className="text-white/70">Saldo:</span>
              <span className="font-bold text-white">$14.99</span>
            </div>
            <button className="glass-panel border border-white/[0.07] rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors">
              <Bell className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">Notificaciones</span>
              <span className="w-4 h-4 rounded-full bg-destructive text-white text-[9px] flex items-center justify-center font-bold">2</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-5">

          {/* LEFT: VIDEO CALL */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden border border-primary/15 shadow-xl shadow-primary/10"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`}
                alt="Khalid"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

              {/* Online badge */}
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <span className="text-xs font-medium text-white">En línea</span>
              </div>

              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 pb-4 px-4 flex items-end justify-between">
                <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
                  <p className="text-white font-bold text-sm">Khalid</p>
                  <p className="text-white/70 text-xs">Especialista en Extranjería</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                    <span className="text-[10px] text-accent">En línea</span>
                  </div>
                </div>
                {/* Call controls */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10">
                  <Button variant="destructive" size="icon" className="rounded-xl h-10 w-10">
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    className={`rounded-xl h-10 w-10 border-none ${muted ? "bg-white/10 hover:bg-white/20 text-white" : "bg-accent hover:bg-accent/80 text-accent-foreground"}`}
                    onClick={() => setMuted(!muted)}
                  >
                    {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Agent action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="glass-panel border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-all group text-left">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Buscar cita</p>
                  <p className="text-[10px] text-muted-foreground">Buscar automáticamente</p>
                </div>
              </button>
              <button className="glass-panel border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 hover:border-secondary/30 transition-all group text-left" onClick={() => setLocation("/buscar-citas")}>
                <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Globe className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sede Online</p>
                  <p className="text-[10px] text-muted-foreground">Tramitar con agente</p>
                </div>
              </button>
              <button className="glass-panel border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 hover:border-accent/30 transition-all group text-left">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Upload className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Subir documento</p>
                  <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG</p>
                </div>
              </button>
              <button className="glass-panel border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 hover:border-yellow-400/30 transition-all group text-left">
                <div className="w-9 h-9 rounded-lg bg-yellow-400/10 flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors">
                  <HelpCircle className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Hablar con Miriam</p>
                  <p className="text-[10px] text-muted-foreground">Asistente 24/7</p>
                </div>
              </button>
            </div>

            {/* NIE Progress */}
            <div className="glass-panel border border-white/[0.07] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white">Renovación TIE — En progreso</h4>
                <span className="text-xs text-primary font-medium">35%</span>
              </div>
              <div className="relative mb-4">
                <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-white/10 z-0"></div>
                <div className="absolute top-3.5 left-4 h-0.5 bg-primary z-0" style={{ width: "35%" }}></div>
                <div className="flex justify-between relative z-10">
                  {[
                    { label: "Iniciado", done: true },
                    { label: "Docs OK", done: true },
                    { label: "Cita", done: false },
                    { label: "Completado", done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 max-w-[60px]">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${step.done ? "bg-primary border-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" : "bg-background border-white/20"}`}>
                        {step.done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <span className="text-[10px] text-muted-foreground">{i + 1}</span>}
                      </div>
                      <p className={`text-[9px] text-center leading-tight ${step.done ? "text-primary font-bold" : "text-muted-foreground"}`}>{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center justify-center gap-1"
                onClick={() => setLocation("/buscar-citas")}
              >
                Continuar con el agente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-4">

            {/* CLIENT DATA CARD */}
            <div className="glass-panel border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
                <div className="relative">
                  <img
                    src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover object-top border-2 border-primary/40"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-accent rounded-full border-2 border-background"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-sm">Ahmed Benali</h4>
                  <p className="text-xs text-muted-foreground">NIE: X-1234567-Z</p>
                  <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verificado
                  </span>
                </div>
                <button className="text-muted-foreground hover:text-white transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              {/* Client data */}
              <div className="p-4 space-y-2.5 text-xs">
                {[
                  ["Fecha nacimiento", "15/03/1990"],
                  ["Nacionalidad", "Marroquí 🇲🇦"],
                  ["Teléfono", "+34 612 345 678"],
                  ["Email", "ahmed@email.com"],
                  ["Dirección", "C/ Gran Vía 12, Madrid"],
                  ["Situación", "Residencia temporal"],
                  ["Caducidad TIE", "30/06/2026 ⚠️"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="text-white font-medium text-right truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TABS: Tramites / Docs / Citas */}
            <div className="glass-panel border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex border-b border-white/[0.06]">
                {(["tramites", "documentos", "citas"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${activeTab === tab ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-white"}`}
                  >
                    {tab === "tramites" ? "Trámites" : tab === "documentos" ? "Documentos" : "Citas"}
                  </button>
                ))}
              </div>

              {/* TAB: Trámites */}
              {activeTab === "tramites" && (
                <div className="p-3 max-h-72 overflow-y-auto space-y-1.5">
                  {TRAMITES_DISPONIBLES.map((t, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <t.icon className={`w-4 h-4 ${t.color}`} />
                      </div>
                      <span className="flex-1 text-xs text-white/80 font-medium">{t.label}</span>
                      {t.status ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium border border-primary/20">{t.status}</span>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* TAB: Documentos */}
              {activeTab === "documentos" && (
                <div className="p-3 space-y-1.5">
                  {DOCS.map((doc, i) => {
                    const s = DOC_STATUS[doc.status as keyof typeof DOC_STATUS];
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                          <s.icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.date}</p>
                        </div>
                        <button className="text-muted-foreground hover:text-white transition-colors shrink-0">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  <button className="w-full mt-2 py-2 text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 border border-dashed border-primary/25 rounded-xl hover:border-primary/40 transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Subir nuevo documento
                  </button>
                </div>
              )}

              {/* TAB: Citas */}
              {activeTab === "citas" && (
                <div className="p-4 space-y-3">
                  {/* Next appointment */}
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                    <p className="text-xs font-bold text-primary mb-1">Próxima cita</p>
                    <p className="text-sm font-bold text-white">24 Mar 2026 · 10:30</p>
                    <p className="text-xs text-muted-foreground">Renovación TIE · Comisaría Madrid</p>
                    <p className="text-xs font-mono text-white/60 mt-1">Ref: ESP-2026-034821</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-accent">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cita confirmada · Aviso WhatsApp enviado</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white">Historial</p>
                    {[
                      { date: "15 Ene 2026", label: "Empadronamiento", status: "Completado" },
                      { date: "03 Nov 2025", label: "Asignación NIE", status: "Completado" },
                    ].map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div>
                          <p className="text-white/80">{h.label}</p>
                          <p className="text-muted-foreground">{h.date}</p>
                        </div>
                        <span className="text-accent text-[10px] font-medium">{h.status}</span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full rounded-xl text-xs h-9 mt-1" onClick={() => setLocation("/buscar-citas")}>
                    <Search className="w-3.5 h-3.5 mr-1.5" /> Nueva cita con agente
                  </Button>
                </div>
              )}
            </div>

            {/* Privacy footer */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
              <Shield className="w-3 h-3 shrink-0" />
              <span>Documentos cifrados según RGPD · © 2026 GestoriaCitalA</span>
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 w-full z-50 glass-panel-heavy border-t border-white/[0.07] sm:hidden">
        <div className="flex justify-around items-center h-14 px-2">
          {[
            { icon: FileText, label: "Documentos", tab: "documentos" },
            { icon: Clock, label: "Citas", tab: "citas" },
            { icon: Globe, label: "Trámites", tab: "tramites" },
            { icon: HelpCircle, label: "Soporte" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => item.tab && setActiveTab(item.tab as any)}
              className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${activeTab === item.tab ? "text-primary" : "text-muted-foreground hover:text-white"}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
