import { useRef, useState } from "react";

export default function RealtimeTest() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const startRealtime = async () => {
    setError("");
    setStatus("connecting");

    try {
      const sessionRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant: "mohamed",
        }),
      });

      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) {
        throw new Error(sessionData?.error || "Error creando sesión realtime");
      }

      const ephemeralKey =
        sessionData?.client_secret?.value ||
        sessionData?.client_secret ||
        "";

      if (!ephemeralKey) {
        throw new Error("No llegó client_secret desde realtime-session");
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const remoteAudio = document.createElement("audio");
      remoteAudio.autoplay = true;
      audioRef.current = remoteAudio;

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream && audioRef.current) {
          audioRef.current.srcObject = remoteStream;
        }
      };

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      localStreamRef.current = localStream;

      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }

      const dc = pc.createDataChannel("oai-events");

      dc.onopen = () => {
        console.log("Data channel open");

        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions:
                "جاوب ديما بالدارجة المغربية وبالحروف العربية. قول: السلام، مرحبا بيك. أنا محمد.",
            },
          })
        );
      };

      dc.onmessage = (event) => {
        console.log("Realtime event:", event.data);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-realtime";

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        const errText = await sdpResponse.text();
        throw new Error(errText || "Error negociando WebRTC con OpenAI");
      }

      const answerSdp = await sdpResponse.text();

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      setStatus("connected");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error realtime");
      setStatus("error");
    }
  };

  const stopRealtime = () => {
    try {
      pcRef.current?.close();
      pcRef.current = null;

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;

      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }

      setStatus("idle");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Realtime Test</h1>

      <div className="flex gap-3 mb-4">
        <button
          onClick={startRealtime}
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
          type="button"
        >
          Start Realtime
        </button>

        <button
          onClick={stopRealtime}
          className="px-4 py-2 rounded bg-red-600 hover:bg-red-700"
          type="button"
        >
          Stop
        </button>
      </div>

      <p className="mb-2">Status: {status}</p>
      {error ? <pre className="text-red-400 whitespace-pre-wrap">{error}</pre> : null}
    </div>
  );
}
