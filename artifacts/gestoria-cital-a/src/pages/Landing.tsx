import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Play, ChevronRight, FileText, Globe, MapPin, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-galaxy opacity-40 mix-blend-screen"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-galaxy.png)` }}
      />

      <Navbar />

      <main className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

        {/* HERO TEXT - smaller, centered */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border-primary/30 text-primary mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-medium">IA de Extranjería v2.0 Activa</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display leading-tight mb-3">
            Tu Gestoría de Extranjería{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary text-glow">
              Inteligente con IA
            </span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Te ayudamos paso a paso a conseguir tu cita y preparar tus documentos.
          </p>
        </motion.div>

        {/* TWO AGENT WINDOWS - side by side, compact */}
        <motion.div
          className="grid grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <AgentCard
            name="Mohamed"
            role="Especialista en Extranjería"
            imagePath={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
            delay={0.1}
          />
          <AgentCard
            name="Sara"
            role="Asesora Legal"
            imagePath={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
            delay={0.2}
          />
        </motion.div>

        {/* SUB TEXT */}
        <p className="text-center text-xs text-muted-foreground mb-10">
          Te ayudamos paso a paso a conseguir tu cita y preparar tus documentos
        </p>

        {/* FEATURES CHECKLIST */}
        <motion.div
          className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {["100% online", "Soporte en español y darija", "Verificación de documentos con IA", "Aviso automático de citas disponibles"].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-white/80 text-sm">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </motion.div>

        {/* VIDEO SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <div className="relative rounded-2xl overflow-hidden glass-panel-heavy aspect-video max-w-3xl mx-auto border border-white/20 group cursor-pointer box-glow-secondary shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-secondary/20 to-primary/20"></div>
            {/* Thumbnail image */}
            <div className="absolute inset-0 bg-[url('/images/bg-galaxy.png')] bg-cover bg-center opacity-30"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/40">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span className="font-display font-bold text-lg text-white">GestoriaCitaIA</span>
              </div>
              <div className="w-14 h-14 rounded-full bg-red-600 border-4 border-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xl">
                <Play className="w-6 h-6 text-white ml-1 fill-white" />
              </div>
              <p className="font-medium text-base text-white mt-1">Cómo funciona GestoriaCitaIA</p>
            </div>
          </div>
        </motion.div>

        {/* PRICING */}
        <div className="mb-14 text-center">
          <h2 className="text-2xl font-display font-bold mb-8">Trámites de Extranjería</h2>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto items-center">
            {/* Basico */}
            <Card className="glass-panel border-white/10 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white/70 uppercase tracking-wider">BÁSICO</CardTitle>
                <div className="text-4xl font-display font-bold text-white mt-2">$9.99</div>
                <p className="text-xs text-muted-foreground">PN: MAGO MÁGICO</p>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="amber" onClick={() => setLocation("/panel")}>
                  Seleccionar plan
                </Button>
              </CardContent>
            </Card>

            {/* Estandar */}
            <Card className="glass-panel border-white/10 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white/70 uppercase tracking-wider">ESTÁNDAR</CardTitle>
                <div className="text-4xl font-display font-bold text-white mt-2">$14.99</div>
                <p className="text-xs text-muted-foreground">PN: MAGO LIBRE</p>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setLocation("/panel")}>
                  Seleccionar plan
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="glass-panel-heavy border-amber-500/60 relative shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                20% DESCUENTO
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-400 uppercase tracking-wider">PRO</CardTitle>
                <div className="text-4xl font-display font-bold text-white mt-2">$27.99</div>
                <p className="text-xs text-muted-foreground">OR: DESCINDIDO</p>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="amber" onClick={() => setLocation("/panel")}>
                  Seleccionar plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SERVICES GRID */}
        <div className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <Button variant="glass" className="h-20 flex-col gap-2 rounded-2xl text-sm">
              <FileText className="w-5 h-5 text-primary" />
              Renovación NIE
            </Button>
            <Button variant="glass" className="h-20 flex-col gap-2 rounded-2xl text-sm">
              <Globe className="w-5 h-5 text-secondary" />
              Visado / Residencia
            </Button>
            <Button variant="glass" className="h-20 flex-col gap-2 rounded-2xl text-sm">
              <MapPin className="w-5 h-5 text-accent" />
              Empadronamiento
            </Button>
            <Button variant="glass" className="h-20 flex-col gap-2 rounded-2xl text-sm">
              <Users className="w-5 h-5 text-muted-foreground" />
              Empadronamiento
            </Button>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex gap-3">
            <a href="#" className="hover:text-white transition-colors">Aviso legal</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
          <div className="flex gap-4 text-muted-foreground">
            {/* Facebook */}
            <a href="#" className="w-6 h-6 rounded bg-blue-600/70 hover:bg-blue-600 cursor-pointer flex items-center justify-center text-white text-xs font-bold transition-colors">f</a>
            {/* Instagram */}
            <a href="#" className="w-6 h-6 rounded bg-pink-600/70 hover:bg-pink-600 cursor-pointer flex items-center justify-center transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            {/* X / Twitter */}
            <a href="#" className="w-6 h-6 rounded bg-black/70 hover:bg-black cursor-pointer flex items-center justify-center transition-colors border border-white/20">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.845L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            {/* WhatsApp */}
            <a href="#" className="w-6 h-6 rounded bg-green-600/70 hover:bg-green-600 cursor-pointer flex items-center justify-center transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
          <div className="text-xs text-muted-foreground">
            © 2026 GestoriaCitalA
          </div>
        </div>
      </footer>
    </div>
  );
}
