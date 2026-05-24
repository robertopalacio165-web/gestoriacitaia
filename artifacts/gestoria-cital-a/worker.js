const WORKER_URL =
  "https://gestoriacitaia-gestoria-cital-a1-lthu56e7b.vercel.app/api/railway-worker";

async function runWorker() {

  try {

    console.log(
      "🚀 Sara Worker Running..."
    );

    const response =
      await fetch(
        WORKER_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          }
        }
      );

    const data =
      await response.json();

    console.log(
      "✅ Worker Response:",
      data
    );

  } catch (err) {

    console.log(
      "❌ Worker Error:",
      err
    );

  }

}

runWorker();

setInterval(
  runWorker,
  30000
);
