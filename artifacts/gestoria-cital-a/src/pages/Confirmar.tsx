import { useMemo } from "react";
import { useLocation } from "wouter";

export default function Confirmar() {
  const [, setLocation] = useLocation();

  const params = useMemo(() => {
    const url = new URL(window.location.href);

    return {
      token: url.searchParams.get("token") || "",
      appointmentId: url.searchParams.get("appointment_id") || "",
      fullName: url.searchParams.get("full_name") || "",
      tramite: url.searchParams.get("tramite") || "",
      city: url.searchParams.get("city") || "",
      office: url.searchParams.get("office") || "",
      date: url.searchParams.get("date") || "",
      time: url.searchParams.get("time") || "",
    };
  }, []);

  const hasRealData =
    !!params.token &&
    !!params.appointmentId &&
    !!params.tramite &&
    !!params.office &&
    !!params.date &&
    !!params.time;

  const handleConfirm = () => {
    if (!hasRealData) return;

    const qs = new URLSearchParams();

    qs.set("token", params.token);
    qs.set("appointment_id", params.appointmentId);

    if (params.fullName) qs.set("full_name", params.fullName);
    if (params.tramite) qs.set("tramite", params.tramite);
    if (params.city) qs.set("city", params.city);
    if (params.office) qs.set("office", params.office);
    if (params.date) qs.set("date", params.date);
    if (params.time) qs.set("time", params.time);

    setLocation(`/buscar-citas?${qs.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Confirmación de cita
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sara ha encontrado una cita real para ti. Revisa los datos y confirma.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {hasRealData ? (
            <>
              <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-emerald-800">
                <p className="font-semibold">Cita real encontrada</p>
                <p className="mt-1 text-sm">
                  Revisa tus datos y confirma solo si todo está correcto.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nombre
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {params.fullName || "No disponible"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Trámite
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {params.tramite}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ciudad
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {params.city || "No disponible"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Oficina
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {params.office}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {params.date}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hora
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {params.time}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Datos técnicos del enlace
                </p>
                <p className="mt-2 break-all text-sm text-slate-600">
                  token: {params.token}
                </p>
                <p className="mt-1 break-all text-sm text-slate-600">
                  appointment_id: {params.appointmentId}
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
            </>
          ) : (
            <>
              <div className="mb-6 rounded-xl bg-amber-50 p-4 text-amber-800">
                <p className="font-semibold">Enlace incompleto o no real</p>
                <p className="mt-1 text-sm">
                  Este enlace no trae una cita real completa. No se puede confirmar.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Datos del enlace
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
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setLocation("/panel")}
                >
                  Volver al panel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
