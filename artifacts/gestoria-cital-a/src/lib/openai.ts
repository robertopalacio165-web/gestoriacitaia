type SaraHistoryItem = {
  from: "user" | "agent";
  text: string;
};

type SaraLeadForm = {
  nombre?: string;
  telefono?: string;
  email?: string;
  niePasaporte?: string;
  ciudad?: string;
  nacionalidad?: string;
  fechaLlegada?: string;
  cumple5Meses?: string;
  asilo?: string;
  penales?: string;
};

type EnviarMensajeSaraParams = {
  mensaje: string;
  lang?: "darija" | "es" | "en";
  context?: string;
  procedureKey?: string;
  procedureLabel?: string;
  sessionId?: string;
  userId?: string;
  history?: SaraHistoryItem[];
  leadForm?: SaraLeadForm;
};

export async function enviarMensajeSara({
  mensaje,
  lang = "es",
  context = "buscar_citas",
  procedureKey = "",
  procedureLabel = "",
  sessionId = "",
  userId = "",
  history = [],
  leadForm = {},
}: EnviarMensajeSaraParams): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistant: "sara",
      context,
      message: mensaje,
      lang,
      procedureKey,
      procedureLabel,
      sessionId,
      userId,
      history,
      leadForm,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Error conectando con Sara");
  }

  return (
    data?.reply ||
    "Sara no devolvió respuesta."
  );
}
