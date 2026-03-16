import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Play, ChevronRight, FileText, Globe, MapPin } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handlePlanSelect = (plan: string) => {
    setLocation('/panel');
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background with inline style for fallback, css class handles main image */}
      <div 
        className="absolute inset-0 z-0 bg-galaxy opacity-40 mix-blend-screen"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-galaxy.png)` }}
      />
      
      <Navbar />

      <main className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-32">
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-primary/30 text-primary mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-sm font-medium">IA de Extranjería v2.0 Activa</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display leading-[1.1] mb-6">
              Tu Gestoría de Extranjería <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary text-glow">
                Inteligente con IA
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Te ayudamos paso a paso a conseguir tu cita y preparar tus documentos. Rápido, seguro y 100% online.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button size="lg" className="w-full sm:w-auto text-lg rounded-full" onClick={() => setLocation('/panel')}>
                Comenzar ahora <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg rounded-full backdrop-blur-md">
                Ver demo
              </Button>
            </div>
            
            <div className="mt-12 flex flex-col gap-4">
              {['100% online', 'Soporte en español y darija', 'Verificación de documentos con IA', 'Aviso automático de citas disponibles'].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  className="flex items-center gap-3 text-white/80"
                >
                  <CheckCircle2 className="w-6 h-6 text-accent shrink-0" />
                  <span className="font-medium text-lg">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="flex-1 w-full max-w-lg lg:max-w-none grid grid-cols-2 gap-4 relative">
            {/* Glowing orb behind agents */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/20 blur-[100px] rounded-full z-0 pointer-events-none"></div>
            
            <AgentCard 
              name="Mohamed" 
              role="Especialista en Extranjería" 
              imagePath={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
              className="mt-12"
              delay={0.2}
            />
            <AgentCard 
              name="Sara" 
              role="Asesora Legal" 
              imagePath={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
              delay={0.4}
            />
          </div>
        </div>

        {/* VIDEO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-32"
        >
          <div className="relative rounded-3xl overflow-hidden glass-panel-heavy aspect-video max-w-4xl mx-auto border-white/20 group cursor-pointer box-glow-secondary">
            <div className="absolute inset-0 bg-gradient-to-tr from-secondary/20 to-primary/20 opacity-50"></div>
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Play className="w-8 h-8 text-white ml-1 fill-white" />
              </div>
              <p className="font-display font-bold text-2xl text-white tracking-wide">Cómo funciona GestoriaCitaIA</p>
            </div>
          </div>
        </motion.div>

        {/* PRICING */}
        <div className="mb-32 text-center">
          <h2 className="text-4xl font-display font-bold mb-12">Trámites de Extranjería</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
            {/* Basico */}
            <Card className="glass-panel border-white/10 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-xl text-white/80">BÁSICO</CardTitle>
                <div className="mt-4 flex justify-center items-baseline text-5xl font-display font-bold">
                  $9.99
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-left mb-8 text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-accent shrink-0"/> Revisión básica</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-accent shrink-0"/> Soporte email</li>
                </ul>
                <Button className="w-full" variant="amber" onClick={() => handlePlanSelect('basico')}>
                  Seleccionar plan
                </Button>
              </CardContent>
            </Card>

            {/* Pro (Middle) */}
            <Card className="glass-panel-heavy border-primary/50 relative transform md:-translate-y-4 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                20% DESCUENTO
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">PRO</CardTitle>
                <div className="mt-4 flex justify-center items-baseline text-6xl font-display font-bold text-white">
                  $27.99
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-left mb-8 text-white/90">
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-accent shrink-0"/> Todo lo Estándar</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-accent shrink-0"/> Videollamada IA</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-accent shrink-0"/> Búsqueda prioritaria</li>
                </ul>
                <Button className="w-full text-lg h-14" variant="amber" onClick={() => handlePlanSelect('pro')}>
                  Seleccionar plan
                </Button>
              </CardContent>
            </Card>

            {/* Estandar */}
            <Card className="glass-panel border-white/10 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-xl text-white/80">ESTÁNDAR</CardTitle>
                <div className="mt-4 flex justify-center items-baseline text-5xl font-display font-bold">
                  $14.99
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-left mb-8 text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-accent shrink-0"/> Búsqueda automática</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-accent shrink-0"/> Notificaciones SMS</li>
                </ul>
                <Button className="w-full" onClick={() => handlePlanSelect('estandar')}>
                  Seleccionar plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SERVICES GRID */}
        <div className="mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Button variant="glass" className="h-24 flex-col gap-2 rounded-2xl">
              <FileText className="w-6 h-6 text-primary" />
              Renovación NIE
            </Button>
            <Button variant="glass" className="h-24 flex-col gap-2 rounded-2xl">
              <Globe className="w-6 h-6 text-secondary" />
              Visado / Residencia
            </Button>
            <Button variant="glass" className="h-24 flex-col gap-2 rounded-2xl">
              <MapPin className="w-6 h-6 text-accent" />
              Empadronamiento
            </Button>
            <Button variant="glass" className="h-24 flex-col gap-2 rounded-2xl text-muted-foreground">
              Ver todos...
            </Button>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-lg mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Aviso legal</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
          <div className="flex gap-6 text-muted-foreground">
            {/* Social Icons Mock */}
            <div className="w-5 h-5 rounded bg-white/20 hover:bg-white/40 cursor-pointer"></div>
            <div className="w-5 h-5 rounded bg-white/20 hover:bg-white/40 cursor-pointer"></div>
            <div className="w-5 h-5 rounded bg-white/20 hover:bg-white/40 cursor-pointer"></div>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2026 GestoriaCitalA
          </div>
        </div>
      </footer>
    </div>
  );
}
