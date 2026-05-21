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
const [paymentEnabled, setPaymentEnabled] = useState(true);
const [answeredOnce, setAnsweredOnce] = useState(false);
  const [userAskedQuestion, setUserAskedQuestion] = useState(false);
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
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
 const [smartAction, setSmartAction] =
  useState<any>(null);
const [hasStartedConversation, setHasStartedConversation] =
  useState(
    localStorage.getItem("khalid_started") === "true"
  );
 
  
useEffect(() => {

  const savedPaid =
    localStorage.getItem("khalid_paid");

  if (savedPaid === "true") {
    const savedConversation =
  localStorage.getItem("khalid_started");

if (savedConversation === "true") {

  setHasStartedConversation(true);

}
    setIsPaid(true);
  }

  const params =
    new URLSearchParams(window.location.search);

  const paid =
    params.get("paid");

  if (paid === "true") {

    localStorage.setItem(
      "khalid_paid",
      "true"
    );

    setIsPaid(true);

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
Nunca interrumpas tus respuestas aunque تسمع الضجيج أو شخص يتكلم. يجب أن تكمل الجواب كامل حتى النهاية قبل أن تستمع من جديد.
`,
        modalities: ["audio", "text"],
       turn_detection: null,

interrupt_response: false,

create_response: true,
      },
    })
  );

  // 🎤 خالد يهضر مباشرة
if (!hasStartedConversation) {

  localStorage.setItem(
    "khalid_started",
    "true"
  );

  setHasStartedConversation(true);

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

} else {

  dc.send(
    JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions:
          "قول: رجعتي. مرحبا بيك من جديد، نكملو منين وقفنا.",
      },
    })
  );

}

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
const khalidText =
  (lastAssistantTextRef.current + msg.delta)
    .toLowerCase();

lastAssistantTextRef.current =
  khalidText;

if (
  khalidText.includes("madrid")
) {

  setSmartAction({
    type: "office",
    city: "Madrid",
    name: "Oficina Extranjería Madrid Centro",
    address: "Calle Silva 19",
    phone: "912 73 90 39",
    image:
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=1200&auto=format&fit=crop"
  });

}

// 👮 Policía
else if (
  khalidText.includes("policia") ||
  khalidText.includes("policía") ||
  khalidText.includes("comisaria") ||
  khalidText.includes("comisaría") ||
  khalidText.includes("tie")
) {

  setSmartAction({
    type: "police",
    city: "Madrid",
    name: "Comisaría Policía Nacional",
    address: "Avenida de los Poblados",
    phone: "091",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop"
  });

}

// 📄 Arraigo
else if (
  khalidText.includes("arraigo")
) {

  setSmartAction("arraigo");

}
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
      // 🔇 apagar micro mientras Khalid habla
if (realtimeLocalStreamRef.current) {

  realtimeLocalStreamRef.current
    .getAudioTracks()
    .forEach(track => {
      track.enabled = false;
    });

}

      setLastReply("");
      lastAssistantTextRef.current = "";
setSmartAction(null);

    }

    // ✅ خالد سالى
if (msg.type === "response.done") {

  assistantBusyRef.current = false;

  setWaitingKhalid(false);
  // 🎤 reactivar micro cuando Khalid termina
if (realtimeLocalStreamRef.current) {

  realtimeLocalStreamRef.current
    .getAudioTracks()
    .forEach(track => {
      track.enabled = true;
    });

}

  console.log("KHALID DONE");
  const assistantTranscript =
  msg?.response?.output?.[0]?.content?.[0]?.transcript
    ?.toLowerCase?.() || "";

console.log(
  "KHALID SAID:",
  assistantTranscript
);

const text =
  assistantTranscript.toLowerCase();

// 👮 POLICÍA / TIE
if (
  text.includes("policia") ||
  text.includes("policía") ||
  text.includes("tie") ||
  text.includes("huellas")
) {

  setSmartAction({
    type: "link",
    title: "Policía y TIE",
    description:
      "Citas, huellas y trámites TIE",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
    buttons: [
      {
        label: "📅 Reservar cita",
      url: "/buscar-citas"
      },
      {
        label: "📍 Maps",
        url:
          "https://www.google.com/maps"
      }
    ]
  });

}

// 🏢 EXTRANJERÍA
else if (
  text.includes("extranjeria") ||
  text.includes("extranjería") ||
  text.includes("residencia") ||
  text.includes("arraigo")
) {

  setSmartAction({
    type: "link",
    title: "Oficina Extranjería",
    description:
      "Información y trámites de residencia",
    image:
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=1200&auto=format&fit=crop",
    buttons: [
      {
        label: "📅 Pedir cita",
        url: "/sara-citas"
      },
      {
        label: "📄 Información",
        url:
          "https://www.inclusion.gob.es/web/migraciones"
      }
    ]
  });

}

// 🇪🇸 NACIONALIDAD
else if (
  text.includes("nacionalidad")
) {

  setSmartAction({
    type: "link",
    title: "Nacionalidad Española",
    description:
      "Documentos y requisitos",
    image:
      "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop",
    buttons: [
      {
        label: "📄 Ver requisitos",
        url:
          "https://www.mjusticia.gob.es"
      }
    ]
  });

}
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
            {!isPaid && (
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
)}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            

           

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

           
          </div>
          <div className="p-4">

       {isPaid && (
  <div className="relative mb-4 rounded-2xl overflow-hidden">

    <img
      src={`${import.meta.env.BASE_URL}images/khalid-extranjeria.png`}
      alt="Khalid"
      className="w-full h-[260px] object-cover"
    />

    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

 



  </div>
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
            {isPaid && (
  <div className="mt-4 mb-2">

    <motion.button
      whileTap={{ scale: 0.96 }}

      onClick={() => {

        if (isListening) {

          stopConversation();

        } else {

          startConversation();

        }

      }}

      className={`w-full h-11 rounded-2xl flex items-center justify-center gap-3 shadow-2xl border border-white/20 font-semibold text-base transition-all ${
        isListening
          ? "bg-red-500"
          : "bg-[#00E05A]"
      }`}
    >

      {isListening ? (
        <>
          <MicOff size={22} />
          Finalizar conversación
        </>
      ) : (
        <>
          <Mic size={22} />
          Hablar con Khalid
        </>
      )}

    </motion.button>

  </div>
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
<div className="mt-5 rounded-[30px] border border-[#18314d] bg-gradient-to-b from-[#071224] to-[#020817] p-3 shadow-[0_0_20px_rgba(0,150,255,0.04)]">

 <h3 className="text-center text-[#42ff87] font-black text-[15px] leading-tight mb-3">
    Miles de personas ya han confiado en nosotros
  </h3>

 <div className="grid grid-cols-2 gap-2">

    <div className="rounded-2xl border border-green-500/20 bg-[#08111f] p-3 text-center">
      <div className="text-3xl mb-2">👥</div>

      <div className="text-green-400 text-[24px] font-black leading-none">
        18.420+
      </div>

      <div className="text-gray-400 text-xs mt-1">
        Expedientes
      </div>
    </div>

    <div className="rounded-2xl border border-blue-500/20 bg-[#08111f] p-3 text-center">
      <div className="text-3xl mb-2">🛡️</div>

      <div className="text-blue-400 text-[24px] font-black leading-none">
        97%
      </div>

      <div className="text-gray-400 text-xs mt-1">
        Aprobados
      </div>
    </div>

    <div className="rounded-2xl border border-purple-500/20 bg-[#08111f] p-3 text-center">
      <div className="text-3xl mb-2">⏱️</div>

      <div className="text-purple-400 text-[24px] font-black leading-none">
        4 min
      </div>

      <div className="text-gray-400 text-xs mt-1">
        Respuesta
      </div>
    </div>

    <div className="rounded-2xl border border-yellow-500/20 bg-[#08111f] p-3 text-center">
      <div className="text-3xl mb-2">🎧</div>

      <div className="text-yellow-400 text-[24px] font-black leading-none">
        100%
      </div>

      <div className="text-gray-400 text-xs mt-1">
        Atención
      </div>
    </div>

  </div>

  <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-[#0b1018] py-3 text-center text-yellow-300 font-bold text-sm">
    ⭐ Primer sistema IA de extranjería en España
  </div>

  <div className="mt-5 flex items-center justify-between">

    <div>
      <div className="text-green-400 text-4xl font-black leading-none">
        4.9/5
      </div>

      <div className="text-yellow-400 text-xl mt-1">
        ★★★★★
      </div>

      <div className="text-gray-400 text-[11px] mt-1">
        Basado en opiniones reales
      </div>
    </div>

    <div className="flex items-center -space-x-2">

      <img
        src="https://randomuser.me/api/portraits/men/32.jpg"
        className="w-10 h-10 rounded-full border-2 border-[#071224]"
      />

      <img
        src="https://randomuser.me/api/portraits/women/44.jpg"
        className="w-10 h-10 rounded-full border-2 border-[#071224]"
      />

      <img
        src="https://randomuser.me/api/portraits/men/51.jpg"
        className="w-10 h-10 rounded-full border-2 border-[#071224]"
      />

      <div className="w-10 h-10 rounded-full bg-[#111827] border-2 border-[#071224] flex items-center justify-center text-white text-xs font-bold">
        +2K
      </div>

    </div>

  </div>

</div>
   
          </div>

          
{/* SMART ACTIONS */}
{isPaid && smartAction?.type === "link" && (

<div className="mt-5 rounded-2xl border border-[#1e293b] bg-[#0b1325] p-4">

  <div className="flex items-center gap-2 mb-3">
    <span className="text-green-400 text-lg">✨</span>

    <h3 className="font-bold text-white">
      Acción recomendada
    </h3>
  </div>

  <div className="rounded-2xl overflow-hidden border border-[#1e293b]">

    <img
      src={smartAction.image}
      className="w-full h-[180px] object-cover"
    />

    <div className="p-4">

      <h4 className="text-xl font-bold mb-1">
        {smartAction.title}
      </h4>

      <p className="text-gray-400 text-sm">
        {smartAction.description}
      </p>

      <div className="grid grid-cols-1 gap-2 mt-4">

        {smartAction.buttons?.map(
          (button: any, index: number) => (

          <a
            key={index}
            href={button.url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 rounded-xl bg-[#071224] border border-[#1e293b] text-sm flex items-center justify-center"
          >
            {button.label}
          </a>

        ))}

      </div>

    </div>

  </div>

</div>

)}
  
   
        </motion.div>
      </div>
    </div>
  );
}
