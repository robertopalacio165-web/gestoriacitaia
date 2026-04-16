import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Upload,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  Globe,
  FileText,
  Calendar,
  Shield,
} from "lucide-react";

export default function Regularizacion2026() {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    nacionalidad: "",
    pasaporte: "",
    ciudad: "",
    llegada: "",
    cincoMeses: "",
    penales: "",
  });

  const [completed, setCompleted] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleContinue = () => {
    if (
      !form.nombre ||
      !form.telefono ||
      !form.nacionalidad ||
      !form.pasaporte ||
      !form.ciudad
    ) {
      alert("Completa los campos obligatorios");
      return;
    }

    setCompleted(true);
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white px-3 py-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* HEADER */}
        <div className="rounded-3xl border border-emerald-500/20 bg-slate-900 p-3">
          <div className="text-center mb-3">
            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
              Nuevo
            </span>
            <h1 className="text-2xl font-bold mt-2">التسوية 2026</h1>
            <p className="text-sm text-slate-300">
              Regularización 2026 · vía laboral
            </p>
          </div>

          {/* AVATAR */}
          <div className="rounded-2xl overflow-hidden border border-slate-700">
            <img
              src="/mohamed.jpg"
              alt="Mohamed"
              className="w-full h-64 object-cover"
            />
          </div>

          {/* MENSAJE VOZ */}
          <div className="mt-3 rounded-2xl bg-slate-800 border border-slate-700 p-3 text-center">
            <p className="text-sm text-emerald-400 font-semibold">
              🟢 Mohamed hablando en tiempo real
            </p>
            <p className="text-sm mt-2 leading-6">
              Salam alaikom, 3ammer lia had ma3loumat dyalek bach nverifi lik
              wach t9dar tdir regularización 2026, w nkmlo m3ak marhala b
              marhala inchallah.
            </p>
          </div>
        </div>

        {/* FORMULARIO */}
        {!completed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-slate-900 border border-slate-700 p-4 space-y-3"
          >
            <h2 className="font-bold text-lg">Rellena tus datos</h2>

            <Input
              icon={<User size={18} />}
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={(v) => updateField("nombre", v)}
            />

            <Input
              icon={<Phone size={18} />}
              placeholder="WhatsApp"
              value={form.telefono}
              onChange={(v) => updateField("telefono", v)}
            />

            <Input
              icon={<Globe size={18} />}
              placeholder="Nacionalidad"
              value={form.nacionalidad}
              onChange={(v) => updateField("nacionalidad", v)}
            />

            <Input
              icon={<FileText size={18} />}
              placeholder="Número de pasaporte"
              value={form.pasaporte}
              onChange={(v) => updateField("pasaporte", v)}
            />

            <Input
              icon={<MapPin size={18} />}
              placeholder="Ciudad actual"
              value={form.ciudad}
              onChange={(v) => updateField("ciudad", v)}
            />

            <Input
              icon={<Calendar size={18} />}
              placeholder="Fecha llegada a España"
              value={form.llegada}
              onChange={(v) => updateField("llegada", v)}
            />

            <select
              value={form.cincoMeses}
              onChange={(e) => updateField("cincoMeses", e.target.value)}
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3"
            >
              <option value="">¿Cumples 5 meses continuos?</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
              <option value="nose">No sé</option>
            </select>

            <select
              value={form.penales}
              onChange={(e) => updateField("penales", e.target.value)}
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3"
            >
              <option value="">¿Antecedentes penales?</option>
              <option value="no">No</option>
              <option value="si">Sí</option>
            </select>

            <button
              onClick={handleContinue}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl py-3"
            >
              Continuar con Mohamed
            </button>
          </motion.div>
        )}

        {/* PANEL CHAT + DOCUMENTOS */}
        {completed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl bg-slate-900 border border-slate-700 p-4 space-y-4"
          >
            <div className="rounded-2xl bg-slate-800 p-3">
              <p className="text-sm">
                ✅ Ya tengo tus datos, {form.nombre}. Ahora súbeme tus pruebas
                de estancia, pasaporte y documentos. Voy a revisarlo
                profesionalmente paso a paso.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 rounded-2xl bg-slate-800 border border-slate-700 px-4"
                placeholder="Escribe tu mensaje..."
              />
              <button className="bg-emerald-500 rounded-2xl px-4">
                <Send size={18} className="text-black" />
              </button>
            </div>

            <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl py-3 flex items-center justify-center gap-2">
              <Upload size={18} />
              Subir documentos
            </button>

            <div className="rounded-2xl bg-slate-800 p-3 text-sm text-slate-300">
              Mohamed verificará:
              <ul className="mt-2 space-y-1">
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Fechas correctas
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  5 meses continuos
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Pasaporte válido
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Formulario vulnerabilidad
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Input({
  icon,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3">
      <div className="text-slate-400">{icon}</div>
      <input
        className="bg-transparent outline-none w-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
