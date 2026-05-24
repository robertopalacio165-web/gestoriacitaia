import fetch from "node-fetch";

async function runWorker() {

  try {

    console.log("🚀 Sara Worker Running...");

    const response = await fetch(
      "https://grateful-spirit-production-6aee.up.railway.app/api/railway-worker"
    );

    const data = await response.json();

    console.log("✅ Worker Response:", data);

  } catch (err) {

    console.log("❌ Worker Error:", err);

  }

}

setInterval(() => {

  runWorker();

}, 30000);

runWorker();
