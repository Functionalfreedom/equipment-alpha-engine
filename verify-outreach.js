require('dotenv').config();
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const pool = new Pool({ database: process.env.DB_NAME || 'taskdb' });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s+/g, '')
    }
});

async function sendSummary() {
    try {
        // Pull the top 5 high-value matches from the database
        const res = await pool.query(`
            SELECT asset_name, buyer_name, potential_spread 
            FROM matches 
            WHERE potential_spread >= 5000 
            ORDER BY match_date DESC LIMIT 5
        `);

        if (res.rows.length === 0) {
            console.log("No high-value matches found in taskdb to verify.");
            return;
        }

        let tableRows = res.rows.map(row => `
            <tr>
                <td style="padding:10px; border:1px solid #ddd;">${row.asset_name}</td>
                <td style="padding:10px; border:1px solid #ddd;">$${Number(row.potential_spread).toLocaleString()}</td>
                <td style="padding:10px; border:1px solid #ddd;">${row.buyer_name}</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: `"Hierarchy Ops" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `Hierarchy Daily Whale Report: ${new Date().toLocaleDateString()}`,
            html: `
                <div style="font-family:sans-serif; max-width:600px;">
                    <h2 style="color:#003366;">Active Deal Pipeline</h2>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f4f4f4;">
                                <th style="padding:10px; border:1px solid #ddd;">Asset</th>
                                <th style="padding:10px; border:1px solid #ddd;">Spread</th>
                                <th style="padding:10px; border:1px solid #ddd;">Target Dealer</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    <p style="margin-top:20px; font-size:12px; color:#666;">
                        This report was generated automatically from Hierarchy's local 'taskdb' instance.
                    </p>
                </div>`
        };

        await transporter.sendMail(mailOptions);
        console.log(`\x1b[32m[SUCCESS]\x1b[0m Summary of ${res.rows.length} deals sent to ${process.env.EMAIL_USER}`);
    } catch (err) {
        console.error("Verification Error:", err.message);
    } finally {
        await pool.end();
    }
}

sendSummary();
