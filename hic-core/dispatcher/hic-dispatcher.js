require('dotenv').config({ path: '../../.env' });
const express = require('express');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const app = express();
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS.replace(/\s+/g, '') }
});

const TARGET = 'belgie.nunez@gmail.com';

// --- PHASE 4: THE WEBHOOK (Automated Release) ---
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    let event = JSON.parse(req.body);
    if (event.type === 'checkout.session.completed') {
        const email = event.data.object.customer_details.email;
        console.log(`\x1b[42m[PAYMENT]\x1b[0m Verified for ${email}. Releasing package...`);
        await sendProcurementPackage(email);
    }
    res.sendStatus(200);
});

app.listen(3000, () => console.log('\x1b[45m HIC SERVER \x1b[0m Port 3000 Active'));

// --- DISPATCHER FUNCTIONS ---
async function sendEmail(phase) {
    const templates = {
        1: { subj: '[HIC-ALPHA] Inventory Alert: 2014 John Deere 470G LC', body: 'High-alpha unit found. Reply YES for terms.' },
        2: { subj: 'RE: Assignment Terms (HIC-A470G)', body: 'Fee: $10,800. Reply AGREE to sign off.' },
        3: { subj: 'Secure Payment Link: Hierarchy Capital', body: 'Terms Accepted: <a href="https://buy.stripe.com/5kQ6oA5xc7NHa30gsWgA800">Complete Checkout</a>' }
    };
    const t = templates[phase];
    await transporter.sendMail({ from: process.env.EMAIL_USER, to: TARGET, subject: t.subj, html: t.body });
    await pool.query("INSERT INTO email_logs (recipient_email, phase, status) VALUES ($1, $2, 'SENT')", [TARGET, phase]);
}

async function sendProcurementPackage(email) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER, to: email,
        subject: 'CONFIRMED: Strategic Procurement Package - JD 470G LC',
        html: `<h2>RELEASED</h2><p>Access details here: <a href="https://mcdougallauction.com">Auction Link</a></p>`
    });
    await pool.query("INSERT INTO email_logs (recipient_email, phase, status) VALUES ($1, 4, 'RELEASED')", [email]);
}

// --- IMAP LISTENER ---
const imap = new Imap({
    user: process.env.EMAIL_USER, password: process.env.EMAIL_PASS.replace(/\s+/g, ''),
    host: 'imap.gmail.com', port: 993, tls: true, tlsOptions: { rejectUnauthorized: false }
});

imap.on('ready', () => {
    console.log("\x1b[44m IMAP LISTENER \x1b[0m Watching " + TARGET);
    setInterval(() => {
        imap.openBox('INBOX', false, () => {
            imap.search(['UNSEEN', ['FROM', TARGET]], (err, results) => {
                if (err || !results.length) return;
                const f = imap.fetch(results, { bodies: '', markSeen: true });
                f.on('message', (msg) => {
                    msg.on('body', (stream) => {
                        simpleParser(stream, async (err, parsed) => {
                            const text = parsed.text.toUpperCase();
                            const res = await pool.query("SELECT phase FROM email_logs WHERE recipient_email = $1 ORDER BY timestamp DESC LIMIT 1", [TARGET]);
                            const phase = res.rows[0]?.phase || 0;
                            if (text.includes('YES') && phase === 1) await sendEmail(2);
                            if (text.includes('AGREE') && phase === 2) await sendEmail(3);
                        });
                    });
                });
            });
        });
    }, 20000);
});

imap.connect();
