const imaps = require('imap-simple');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

// 1. Database Connection
const pool = new Pool({
    user: 'belgienunez',
    host: 'localhost',
    database: 'postgres',
    port: 5432,
});

// 2. Email Configuration (Use App Passwords for Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'hierarchyinvestmentcorp@gmail.com', pass: 'your-app-password' }
});

const config = {
    imap: {
        user: 'hierarchyinvestmentcorp@gmail.com',
        password: 'your-app-password',
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 3000
    }
};

// 3. PDF Generator (Stage 2: The LSA)
async function generateLSA(deal) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const fee = Math.min(deal.spread_value * 0.1, 2500);

    page.drawText('HIERARCHY INVESTMENT CAPITAL | LEAD ASSIGNMENT', { x: 50, y: 350, size: 20 });
    page.drawText(`Asset: ${deal.unit_name}`, { x: 50, y: 300, size: 12 });
    page.drawText(`UID: ${deal.uid}`, { x: 50, y: 280, size: 12 });
    page.drawText(`Procurement Fee: $${fee.toLocaleString()}`, { x: 50, y: 260, size: 12 });
    page.drawText(`Terms: As-Is, Where-Is. Non-Refundable Data Release.`, { x: 50, y: 200, size: 10 });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(`./LSA_${deal.uid}.pdf`, pdfBytes);
    return `./LSA_${deal.uid}.pdf`;
}

// 4. The Master Loop (Stage 1 & 2 Logic)
async function listenForAction() {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: true };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (let msg of messages) {
        const from = msg.parts[1].body.header.from[0];
        const body = msg.parts[0].body.toLowerCase();

        // SECURITY LOCK: Only respond to you
        if (!from.includes('belgie.nunez@gmail.com')) {
            console.log(`[BLOCK] Ignoring external contact from: ${from}`);
            continue;
        }

        if (body.includes('yes')) {
            console.log(`[MATCH] Admin requested lead. Fetching top spread...`);
            
            const res = await pool.query('SELECT * FROM live_purview ORDER BY spread_value DESC LIMIT 1');
            const deal = res.rows[0];

            if (deal) {
                const pdfPath = await generateLSA(deal);
                
                await transporter.sendMail({
                    from: 'hierarchyinvestmentcorp@gmail.com',
                    to: 'belgie.nunez@gmail.com',
                    subject: `STAGED: LSA for ${deal.uid}`,
                    text: `Review the attached Lead Sales Agreement for ${deal.unit_name}. Reply DEPOSIT to release source URL.`,
                    attachments: [{ filename: `LSA_${deal.uid}.pdf`, path: pdfPath }]
                });
                console.log(`[SUCCESS] Stage 2 sent for ${deal.uid}`);
            }
        }
    }
    connection.end();
}

// Run every 60 seconds
console.log("--- HIC MASTER TEST: SILENT MODE ACTIVE ---");
setInterval(listenForAction, 60000);

