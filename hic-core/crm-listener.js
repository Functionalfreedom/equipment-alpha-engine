require('dotenv').config({ path: '/Users/belgienunez/my-first-api/.env' });
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS.replace(/\s+/g, '') }
});

const imap = new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS.replace(/\s+/g, ''),
    host: 'imap.gmail.com',
    port: 993,
    tls: true
});

async function generateAgreement(deal) {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = `/tmp/HIC_Agreement_${deal.uid}.pdf`;
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(25).text('H', { align: 'center' });
    doc.fontSize(16).text('HIERARCHY INVESTMENT CAPITAL', { align: 'center', characterSpacing: 2 });
    doc.moveDown().fontSize(12).font('Times-Bold').text(`ASSIGNMENT AGREEMENT | REF: ${deal.uid}`);
    doc.font('Times-Roman').fontSize(10).text(`Asset: ${deal.unit_name}\nLocation: ${deal.province}\n\n`);
    doc.font('Times-Bold').text("1. PROCUREMENT SERVICE FEE");
    doc.font('Times-Roman').text(`Success Fee of $${Number(deal.hic_fee).toLocaleString()} USD for the Sovereign Procurement Package. Non-refundable once data is released.\n\n`);
    doc.font('Times-Bold').text("2. LIABILITY & 'AS-IS' DISCLOSURE");
    doc.font('Times-Roman').text("Asset offered 'As-Is, Where-Is'. Hierarchy Investment Capital is a data intermediary and holds no liability for mechanical condition or bid outcomes.\n\n");
    doc.text("__________________________\nClient Signature");
    doc.end();
    return filePath;
}

imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
        console.log("[HIC CRM] Listening for Lead Interest...");
        imap.on('mail', () => {
            const f = imap.seq.fetch(box.messages.total + ':*', { bodies: '' });
            f.on('message', (msg) => {
                msg.on('body', async (stream) => {
                    const parsed = await simpleParser(stream);
                    const text = parsed.text.toLowerCase();
                    const subject = parsed.subject;
                    
                    if ((text.includes('yes') || text.includes('interested')) && subject.includes('HIC-')) {
                        const uidMatch = subject.match(/HIC-[A-Z0-9]+/);
                        if (uidMatch) {
                            const uid = uidMatch[0];
                            const res = await pool.query("SELECT * FROM live_purview WHERE uid = $1", [uid]);
                            if (res.rows[0]) {
                                const pdfPath = await generateAgreement(res.rows[0]);
                                await transporter.sendMail({
                                    from: process.env.EMAIL_USER,
                                    to: parsed.from.value[0].address,
                                    subject: `RE: Assignment Agreement | ${uid}`,
                                    text: "Please find the formal agreement attached. Sign and return to receive the secure payment link.",
                                    attachments: [{ filename: `HIC_Agreement_${uid}.pdf`, path: pdfPath }]
                                });
                                console.log(`[SUCCESS] Agreement sent to ${parsed.from.value[0].address} for ${uid}`);
                            }
                        }
                    }
                });
            });
        });
    });
});
imap.connect();
