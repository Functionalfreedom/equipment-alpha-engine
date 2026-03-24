// test-email.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ database: 'taskdb' });

async function forceAudit() {
    const audit = { 
        time: new Date().toLocaleTimeString(), 
        recipient: 'juliana_cr18@hotmail.com', 
        asset: '2005 FREIGHTLINER M2 106 - MANUAL TEST', 
        status: 'SENT_BCC_ACTIVE' 
    };
    fs.appendFileSync('sent_audit.json', JSON.stringify(audit) + '\n');
    console.log("SUCCESS: Dashboard Audit Log updated.");
    process.exit();
}
forceAudit();
