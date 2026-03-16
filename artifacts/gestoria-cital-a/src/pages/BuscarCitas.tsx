import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, FileText, Settings, Maximize2, Globe, MicOff, Mic } from "lucide-react";
import { useScheduleAppointment } from "@/hooks/use-appointments";

export default function BuscarCitas() {
  const [selectedTramite, setSelectedTramite] = useState("");
  const { toast } = useToast();
  const scheduleMutation = useScheduleAppointment();
  
  const handleAceptar = () => {
    if (!selectedTramite) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un trámite primero.",
        variant: "destructive"
      });
      return;
    }
    
    scheduleMutation.mutate({ type: selectedTramite }, {
      onSuccess: () => {
        toast({
          title: "¡Proceso iniciado!",
          description: "La IA está buscando citas disponibles para tu trámite.",
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col h-screen overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-galaxy opacity-40 mix-blend-screen"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-galaxy.png)` }}
      />
      
      <Navbar />

      <main className="flex-1 relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full h-full flex flex-col">
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-display font-bold">Buscador Inteligente</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white/5 rounded-full p-1.5 pr-4 border border-white/10">
              <img 
                src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                alt="Mohamed"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-medium">Mohamed asistiendo...</span>
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse ml-2"></span>
            </div>
          </div>
        </div>

        {/* BROWSER SIMULATION */}
        <div className="flex-1 min-h-[400px] relative rounded-t-xl rounded-b-md overflow-hidden glass-panel border border-white/20 shadow-2xl flex flex-col bg-[#f0f2f5] dark:bg-[#1a1b1e]">
          
          {/* Browser Header */}
          <div className="h-12 bg-[#dfe1e5] dark:bg-[#2c2d31] flex items-center px-4 gap-4 border-b border-black/10 dark:border-white/10 shrink-0">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            </div>
            <div className="flex-1 mx-4 max-w-xl">
              <div className="bg-white dark:bg-[#1e1e20] rounded-md h-7 flex items-center px-3 text-xs text-gray-500 font-mono shadow-inner">
                <Globe className="w-3 h-3 mr-2" />
                sede.administracionespublicas.gob.es
              </div>
            </div>
          </div>

          {/* Browser Content */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 p-8 text-black dark:text-white">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-[#003366] dark:text-blue-400 mb-6 border-b pb-2">CITA PREVIA DE EXTRANJERÍA</h2>
              
              <div className="bg-[#f8f9fa] dark:bg-zinc-800 p-6 rounded border border-gray-200 dark:border-zinc-700">
                <label className="block text-sm font-bold mb-2">TRÁMITES DISPONIBLES PARA LA PROVINCIA SELECCIONADA</label>
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedTramite}
                  onChange={(e) => setSelectedTramite(e.target.value)}
                >
                  <option value="">Seleccione el trámite entre los relacionados</option>
                  <option value="tie">Renovación de Tarjeta de Identidad de Extranjero (TIE)</option>
                  <option value="regreso">Autorización de Regreso</option>
                  <option value="nie">Certificados y Asignación NIE</option>
                  <option value="ue">Certificados UE</option>
                  <option value="estudiantes">Estudiantes</option>
                </select>

                <div className="flex justify-center gap-4 mt-8">
                  <Button variant="outline" className="bg-gray-200 text-black border-gray-300 hover:bg-gray-300 rounded-sm">
                    Volver
                  </Button>
                  <Button 
                    className="bg-[#003366] text-white hover:bg-[#002244] rounded-sm"
                    onClick={handleAceptar}
                    disabled={scheduleMutation.isPending}
                  >
                    {scheduleMutation.isPending ? "Procesando..." : "Aceptar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* AI CHAT BUBBLE OVERLAY */}
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
              className="absolute bottom-6 right-6 max-w-sm"
            >
              <Card className="glass-panel-heavy border-primary/40 shadow-xl shadow-primary/20 p-4 rounded-2xl rounded-br-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <img src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`} className="w-full h-full rounded-full object-cover" alt="AI" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Primero, selecciona tu trámite. Vamos a pulsar <span className="text-accent font-bold">"Renovación de Tarjeta de Identidad de Extranjero (TIE)"</span>
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

        </div>
      </main>

      {/* BOTTOM TOOLBAR */}
      <div className="relative z-20 glass-panel-heavy border-t border-white/10 p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-white">
              <MicOff className="w-5 h-5 text-destructive" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-white hidden sm:flex">
              <MessageSquare className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex gap-4">
            <Button variant="glass" className="rounded-xl px-6 border-white/20 hover:border-primary/50 text-white">
              <FileText className="w-4 h-4 mr-2" /> Documentos
            </Button>
            <Button variant="glass" className="rounded-xl px-6 border-white/20 hover:border-primary/50 text-white">
              <Settings className="w-4 h-4 mr-2" /> Formularios
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-white">
            <Maximize2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

    </div>
  );
}
