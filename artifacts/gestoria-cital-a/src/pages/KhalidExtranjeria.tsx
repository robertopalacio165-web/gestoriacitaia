import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";

const GOOGLE_API_KEY = "AIzaSyAaXhxuYAfQL1WwfPsXWb168GlZ4B2JMIg";

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
  const [smartAction, setSmartAction] = useState<any>(null);
  const [hasStartedConversation, setHasStartedConversation] = useState(
    localStorage.getItem("khalid_started") === "true"
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    const savedPaid = localStorage.getItem("khalid_paid");
    if (savedPaid === "true") {
      const savedConversation = localStorage.getItem("khalid_started");
      if (savedConversation === "true") {
        setHasStartedConversation(true);
      }
      setIsPaid(true);
    }

    const params = new URLSearchParams(window.location.search);
    const paid = params.get("paid");
    if (paid === "true") {
      localStorage.setItem("khalid_paid", "true");
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
      const isPremium = localStorage.getItem("khalid_paid") === "true";
      if (!isPremium) {
        setShowPayment(true);
        stopConversation();
      }
    }
  }, [lastReply]);

  // 🔍 Extraer dirección completa del texto - CORREGIDO
  const extraerDireccionCompleta = (texto: string): string | null => {
    if (!texto) return null;

    console.log("🔍 TEXTO ORIGINAL:", texto);

    const patrones = [
      /(avinguda|avenida|avda|carrer|calle|rambla|plaza|paseo|ronda)\s+([^,\n]+?\d+[^\n]*)/i,
      /(avinguda|avenida|avda|carrer|calle|rambla|plaza|paseo|ronda)\s+([^,\n]+)/i,
    ];

    for (const patron of patrones) {
      const match = texto.match(patron);
      if (match) {
        let direccion = match[0]
          .split(/[.،\n]/)[0]
          .trim();
        direccion = direccion.replace(/\s+/g, " ");
        console.log("📍 DIRECCION DETECTADA:", direccion);
        return direccion;
      }
    }

    return null;
  };

  // 🔍 Obtener datos de Google Places
  const obtenerDatosGooglePlaces = async (direccion: string) => {
    try {
      setIsLoadingLocation(true);
      
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccion)}&key=${GOOGLE_API_KEY}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.status !== "OK" || !geocodeData.results.length) {
        throw new Error("No se encontró la dirección");
      }

      const location = geocodeData.results[0].geometry.location;
      const lat = location.lat;
      const lng = location.lng;
      const direccionFormateada = geocodeData.results[0].formatted_address;

      let photoUrl = "";
      let nombreLugar = "";

      nombreLugar = direccionFormateada;

      photoUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=1200x600&maptype=roadmap&markers=color:red|${lat},${lng}&key=${GOOGLE_API_KEY}`;

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

      return {
        address: direccionFormateada,
        lat,
        lng,
        name: nombreLugar || "Ubicación encontrada",
        photo: photoUrl,
        mapsUrl,
        placeId: ""
      };

    } catch (error) {
      console.error("Error obteniendo datos de Google Places:", error);
      
      return {
        address: direccion,
        lat: 0,
        lng: 0,
        name: "Ubicación encontrada",
        photo: `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(direccion)}&zoom=15&size=1200x600&maptype=roadmap&markers=color:red|${encodeURIComponent(direccion)}&key=${GOOGLE_API_KEY}`,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`,
        placeId: ""
      };
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // 🔍 Función principal para detectar y mostrar dirección
  const detectarYMostrarDireccion = async (texto: string) => {
    if (!texto || texto.length < 5) return;
    console.log("📝 TEXTO RECIBIDO:", texto);

    const textoLower = texto.toLowerCase();
    
    const ciudades = [
      "madrid", "barcelona", "valencia", "sevilla",
      "málaga", "malaga", "murcia", "alicante",
      "granada", "bilbao", "zaragoza", "toledo", "vigo"
    ];

    const tieneCiudad = ciudades.some(city => textoLower.includes(city));
    
    let direccion = extraerDireccionCompleta(texto);
    console.log("📍 DIRECCION FINAL:", direccion);
    
    if (!direccion && tieneCiudad) {
      const ciudadEncontrada = ciudades.find(city => textoLower.includes(city));
      if (ciudadEncontrada) {
        direccion = ciudadEncontrada.charAt(0).toUpperCase() + ciudadEncontrada.slice(1);
      }
    }

    if (!direccion) return;

    let titulo = "📍 Ubicación encontrada";
    let descripcion = "Dirección mencionada por Khalid";

    if (textoLower.includes("policia") || textoLower.includes("policía") || 
        textoLower.includes("comisaria") || textoLower.includes("comisaría") ||
        textoLower.includes("tie") || textoLower.includes("huellas")) {
      titulo = "🚔 Comisaría de Policía";
      descripcion = "Citas para huellas, TIE y trámites policiales";
    } else if (textoLower.includes("extranjeria") || textoLower.includes("extranjería") ||
               textoLower.includes("inmigracion") || textoLower.includes("inmigración") ||
               textoLower.includes("residencia") || textoLower.includes("arraigo") ||
               textoLower.includes("visado") || textoLower.includes("permiso") ||
               textoLower.includes("nie") || textoLower.includes("cita")) {
      titulo = "🏢 Oficina de Extranjería";
      descripcion = "Trámites de residencia, arraigo, visados y documentación";
    } else if (textoLower.includes("nacionalidad")) {
      titulo = "🇪🇸 Nacionalidad Española";
      descripcion = "Requisitos, documentos y plazos para obtener la nacionalidad";
    }

    setSmartAction({
      type: "loading",
      title: "🔍 Buscando ubicación...",
      description: "Obteniendo información de Google Maps",
      loading: true
    });
    
    console.log("🚨 DIRECCION ENVIADA A GOOGLE:", direccion);
    const datosGoogle = await obtenerDatosGooglePlaces(direccion);

    const nuevoSmartAction = {
      type: "place",
      title: titulo,
      description: descripcion,
      address: datosGoogle.address || direccion,
      name: datosGoogle.name || "Ubicación encontrada",
      image: datosGoogle.photo,
      mapsUrl: datosGoogle.mapsUrl,
      lat: datosGoogle.lat,
      lng: datosGoogle.lng,
      placeId: datosGoogle.placeId,
      loading: false,
      buttons: [
        {
          label: "📍 Abrir Google Maps",
          url: datosGoogle.mapsUrl,
          icon: "🗺️"
        }
      ]
    };

    console.log("📍 DIRECCIÓN COMPLETA:", nuevoSmartAction);
    setSmartAction(nuevoSmartAction);
  };

  // ============ FUNCIONES DE CONVERSACIÓN ============
  const startConversation = async () => {
    try {
      setIsListening(true);
      setMessagesCount((prev) => prev + 1);

      const tokenResponse = await fetch("/api/realtime-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant: "khalid",
        }),
      });

      const data = await tokenResponse.json();
      console.log("TOKEN RESPONSE:", data);

      const EPHEMERAL_KEY = data?.client_secret?.value || data?.value || data?.clientSecret;
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

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      realtimeLocalStreamRef.current = mediaStream;

      mediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStream);
      });

      const dc = pc.createDataChannel("oai-events");

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

        if (!hasStartedConversation) {
          localStorage.setItem("khalid_started", "true");
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
                instructions: "قول: رجعتي. مرحبا بيك من جديد، نكملو منين وقفنا.",
              },
            })
          );
        }
      });

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type) {
            console.log("📨 TIPO:", msg.type);
          }

          if (msg.type === "response.output_text.delta" && typeof msg.delta === "string") {
            const nuevoTexto = lastAssistantTextRef.current + msg.delta;
            lastAssistantTextRef.current = nuevoTexto;
            setLastReply(nuevoTexto);
            
            detectarYMostrarDireccion(nuevoTexto);

            const isPremium = localStorage.getItem("khalid_paid") === "true";
            if (userAskedQuestion && !freeQuestionUsed && !isPremium) {
              setFreeQuestionUsed(true);
              setPaymentEnabled(true);
              setShowPayment(true);
              stopConversation();
            }
          }

          const transcript =
            msg?.transcript ||
            msg?.item?.transcript ||
            msg?.item?.content?.[0]?.transcript ||
            "";

          if (
            (msg.type === "conversation.item.input_audio_transcription.completed" ||
              msg.type === "input_audio_buffer.transcription.completed") &&
            transcript &&
            transcript !== lastUserTranscriptRef.current
          ) {
            lastUserTranscriptRef.current = transcript;
            setLastTranscript(transcript);
            console.log("👤 USUARIO:", transcript);
            setUserAskedQuestion(true);
          }

          if (msg.type === "response.created") {
            assistantBusyRef.current = true;
            setWaitingKhalid(true);
            if (realtimeLocalStreamRef.current) {
              realtimeLocalStreamRef.current
                .getAudioTracks()
                .forEach(track => {
                  track.enabled = false;
                });
            }
            setLastReply("");
            lastAssistantTextRef.current = "";
          }

          if (msg.type === "response.done") {
            assistantBusyRef.current = false;
            setWaitingKhalid(false);

            if (realtimeLocalStreamRef.current) {
              realtimeLocalStreamRef.current
                .getAudioTracks()
                .forEach(track => {
                  track.enabled = true;
                });
            }

            console.log("✅ KHALID DONE");

            let assistantTranscript = "";

            if (msg?.response?.output?.[0]?.content?.[0]?.transcript) {
              assistantTranscript = msg.response.output[0].content[0].transcript;
            } else if (msg?.response?.output?.[0]?.content?.[0]?.text) {
              assistantTranscript = msg.response.output[0].content[0].text;
            } else if (msg?.response?.output?.[0]?.text) {
              assistantTranscript = msg.response.output[0].text;
            } else if (msg?.response?.text) {
              assistantTranscript = msg.response.text;
            }

            if (!assistantTranscript && lastAssistantTextRef.current) {
              assistantTranscript = lastAssistantTextRef.current;
            }

            console.log("📝 TEXTO FINAL:", assistantTranscript);

            if (assistantTranscript) {
              detectarYMostrarDireccion(assistantTranscript);
            }
          }
        } catch (err) {
          console.error("❌ Error en onmessage:", err);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime/calls";
      const sdpResponse = await fetch(baseUrl, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const sdpText = await sdpResponse.text();
      console.log("SDP STATUS:", sdpResponse.status);
      console.log("SDP RESPONSE:", sdpText);

      if (!sdpResponse.ok) {
        throw new Error(sdpText);
      }

      const answer = {
        type: "answer",
        sdp: sdpText,
      };

      await pc.setRemoteDescription(answer as any);

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
          <h1 className="text-3xl font-bold">Khalid</h1>
          <p className="text-gray-400 text-sm">{t("agent_mo_role")}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden border border-[#1e293b] bg-[#071224] shadow-2xl"
        >
          <div className="relative">
            {!isPaid && (
              <div className="relative">
                <video
                  id="khalid-video"
                  playsInline
                  preload="metadata"
                  poster="/images/khalid-extranjeria.png"
                  className="w-full h-[270px] object-cover border-b border-[#f6c453]/10"
                  onPlay={() => {
                    const btn = document.getElementById("play-button-khalid");
                    if (btn) btn.style.display = "none";
                  }}
                >
                  <source src="/khalid-presentacion.mp4" type="video/mp4" />
                </video>

                <button
                  id="play-button-khalid"
                  type="button"
                  className="absolute inset-0 flex items-center justify-center"
                  onClick={() => {
                    const video = document.getElementById(
                      "khalid-video"
                    ) as HTMLVideoElement;
                    if (video) {
                      video.play();
                    }
                  }}
                >
                  <div className="bg-black/10 backdrop-blur-[2px] rounded-full w-12 h-12 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              </div>
            )}

            <div className="absolute bottom-5 right-4 text-right">
              <h2 className="text-2xl font-bold">Khalid</h2>
              <p className="text-sm text-gray-200">{t("Especialista en Extranjería")}</p>
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
                            {t("unlockKhalid")}
                          </h3>
                          <div className="mt-1 inline-flex items-center rounded-full bg-yellow-500 px-2 py-[2px] text-[9px] font-bold text-black">
                            PREMIUM
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-yellow-400 leading-none">11,99€</div>
                        <div className="text-[10px] text-yellow-200 mt-1">{t("plan_std_f6")}</div>
                      </div>
                    </div>

                    <p className="text-gray-300 text-xs leading-relaxed mb-3">
                      {t("premiumDescription")}
                    </p>

                    <button
                      disabled={!paymentEnabled}
                      onClick={async () => {
                        if (!paymentEnabled) return;
                        try {
                          const response = await fetch("/api/create-checkout-khalid", {
                            method: "POST",
                          });
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
                      🔓 {t("unlockNow")}
                    </button>

                    <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-400">
                      <span>🔐 {t("securePayment")}</span>
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
                    isListening ? "bg-red-500" : "bg-[#00E05A]"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff size={22} />
                      {t("endConversation")}
                    </>
                  ) : (
                    <>
                      <Mic size={22} />
                      {t("talkToKhalid")}
                    </>
                  )}
                </motion.button>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-[#1e293b] bg-[#0b1325] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-green-400" size={18} />
                <span className="font-semibold">Khalid IA</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-300">
                {t("khalidDescription")}.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-green-500/30 bg-[#071224] p-3">
              <h3 className="text-green-400 text-lg font-bold text-center mb-3">
                {t("hero_trust")}
              </h3>

              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-xl bg-[#0b1325] p-2 text-center">
                  <div className="text-green-400 text-xl font-black">18K+</div>
                  <div className="text-[10px] text-gray-400">{t("panel_stat_tramites")}</div>
                </div>
                <div className="rounded-xl bg-[#0b1325] p-2 text-center">
                  <div className="text-blue-400 text-xl font-black">97%</div>
                  <div className="text-[10px] text-gray-400">{t("verified")}</div>
                </div>
                <div className="rounded-xl bg-[#0b1325] p-2 text-center">
                  <div className="text-purple-400 text-xl font-black">4m</div>
                  <div className="text-[10px] text-gray-400">{t("panel_continue")}</div>
                </div>
                <div className="rounded-xl bg-[#0b1325] p-2 text-center">
                  <div className="text-yellow-400 text-xl font-black">100%</div>
                  <div className="text-[10px] text-gray-400">{t("panel_action_ia")}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-yellow-500/30 bg-[#0b1325] py-2 text-center text-sm font-bold text-white">
                🏆 {t("reg_title")}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-green-400 text-3xl font-black">4.9/5</div>
                  <div className="text-yellow-400 text-sm">★★★★★</div>
                </div>
                <div className="flex -space-x-2">
                  <img
                    src="https://randomuser.me/api/portraits/men/32.jpg"
                    className="w-8 h-8 rounded-full border border-[#071224]"
                  />
                  <img
                    src="https://randomuser.me/api/portraits/women/44.jpg"
                    className="w-8 h-8 rounded-full border border-[#071224]"
                  />
                  <img
                    src="https://randomuser.me/api/portraits/men/75.jpg"
                    className="w-8 h-8 rounded-full border border-[#071224]"
                  />
                  <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center text-[10px] font-bold border border-[#071224]">
                    +2K
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 🗺️ TARJETA DE UBICACIÓN CON GOOGLE PLACES */}
          {isPaid && smartAction && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-4 mb-4 rounded-2xl border border-[#1e293b] bg-[#0b1325] p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-400 text-lg">📍</span>
                <h3 className="font-bold text-white">
                  {smartAction.loading ? "🔍 Buscando..." : "Ubicación encontrada"}
                </h3>
                {isLoadingLocation && (
                  <div className="ml-2 w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <div className="rounded-2xl overflow-hidden border border-[#1e293b]">
                {smartAction.image && (
                  <img
                    src={smartAction.image}
                    className="w-full h-[220px] object-cover"
                    alt={smartAction.name || "Ubicación"}
                    onError={(e) => {
                      const fallbackUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(smartAction.address || "Madrid")}&zoom=15&size=1200x600&maptype=roadmap&markers=color:red|${encodeURIComponent(smartAction.address || "Madrid")}&key=${GOOGLE_API_KEY}`;
                      e.currentTarget.src = fallbackUrl;
                    }}
                  />
                )}

                <div className="p-4">
                  <h4 className="text-xl font-bold mb-1 text-white">
                    {smartAction.title || smartAction.name || "Ubicación"}
                  </h4>

                  {smartAction.address && (
                    <p className="text-green-400 text-sm font-medium mb-1">
                      📍 {smartAction.address}
                    </p>
                  )}

                  <p className="text-gray-400 text-sm mb-3">
                    {smartAction.description}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {smartAction.buttons?.map((button: any, index: number) => (
                      <a
                        key={index}
                        href={button.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-12 rounded-xl bg-[#1a2940] hover:bg-[#1e3a5f] border border-[#1e293b] text-sm flex items-center justify-center text-white transition-all duration-200"
                      >
                        {button.icon || "📍"} {button.label}
                      </a>
                    ))}
                  </div>

                  {smartAction.lat && smartAction.lng && (
                    <p className="mt-2 text-[10px] text-gray-500 text-center">
                      📌 {smartAction.lat.toFixed(6)}, {smartAction.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
