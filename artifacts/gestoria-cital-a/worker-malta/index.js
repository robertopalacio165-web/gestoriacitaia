const log = require("./logger");
const queue = require("./queue");
const searchJobs = require("./search-jobs");

async function start() {

    log("=================================");
    log("GESTORIACITAIA MALTA WORKER");
    log("=================================");

    // Buscar ofertas nuevas
    await searchJobs();

    // Obtener clientes activos
    const applications = await queue.getPendingApplications();

    log(`Clientes activos: ${applications.length}`);

    applications.forEach(app => {

        log(
            `${app.full_name} | ${app.plan}`
        );

    });

}

start();
