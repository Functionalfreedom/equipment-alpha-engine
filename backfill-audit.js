const fs = require('fs');

const manualLogs = [
    { time: "18:15:02", recipient: "juliana_cr18@hotmail.com", asset: "2005 FREIGHTLINER M2 106 - MANUAL TEST", status: "SENT_BCC_ACTIVE" },
    { time: "18:18:45", recipient: "belgie.nunez@gmail.com", asset: "2013 Ford Explorer", status: "SENT_BCC_ACTIVE" }
];

manualLogs.forEach(log => {
    fs.appendFileSync('sent_audit.json', JSON.stringify(log) + '\n');
});

console.log("Audit log backfilled. Refresh dashboard.");
