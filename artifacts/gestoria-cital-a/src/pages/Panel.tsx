import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneOff, Mic, MicOff, FileText, CheckCircle2, XCircle, Search, Clock, Home, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function Panel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <div 
        className="fixed inset-0 z-0 bg-galaxy opacity-30 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-galaxy.png)` }}
      />
      
      <Navbar />

      <main className="flex-1 relative z-10 pt-28 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-display font-bold mb-8">Panel Personal de Cliente</h1>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          
          {/* VIDEO CALL SECTION */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-3xl overflow-hidden glass-panel-heavy aspect-[4/3] w-full border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]"
            >
              <img 
                src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`}
                alt="Agent Video"
                className="w-full h-full object-cover opacity-90"
              />
              
              <div className="absolute top-6 left-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse"></span>
                <span className="text-sm font-medium text-white">Khalid • En línea</span>
              </div>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
                <Button variant="destructive" size="icon" className="rounded-xl h-12 w-12 hover:bg-red-600">
                  <PhoneOff className="w-5 h-5" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-xl h-12 w-12 bg-white/10 hover:bg-white/20 text-white">
                  <MicOff className="w-5 h-5" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-xl h-12 w-12 bg-accent hover:bg-accent/80 text-accent-foreground border-none">
                  <Mic className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </div>

          {/* SIDEBAR DASHBOARD */}
          <div className="space-y-6">
            
            {/* Agent Card Mini */}
            <Card className="glass-panel border-white/10 p-4 flex items-center gap-4">
              <img 
                src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                alt="Sara"
                className="w-14 h-14 rounded-full object-cover border-2 border-secondary"
              />
              <div className="flex-1">
                <h4 className="font-bold text-white">Sara</h4>
                <p className="text-sm text-muted-foreground">Asesora Legal</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-full px-4 text-xs h-8 border-secondary/50 hover:bg-secondary/20">
                Hablar
              </Button>
            </Card>

            {/* Documentos */}
            <Card className="glass-panel border-white/10">
              <div className="p-5 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-display font-semibold text-lg">Mis Documentos</h3>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">Añadir</Button>
              </div>
              <div className="p-2">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium truncate text-white">Contrato_de_trabajo.pdf</p>
                    <p className="text-xs text-muted-foreground">Verificado</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium truncate text-white">Certificado_In...</p>
                    <p className="text-xs text-destructive">Falta firma</p>
                  </div>
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
              </div>
              <div className="p-4 bg-accent/5 rounded-b-2xl border-t border-white/5 text-center">
                <p className="text-sm font-medium text-accent flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Los documentos están verificados
                </p>
              </div>
            </Card>

            {/* Citas & Tracker */}
            <Card className="glass-panel border-white/10 p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-white mb-2">Estado de cita</h3>
              <p className="text-muted-foreground text-sm mb-6">No hay citas programadas actualmente.</p>
              <Button className="w-full rounded-xl mb-4" onClick={() => setLocation('/buscar-citas')}>
                <Search className="w-4 h-4 mr-2" /> Buscar cita automáticamente
              </Button>
              
              <div className="w-full mt-4 pt-6 border-t border-white/10">
                <h4 className="text-sm font-semibold text-left mb-4 text-white">Progreso: Renovación NIE</h4>
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-white/10"></div>
                  
                  <div className="flex gap-4 mb-4 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="pt-1 text-left">
                      <p className="text-sm font-medium text-white/80">En progreso</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mb-4 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-accent text-background flex items-center justify-center shrink-0 shadow-[0_0_10px_hsl(var(--accent))]">
                      <span className="text-xs font-bold">2</span>
                    </div>
                    <div className="pt-1 text-left">
                      <p className="text-sm font-bold text-accent">Documentos Verificados</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mb-4 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-background border border-white/20 flex items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground">3</span>
                    </div>
                    <div className="pt-1 text-left">
                      <p className="text-sm text-muted-foreground">Cita Programada</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-background border border-white/20 flex items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground">4</span>
                    </div>
                    <div className="pt-1 text-left">
                      <p className="text-sm text-muted-foreground">Trámite Completado</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button variant="link" className="mt-4 text-muted-foreground hover:text-white">
                Ver historial de citas
              </Button>
            </Card>

          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full z-50 glass-panel-heavy border-t border-white/10 sm:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white p-2">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Inicio</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white p-2">
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-medium">Docs</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary p-2 relative">
            <div className="absolute -top-4 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 border-4 border-background">
              <Search className="w-5 h-5 text-background" />
            </div>
            <span className="text-[10px] font-medium mt-4">Buscar</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white p-2">
            <HelpCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">Soporte</span>
          </button>
        </div>
      </nav>
      
      {/* Privacy notice for desktop */}
      <div className="hidden sm:block text-center py-4 text-xs text-muted-foreground relative z-10 bg-black/50">
        Toda tu información está protegida mediante encriptación end-to-end según la RGPD.
      </div>
    </div>
  );
}
