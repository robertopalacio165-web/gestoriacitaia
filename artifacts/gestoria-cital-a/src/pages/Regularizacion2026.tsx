import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Mic, Upload, CheckCircle } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Regularizacion2026() {
  const { lang } = useLang();
  const [verified, setVerified] = useState(false);
  const [uploading, setUploading] = useState(false);

  const t = {
    es: {
      talk: "Hablar con Mohamed",
      upload: "Subir documentos",
      confirm: "Confirmado",
      waiting: "Esperando verificación...",
    },
    en: {
      talk: "Talk with Mohamed",
      upload: "Upload documents",
      confirm: "Confirmed",
      waiting: "Waiting verification...",
    },
    darija: {
      talk: "هضر مع محمد",
      upload: "طلع الوثائق",
      confirm: "تأكيد",
      waiting: "كنتسناو التحقق...",
    },
  }[lang === "en" ? "en" : lang === "darija" ? "darija" : "es"];

  const handleUpload = async () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setVerified(true);
    }, 3000);
  };

  const handleConfirm = async () => {
    window.open("https://wa.me/", "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="max-w-md mx-auto p-4 space-y-4 pt-20">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900">
          <img
            src="/images/avatar-mohamed.png"
            className="w-full h-72 object-cover"
          />
          <div className="p-4 text-center text-xl font-bold">Mohamed</div>
        </div>

        <button className="w-full bg-green-500 rounded-xl py-3 font-bold flex items-center justify-center gap-2">
          <Mic size={18} /> {t.talk}
        </button>

        <button
          onClick={handleUpload}
          className="w-full bg-blue-600 rounded-xl py-3 font-bold flex items-center justify-center gap-2"
        >
          <Upload size={18} /> {uploading ? t.waiting : t.upload}
        </button>

        <button
          disabled={!verified}
          onClick={handleConfirm}
          className="w-full rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-40 bg-emerald-600"
        >
          <CheckCircle size={18} /> {t.confirm}
        </button>
      </main>
    </div>
  );
}
