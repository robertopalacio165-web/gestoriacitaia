# Reemplaza TODO el archivo `src/pages/Confirmar.tsx` por este código completo

```tsx
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
      setError("");

      const response = await fetch("/api/create-checkout-sara", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: params.token,
          appointment_id: params.appointmentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Error Stripe");
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error iniciando pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071117] px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_35%)]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_35%)]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-400 backdrop-blur-xl">
            Cita real encontrada
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-white">
            Confirmación de cita
          </h1>

          <p className="mt-3 text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Sara ha encontrado una cita oficial para ti. Revisa todos los datos
            antes de continuar con la reserva segura.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.45)] overflow-hidden">
          {hasRealData ? (
            <>
              <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    Estado de la reserva
                  </p>

                  <h2 className="text-xl font-bold text-white mt-1">
                    Lista para confirmar
                  </h2>
                </div>

                <div className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400">
                  Disponible ahora
                </div>
              </div>

              <div className="p-6 grid gap-4 md:grid-cols-2">
                <Box label="Nombre" value={params.fullName || "No disponible"} />
                <Box label="Trámite" value={params.tramite} />
                <Box label="Ciudad" value={params.city || "No disponible"} />
                <Box label="Oficina" value={params.office} />
                <Box label="Fecha" value={params.date} />
                <Box label="Hora" value={params.time} />
              </div>

              <div className="px-6 pb-6">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-slate-400">
                        Reserva segura gestionada por Sara
                      </p>

                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-5xl font-black text-white">
                          13,99€
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-slate-400">
                        Pago único
                      </p>

                      <p className="mt-1 text-sm text-emerald-400 font-semibold">
                        Confirmación inmediata
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
                    onClick={handleConfirm}
                  >
                    {loading
                      ? "Redirigiendo a Stripe..."
                      : "Confirmar y pagar"}
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base font-semibold text-slate-200 transition hover:bg-white/10"
                    onClick={() => setLocation("/panel")}
                  >
                    Volver
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-10 text-center">
              <div className="mx-auto w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-5 py-2 text-sm font-semibold text-amber-300">
                Enlace inválido
              </div>

              <h2 className="mt-6 text-3xl font-black text-white">
                No encontramos una cita válida
              </h2>

              <p className="mt-3 text-slate-400 max-w-lg mx-auto leading-relaxed">
                Este enlace no contiene información completa o la reserva ya no
                está disponible.
              </p>

              <button
                type="button"
                className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base font-semibold text-white hover:bg-white/10 transition"
                onClick={() => setLocation("/panel")}
              >
                Volver al panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Box({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-xl font-semibold text-white break-words">
        {value}
      </p>
    </div>
  );
}
```

Después guarda el archivo y abre:

```txt
https://gestoriacitaia.com/confirmar?token=abc123&appointment_id=999&full_name=Mohamed&tramite=TIE&city=Madrid&office=Aluche&date=20-06-2026&time=09:30
```
