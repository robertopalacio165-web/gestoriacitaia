import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { PaymentModal } from "@/components/PaymentModal";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  FileText, CheckCircle2, XCircle, AlertCircle, Bell, Shield,
  Upload, Download, ChevronRight, Globe, Home, Briefcase, Users,
  GraduationCap, Heart, Car, Building2, Clock, Calendar,
  CreditCard, Star, Search, MessageSquare, ArrowRight, User, TrendingUp
} from "lucide-react";

const CITAS = [
  { date: "24 Mar 2026", time: "10:30", label: "Renovación TIE", ref: "ESP-2026-034821", status: "proxima", lugar: "Comisaría Madrid Centro" },
  { date: "15 Ene 2026", time: "09:15", label: "Empadronamiento", ref: "MAD-2026-001234", status: "completada", lugar: "Ayuntamiento Madrid" },
  { date: "03 Nov 2025", time: "11:00", label: "Asignación NIE", ref: "ESP-2025-099812", status: "completada", lugar: "Comisaría Madrid Norte" },
];

const TRAMITES_ACTIVOS = [
  { icon: FileText, label: "Renovación TIE", color: "text-blue-400", pct: 35, status: "En curso", pasos: ["Iniciado", "Docs OK", "Cita", "Completado"], paso: 2 },
  { icon: Heart, label: "Arraigo Social", color: "text-red-400", pct: 10, status: "Pendiente docs", pasos: ["Iniciado", "Docs OK", "Solicitud", "Completado"], paso: 1 },
];

const DOCS = [
  { name: "Pasaporte (vigente)", status: "ok", date: "Ene 2026", size: "2.4 MB" },
  { name: "Contrato de trabajo", status: "ok", date: "Feb 2026", size: "1.1 MB" },
  { name: "Empadronamiento", status: "ok", date: "Mar 2026", size: "0.8 MB" },
  { name: "Cert. antecedentes penales", status: "warn", date: "Por renovar", size: "—" },
  { name: "Fotografías carnet (4u)", status: "missing", date: "Falta", size: "—" },
  { name: "Formulario EX17", status: "ok", date: "Ene 2026", size: "0.5 MB" },
];

const DOC_STATUS = {
  ok: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", label: "OK" },
  warn: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10", label: "Revisar" },
  missing: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Falta" },
};

export default function Panel() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"resumen" | "tramites" | "citas" | "documentos">("resumen");
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState("Estándar");

  const docsOk = DOCS.filter(d => d.status === "ok").length;
  const docsPct = Math.round((docsOk / DOCS.length) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(34,197,94,0.12), transparent), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(59,130,246,0.08), transparent)" }}
      />
      <Navbar />

      <main className="flex-1 relative z-10 pt-20 pb-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary/40 overflow-hidden shrink-0">
              <img src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`} className="w-full h-full object-cover object-top" alt="" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white">Panel Personal</h1>
              <p className="text-xs text-muted-foreground">Ahmed Benali · <span className="text-primary font-semibold">Plan Estándar</span> · NIE: X-1234567-Z</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative glass-panel border border-white/[0.07] rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              Notificaciones
              <span className="w-4 h-4 rounded-full bg-destructive text-white text-[9px] flex items-center justify-center font-bold">2</span>
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Plan activo", value: "Estándar", sub: "Hasta 3 citas/mes", icon: Star, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
            { label: "Trámites activos", value: "2", sub: "1 en curso · 1 pendiente", icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
            { label: "Próxima cita", value: "24 Mar", sub: "Renovación TIE · 10:30", icon: Calendar, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
            { label: "Documentos", value: `${docsOk}/${DOCS.length}`, sub: `${docsPct}% completo`, icon: Shield, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`glass-panel border ${card.border} rounded-2xl p-4 flex flex-col gap-2`}>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white leading-none">{card.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{card.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* TABS */}
        <div className="glass-panel border border-white/[0.07] rounded-2xl overflow-hidden mb-4">
          <div className="flex border-b border-white/[0.06] overflow-x-auto">
            {(["resumen", "tramites", "citas", "documentos"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold capitalize transition-colors whitespace-nowrap px-2 ${activeTab === tab ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-white"}`}>
                {tab === "resumen" ? "Resumen" : tab === "tramites" ? "Trámites" : tab === "citas" ? "Mis Citas" : "Documentos"}
              </button>
            ))}
          </div>

          {/* TAB: Resumen */}
          {activeTab === "resumen" && (
            <div className="p-4 space-y-4">

              {/* Plan card */}
              <div className="bg-gradient-to-r from-primary/10 to-blue-900/20 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plan activo</p>
                    <p className="text-base font-black text-white">Estándar · $19.99<span className="text-xs font-normal text-muted-foreground">/mes</span></p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold">ACTIVO</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  {[["Citas usadas", "1 / 3"], ["Trámites", "2 / 3"], ["Próx. factura", "01 Abr 2026"]].map(([l, v]) => (
                    <div key={l} className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">{l}</p>
                      <p className="text-xs font-bold text-white mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPayment(true)} className="flex-1 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold transition-colors flex items-center justify-center gap-1">
                    <CreditCard className="w-3 h-3" /> Gestionar plan
                  </button>
                  <button onClick={() => setLocation("/buscar-citas")} className="flex-1 py-1.5 rounded-lg bg-secondary/20 hover:bg-secondary/30 text-secondary text-xs font-semibold transition-colors flex items-center justify-center gap-1">
                    <Search className="w-3 h-3" /> Nueva cita
                  </button>
                </div>
              </div>

              {/* Active tramites summary */}
              <div>
                <p className="text-xs font-bold text-white mb-2">Trámites en curso</p>
                <div className="space-y-2">
                  {TRAMITES_ACTIVOS.map((tr, i) => (
                    <div key={i} className="glass-panel border border-white/[0.07] rounded-xl p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <tr.icon className={`w-4 h-4 ${tr.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white">{tr.label}</p>
                          <p className="text-[10px] text-muted-foreground">{tr.status}</p>
                        </div>
                        <span className="text-xs font-bold text-primary">{tr.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${tr.pct}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div>
                <p className="text-xs font-bold text-white mb-2">Acciones rápidas</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Search, label: "Buscar cita", sub: "Con agente Sara", color: "text-primary", onClick: () => setLocation("/buscar-citas") },
                    { icon: Globe, label: "Regularización", sub: "2026 · Nuevo", color: "text-amber-400", onClick: () => setLocation("/regularizacion-2026") },
                    { icon: Upload, label: "Subir documento", sub: "PDF, JPG, PNG", color: "text-blue-400", onClick: () => setActiveTab("documentos") },
                    { icon: MessageSquare, label: "Hablar con IA", sub: "Asistente 24/7", color: "text-secondary", onClick: () => {} },
                  ].map((a, i) => (
                    <button key={i} onClick={a.onClick} className="glass-panel border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 hover:border-white/15 transition-all text-left group">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                        <a.icon className={`w-4 h-4 ${a.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white">{a.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Legal notice */}
              <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-600/20 rounded-xl p-3">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                  <strong className="text-amber-400">Aviso:</strong> GestoriaCitaIA es un asistente IA. No somos gestoría ni abogados. Solo organizamos tus documentos y te ayudamos a buscar citas. No realizamos trámites en tu nombre.
                </p>
              </div>
            </div>
          )}

          {/* TAB: Trámites */}
          {activeTab === "tramites" && (
            <div className="p-4 space-y-4">
              {TRAMITES_ACTIVOS.map((tr, i) => (
                <div key={i} className="glass-panel border border-white/[0.07] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <tr.icon className={`w-5 h-5 ${tr.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{tr.label}</p>
                      <p className="text-xs text-muted-foreground">{tr.status} · {tr.pct}% completado</p>
                    </div>
                    <button onClick={() => setLocation("/buscar-citas")} className="text-xs text-primary hover:underline flex items-center gap-1">
                      Continuar <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                    <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${tr.pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                  </div>
                  <div className="flex justify-between relative">
                    <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-white/10"></div>
                    <div className="absolute top-3.5 left-4 h-0.5 bg-primary" style={{ width: `${(tr.paso / (tr.pasos.length - 1)) * 90}%` }}></div>
                    {tr.pasos.map((p, pi) => (
                      <div key={pi} className="flex flex-col items-center gap-1 relative z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${pi < tr.paso ? "bg-primary border-primary" : "bg-background border-white/20"}`}>
                          {pi < tr.paso ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <span className="text-[10px] text-muted-foreground">{pi + 1}</span>}
                        </div>
                        <p className={`text-[9px] leading-tight text-center max-w-[50px] ${pi < tr.paso ? "text-primary font-bold" : "text-muted-foreground"}`}>{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="text-center">
                <button onClick={() => setLocation("/buscar-citas")} className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                  <Search className="w-3.5 h-3.5" /> Buscar nueva cita con agente IA
                </button>
              </div>
            </div>
          )}

          {/* TAB: Citas */}
          {activeTab === "citas" && (
            <div className="p-4 space-y-3">
              {CITAS.map((cita, i) => (
                <div key={i} className={`rounded-xl p-3 border ${cita.status === "proxima" ? "bg-primary/10 border-primary/25" : "glass-panel border-white/[0.07]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cita.status === "proxima" ? "bg-primary/20" : "bg-white/5"}`}>
                        <Calendar className={`w-4 h-4 ${cita.status === "proxima" ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{cita.label}</p>
                        <p className="text-[11px] text-muted-foreground">{cita.date} · {cita.time}</p>
                        <p className="text-[10px] text-white/50">{cita.lugar}</p>
                        <p className="text-[10px] font-mono text-white/40 mt-0.5">Ref: {cita.ref}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${cita.status === "proxima" ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary/10 text-primary/70 border border-primary/15"}`}>
                      {cita.status === "proxima" ? "Próxima" : "Completada ✓"}
                    </span>
                  </div>
                  {cita.status === "proxima" && (
                    <div className="mt-2 pt-2 border-t border-primary/15 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      <p className="text-[10px] text-primary/80">Confirmada · Aviso WhatsApp enviado</p>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setLocation("/buscar-citas")} className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 mt-2">
                <Search className="w-4 h-4" /> Nueva cita con agente IA
              </button>
            </div>
          )}

          {/* TAB: Documentos */}
          {activeTab === "documentos" && (
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-white">Documentos de extranjería</p>
                <span className="text-xs text-primary font-medium">{docsOk}/{DOCS.length} completados</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${docsPct}%` }} transition={{ duration: 0.8 }} />
              </div>
              {DOCS.map((doc, i) => {
                const s = DOC_STATUS[doc.status as keyof typeof DOC_STATUS];
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{doc.date} {doc.size !== "—" && `· ${doc.size}`}</p>
                    </div>
                    <span className={`text-[10px] font-medium shrink-0 ${s.color}`}>{s.label}</span>
                    {doc.status === "ok" && <button className="text-muted-foreground hover:text-white transition-colors shrink-0"><Download className="w-3.5 h-3.5" /></button>}
                    {doc.status === "missing" && <button className="text-[10px] text-secondary hover:text-secondary/80 font-semibold flex items-center gap-1 shrink-0"><Upload className="w-3 h-3" /> Subir</button>}
                  </div>
                );
              })}
              <button className="w-full mt-2 py-2.5 text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1.5 border border-dashed border-primary/25 rounded-xl hover:border-primary/40 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Subir nuevo documento
              </button>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-white/[0.06]">
                <Shield className="w-3 h-3 shrink-0 text-primary" />
                Documentos cifrados según RGPD · Solo tú tienes acceso
              </div>
            </div>
          )}
        </div>

        {/* Client data card */}
        <div className="glass-panel border border-white/[0.07] rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-white mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-primary" /> Datos del cliente
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
            {[
              ["Nombre completo", "Ahmed Benali"],
              ["NIE", "X-1234567-Z"],
              ["Nacionalidad", "Marroquí 🇲🇦"],
              ["Fecha nacimiento", "15/03/1990"],
              ["Teléfono", "+34 612 345 678"],
              ["Email", "ahmed@email.com"],
              ["Dirección", "C/ Gran Vía 12, Madrid"],
              ["Situación", "Residencia temporal"],
              ["Caducidad TIE", "30/06/2026 ⚠️"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">{k}</span>
                <span className="text-xs text-white font-medium truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      <LegalDisclaimer />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={(p) => { setPlanActivo(p); setShowPayment(false); }}
        agentMessage="Elige o cambia tu plan en cualquier momento. Cancela cuando quieras, sin permanencia."
      />

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 w-full z-50 glass-panel-heavy border-t border-white/[0.07] sm:hidden">
        <div className="flex justify-around items-center h-14 px-2">
          {[
            { icon: TrendingUp, label: "Resumen", tab: "resumen" },
            { icon: FileText, label: "Trámites", tab: "tramites" },
            { icon: Clock, label: "Citas", tab: "citas" },
            { icon: Shield, label: "Docs", tab: "documentos" },
          ].map((item, i) => (
            <button key={i} onClick={() => setActiveTab(item.tab as any)}
              className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${activeTab === item.tab ? "text-primary" : "text-muted-foreground hover:text-white"}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
