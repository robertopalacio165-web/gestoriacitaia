import { useMemo } from "react";
import { useLocation } from "wouter";

export default function Confirmar() {
  const [, setLocation] = useLocation();

  const params = useMemo(() => {
    const url = new URL(window.location.href);
    return {
      token: url.searchParams.get("token") || "",
      appointmentId: url.searchParams.get("appointment_id") || "",
    };
  }, []);

  const handleConfirm = () => {
    const qs = new URLSearchParams();

    if (params.token) {
      qs.set("token", params.token);
    }

    if (params.appointmentId) {
      qs.set("appointment_id", params.appointmentId);
    }

    setLocation(`/buscar-citas${qs.toString() ? `?${qs.toString()}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Confirmación de cita
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sara ha encontrado una cita para ti. Revisa los datos y confirma.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-emerald-800">
            <p className="font-semibold">Cita encontrada</p>
            <p className="mt-1 text-sm">
              Tus datos ya están preparados. Solo falta tu confirmación final.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nombre
              </p>
              <p className="mt-1 text-base font-medium text-slate-900">
                Pendiente de cargar
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Trámite
              </p>
              <p className="mt-1 text-base font-medium text-slate-900">
                Pendiente de cargar
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ciudad
              </p>
              <p className="mt-1 text-base font-medium text-slate-900">
                Pendiente de cargar
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Oficina
              </p>
              <p className="mt-1 text-base font-medium text-slate-900">
                Pendiente de cargar
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Datos técnicos del enlace
            </p>
            <p className="mt-2 break-all text-sm text-slate-600">
              token: {params.token || "vacío"}
            </p>
            <p className="mt-1 break-all text-sm text-slate-600">
              appointment_id: {params.appointmentId || "vacío"}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              onClick={handleConfirm}
            >
              Confirmar cita ahora
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setLocation("/panel")}
            >
              Volver al panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
