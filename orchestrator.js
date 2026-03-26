const { exec } = require('child_process');
const cron = require('node-cron');

// 1. Hourly Scraper: 6 AM EST (3 AM PST) to 8 PM EST (5 PM PST)
// Runs at the top of every hour
cron.schedule('0 3-17 * * *', () => {
    console.log("[HIC] Hourly Pulse: Running Trawler...");
    exec('pm2 restart hic-trawler');
}, { timezone: "America/Los_Angeles" });

// 2. Daily Dispatch: 12 PM EST (9 AM PST)
cron.schedule('0 9 * * *', () => {
    console.log("[HIC] Noon Dispatch: Executing Outreach...");
    exec('node ~/Desktop/Hierarchy_Exports/my-first-api/verify-outreach.js');
}, { timezone: "America/Los_Angeles" });

console.log("[HIC] Nervous System Active. Monitoring Schedule...");
