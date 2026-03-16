import { Link, useLocation } from "wouter";
import { User, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Navbar() {
  const [location] = useLocation();
  const [lang, setLang] = useState<"es" | "darija">("es");

  return (
    <header className="fixed top-0 w-full z-50 glass-panel border-b-0 border-white/5 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1px] box-glow-primary">
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
            GestoriaCitaIA
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-5 text-sm">
          <Link href="/" className={cn("font-medium transition-colors hover:text-primary", location === "/" ? "text-primary" : "text-muted-foreground")}>Inicio</Link>
          <Link href="/panel" className={cn("font-medium transition-colors hover:text-primary", location === "/panel" ? "text-primary" : "text-muted-foreground")}>Panel</Link>
          <Link href="/buscar-citas" className={cn("font-medium transition-colors hover:text-primary", location === "/buscar-citas" ? "text-primary" : "text-muted-foreground")}>Citas</Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language buttons */}
          <div className="flex items-center rounded-full border border-white/15 bg-white/5 overflow-hidden">
            <button
              onClick={() => setLang("es")}
              className={cn(
                "px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1.5",
                lang === "es" ? "bg-primary text-background" : "text-muted-foreground hover:text-white"
              )}
            >
              🇪🇸 <span className="hidden sm:inline">Castellano</span><span className="sm:hidden">ES</span>
            </button>
            <button
              onClick={() => setLang("darija")}
              className={cn(
                "px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1.5",
                lang === "darija" ? "bg-primary text-background" : "text-muted-foreground hover:text-white"
              )}
            >
              🇲🇦 <span className="hidden sm:inline">Darija</span><span className="sm:hidden">دارجة</span>
            </button>
          </div>

          {/* Google Login */}
          {location === "/" ? (
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
              onClick={() => {}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="hidden sm:inline">Login con Google</span>
              <span className="sm:hidden">Google</span>
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
