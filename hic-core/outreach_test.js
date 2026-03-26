const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const path = require('path');
// This forces it to look in ~/my-first-api/hic-core/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '' 
    }
});

async function sendExecutivePitch(uid, targetEmail) {
    try {
        const res = await pool.query("SELECT * FROM live_purview WHERE uid = $1", [uid]);
        const asset = res.rows[0];

        if (!asset) {
            console.log(`Error: Asset with uid ${uid} not found.`);
            process.exit(1);
        }

        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1a202c; color: #ffffff; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 20px; letter-spacing: 2px;">HIERARCHY INVESTMENT CAPITAL</h1>
            </div>
            <div style="padding: 30px; color: #333; line-height: 1.6;">
                <h2 style="border-bottom: 2px solid #1a202c; padding-bottom: 10px;">EXECUTIVE SUMMARY</h2>
                <p><strong>Asset:</strong> ${asset.unit_name}</p>
                <p><strong>Ref ID:</strong> ${asset.uid}</p>
                <div style="background: #f4f7f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Current Bid:</strong> $${Number(asset.current_bid).toLocaleString()} CAD</p>
                    <p style="margin: 5px 0;"><strong>Projected USD Landed:</strong> $${Math.round(asset.current_bid * 0.85).toLocaleString()} USD*</p>
                </div>
                <p>Please reply to this email to receive the <b>MSA</b> and <b>Technical PDF</b>.</p>
                <p style="margin-top: 30px;">Regards,<br><b>Principal</b><br>Hierarchy Investment Capital Holdings Corp.</p>
            </div>
        </div>`;

        await transporter.sendMail({
            from: `"Hierarchy Engine" <${process.env.EMAIL_USER}>`,
            to: targetEmail,
            subject: `HIC OPPORTUNITY: ${asset.unit_name} (Ref: ${asset.uid})`,
            html: emailHtml
        });

        console.log(`\x1b[42m SUCCESS \x1b[0m Executive Summary sent to ${targetEmail}`);
        process.exit(0);
    } catch (e) { 
        console.error("\x1b[41m FAILED \x1b[0m", e.message); 
        process.exit(1);
    }
}

const testUid = process.argv[2];
if (!testUid) {
    console.log("Usage: node outreach_test.js <uid>");
} else {
    sendExecutivePitch(testUid, 'belgie.nunez@gmail.com');
}
