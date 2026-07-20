const axios = require("axios");
const supabase = require("./supabase");
const log = require("./logger");

// ===============================
// BUSCAR OFERTAS
// ===============================
async function fetchJobs() {

    // TODO:
    // Aquí conectaremos Jobsplus, Keepmeposted,
    // CareerJet, etc.

    return [

        {
            company: "Hilton Malta",
            title: "Receptionist",
            location: "St Julian's",
            url: "https://example.com/job1",
            source: "TEST",
            salary: "",
            job_type: "Full Time",
            description: "Receptionist wanted"
        },

        {
            company: "Corinthia Hotel",
            title: "Waiter",
            location: "Sliema",
            url: "https://example.com/job2",
            source: "TEST",
            salary: "",
            job_type: "Full Time",
            description: "Restaurant waiter"
        }

    ];

}

// ===============================
// GUARDAR UNA OFERTA
// ===============================
async function saveJob(job) {

    const { data: exists } = await supabase
        .from("malta_job_offers")
        .select("id")
        .eq("url", job.url)
        .maybeSingle();

    if (exists) {

        log(`Oferta ya existe: ${job.title}`);
        return false;

    }

    const { error } = await supabase
        .from("malta_job_offers")
        .insert({

            company: job.company,
            title: job.title,
            location: job.location,
            url: job.url,
            source: job.source,
            salary: job.salary,
            job_type: job.job_type,
            description: job.description

        });

    if (error) {

        log(error.message);
        return false;

    }

    log(`Nueva oferta guardada: ${job.title}`);

    return true;

}

// ===============================
// EJECUTAR BUSCADOR
// ===============================
async function searchJobs() {

    log("==================================");
    log("BUSCANDO OFERTAS EN MALTA...");
    log("==================================");

    const jobs = await fetchJobs();

    let inserted = 0;

    for (const job of jobs) {

        const ok = await saveJob(job);

        if (ok)
            inserted++;

    }

    log(`Ofertas encontradas: ${jobs.length}`);
    log(`Ofertas nuevas: ${inserted}`);

    return inserted;

}

module.exports = searchJobs;
