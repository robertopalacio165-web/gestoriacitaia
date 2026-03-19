import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { User, Bell, Menu, X, Home, LayoutDashboard, CalendarSearch, FileText, CheckCircle2, AlertCircle, LogOut, CreditCard, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

const NOTIFS = [
  { id: 1, type: "cita", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", title: "Cita confirmada", body: "Renovación TIE · 24 Mar 2026 · 10:30 — Comisaría Madrid", time: "hace 2h", read: false },
  { id: 2, type: "doc", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10", title: "Documento por renovar", body: "Tu Cert. de antecedentes penales caduca pronto", time: "hace 1d", read: false },
  { id: 3, type: "info", icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10", title: "Regularización 2026", body: "Nueva convocatoria disponible. Consulta tu elegibilidad.", time: "hace 3d", read: true },
];

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { lang, setLang, t } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFS);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { href: "/", label: t("nav_inicio"), icon: Home, color: "text-primary" },
    { href: "/panel", label: t("nav_panel"), icon: LayoutDashboard, color: "text-secondary" },
    { href: "/buscar-citas", label: t("nav_citas"), icon: CalendarSearch, color: "text-primary" },
    { href: "/regularizacion-2026", label: t("nav_reg"), icon: FileText, color: "text-amber-400", badge: true },
  ];

  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));

  const Dropdown = ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="absolute top-full right-0 mt-2 w-80 glass-panel-heavy border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-50"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <header className="fixed top-0 w-full z-50 glass-panel-heavy border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity shrink-0" onClick={() => setMobileOpen(false)}>
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="url(#grad)" />
                <path d="M16 7L9 12v8l7 5 7-5v-8L16 7z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
                <circle cx="16" cy="16" r="3" fill="white" />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22c55e"/><stop offset="1" stopColor="#16a34a"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white flex items-center gap-0.5">
              Gestoría<span className="text-primary">Cita</span><span className="text-white font-black">IA</span>
            </span>
          </Link>

          {/* Nav links desktop */}
          <div className="hidden sm:flex items-center gap-5 text-sm">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={cn("font-medium transition-colors flex items-center gap-1",
                  link.href === "/regularizacion-2026" ? "hover:text-amber-400" : "hover:text-primary",
                  location === link.href
                    ? link.href === "/regularizacion-2026" ? "text-amber-400" : "text-primary"
                    : "text-muted-foreground"
                )}>
                {link.badge && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language dropdown */}
            <div className="relative" ref={langRef}>
              {/* Trigger button */}
              {(() => {
                const LANGS = [
                  { code: "es" as const, iso: "es", label: "Castellano", short: "ES" },
                  { code: "en" as const, iso: "gb", label: "English",    short: "EN" },
                  { code: "darija" as const, iso: "ma", label: "Darija",  short: "MA" },
                ];
                const current = LANGS.find(l => l.code === lang)!;
                const flagUrl = (iso: string) => `https://flagcdn.com/w40/${iso}.png`;
                return (
                  <>
                    <button
                      onClick={() => { setLangOpen(o => !o); setNotifOpen(false); setProfileOpen(false); }}
                      className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-500 transition-colors shadow"
                    >
                      <img src={flagUrl(current.iso)} alt={current.label} className="w-6 h-4 object-cover rounded-sm" />
                      <span className="text-sm font-semibold text-white tracking-wide">{current.short}</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-slate-300 transition-transform duration-200", langOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {langOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="absolute top-full right-0 mt-2 w-52 rounded-xl overflow-hidden z-50"
                          style={{ background: "#1e2535", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
                        >
                          <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Idioma / Language</p>
                          {LANGS.map(({ code, iso, label }) => (
                            <button
                              key={code}
                              onClick={() => { setLang(code); setLangOpen(false); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                                lang === code
                                  ? "bg-primary/20 border-l-2 border-primary"
                                  : "hover:bg-white/8 border-l-2 border-transparent"
                              )}
                            >
                              <img src={flagUrl(iso)} alt={label} className="w-7 h-5 object-cover rounded-sm shrink-0 shadow-sm" />
                              <span className={cn("text-sm font-semibold flex-1", lang === code ? "text-primary" : "text-white")}>{label}</span>
                              {lang === code && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          ))}
                          <div className="h-2" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
            </div>

            {/* On landing → login button; elsewhere → bell + avatar */}
            {location === "/" ? (
              <button
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 transition-colors shadow-sm"
                onClick={() => setLocation("/panel")}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("nav_login")}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">

                {/* Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                    className="relative p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-white"
                  >
                    <Bell className="w-4 h-4" />
                    {unread > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </button>

                  <Dropdown open={notifOpen}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                      <p className="text-sm font-bold text-white">Notificaciones</p>
                      {unread > 0 && (
                        <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">Marcar todo leído</button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.map(n => (
                        <div key={n.id} className={cn("flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/[0.04]", !n.read && "bg-primary/5")}>
                          <div className={`w-8 h-8 rounded-lg ${n.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <n.icon className={`w-4 h-4 ${n.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-white">{n.title}</p>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{n.body}</p>
                            <p className="text-[10px] text-white/30 mt-1">{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setLocation("/panel"); setNotifOpen(false); }}
                      className="w-full py-2.5 text-xs text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1 font-semibold">
                      Ver panel completo <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </Dropdown>
                </div>

                {/* Avatar / Profile */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-secondary to-primary p-[2px] hover:scale-105 transition-transform"
                  >
                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      <User className="w-4 h-4 text-white/60" />
                    </div>
                  </button>

                  <Dropdown open={profileOpen}>
                    {/* Profile header */}
                    <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-primary/40 overflow-hidden shrink-0">
                        <img src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`} alt="" className="w-full h-full object-cover object-top" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Ahmed Benali</p>
                        <p className="text-[10px] text-muted-foreground">NIE: X-1234567-Z · Plan Estándar</p>
                      </div>
                    </div>
                    {/* Menu items */}
                    <div className="py-1">
                      {[
                        { icon: LayoutDashboard, label: "Mi Panel", href: "/panel", color: "text-primary" },
                        { icon: CalendarSearch, label: "Buscar cita", href: "/buscar-citas", color: "text-secondary" },
                        { icon: FileText, label: "Regularización 2026", href: "/regularizacion-2026", color: "text-amber-400" },
                        { icon: CreditCard, label: "Gestionar plan", href: "/panel", color: "text-blue-400" },
                      ].map(item => (
                        <button key={item.label} onClick={() => { setLocation(item.href); setProfileOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                          <span className="text-sm text-white/80 font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-white/[0.07] py-1">
                      <button onClick={() => { setLocation("/"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-destructive/10 transition-colors text-left">
                        <LogOut className="w-4 h-4 text-destructive/80" />
                        <span className="text-sm text-destructive/80 font-medium">Cerrar sesión</span>
                      </button>
                    </div>
                  </Dropdown>
                </div>
              </div>
            )}

            {/* Hamburger */}
            <button className="sm:hidden p-1.5 text-muted-foreground hover:text-white transition-colors" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)} />
            <motion.nav
              className="fixed top-16 left-0 right-0 z-40 sm:hidden glass-panel-heavy border-b border-white/[0.07] px-4 py-4"
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}>
              <div className="space-y-1">
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                    className={cn("flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all",
                      location === link.href ? "bg-primary/10 text-primary border border-primary/20" : "text-white/70 hover:text-white hover:bg-white/5")}>
                    <div className={cn("w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0", location === link.href && "bg-primary/15")}>
                      <link.icon className={cn("w-4 h-4", location === link.href ? "text-primary" : link.color)} />
                    </div>
                    <span className="flex-1">{link.label}</span>
                    {link.badge && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                    {location === link.href && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </Link>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex justify-center gap-4 text-[11px] text-muted-foreground">
                <Link href="/aviso-legal" onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Aviso legal</Link>
                <Link href="/privacidad" onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Privacidad</Link>
                <Link href="/cookies" onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Cookies</Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
