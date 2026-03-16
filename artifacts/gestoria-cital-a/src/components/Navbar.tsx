import { Link, useLocation } from "wouter";
import { User, Bell, Menu, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Navbar() {
  const [location] = useLocation();
  const [lang, setLang] = useState<"es" | "darija">("es");

  return (
    <header className="fixed top-0 w-full z-50 glass-panel-heavy border-b border-white/[0.07] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group hover:opacity-85 transition-opacity shrink-0"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1.5px] box-glow-primary">
            <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
              <img
                src={`${import.meta.env.BASE_URL}images/logo.png`}
                alt="Logo"
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<span class="text-primary font-bold text-base">G</span>';
                }}
              />
            </div>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white flex items-center gap-1">
            GestoriaCita
            <span className="text-primary text-glow">IA</span>
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary ml-0.5">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <Link href="/" className={cn("font-medium transition-colors hover:text-primary", location === "/" ? "text-primary" : "text-muted-foreground")}>Inicio</Link>
          <Link href="/panel" className={cn("font-medium transition-colors hover:text-primary", location === "/panel" ? "text-primary" : "text-muted-foreground")}>Panel</Link>
          <Link href="/buscar-citas" className={cn("font-medium transition-colors hover:text-primary", location === "/buscar-citas" ? "text-primary" : "text-muted-foreground")}>Citas</Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <div className="flex items-center rounded-full border border-white/[0.12] bg-white/[0.04] overflow-hidden">
            <button
              onClick={() => setLang("es")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                lang === "es"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              🇪🇸 <span className="hidden sm:inline">Castellano</span>
            </button>
            <button
              onClick={() => setLang("darija")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                lang === "darija"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              🇲🇦 <span className="hidden sm:inline">Darija</span>
            </button>
          </div>

          {/* Login button */}
          {location === "/" ? (
            <button
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/30"
              onClick={() => {}}
            >
              <LogIn className="w-3.5 h-3.5" />
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
