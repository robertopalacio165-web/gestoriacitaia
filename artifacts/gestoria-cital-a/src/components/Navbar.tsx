import { Link, useLocation } from "wouter";
import { User, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();

  return (
    <header className="fixed top-0 w-full z-50 glass-panel border-b-0 border-white/5 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1px] box-glow-primary">
            <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
              <img 
                src={`${import.meta.env.BASE_URL}images/logo.png`} 
                alt="Logo" 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  // Fallback if image not yet generated
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-primary font-bold text-lg">G</span>';
                }}
              />
            </div>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
            GestoriaCitaIA
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-6 mr-4">
            <Link href="/" className={cn("text-sm font-medium transition-colors hover:text-primary", location === '/' ? "text-primary" : "text-muted-foreground")}>Inicio</Link>
            <Link href="/panel" className={cn("text-sm font-medium transition-colors hover:text-primary", location === '/panel' ? "text-primary" : "text-muted-foreground")}>Panel</Link>
            <Link href="/buscar-citas" className={cn("text-sm font-medium transition-colors hover:text-primary", location === '/buscar-citas' ? "text-primary" : "text-muted-foreground")}>Citas</Link>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-xl" title="Español">
              🇪🇸
            </button>
            
            {location === '/' ? (
              <Link href="/panel">
                <Button className="rounded-full font-semibold px-6 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.5)]">
                  Entrar
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-white">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background"></span>
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-secondary to-primary p-[2px]">
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    <User className="w-5 h-5 text-white/50" />
                  </div>
                </div>
              </div>
            )}
            
            <button className="sm:hidden p-2 text-muted-foreground hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
