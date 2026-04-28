import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Mic, MicOff, Upload, CheckCircle } from "lucide-react";

export default function Regularizacion2026() {
  const [isListening, setIsListening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [lastMessage, setLastMessage] = useState(
    "السلام عليكم، مرحبا بك فـ GestoriaCitaIA"
  );

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  async function startRealtime() {
    try {
      const res = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant: "mohamed" }),
      });

      const data = await res.json();
      const token = data?.value;

      if (!token) {
        alert("Realtime token error");
        return;
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      const local = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      local.getTracks().forEach((track) => pc.addTrack(track, local));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        setIsListening(true);

        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text:
                    "ابدأ أنت الكلام الآن. قول: السلام عليكم، مرحبا بك فـ GestoriaCitaIA. أنا محمد وغادي نعاونك اليوم.",
                },
              ],
            },
          })
        );

        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
            },
          })
        );
      };

      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === "response.output_text.delta") {
            setLastMessage((prev) => prev + msg.delta);
          }

          if (msg.type === "response.created") {
            setLastMessage("");
          }
        } catch {}
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer = await sdpRes.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answer,
      });
    } catch (err) {
      console.error(err);
      alert("Realtime error");
    }
  }

  function stopRealtime() {
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;
    setIsListening(false);
  }

  function handleMic() {
    if (isListening) stopRealtime();
    else startRealtime();
  }

  function handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.multiple = true;

    input.onchange = async () => {
      setUploading(true);

      setTimeout(() => {
        setUploading(false);
        setVerified(true);
        setLastMessage(
          "مزيان، راجعت الوثائق ديالك. الملف ديالك قوي وتقدر تدفع فالتسوية الجماعية."
        );
      }, 2500);
    };

    input.click();
  }

  function handleConfirm() {
    setConfirmed(true);
    setLastMessage(
      "شكراً على الثقة ديالك. غادي يوصلك PDF و ZIP فالواتساب فيه الملف ديالك كامل."
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="rounded-3xl overflow-hidden bg-white shadow-xl border">
          <div className="relative h-[520px] bg-gradient-to-b from-slate-200 to-slate-100">
            <img
              src="/images/avatar-mohamed.png"
              alt="Mohamed"
              className="w-full h-full object-cover"
            />

            <div className="absolute top-4 left-4 bg-white/90 rounded-full px-3 py-1 text-sm font-bold text-green-600">
              ● Online
            </div>

            <div className="absolute bottom-5 left-0 right-0 flex justify-center">
              <button
                onClick={handleMic}
                className="w-16 h-16 rounded-full bg-blue-700 text-white flex items-center justify-center shadow-xl"
              >
                {isListening ? <MicOff size={28} /> : <Mic size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white rounded-3xl shadow-xl border p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Regularización 2026
            </h1>
            <p className="text-slate-500 text-sm">
              Mohamed AI - GestoriaCitaIA
            </p>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4 min-h-[120px] text-right leading-8 text-slate-700">
            {lastMessage}
          </div>

          <button
            onClick={handleUpload}
            disabled={!isListening || uploading}
            className="w-full rounded-2xl bg-blue-700 text-white py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload size={18} />
            {uploading ? "Uploading..." : "Subir documentos"}
          </button>

          <button
            onClick={handleConfirm}
            disabled={!verified || confirmed}
            className="w-full rounded-2xl bg-green-600 text-white py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle size={18} />
            {confirmed ? "Confirmado" : "Confirmar"}
          </button>

          <div className="text-xs text-slate-500 text-center">
            أولاً شعل الميكروفون، من بعد طلع الوثائق، ومن بعد Confirmar
          </div>
        </div>
      </main>

      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}
