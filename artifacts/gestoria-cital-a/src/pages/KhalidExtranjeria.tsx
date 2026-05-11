import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Shield,
  Volume2,
  Bell,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";

export default function KhalidExtranjeria() {
  const { toast } = useToast();
  const { t } = useLang();

  const [isListening, setIsListening] = useState(false);
  const [messagesCount, setMessagesCount] = useState(0);
  const [showPayment, setShowPayment] = useState(false);

  const realtimeRef = useRef<any>(null);

  useEffect(() => {
    if (messagesCount >= 2) {
      setShowPayment(true);
    }
  }, [messagesCount]);

  const startConversation = async () => {
    try {
      setIsListening(true);

      setMessagesCount((prev) => prev + 1);

      const tokenResponse = await fetch(
        "/api/realtime-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assistant: "khalid",
          }),
        }
      );

      const data = await tokenResponse.json();

      const EPHEMERAL_KEY =
        data.client_secret.value;

      const pc = new RTCPeerConnection();

      realtimeRef.current = pc;

      const audioEl =
        document.createElement("audio");

      audioEl.autoplay = true;

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const mediaStream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      mediaStream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(track, mediaStream);
        });

      const dc =
        pc.createDataChannel("oai-events");

      dc.addEventListener("open", () => {
        console.log("Realtime conectado");
      });

      const offer = await pc.createOffer();

      await pc.setLocalDescription(offer);

      const baseUrl =
        "https://api.openai.com/v1/realtime";

      const model = "gpt-realtime";

      const sdpResponse = await fetch(
        `${baseUrl}?model=${model}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      const answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(
        answer as any
      );

      toast({
        title: "Khalid conectado",
        description: "Realtime activo",
      });
    } catch (error) {
      console.error(error);

      setIsListening(false);

      toast({
        title: "Error",
        description: "No se pudo conectar",
      });
    }
  };

  const stopConversation = () => {
    setIsListening(false);

    realtimeRef.current?.close?.();

    realtimeRef.current = null;
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <Navbar />

      <div className="max-w-md mx-auto px-4 pt-5 pb-20">
        <div className="mb-3">
          <h1 className="text-3xl font-bold">
            Khalid
          </h1>

          <p className="text-gray-400 text-sm">
            {t("Especialista en Extranjería")}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden border border-[#1e293b] bg-[#071224] shadow-2xl"
        >
          <div className="relative">
            <img
              src={`${import.meta.env.BASE_URL}images/khalid-extranjeria.png`}
              alt="Khalid"
              className="w-full h-[340px] object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-green-500/30 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              En línea
            </div>

            <div className="absolute top-4 right-4 flex gap-2">
              <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
                <Bell size={16} />
              </div>

              <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
                <Volume2 size={16} />
              </div>
            </div>

            <div className="absolute bottom-5 right-4 text-right">
              <h2 className="text-2xl font-bold">
                Khalid
              </h2>

              <p className="text-sm text-gray-200">
                {t("Especialista en Extranjería")}
              </p>
            </div>

            <div className="absolute bottom-5 left-5">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                <Mic size={26} />
              </div>
            </div>
          </div>

          <div className="p-5">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={
                isListening
                  ? stopConversation
                  : startConversation
              }
              className={`w-full h-14 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                isListening
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff size={22} />
                  {t("Finalizar conversación")}
                </>
              ) : (
                <>
                  <Mic size={22} />
                  {t("Hablar con Khalid")}
                </>
              )}
            </motion.button>

            <div className="mt-5 rounded-2xl border border-[#1e293b] bg-[#0b1325] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield
                  className="text-green-400"
                  size={18}
                />

                <span className="font-semibold">
                  Khalid IA
                </span>
              </div>

              <p className="text-sm leading-relaxed text-gray-300">
                Especialista profesional en extranjería española para marroquíes en España.
                Pregunta sobre residencia, papeles, policía, nacionalidad,
                arraigo, trabajo, estudios y cualquier problema legal relacionado
                con inmigración.
              </p>
            </div>

            {showPayment && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5"
              >
                <button
                  onClick={() => {
                    window.location.href =
                      "/checkout-khalid";
                  }}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-2xl text-lg"
                >
                  Desbloquear Khalid — 7,99€
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
