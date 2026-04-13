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
        assistant: "sara",
        message: rawText,
        context: "buscar_citas",
        lang,
        history: historyToSend,
        procedureLabel: selectedTramiteLabel,
        procedureKey: selectedTramite,
        sessionId: `sara_${selectedTramite}`,
        userId: profile?.id || "",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Error en Sara");
    }

    const finalReply =
      data?.reply ||
      (lang === "darija"
        ? "سمح ليا، ما قدرتش نجاوب دابا."
        : lang === "en"
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
        text:
          lang === "darija"
            ? "باش نكملو معاك ونخدمو على الموعد، خاصك تفعل الخدمة."
            : lang === "en"
            ? "To continue working on your appointment, you need to activate the service."
            : "Para seguir trabajando en tu cita, necesitas activar el servicio.",
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
    console.error("Error conectando con Sara:", error);

    const errorReply: ChatMsg = {
      from: "agent",
      text:
        lang === "darija"
          ? "وقع مشكل فالاتصال مع سارة، عاود حاول."
          : lang === "en"
          ? "There was a connection error with Sara. Please try again."
          : "Error conectando con Sara, intenta otra vez.",
      ts: Date.now(),
    };

    setChatMessages((prev) => [...prev, errorReply]);
  } finally {
    setSendingChat(false);
  }
};
