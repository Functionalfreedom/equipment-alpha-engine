process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const { generateProfessionalPDF } = require('./scraper.js');

const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const config = {
    imap: {
        user: process.env.EMAIL_USER, password: process.env.EMAIL_PASS,
        host: 'imap.gmail.com', port: 993, tls: true, authTimeout: 5000
    }
};

async function checkInbox() {
    console.log('--- SCANNING INBOX ---');
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search(['UNSEEN'], { bodies: [''], markSeen: false });

        for (let item of messages) {
            const all = item.parts.find(part => part.which === '');
            const mail = await simpleParser(all.body);
            const fromEmail = mail.from.value[0].address.toLowerCase();
            const body = (mail.text || "").toLowerCase();

            if (body.includes('yes') || body.includes('proceed')) {
                console.log(`[TRIGGER] Found 'YES' from: ${fromEmail}`);

                // DEBUG: Let's see if the database even knows this email
                const dbCheck = await pool.query('SELECT buyer_name FROM buyer_demands WHERE LOWER(email) = $1', [fromEmail]);
                console.log(`[DB-DEBUG] Buyer Lookup for ${fromEmail}: ${dbCheck.rowCount > 0 ? dbCheck.rows[0].buyer_name : 'NOT FOUND'}`);

                const res = await pool.query(`
                    SELECT * FROM matches 
                    WHERE status = 'PITCHED' 
                    AND buyer_name IN (SELECT buyer_name FROM buyer_demands WHERE LOWER(email) = $1)
                    ORDER BY match_date DESC LIMIT 1`, [fromEmail]);

                if (res.rowCount > 0) {
                    const deal = res.rows[0];
                    console.log(`[MATCH] Closing Deal: ${deal.asset_name}`);
                    const { filePath } = await generateProfessionalPDF(deal.asset_name, deal.assignment_fee, './');

                    await transporter.sendMail({
                        from: 'process.env.EMAIL_FROM_NAME <YOUR_ANONYMOUS_EMAIL>',
                        to: fromEmail,
                        subject: `PROCUREMENT PACKAGE: ${deal.asset_name}`,
                        html: `<h3>HIERARCHY</h3><p>Attached is your assignment for <b>${deal.asset_name}</b>.</p>`,
                        attachments: [{ filename: `HIC_Assignment.pdf`, path: filePath }]
                    });

                    await connection.addFlags(item.attributes.uid, '\\Seen');
                    await pool.query('UPDATE matches SET status = $1 WHERE id = $2', ['ACCEPTED', deal.id]);
                    console.log(`[SUCCESS] Loop Closed for ${fromEmail}`);
                } else {
                    console.log(`[ERROR] Database has no PITCHED deal for buyer: ${fromEmail}`);
                }
            }
        }
        await connection.end();
    } catch (err) { console.error('[SYSTEM ERROR]', err.message); if (connection) connection.end(); }
}

setInterval(checkInbox, 30000); // Check every 30 seconds for the test
checkInbox();
