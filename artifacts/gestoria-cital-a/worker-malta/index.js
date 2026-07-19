const log = require("./logger");
const queue = require("./queue");

async function start() {

    log("=================================");
    log("GESTORIACITAIA MALTA WORKER");
    log("=================================");

    const applications = await queue.getPendingApplications();

    log(`Clientes activos: ${applications.length}`);

    applications.forEach(app => {

        log(
            `${app.full_name} | ${app.plan}`
        );

    });

}

start();
