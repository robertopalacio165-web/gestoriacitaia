import { Link, useLocation } from "wouter";
import { User, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Navbar() {
  const [location] = useLocation();
  const [lang, setLang] = useState<"es" | "darija">("es");

  return (
    <header className="fixed top-0 w-full z-50 glass-panel-heavy border-b border-white/[0.07] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group hover:opacity-85 transition-opacity shrink-0">
          {/* Icon mark */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="url(#grad)" />
              <path d="M16 7L9 12v8l7 5 7-5v-8L16 7z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
              <circle cx="16" cy="16" r="3" fill="white" />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22c55e"/>
                  <stop offset="1" stopColor="#16a34a"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          {/* Name */}
          <span className="font-display font-bold text-base tracking-tight text-white flex items-center gap-0.5">
            Gestoría
            <span className="text-primary">Cita</span>
            <span className="text-white/60 font-medium">IA</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-5 text-sm">
          <Link href="/" className={cn("font-medium transition-colors hover:text-primary", location === "/" ? "text-primary" : "text-muted-foreground")}>Inicio</Link>
          <Link href="/panel" className={cn("font-medium transition-colors hover:text-primary", location === "/panel" ? "text-primary" : "text-muted-foreground")}>Panel</Link>
          <Link href="/buscar-citas" className={cn("font-medium transition-colors hover:text-primary", location === "/buscar-citas" ? "text-primary" : "text-muted-foreground")}>Citas</Link>
          <Link href="/regularizacion-2026" className={cn("font-medium transition-colors hover:text-amber-400 flex items-center gap-1", location === "/regularizacion-2026" ? "text-amber-400" : "text-muted-foreground")}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Regularización 2026
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <div className="flex items-center rounded-full border border-white/[0.12] bg-white/[0.04] overflow-hidden">
            <button
              onClick={() => setLang("es")}
              className={cn("px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                lang === "es" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
            >
              🇪🇸 <span className="hidden sm:inline">Castellano</span>
            </button>
            <button
              onClick={() => setLang("darija")}
              className={cn("px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                lang === "darija" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
            >
              🇲🇦 <span className="hidden sm:inline">Darija</span>
            </button>
          </div>

          {/* Login button / User avatar */}
          {location === "/" ? (
            <button
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 transition-colors shadow-sm shadow-secondary/30"
              onClick={() => {}}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Iniciar sesión</span>
              <span className="sm:hidden">Login</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button className="relative p-1.5 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-white">
                <Bell className="w-4 h-4" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-secondary to-primary p-[2px]">
                <div className="w-full h-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  <User className="w-4 h-4 text-white/50" />
                </div>
              </div>
            </div>
          )}

          <button className="sm:hidden p-1.5 text-muted-foreground hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
