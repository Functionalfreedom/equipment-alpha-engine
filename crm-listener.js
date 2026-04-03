require('dotenv').config({ path: '/Users/belgienunez/my-first-api/.env' });
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const imapConfig = {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS.replace(/\s+/g, ''),
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    keepalive: { interval: 10000, idleInterval: 300000, forceNoop: true }
};

let imap = new Imap(imapConfig);

function startListener() {
    imap.once('ready', () => {
        console.log("[HIC CRM] Connection Established. Listening...");
        imap.openBox('INBOX', false, (err) => {
            if (err) console.error(err);
        });
    });

    imap.on('error', (err) => {
        console.log('[IMAP ERROR] Restarting...', err.code);
        setTimeout(() => { imap = new Imap(imapConfig); startListener(); }, 5000);
    });

    imap.connect();
}
startListener();
