require("dotenv").config();

module.exports = {
  worker: {
    interval: 5 * 60 * 1000,
    maxApplicationsPerDay: 10,
    emailSummaryHour: 20
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY
  },

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  },

  gmail: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
};
