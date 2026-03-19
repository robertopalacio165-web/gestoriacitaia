import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export function LegalDisclaimer() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="w-full bg-amber-950/60 border-t border-amber-600/30 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-200/80 leading-relaxed flex-1">
          <span className="font-bold text-amber-400">Aviso importante:</span>{" "}
          GestoriaCitaIA es un <strong>asistente de inteligencia artificial</strong>. No somos gestoría, ni abogados, ni despacho jurídico. No realizamos trámites en tu nombre ni te representamos ante ningún organismo oficial. Únicamente te ayudamos a <strong>organizar tus documentos</strong>, explicarte los requisitos de los trámites de extranjería y <strong>buscar disponibilidad de citas</strong>. Para trámites oficiales, consulta con un gestor administrativo colegiado o un abogado especialista en extranjería.
        </p>
        <button onClick={() => setDismissed(true)} className="text-amber-400/60 hover:text-amber-400 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
