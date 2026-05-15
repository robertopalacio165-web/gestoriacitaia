import { useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function Confirmar() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

const handleConfirm = async () => {
  if (!hasRealData) return;

  try {
    setLoading(true);

const stripeRes = await fetch(
  "/api/create-checkout-sara",
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      appointment_id: params.appointmentId,
      token: params.token,
    }),
  }
);

const stripeData = await stripeRes.json();

if (stripeData.url) {

  window.location.href = stripeData.url;

}
  } catch (err) {
    console.error(err);
  }
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
                <Box label="Nombre" value={params.fullName || "No disponible"} />
                <Box label="Trámite" value={params.tramite} />
                <Box label="Ciudad" value={params.city || "No disponible"} />
                <Box label="Oficina" value={params.office} />
                <Box label="Fecha" value={params.date} />
                <Box label="Hora" value={params.time} />
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Datos técnicos
                </p>
                <p className="mt-2 text-sm text-slate-600 break-all">
                  token: {params.token}
                </p>
                <p className="text-sm text-slate-600 break-all">
                  appointment_id: {params.appointmentId}
                </p>
              </div>

              {error && (
                <div className="mt-4 text-sm text-red-600">{error}</div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  onClick={handleConfirm}
                >
                  {loading ? "جارٍ التوجيه للدفع..." : "Confirmar y pagar"}
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
                <p className="font-semibold">Enlace inválido</p>
                <p className="mt-1 text-sm">
                  Este enlace no contiene una cita completa.
                </p>
              </div>

              <button
                type="button"
                className="mt-4 rounded-xl border px-5 py-3"
                onClick={() => setLocation("/panel")}
              >
                Volver
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Box({ label, value }: any) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-medium text-slate-900">{value}</p>
    </div>
  );
}
