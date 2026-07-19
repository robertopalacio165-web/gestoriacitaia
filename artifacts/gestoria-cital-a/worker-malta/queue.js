const supabase = require("./supabase");
const config = require("./config");
const log = require("./logger");

async function getPendingApplications() {

    const { data, error } = await supabase
        .from("malta_applications")
        .select("*")
        .eq("paid", true)
        .eq("status", "active");

    if (error) {
        log(error.message);
        return [];
    }

    return data || [];
}

module.exports = {
    getPendingApplications
};
