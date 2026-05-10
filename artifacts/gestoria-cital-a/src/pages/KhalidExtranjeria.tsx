import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Shield,
  Volume2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function KhalidExtranjeria() {
  const { toast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [messagesCount, setMessagesCount] = useState(0);
  const [showPayment, setShowPayment] = useState(false);

  const realtimeRef = useRef<any>(null);

  useEffect(() => {
    if (messagesCount >= 2) {
      setShowPayment(true);
    }
  }, [messagesCount]);

  const khalidInstructions = useMemo(() => {
    return `
أنت خالد من GestoriaCitaIA.

🎯 الدور ديالك:
خبير محترف فالقانون ديال الهجرة والإقامة والأوراق فإسبانيا.

🧠 القواعد:

- هضر غير بالدارجة المغربية.
- بالحروف العربية فقط.
- هضر بطريقة احترافية وواضحة وبسيطة.
- جاوب بحال مستشار قانوني محترف.
- عاون الناس فكل ما يخص:
  - الإقامة
  - الأوراݣ
  - الباريو
  - أرايݣو
  - الريزيدونسيا
  - الجنسية
  - رفض الملفات
  - الطرد
  - الحبس
  - الغرامات
  - الشرطة
  - المحاكم
  - الكوميساريا
  - لم الشمل
  - الدراسة
  - العمل
  - قانون الأجانب الإسباني
  - تسوية الوضعية
  - أي مشكل عند المهاجرين المغاربة فإسبانيا

- إلا ما عرفتيش شي معلومة، قول ما متأكدش.
- ما تخترعش القوانين.
- هضر بثقة وهدوء.
- جاوب بطريقة قصيرة ومفيدة.
- ما تهضرش بالإنجليزية.
- ما تهضرش بالإسبانية.
- غير الدارجة المغربية.

🎤 الصوت:
احترافي، هادئ، ذكي، ومستشار قانوني مغربي محترم.
`;
  }, []);

  const startConversation = async () => {
    try {
      setIsListening(true);

      setMessagesCount((prev) => prev + 1);

      toast({
        title: "Khalid conectado",
        description: "Realtime activo",
      });

      /*
      هنا خليه نفس realtime ديال Mohammed
      انسخ نفس الكود realtime/session/webRTC
      اللي عندك ف Mohammed
      */
    } catch (error) {
      console.error(error);

      toast({
        title: "Error",
        description: "No se pudo conectar",
      });
    }
  };

  const stopConversation = () => {
    setIsListening(false);

    if (realtimeRef.current) {
      realtimeRef.current.close?.();
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <Navbar />

      <div className="max-w-md mx-auto px-4 pt-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-[#1e293b] bg-[#081120] overflow-hidden shadow-2xl"
        >
          <div className="relative">
            <img
              src="/khalid-extranjeria.jpg"
              alt="Khalid"
              className="w-full h-[340px] object-cover"
            />

            <div className="absolute top-4 left-4 bg-green-500/20 border border-green-400 px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              En línea
            </div>

            <div className="absolute bottom-4 left-4">
              <h2 className="text-3xl font-bold">
                Khalid
              </h2>

              <p className="text-gray-300 text-sm">
                Especialista en Extranjería
              </p>
            </div>

            <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-full">
              <Volume2 size={18} />
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
              className={`w-full h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                isListening
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff size={24} />
                  Finalizar conversación
                </>
              ) : (
                <>
                  <Mic size={24} />
                  Hablar con Khalid
                </>
              )}
            </motion.button>

            <div className="mt-5 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-green-400" size={18} />
                <span className="font-semibold">
                  Khalid IA
                </span>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">
                Especialista profesional en extranjería española para marroquíes en España.
                Pregunta sobre residencia, papeles, multas, policía, nacionalidad,
                arraigo, trabajo, estudios y cualquier problema legal relacionado
                con inmigración.
              </p>
            </div>

            {showPayment && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6"
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
