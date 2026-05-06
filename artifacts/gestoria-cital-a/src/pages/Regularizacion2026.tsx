const speakRealtime = async (text: string) => {

  if (!realtimeDcRef.current) return;

  if (realtimeDcRef.current.readyState !== "open") return;

  realtimeDcRef.current.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text,
          },
        ],
      },
    })
  );

  realtimeDcRef.current.send(
    JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
      },
    })
  );
};
