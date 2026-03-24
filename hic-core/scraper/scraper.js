require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const path = require('path');

const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

// --- MONDAY 09:00: SET TO FALSE TO GO LIVE ---
const SYSTEM_PAUSE = true; 

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'hierarchyinvestmentcorp@gmail.com', pass: 'klljylapojryecxv' }
});

async function generateProfessionalPDF(assetName, fee, dailyFolder) {
    const txID = `HIC-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    const filePath = path.join(dailyFolder, `HIC_ASSIGNMENT_${txID}.pdf`);
    const htmlContent = `
    <html>
    <head><style>
        body { font-family: 'Times New Roman', serif; padding: 80px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .signature-line { border-top: 1px solid #000; width: 300px; margin-top: 80px; position: relative; }
        .cursive { font-family: 'Brush Script MT', cursive; font-size: 32px; position: absolute; top: -30px; left: 20px; }
    </style></head>
    <body>
        <div class="header"><h1>H</h1><h2>HIERARCHY</h2></div>
        <h3>ASSIGNMENT OF PURCHASE RIGHTS</h3>
        <p>Asset: ${assetName}</p><p>Ref: ${txID}</p><p>Fee: $${fee} CAD</p>
        <div class="signature-line"><span class="cursive">Belgie Nunez</span><strong>Belgie Nunez</strong><br>Principal, Hierarchy Investment Capital</div>
    </body></html>`;
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    await page.pdf({ path: filePath, format: 'Letter' });
    await browser.close();
    return { filePath, txID };
}

async function sendAutomatedPitch(demand, assetName, spread, expiry) {
    const txID = `HIC-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    await pool.query('INSERT INTO matches (buyer_name, asset_name, potential_spread, status, transaction_id, assignment_fee, expiry_date) VALUES ($1, $2, $3, $4, $5, $6, $7)', [demand.buyer_name, assetName, spread, 'TRACKED', txID, 2500, expiry]);
    if (SYSTEM_PAUSE) return;

    const pitchHtml = `<div style="font-family: 'Times New Roman', serif; max-width: 600px; border: 1px solid #eee; padding: 40px;">
        <div style="text-align:center;"><h2>H</h2><h3>HIERARCHY</h3><p>Investment Capital</p></div>
        <p>We have secured acquisition rights for: <b>${assetName}</b></p>
        <p><b>Deal Expiry:</b> ${expiry}</p>
        <p>Please reply "Yes" to request the full procurement package.</p>
        <p>Regards,<br><b>Belgie Nunez</b><br>Principal</p>
    </div>`;

    await transporter.sendMail({
        from: '"Belgie Nunez | Hierarchy Capital" <hierarchyinvestmentcorp@gmail.com>',
        to: demand.email, subject: `OFF-MARKET PROCUREMENT: ${assetName}`, html: pitchHtml
    });
    await pool.query('UPDATE matches SET status = $1 WHERE transaction_id = $2', ['PITCHED', txID]);
}

async function scan() {
    try {
        const demandRes = await pool.query('SELECT * FROM buyer_demands');
        const { data } = await axios.get('https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&sc=ach-shop&hp=1&vct=7&sr=1&lst=1');
        const $ = cheerio.load(data);
        $('table tr').each((i, el) => {
            const title = $(el).find('td').eq(1).text().trim();
            const expiry = $(el).find('td').eq(2).text().trim();
            const bid = parseFloat($(el).find('td').eq(3).text().replace(/[^0-9.]/g, '')) || 0;
            demandRes.rows.forEach(async d => {
                if (d.keywords.split(',').some(k => title.toLowerCase().includes(k.trim().toLowerCase()))) {
                    const spread = d.max_budget - bid;
                    if (spread > 2500) {
                        const exists = await pool.query('SELECT id FROM matches WHERE asset_name = $1 AND buyer_name = $2', [title, d.buyer_name]);
                        if (exists.rowCount === 0) await sendAutomatedPitch(d, title, spread, expiry);
                    }
                }
            });
        });
    } catch (e) {}
}
setInterval(scan, 900000);
scan();
module.exports = { generateProfessionalPDF };
