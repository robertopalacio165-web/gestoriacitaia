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
const [paymentEnabled, setPaymentEnabled] = useState(false);
const [answeredOnce, setAnsweredOnce] = useState(false);
  const [userAskedQuestion, setUserAskedQuestion] = useState(false);
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false);
  const realtimeRef = useRef<any>(null);
const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
const realtimePcRef = useRef<RTCPeerConnection | null>(null);
const realtimeDcRef = useRef<RTCDataChannel | null>(null);
const realtimeLocalStreamRef = useRef<MediaStream | null>(null);

const assistantBusyRef = useRef(false);
const lastUserTranscriptRef = useRef("");
const lastAssistantTextRef = useRef("");

const [waitingKhalid, setWaitingKhalid] = useState(false);
const [lastTranscript, setLastTranscript] = useState("");
const [lastReply, setLastReply] = useState("");
  const isPaid =
  localStorage.getItem("khalid_paid") === "true";
  useEffect(() => {

  const params =
    new URLSearchParams(window.location.search);

  const paid =
    params.get("paid");

  if (paid === "true") {

    localStorage.setItem(
      "khalid_paid",
      "true"
    );

    setShowPayment(false);

  }

}, []);

useEffect(() => {

  if (
    lastReply.includes("سولني أي سؤال") ||
    lastReply.includes("الهجرة") ||
    lastReply.includes("الإقامة")
  ) {

    const isPremium =
      localStorage.getItem("khalid_paid") === "true";

    if (!isPremium) {

      setShowPayment(true);

      stopConversation();

    }

  }

}, [lastReply]);

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

      console.log("TOKEN RESPONSE:", data);

      const EPHEMERAL_KEY =
        data?.client_secret?.value ||
        data?.value ||
        data?.clientSecret;

      if (!EPHEMERAL_KEY) {
        throw new Error("No ephemeral key");
      }

      const pc = new RTCPeerConnection();
realtimePcRef.current = pc;
      realtimeRef.current = pc;

      const audioEl = document.createElement("audio");

audioEl.autoplay = true;

audioEl.playsInline = true;

remoteAudioRef.current = audioEl;

      audioEl.autoplay = true;

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const mediaStream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
realtimeLocalStreamRef.current = mediaStream;

mediaStream
  .getTracks()
  .forEach((track) => {
    pc.addTrack(track, mediaStream);
  });
     
      const dc =
        pc.createDataChannel("oai-events");

     dc.addEventListener("open", () => {

  console.log("Realtime conectado");

  dc.send(
    JSON.stringify({
      type: "session.update",
      session: {
        instructions: `
أنت خالد من GestoriaCitaIA.

تكلم فقط بالدارجة المغربية.

أنت خبير فالهجرة والقانون فإسبانيا.

جاوب فقط مرة وحدة.

من بعد أول جواب قول مباشرة:

"إلى بغيتي نكمل معاك، ضغط على زر الأداء وخلّص."

ومن بعد سكت وما تجاوبش مرة أخرى.
الجواب يكون قصير وواضح وطبيعي.

ممنوع تعاود السؤال.

ممنوع تهضر بزاف.

إذا قال المستخدم "سلام" أو "مرحبا"
قول:

السلام عليكم، أنا خالد من GestoriaCitaIA.
سولني أي سؤال على الهجرة أو الإقامة أو الأوراق فإسبانيا وإن شاء الله نجاوبك.
`,
        modalities: ["audio", "text"],
        turn_detection: {
          type: "server_vad",
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 1200,
        },
      },
    })
  );

  // 🎤 خالد يهضر مباشرة
  dc.send(
    JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions:
          "قول: السلام عليكم، أنا خالد من GestoriaCitaIA. سولني أي سؤال على الهجرة فإسبانيا.",
      },
    })
  );

});
dc.onmessage = (event) => {
  try {

    const msg = JSON.parse(event.data);

    // 🧠 كلام خالد
  if (
  msg.type === "response.output_text.delta" &&
  typeof msg.delta === "string"
) {

  setLastReply((prev) => prev + msg.delta);

  const isPremium =
    localStorage.getItem("khalid_paid") === "true";

  if (
    userAskedQuestion &&
    !freeQuestionUsed &&
    !isPremium
  ) {

    setFreeQuestionUsed(true);

    setPaymentEnabled(true);

    setShowPayment(true);

    stopConversation();

  }

}

    // 🎤 كلام المستخدم
    const transcript =
      msg?.transcript ||
      msg?.item?.transcript ||
      msg?.item?.content?.[0]?.transcript ||
      "";

    if (
      (
        msg.type === "conversation.item.input_audio_transcription.completed" ||
        msg.type === "input_audio_buffer.transcription.completed"
      ) &&
      transcript &&
      transcript !== lastUserTranscriptRef.current
    ) {

      lastUserTranscriptRef.current = transcript;

      setLastTranscript(transcript);

      console.log("USER:", transcript);
setUserAskedQuestion(true);
    }

    // 🤖 خالد بدا يهضر
    if (msg.type === "response.created") {

      assistantBusyRef.current = true;

      setWaitingKhalid(true);

      setLastReply("");

    }

    // ✅ خالد سالى
if (msg.type === "response.done") {

  assistantBusyRef.current = false;

  setWaitingKhalid(false);

  console.log("KHALID DONE");

}

  } catch (err) {

    console.error(err);

  }
};
      const offer = await pc.createOffer();

      await pc.setLocalDescription(offer);

      const baseUrl =
     "https://api.openai.com/v1/realtime/calls";

      const sdpResponse = await fetch(
        baseUrl,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      const sdpText =
        await sdpResponse.text();

      console.log(
        "SDP STATUS:",
        sdpResponse.status
      );

      console.log(
        "SDP RESPONSE:",
        sdpText
      );

      if (!sdpResponse.ok) {
        throw new Error(sdpText);
      }

      const answer = {
        type: "answer",
        sdp: sdpText,
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
          className="rounded-2xl overflow-hidden border border-[#1e293b] bg-[#071224] shadow-2xl"
        >
          <div className="relative">
            
          <video
  autoPlay
  muted
  loop
  playsInline
            poster={`${import.meta.env.BASE_URL}images/khalid-extranjeria.png`}
  className="w-full h-[260px] object-cover"
>

  <source
    src="/videoskhalid-placeholder.mp4.mp4"
    type="video/mp4"
  />

</video>

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
          <div className="p-4">

            {isPaid && (
     <motion.button
  whileTap={{ scale: 0.96 }}

  disabled={
    answeredOnce &&
    localStorage.getItem("khalid_paid") !== "true"
  }

  onClick={() => {

    const isPremium =
      localStorage.getItem("khalid_paid") === "true";

    if (
      answeredOnce &&
      !isPremium
    ) {
      return;
    }

    if (isListening) {

      stopConversation();

    } else {

      startConversation();

    }

  }}

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
            )}
            {!isPaid && (
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="mt-3"
>
  <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-[#1a1200] via-[#0b0b0b] to-[#1a1200] p-3">

    <div className="relative z-10">

      <div className="flex items-start justify-between mb-2">

        <div className="flex items-center gap-2">

          <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center text-sm">
            🔒
          </div>

          <div>
            <h3 className="text-lg font-bold text-white leading-tight">
              Desbloquea a Khalid
            </h3>

            <div className="mt-1 inline-flex items-center rounded-full bg-yellow-500 px-2 py-[2px] text-[9px] font-bold text-black">
              PREMIUM
            </div>
          </div>

        </div>

        <div className="text-right">
          <div className="text-xl font-black text-yellow-400 leading-none">
            11,99€
          </div>

          <div className="text-[10px] text-yellow-200 mt-1">
            Acceso completo
          </div>
        </div>

      </div>

      <p className="text-gray-300 text-xs leading-relaxed mb-3">
  Acceso ilimitado a respuestas y asesoría personalizada.
</p>

<button
  disabled={!paymentEnabled}
  onClick={async () => {

    if (!paymentEnabled) {
      return;
    }

    try {

      const response = await fetch(
        "/api/create-checkout-khalid",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (data?.url) {

        window.location.href = data.url;

      }

    } catch (err) {

      console.error(err);

    }

  }}
  className={`w-full h-10 rounded-xl text-black font-extrabold text-sm transition-all ${
    paymentEnabled
      ? "bg-gradient-to-b from-yellow-300 to-yellow-500 border border-yellow-200/40 shadow-[0_8px_25px_rgba(255,200,0,0.35)]"
      : "bg-gray-600 opacity-50 cursor-not-allowed"
  }`}
>
  🔓 Desbloquear ahora
</button>

      <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-400">
        <span>🔐 Pago seguro con Stripe</span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">

        <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-blue-700 font-black text-[10px]">
          VISA
        </div>

        <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-red-500 font-black text-[10px]">
          Mastercard
        </div>

        <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-black font-black text-[10px]">
           Pay
        </div>

        <div className="h-8 px-2 rounded-lg bg-white flex items-center justify-center text-black font-black text-[10px]">
          G Pay
        </div>

      </div>

    </div>
  </div>
</motion.div>
          )}
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

   
          </div>
        </motion.div>
      </div>
    </div>
  );
}
