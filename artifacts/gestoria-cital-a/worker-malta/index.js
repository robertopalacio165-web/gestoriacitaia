const log = require("./logger");
const queue = require("./queue");
const searchJobs = require("./search-jobs");

async function start() {

    log("=================================");
    log("GESTORIACITAIA MALTA WORKER");
    log("=================================");

    // Buscar ofertas nuevas
    await searchJobs();

    // Leer clientes activos
    const applications = await queue.getPendingApplications();

    log(`Clientes activos: ${applications.length}`);

    for (const app of applications) {

        log("--------------------------------");
        log(`Nombre: ${app.full_name}`);
        log(`Email: ${app.email}`);
        log(`WhatsApp: ${app.whatsapp}`);
        log(`País: ${app.country}`);
        log(`Nacionalidad: ${app.nationality}`);
        log(`Plan: ${app.plan}`);
        log("--------------------------------");

    }

}

start().catch(console.error);
