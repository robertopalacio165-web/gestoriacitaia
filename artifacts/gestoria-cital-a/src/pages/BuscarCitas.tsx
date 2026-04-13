import { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { PaymentModal } from "@/components/PaymentModal";
import { OfficialBrowserPanel } from "@/components/OfficialBrowserPanel";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  MessageSquare,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useScheduleAppointment } from "@/hooks/use-appointments";
import { supabase } from "@/lib/supabaseClient";

interface ChatMsg {
  from: "agent" | "user";
  text: string;
}

export default function BuscarCitas() {
  const [selectedTramite, setSelectedTramite] = useState("tie");
  const [muted, setMuted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState<string | null>(null);

  const { t, lang } = useLang();
  const { toast } = useToast();
  const scheduleMutation = useScheduleAppointment();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatMessages([
      {
        from: "agent",
        text:
          lang === "darija"
            ? "مرحبا أنا سارة، كيفاش نعاونك؟"
            : "Hola, soy Sara. ¿En qué te ayudo?",
      },
    ]);
  }, [lang]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { from: "user", text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setSendingChat(true);

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          from: "agent",
          text:
            lang === "darija"
              ? "خدامين معاك خطوة بخطوة."
              : "Estoy trabajando contigo paso a paso.",
        },
      ]);
      setSendingChat(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={(p) => setPlanActivo(p)}
        agentMessage="Activa tu plan para continuar"
      />

      <main className="flex-1 pt-16 px-4 max-w-7xl mx-auto w-full">
        <h1 className="text-xl font-bold mb-4">
          {t("buscar_title")}
        </h1>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* LEFT PANEL */}
          <div className="lg:w-[340px] flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden bg-black h-[280px]">
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                className="w-full h-full object-cover"
              />

              <button
                onClick={() => setMuted(!muted)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"
              >
                {muted ? (
                  <MicOff className="text-white w-4 h-4" />
                ) : (
                  <Mic className="text-white w-4 h-4" />
                )}
              </button>
            </div>

            <button
              onClick={() => setShowChat(!showChat)}
              className="border rounded-xl py-2 text-sm"
            >
              Chat
            </button>

            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border rounded-xl p-2 flex flex-col h-[200px]"
                >
                  <div className="flex-1 overflow-y-auto text-xs space-y-2">
                    {chatMessages.map((m, i) => (
                      <div key={i}>{m.text}</div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex gap-2 mt-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 border rounded px-2 text-xs"
                    />
                    <button onClick={handleSendChat}>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT PANEL 🔥 NAVEGADOR REAL */}
          <motion.div
            className="flex-1 min-h-[400px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <OfficialBrowserPanel
              url="https://icp.administracionelectronica.gob.es/icpplus/index.html"
              avatarImage={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
