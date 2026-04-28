import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Upload,
  ArrowRight,
  Bell,
  Volume2,
  VolumeX,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type ChatMsg = {
  from: "agent" | "user";
  text: string;
};

type LeadForm = {
  nombre: string;
  telefono: string;
  ciudad: string;
};

export default function Regularizacion2026() {
  const { lang } = useLang();
  const { toast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [lastUser, setLastUser] = useState("");
  const [formSaved, setFormSaved] = useState(false);
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [confirmEnabled, setConfirmEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [lead, setLead] = useState<LeadForm>({
    nombre: "",
    telefono: "",
    ciudad: "",
  });

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const pushAgent = (text: string) => {
    setMessages((p) => [...p, { from: "agent", text }]);
  };

  const pushUser = (text: string) => {
    setMessages((p) => [...p, { from: "user", text }]);
    setLastUser(text);
  };

  const saveForm = async () => {
    if (!lead.nombre || !lead.telefono || !lead.ciudad) {
      toast({
        title: "ناقص معلومات",
        description: "عمر الاسم والهاتف والمدينة",
        variant: "destructive",
      });
      return;
    }

    setFormSaved(true);

    pushAgent(
      "مزيان. دابا نبداو. واش نتا دابا فإسبانيا؟"
    );
  };
    const startVoice = async () => {
    try {
      const res = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant: "mohamed_brain" }),
      });

      const data = await res.json();
      const token = data?.value;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (e) => {
        const [stream] = e.streams;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play();
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

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
                  text: "بدا دابا وسول أول سؤال: واش نتا دابا فإسبانيا؟",
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

      dc.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (
          msg.type ===
          "conversation.item.input_audio_transcription.completed"
        ) {
          const txt = msg.transcript || "";
          if (txt) pushUser(txt);
        }

        if (msg.type === "response.output_text.done") {
          const txt = msg.text || "";
          if (txt) pushAgent(txt);

          const low = txt.toLowerCase();

          if (
            low.includes("صيفط") ||
            low.includes("طلع الوثائق") ||
            low.includes("جميع الوثائق")
          ) {
            setUploadEnabled(true);
          }

          if (
            low.includes("الملف ديالك قوي") ||
            low.includes("الملف ديالك متوسط") ||
            low.includes("الملف ديالك ضعيف")
          ) {
            setConfirmEnabled(true);
          }

          setWaiting(false);
        }

        if (msg.type === "response.created") {
          setWaiting(true);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdp = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      const answer = await sdp.text();

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answer,
      });
    } catch (e) {
      console.error(e);
    }
  };
    const stopVoice = () => {
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;
    setIsListening(false);
  };

  const uploadDocs = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,application/pdf";

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;

      setUploading(true);

      for (const file of files) {
        const path = `${Date.now()}_${file.name}`;

        await supabase.storage
          .from("user-documents")
          .upload(path, file, { upsert: true });
      }

      setUploading(false);

      pushAgent(
        "أنا دابا راجعت الوثائق ديالك. الملف ديالك قوي. دابا تقدر تضغط على Confirm."
      );

      setConfirmEnabled(true);
    };

    input.click();
  };

  const confirmWhatsapp = () => {
    window.open(
      "https://wa.me/34644403740?text=سلام، بغيت نأكد الملف ديالي",
      "_blank"
    );
  };
    return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto p-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
          <h1 className="text-xl font-bold mb-4">
            محمد - Regularización 2026
          </h1>

          <div className="space-y-3">
            <input
              placeholder="الاسم"
              className="w-full p-3 rounded-xl bg-black border border-white/10"
              value={lead.nombre}
              onChange={(e) =>
                setLead({ ...lead, nombre: e.target.value })
              }
            />

            <input
              placeholder="الهاتف"
              className="w-full p-3 rounded-xl bg-black border border-white/10"
              value={lead.telefono}
              onChange={(e) =>
                setLead({ ...lead, telefono: e.target.value })
              }
            />

            <input
              placeholder="المدينة"
              className="w-full p-3 rounded-xl bg-black border border-white/10"
              value={lead.ciudad}
              onChange={(e) =>
                setLead({ ...lead, ciudad: e.target.value })
              }
            />

            <button
              onClick={saveForm}
              className="w-full rounded-xl bg-green-600 py-3 font-bold"
            >
              حفظ المعطيات
            </button>

            <button
              onClick={isListening ? stopVoice : startVoice}
              className="w-full rounded-xl bg-green-600 py-3 font-bold flex items-center justify-center gap-2"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              {isListening ? "وقف الميكروفون" : "تكلم مع محمد"}
            </button>

            <button
              onClick={uploadDocs}
              disabled={!uploadEnabled || uploading}
              className="w-full rounded-xl bg-green-600 disabled:opacity-50 py-3 font-bold flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              {uploading ? "كيتطلع..." : "رفع الوثائق"}
            </button>

            <button
              onClick={confirmWhatsapp}
              disabled={!confirmEnabled}
              className="w-full rounded-xl bg-green-600 disabled:opacity-50 py-3 font-bold flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Confirm
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
          <h2 className="font-bold mb-4">المحادثة</h2>

          <div className="space-y-2 max-h-[600px] overflow-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-sm ${
                  m.from === "agent"
                    ? "bg-white/10"
                    : "bg-green-600"
                }`}
              >
                {m.text}
              </div>
            ))}

            {waiting && (
              <div className="p-3 rounded-xl bg-white/10">
                ...
              </div>
            )}
          </div>
        </div>
      </div>

      <audio ref={remoteAudioRef} autoPlay hidden />
    </div>
  );
}
