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
    auth: { user: 'hierarchyinvestmentcorp@gmail.com', pass: 'klljylapojryecxv' }
});

const config = {
    imap: {
        user: 'hierarchyinvestmentcorp@gmail.com', password: 'klljylapojryecxv',
        host: 'imap.gmail.com', port: 993, tls: true, authTimeout: 5000
    }
};

async function testLoop() {
    console.log('--- [TEST MODE] SCANNING FOR BELGIE "YES" ---');
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        
        // Only look for UNREAD mail from your personal account
        const messages = await connection.search(['UNSEEN'], { bodies: [''], markSeen: false });

        for (let item of messages) {
            const all = item.parts.find(part => part.which === '');
            const mail = await simpleParser(all.body);
            const fromEmail = mail.from.value[0].address.toLowerCase();
            const body = (mail.text || "").toLowerCase();

            // SENSITIVITY: Only trigger if it's YOUR personal email
            if (fromEmail === 'belgie.nunez@gmail.com' && (body.includes('yes') || body.includes('proceed'))) {
                console.log(`[TRIGGER] Verified Test Reply from ${fromEmail}`);

                const asset = '2022 CATERPILLAR 320 HYDRAULIC EXCAVATOR';
                const fee = 2500;
                
                console.log(`[ACTION] Generating Package for: ${asset}`);
                const { filePath } = await generateProfessionalPDF(asset, fee, './');

                await transporter.sendMail({
                    from: '"Hierarchy Capital | TEST" <hierarchyinvestmentcorp@gmail.com>',
                    to: fromEmail,
                    subject: `[TEST LOOP] PROCUREMENT: ${asset}`,
                    html: `<h3>HIERARCHY INVESTMENT CAPITAL</h3><p>Loop Test Successful. Attached is the package for <b>${asset}</b>.</p>`,
                    attachments: [{ filename: `HIC_TEST_PACKAGE.pdf`, path: filePath }]
                });

                // MARK AS SEEN IMMEDIATELY TO STOP MULTI-FIRING
                await connection.addFlags(item.attributes.uid, '\\Seen');
                console.log(`[SUCCESS] Test Package Dispatched to ${fromEmail}`);
            }
        }
        await connection.end();
    } catch (err) { 
        console.error('[TEST ERROR]', err.message); 
        if (connection) connection.end(); 
    }
}

// Check every 15 seconds for rapid testing
setInterval(testLoop, 15000); 
testLoop();
