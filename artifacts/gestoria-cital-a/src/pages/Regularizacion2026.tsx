import { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { PaymentModal } from "@/components/PaymentModal";
import { useLang } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Bell,
  MessageSquare,
  Send,
  Upload,
  Star,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fileToDataUrl, verifyDocument } from "@/lib/verifyDocument";
import {
  EXTRANJERIA_PROCEDURES,
  getProcedureByKey,
} from "@/lib/extranjeriaProcedures";

interface ChatMsg {
  from: "agent" | "user";
  text: string;
  ts?: number;
}

type DocStatus = "ok" | "warn" | "missing";

type SituationItem = {
  value: string;
  label: string;
};

type StoredDocItem = {
  id: string;
  nombre: string;
  archivo: string;
  estado: DocStatus;
  kb: string;
  expectedType?: string;
  detectedType?: string;
  note?: string;
};

type LeadFormState = {
  nombre: string;
  telefono: string;
  email: string;
  niePasaporte: string;
  ciudad: string;
  nacionalidad: string;
  fechaLlegada: string;
  cumple5Meses: string;
  asilo: string;
  penales: string;
};

function buildInitialDocs(procedureKey: string): StoredDocItem[] {
  const procedure = getProcedureByKey(procedureKey) || EXTRANJERIA_PROCEDURES[0];

  return procedure.requiredDocuments.map((doc) => ({
    id: doc.id,
    nombre: doc.name,
    archivo: "",
    estado: "missing" as DocStatus,
    kb: "",
    expectedType: doc.expectedType || "auto",
    detectedType: "",
    note: doc.notes || "",
  }));
}

function normalizeDocType(value?: string) {
  return (value || "").trim().toLowerCase();
}

export default function Regularizacion2026() {
  const [selectedSituacion, setSelectedSituacion] = useState(
    "regularizacion_2026_laboral"
  );
  const [muted, setMuted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState<string | null>(null);
  const [sendingChat, setSendingChat] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [paymentTriggered, setPaymentTriggered] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatBootstrapped, setChatBootstrapped] = useState(false);
  const [generalUploading, setGeneralUploading] = useState(false);
  const [completionMessageSent, setCompletionMessageSent] = useState(false);

  const [leadForm, setLeadForm] = useState<LeadFormState>({
    nombre: "",
    telefono: "",
    email: "",
    niePasaporte: "",
    ciudad: "",
    nacionalidad: "",
    fechaLlegada: "",
    cumple5Meses: "",
    asilo: "",
    penales: "",
  });

  const { t, lang } = useLang();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const safeLang = (lang === "darija" || lang === "en" ? lang : "es") as
    | "darija"
    | "es"
    | "en";

  const currentProcedure = getProcedureByKey(selectedSituacion) || null;
  if (!currentProcedure) return null;

  const ui = useMemo(() => {
    if (safeLang === "darija") {
      return {
        initialChat:
          "وعليكم السلام، مرحبا بيك. أنا محمد، وغادي نعاونك فـ ملف ديالك خطوة بخطوة.",
        online: "متصل الآن",
        role: "مختص فالهجرة",
        paymentMessage:
          "باش نكملو فالملف ديالك ونخدمو على الوثائق، فعل الخطة ديالك.",
        paymentTriggerMessage:
          "باش نكملو معاك بشكل كامل، خاصك تفعّل الخدمة.",
        planActivated: "تفعلات الخطة",
        planContinue: "مزيان. نكملو فالملف ديالك.",
        openChat: "فتح الشات",
        closeChat: "سد الشات",
        writeQuestion: "كتب سؤالك...",
        uploadGeneral: "رفع الوثائق",
        uploadGeneralDesc:
          "من هنا تقدر ترفع جميع الوثائق اللي طلب منك محمد.",
        withoutAudio: "بلا صوت",
        mute: "كتم",
        activePlanLabel: "الخطة",
        active: "نشطة",
        uploading: "كيترفع...",
        uploadSuccessTitle: "تقبلات الوثيقة",
        uploadSuccessDesc: "راجعنا الوثيقة وربطناها مع الملف.",
        uploadErrorTitle: "خطأ فالوثيقة",
        uploadErrorDesc: "ما قدرناش نربط هاد الوثيقة مع الملف.",
        mohamedDocOk: (fileName: string, docName: string) =>
          `مزيان. توصلت بــ ${fileName} وراجعتو. حطيناه دابا فخانة «${docName}».`,
        mohamedDocWarn: (fileName: string) =>
          `توصلت بــ ${fileName} ولكن مازال خاصني نسخة أوضح ولا الوثيقة المناسبة باش نكمل المراجعة.`,
        mohamedDocUnknown: (fileName: string) =>
          `توصلت بــ ${fileName}، ولكن ما قدرناش نربطو أوتوماتيكياً مع وثيقة معينة. زيد رفع الوثائق الباقية وأنا نكمل المراجعة.`,
        mohamedFinal:
          "مزيان. راجعنا الوثائق ديالك ووجدنا الملف ديالك. إلى بغيتي دابا نكملو بالموعد، تقدر تدخل لسارة وغادي تعاونك.",
        goSara: "المرور إلى سارة",
        goSaraDesc: "إلى بغيتي تكمل بالموعد، سارة غادي تعاونك.",
        formTitle: "لوحة رسمية مدمجة",
        formDesc:
          "عمر المعطيات الأساسية باش محمد يبدا معاك التحقق من 5 شهور والوثائق.",
        saveLeadButton: "حفظ المعطيات والمتابعة مع محمد",
        savedLeadReply:
          "مزيان. خديت المعطيات ديالك. دابا صيفط ليا الوثائق ديالك ونبدا نراجعهم خطوة بخطوة.",
        labels: {
          nombre: "الاسم الكامل",
          telefono: "الهاتف",
          email: "الإيميل",
          niePasaporte: "NIE / الباسبور",
          ciudad: "المدينة",
          nacionalidad: "الجنسية",
          fechaLlegada: "تاريخ الدخول لإسبانيا",
          cumple5Meses: "واش عندك 5 شهور متواصلة؟",
          asilo: "واش عندك طلب لجوء؟",
          penales: "سوابق عدلية",
          select: "اختر",
          yes: "نعم",
          no: "لا",
          dontKnow: "ما عرفت",
        },
      };
    }

    if (safeLang === "en") {
      return {
        initialChat:
          "Hello, I’m Mohamed. I’ll help you with your case step by step.",
        online: "Online",
        role: "Immigration Specialist",
        paymentMessage:
          "To continue with your case and document review, activate your plan.",
        paymentTriggerMessage:
          "To continue fully with your case, activate the service.",
        planActivated: "Plan activated",
        planContinue: "Perfect. Let’s continue with your case.",
        openChat: "Open chat",
        closeChat: "Close chat",
        writeQuestion: "Type your question...",
        uploadGeneral: "Upload documents",
        uploadGeneralDesc:
          "Use this single button to upload all documents Mohamed requests.",
        withoutAudio: "No audio",
        mute: "Mute",
        activePlanLabel: "Plan",
        active: "active",
        uploading: "Uploading...",
        uploadSuccessTitle: "Document received",
        uploadSuccessDesc: "The document was reviewed and linked to the case.",
        uploadErrorTitle: "Document error",
        uploadErrorDesc: "We could not link that document to the case.",
        mohamedDocOk: (fileName: string, docName: string) =>
          `Perfect. I received ${fileName} and linked it to “${docName}”.`,
        mohamedDocWarn: (fileName: string) =>
          `I received ${fileName}, but I still need a clearer version or the correct document to continue.`,
        mohamedDocUnknown: (fileName: string) =>
          `I received ${fileName}, but I could not match it automatically to a required document yet.`,
        mohamedFinal:
          "Perfect. We have reviewed your documents and prepared your case. If you want to continue with the appointment, Sara will help you.",
        goSara: "Go to Sara",
        goSaraDesc: "If you want to continue with the appointment, Sara will help you.",
        formTitle: "Integrated official panel",
        formDesc:
          "Fill in the basic details so Mohamed can start checking the 5 months and your documents.",
        saveLeadButton: "Save details and continue with Mohamed",
        savedLeadReply:
          "Perfect. I already have your details. Now send me your documents and I will review them step by step.",
        labels: {
          nombre: "Full name",
          telefono: "Phone",
          email: "Email",
          niePasaporte: "NIE / Passport",
          ciudad: "City",
          nacionalidad: "Nationality",
          fechaLlegada: "Arrival date in Spain",
          cumple5Meses: "Do you have 5 continuous months?",
          asilo: "Do you have an asylum application?",
          penales: "Criminal record",
          select: "Select",
          yes: "Yes",
          no: "No",
          dontKnow: "I don't know",
        },
      };
    }

    return {
      initialChat:
        "Hola, soy Mohamed. Voy a ayudarte con tu trámite paso a paso.",
      online: "En línea",
      role: "Especialista en Extranjería",
      paymentMessage:
        "Para continuar con tu trámite y la revisión de documentos, activa tu plan.",
      paymentTriggerMessage:
        "Para seguir contigo de forma completa, activa el servicio.",
      planActivated: "Plan activado",
      planContinue: "Perfecto. Continuamos con tu trámite.",
      openChat: "Abrir chat",
      closeChat: "Cerrar chat",
      writeQuestion: "Escribe tu pregunta...",
      uploadGeneral: "Subir documentos",
      uploadGeneralDesc:
        "Usa este único botón para subir todos los documentos que te pida Mohamed.",
      withoutAudio: "Sin audio",
      mute: "Mute",
      activePlanLabel: "Plan",
      active: "activo",
      uploading: "Subiendo...",
      uploadSuccessTitle: "Documento recibido",
      uploadSuccessDesc: "El documento se ha revisado y vinculado al expediente.",
      uploadErrorTitle: "Error en documento",
      uploadErrorDesc: "No se pudo vincular ese documento al expediente.",
      mohamedDocOk: (fileName: string, docName: string) =>
        `Perfecto. Ya he recibido ${fileName} y lo he colocado en «${docName}».`,
      mohamedDocWarn: (fileName: string) =>
        `He recibido ${fileName}, pero todavía necesito una versión más clara o el documento correcto para seguir.`,
      mohamedDocUnknown: (fileName: string) =>
        `He recibido ${fileName}, pero no he podido relacionarlo automáticamente con un documento concreto del expediente.`,
      mohamedFinal:
        "Perfecto. Ya hemos revisado tu documentación y hemos dejado preparado tu expediente. Si ahora quieres continuar con la cita, Sara te ayudará.",
      goSara: "Ir con Sara",
      goSaraDesc: "Si quieres seguir con la cita, Sara te ayuda.",
      formTitle: "Panel oficial integrado",
      formDesc:
        "Rellena los datos básicos para que Mohamed empiece a comprobar los 5 meses y tus documentos.",
      saveLeadButton: "Guardar datos y continuar con Mohamed",
      savedLeadReply:
        "Perfecto. Ya tengo tus datos. Ahora súbeme tus documentos y empezaré a revisarlos paso a paso.",
      labels: {
        nombre: "Nombre completo",
        telefono: "Teléfono",
        email: "Email",
        niePasaporte: "NIE / Pasaporte",
        ciudad: "Ciudad",
        nacionalidad: "Nacionalidad",
        fechaLlegada: "Fecha llegada a España",
        cumple5Meses: "¿Cumples 5 meses continuos?",
        asilo: "¿Tienes solicitud de asilo?",
        penales: "Antecedentes penales",
        select: "Selecciona",
        yes: "Sí",
        no: "No",
        dontKnow: "No sé",
      },
    };
  }, [safeLang]);

  const [docs, setDocs] = useState<StoredDocItem[]>(
    buildInitialDocs(selectedSituacion)
  );

  const chatStorageKey = useMemo(() => {
    return `gestoriacitaia_mohamed_chat_procedure_${safeLang}_${selectedSituacion}`;
  }, [safeLang, selectedSituacion]);

  useEffect(() => {
    setDocs(buildInitialDocs(selectedSituacion));
    setCompletionMessageSent(false);
  }, [selectedSituacion]);

  useEffect(() => {
    if (!chatStorageKey) return;

    try {
      const raw = localStorage.getItem(chatStorageKey);

      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);

          const userMsgs = parsed.filter((m) => m.from === "user").length;
          setUserMessageCount(userMsgs);

          const paymentAlreadyTriggered = parsed.some(
            (m) => m.from === "agent" && m.text === ui.paymentTriggerMessage
          );

          const completionAlreadySent = parsed.some(
            (m) => m.from === "agent" && m.text === ui.mohamedFinal
          );

          setPaymentTriggered(paymentAlreadyTriggered);
          setCompletionMessageSent(completionAlreadySent);
          setChatBootstrapped(true);
          return;
        }
      }

      const freshChat: ChatMsg[] = [
        {
          from: "agent",
          text: ui.initialChat,
          ts: Date.now(),
        },
      ];

      setChatMessages(freshChat);
      setUserMessageCount(0);
      setPaymentTriggered(false);
      setCompletionMessageSent(false);
      setChatBootstrapped(true);
    } catch (error) {
      console.error("Error cargando historial de Mohamed:", error);

      const freshChat: ChatMsg[] = [
        {
          from: "agent",
          text: ui.initialChat,
          ts: Date.now(),
        },
      ];

      setChatMessages(freshChat);
      setUserMessageCount(0);
      setPaymentTriggered(false);
      setCompletionMessageSent(false);
      setChatBootstrapped(true);
    }
  }, [
    chatStorageKey,
    ui.initialChat,
    ui.paymentTriggerMessage,
    ui.mohamedFinal,
  ]);

  useEffect(() => {
    if (!chatBootstrapped || !chatStorageKey || chatMessages.length === 0) return;

    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
    } catch (error) {
      console.error("Error guardando historial de Mohamed:", error);
    }
  }, [chatMessages, chatBootstrapped, chatStorageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, sendingChat, generalUploading]);

  const docsOk = docs.filter((d) => d.estado === "ok").length;
  const docsTotal = docs.length;
  const allReady = docsOk >= Math.max(1, docsTotal - 1);

  const SITUACIONES: SituationItem[] = EXTRANJERIA_PROCEDURES.map((p) => ({
    value: p.key,
    label: p.name,
  }));

  const handleSelectPlan = (plan: string) => {
    setPlanActivo(plan);
    setShowPayment(false);

    toast({
      title: ui.planActivated,
      description: ui.planContinue,
    });
  };

  const updateLeadForm = (field: keyof LeadFormState, value: string) => {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveLeadForm = () => {
    const message = ui.savedLeadReply;

    setChatMessages((prev) => [
      ...prev,
      {
        from: "agent",
        text: message,
        ts: Date.now(),
      },
    ]);

    toast({
      title:
        safeLang === "darija"
          ? "تحفظات المعطيات"
          : safeLang === "en"
          ? "Details saved"
          : "Datos guardados",
      description:
        safeLang === "darija"
          ? "محمد قدر يبدا يراجع معاك الوثائق."
          : safeLang === "en"
          ? "Mohamed can now start reviewing your documents."
          : "Mohamed ya puede empezar a revisar tus documentos.",
    });
  };

  const getBestDocMatch = (
    detectedType: string | undefined,
    currentDocs: StoredDocItem[]
  ): StoredDocItem | null => {
    const normalizedDetected = normalizeDocType(detectedType);

    if (normalizedDetected) {
      const exactMissing = currentDocs.find(
        (doc) =>
          doc.estado !== "ok" &&
          normalizeDocType(doc.expectedType) === normalizedDetected
      );

      if (exactMissing) return exactMissing;

      const exactWarn = currentDocs.find(
        (doc) =>
          doc.estado === "warn" &&
          normalizeDocType(doc.expectedType) === normalizedDetected
      );

      if (exactWarn) return exactWarn;
    }

    const firstMissing = currentDocs.find((doc) => doc.estado === "missing");
    if (firstMissing) return firstMissing;

    const firstWarn = currentDocs.find((doc) => doc.estado === "warn");
    if (firstWarn) return firstWarn;

    return null;
  };

  const pushAgentMessage = (text: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        from: "agent",
        text,
        ts: Date.now(),
      },
    ]);
  };

  const maybeSendCompletionMessage = (nextDocs: StoredDocItem[]) => {
    const okCount = nextDocs.filter((d) => d.estado === "ok").length;
    const total = nextDocs.length;
    const readyNow = okCount >= Math.max(1, total - 1);

    if (readyNow && !completionMessageSent) {
      pushAgentMessage(ui.mohamedFinal);
      setCompletionMessageSent(true);
    }
  };

  const handleGeneralUpload = async () => {
    if (!planActivo) {
      setShowPayment(true);
      return;
    }

    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,application/pdf";
      input.multiple = true;

      input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (files.length === 0) return;

        setGeneralUploading(true);

        for (const file of files) {
          try {
            const base64 = await fileToDataUrl(file);

            const result = await verifyDocument({
              imageBase64: base64,
              expectedDocumentType: "auto",
              lang: safeLang,
            });

            let matchedDocSnapshot: StoredDocItem | null = null;
            let nextDocsSnapshot: StoredDocItem[] = [];

            setDocs((prev) => {
              const matchedDoc = getBestDocMatch(result.document_type, prev);
              matchedDocSnapshot = matchedDoc;

              if (!matchedDoc) {
                nextDocsSnapshot = [...prev];
                return prev;
              }

              const nextStatus: DocStatus =
                result.status === "invalid" || result.match_expected_type === false
                  ? "warn"
                  : "ok";

              const updatedDocs = prev.map((doc) =>
                doc.id === matchedDoc.id
                  ? {
                      ...doc,
                      estado: nextStatus,
                      archivo: file.name,
                      kb: `${Math.round(file.size / 1024)} KB`,
                      detectedType: result.document_type || "",
                      note: result.summary || "",
                    }
                  : doc
              );

              nextDocsSnapshot = updatedDocs;
              return updatedDocs;
            });

            if (!matchedDocSnapshot) {
              pushAgentMessage(ui.mohamedDocUnknown(file.name));

              toast({
                title: ui.uploadErrorTitle,
                description: ui.uploadErrorDesc,
                variant: "destructive",
              });

              continue;
            }

            const isWarn =
              result.status === "invalid" || result.match_expected_type === false;

            if (isWarn) {
              pushAgentMessage(ui.mohamedDocWarn(file.name));
            } else {
              pushAgentMessage(
                ui.mohamedDocOk(file.name, matchedDocSnapshot.nombre)
              );
            }

            toast({
              title: ui.uploadSuccessTitle,
              description: result?.summary || ui.uploadSuccessDesc,
            });

            if (nextDocsSnapshot.length > 0) {
              maybeSendCompletionMessage(nextDocsSnapshot);
            }
          } catch (err: any) {
            console.error("Error IA documento:", err);

            pushAgentMessage(
              safeLang === "darija"
                ? "وقع مشكل فمراجعة واحد الوثيقة. عاود رفعها من فضلك."
                : safeLang === "en"
                ? "There was a problem reviewing one document. Please upload it again."
                : "Ha habido un problema revisando uno de los documentos. Súbelo otra vez, por favor."
            );

            toast({
              title:
                safeLang === "darija"
                  ? "خطأ فالتحليل"
                  : safeLang === "en"
                  ? "Verification error"
                  : "Error de verificación",
              description:
                err?.message ||
                (safeLang === "darija"
                  ? "ما قدرناش نحللو الوثيقة."
                  : safeLang === "en"
                  ? "Could not analyze the document."
                  : "No se pudo analizar el documento."),
              variant: "destructive",
            });
          }
        }

        setGeneralUploading(false);
      };

      input.click();
    } catch (error: any) {
      console.error("Error general handleGeneralUpload:", error);
      setGeneralUploading(false);

      toast({
        title:
          safeLang === "darija"
            ? "خطأ"
            : safeLang === "en"
            ? "Error"
            : "Error",
        description:
          error?.message ||
          (safeLang === "darija"
            ? "وقع مشكل غير متوقع."
            : safeLang === "en"
            ? "An unexpected error occurred."
            : "Ocurrió un error inesperado."),
        variant: "destructive",
      });
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || sendingChat || !chatBootstrapped) return;

    const rawText = chatInput.trim();
    const nextUserCount = userMessageCount + 1;
    const shouldTriggerPayment =
      !planActivo && !paymentTriggered && nextUserCount >= 2;

    const userMessage: ChatMsg = {
      from: "user",
      text: rawText,
      ts: Date.now(),
    };

    const historyToSend = chatMessages.slice(-8).map((msg) => ({
      from: msg.from,
      text: msg.text,
    }));

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setSendingChat(true);
    setUserMessageCount(nextUserCount);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant: "mohamed",
          message: rawText,
          context: "multi_extranjeria_procedure",
          procedureKey: selectedSituacion,
          procedureLabel: currentProcedure.name,
          lang: safeLang,
          history: historyToSend,
          leadForm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error en Mohamed");
      }

      const finalReply =
        data?.reply ||
        (safeLang === "darija"
          ? "سمح ليا، ما قدرتش نجاوب دابا."
          : safeLang === "en"
          ? "Sorry, I could not answer right now."
          : "Lo siento, no pude responder ahora mismo.");

      const agentReply: ChatMsg = {
        from: "agent",
        text: finalReply,
        ts: Date.now(),
      };

      if (shouldTriggerPayment) {
        const paymentMsg: ChatMsg = {
          from: "agent",
          text: ui.paymentTriggerMessage,
          ts: Date.now() + 1,
        };

        setChatMessages((prev) => [...prev, agentReply, paymentMsg]);
        setPaymentTriggered(true);

        setTimeout(() => {
          setShowPayment(true);
        }, 900);
      } else {
        setChatMessages((prev) => [...prev, agentReply]);
      }
    } catch (error) {
      console.error("Error conectando con Mohamed:", error);

      const errorReply: ChatMsg = {
        from: "agent",
        text:
          safeLang === "darija"
            ? "وقع مشكل فالاتصال مع محمد، عاود حاول."
            : safeLang === "en"
            ? "There was a connection error with Mohamed. Please try again."
            : "Error conectando con Mohamed, intenta otra vez.",
        ts: Date.now(),
      };

      setChatMessages((prev) => [...prev, errorReply]);
    } finally {
      setSendingChat(false);
    }
  };

  const goToSara = () => {
    window.location.href = "/citas";
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <div
        className="fixed inset-0 z-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 40% at 30% 20%, rgba(34,197,94,0.1), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.08), transparent)",
        }}
      />

      <Navbar />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={handleSelectPlan}
        agentMessage={ui.paymentMessage}
      />

      <main className="flex-1 relative z-10 pt-16 pb-8">
        <div className="px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
              {t("reg_title")}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Star className="w-2.5 h-2.5" />
                {t("reg_new")}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">{currentProcedure.name}</p>
          </div>

          {planActivo ? (
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium">
              {ui.activePlanLabel} {planActivo} {ui.active} ✓
            </span>
          ) : (
            <button
              onClick={() => setShowPayment(true)}
              className="text-xs px-3 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
              type="button"
            >
              {t("reg_activar")}
            </button>
          )}
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-3">
            <div
              className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)] bg-black"
              style={{ height: "260px" }}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                alt="Mohamed"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-white">{ui.online}</span>
              </div>

              <div className="absolute top-3 right-3">
                <div className="relative w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                    !
                  </span>
                </div>
              </div>

              {!muted && (
                <div className="absolute bottom-14 left-4 flex items-end gap-0.5 h-5">
                  {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: [`${h}px`, `${h * 2}px`, `${h}px`] }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.07,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="absolute bottom-12 right-3 text-right">
                <p className="text-white font-bold text-sm drop-shadow-lg">
                  Mohamed
                </p>
                <p className="text-white/70 text-[11px] drop-shadow-lg">
                  {ui.role}
                </p>
              </div>

              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors ${
                    muted
                      ? "bg-destructive/80 border-destructive"
                      : "bg-black/50 border-white/20 hover:bg-black/70"
                  }`}
                  type="button"
                >
                  {muted ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                showChat
                  ? "bg-secondary/20 border-secondary/40 text-secondary"
                  : "glass-panel border-white/10 text-white/70 hover:text-white hover:border-white/20"
              }`}
              type="button"
            >
              <MessageSquare className="w-4 h-4" />
              {showChat ? ui.closeChat : ui.openChat}
            </button>

            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                >
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[340px]">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={`${msg.ts || i}-${i}`}
                        className={`flex gap-2 ${
                          msg.from === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.from === "agent" && (
                          <img
                            src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                            className="w-6 h-6 rounded-full object-cover object-top shrink-0"
                            alt=""
                          />
                        )}
                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                            msg.from === "agent"
                              ? "bg-white/8 text-white/90 border border-white/10"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {(sendingChat || generalUploading) && (
                      <div className="flex gap-2 justify-start">
                        <img
                          src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                          className="w-6 h-6 rounded-full object-cover object-top shrink-0"
                          alt=""
                        />
                        <div className="px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed bg-white/8 text-white/90 border border-white/10">
                          ...
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  <div className="border-t border-white/10 p-2 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder={ui.writeQuestion}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={sendingChat}
                      className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-60"
                      type="button"
                    >
                      <Send className="w-3.5 h-3.5 text-primary-foreground" />
                    </button>
                  </div>

                  <div className="border-t border-white/10 p-3">
                    <button
                      onClick={handleGeneralUpload}
                      disabled={generalUploading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold text-xs px-4 py-3 transition-colors"
                      type="button"
                    >
                      {generalUploading ? (
                        <>
                          <motion.div
                            className="w-3.5 h-3.5 border border-primary-foreground border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 0.7,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          {ui.uploading}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {ui.uploadGeneral}
                        </>
                      )}
                    </button>

                    <p className="mt-2 text-[10px] text-white/50 text-center">
                      {ui.uploadGeneralDesc}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white shadow-xl overflow-hidden">
              <div className="bg-[#f8fafc] border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{ui.formTitle}</p>
                    <p className="text-[11px] text-slate-500">{ui.formDesc}</p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-4 space-y-3 bg-white">
                <FieldLabel label={ui.labels.nombre} />
                <FieldInput
                  value={leadForm.nombre}
                  onChange={(v) => updateLeadForm("nombre", v)}
                  placeholder={ui.labels.nombre}
                />

                <FieldLabel label={ui.labels.telefono} />
                <FieldInput
                  value={leadForm.telefono}
                  onChange={(v) => updateLeadForm("telefono", v)}
                  placeholder={ui.labels.telefono}
                />

                <FieldLabel label={ui.labels.email} />
                <FieldInput
                  value={leadForm.email}
                  onChange={(v) => updateLeadForm("email", v)}
                  placeholder="email@example.com"
                />

                <FieldLabel label={ui.labels.niePasaporte} />
                <FieldInput
                  value={leadForm.niePasaporte}
                  onChange={(v) => updateLeadForm("niePasaporte", v)}
                  placeholder={ui.labels.niePasaporte}
                />

                <FieldLabel label={ui.labels.ciudad} />
                <FieldInput
                  value={leadForm.ciudad}
                  onChange={(v) => updateLeadForm("ciudad", v)}
                  placeholder={ui.labels.ciudad}
                />

                <FieldLabel label={ui.labels.nacionalidad} />
                <FieldInput
                  value={leadForm.nacionalidad}
                  onChange={(v) => updateLeadForm("nacionalidad", v)}
                  placeholder={ui.labels.nacionalidad}
                />

                <FieldLabel label={ui.labels.fechaLlegada} />
                <FieldInput
                  value={leadForm.fechaLlegada}
                  onChange={(v) => updateLeadForm("fechaLlegada", v)}
                  placeholder="DD/MM/AAAA"
                />

                <FieldLabel label={ui.labels.cumple5Meses} />
                <FieldSelect
                  value={leadForm.cumple5Meses}
                  onChange={(v) => updateLeadForm("cumple5Meses", v)}
                  options={[
                    { value: "", label: ui.labels.select },
                    { value: "si", label: ui.labels.yes },
                    { value: "no", label: ui.labels.no },
                    { value: "nose", label: ui.labels.dontKnow },
                  ]}
                />

                <FieldLabel label={ui.labels.asilo} />
                <FieldSelect
                  value={leadForm.asilo}
                  onChange={(v) => updateLeadForm("asilo", v)}
                  options={[
                    { value: "", label: ui.labels.select },
                    { value: "no", label: ui.labels.no },
                    { value: "si", label: ui.labels.yes },
                    { value: "nose", label: ui.labels.dontKnow },
                  ]}
                />

                <FieldLabel label={ui.labels.penales} />
                <FieldSelect
                  value={leadForm.penales}
                  onChange={(v) => updateLeadForm("penales", v)}
                  options={[
                    { value: "", label: ui.labels.select },
                    { value: "no", label: ui.labels.no },
                    { value: "si", label: ui.labels.yes },
                  ]}
                />

                <button
                  onClick={handleSaveLeadForm}
                  className="w-full rounded-[18px] bg-[#003b82] hover:bg-[#002f69] text-white font-bold text-sm py-3 transition-colors"
                  type="button"
                >
                  {ui.saveLeadButton}
                </button>
              </div>
            </div>

            {allReady && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-bold text-white">{ui.goSara}</p>
                <p className="mt-1 text-xs text-white/70">{ui.goSaraDesc}</p>

                <button
                  onClick={goToSara}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 text-sm font-bold transition-colors"
                  type="button"
                >
                  {ui.goSara}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="block text-[12px] font-semibold text-slate-600 mb-1">
      {label}
    </label>
  );
}

function FieldInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
      placeholder={placeholder}
    />
  );
}

function FieldSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
    >
      {options.map((opt) => (
        <option key={`${opt.value}-${opt.label}`} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
