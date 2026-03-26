const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

app.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM live_purview ORDER BY hic_fee DESC NULLS LAST");
        
        const rows = result.rows.map(i => {
            const bid = Number(i.current_bid) || 0;
            const fmv = Number(i.market_value) || 0;
            const spread = Number(i.spread_value) || 0;
            const fee = Number(i.hic_fee) || 0;

            return `
            <tr style="border-bottom: 1px solid #edf2f7; font-family: sans-serif;">
                <td style="padding:18px;">
                    <b style="font-size:15px; color:#2d3748;">${i.unit_name}</b><br>
                    <small style="color:#e53e3e; font-weight:700; text-transform: uppercase;">⏳ Ends: ${i.expiry_date || 'N/A'}</small>
                </td>
                <td style="padding:18px; color:#4a5568;">$${bid.toLocaleString()} <small style="font-size:10px; color:#a0aec0;">USD</small></td>
                <td style="padding:18px; color:#718096; font-style: italic;">$${fmv.toLocaleString()} <small style="font-size:10px; color:#a0aec0;">USD</small></td>
                <td style="padding:18px; color:#3182ce; font-weight:600;">$${spread.toLocaleString()} <small style="font-size:10px; color:#a0aec0;">USD</small></td>
                <td style="padding:18px; color:#2f855a; font-weight:800; font-size:17px;">$${fee.toLocaleString()} <small style="font-size:10px; color:#a0aec0;">USD</small></td>
                <td style="padding:18px; text-align:right;">
                    <a href="${i.item_url}" target="_blank" style="text-decoration:none; background:#2d3748; color:white; padding:10px 18px; border-radius:6px; font-weight:600; font-size:13px; display:inline-block; transition: 0.2s;">
                        VIEW ASSET
                    </a>
                </td>
            </tr>`;
        }).join('');

        res.send(`
            <html>
                <head><title>HIC | Sovereign USD Inventory</title></head>
                <body style="background:#f8fafc; padding:50px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                    <div style="max-width:1300px; margin:auto;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                            <div>
                                <h1 style="margin:0; color:#1a202c; letter-spacing:-1px;">HIERARCHY INVESTMENT CAPITAL</h1>
                                <p style="margin:5px 0 0; color:#718096; font-weight:500;">Asset Portal | <span style="color:#2b6cb0;">All Values Converted to USD (FX: 0.72)</span></p>
                            </div>
                            <div style="text-align:right;">
                                <span style="background:#f0fff4; color:#2f855a; border: 1px solid #c6f6d5; padding:8px 15px; border-radius:20px; font-weight:700; font-size:12px;">US BUYER PRIORITY ACCESS</span>
                            </div>
                        </div>
                        <table style="width:100%; background:white; border-collapse:collapse; border-radius:12px; overflow:hidden; box-shadow:0 10px 15px rgba(0,0,0,0.05);">
                            <thead>
                                <tr style="background:#f1f5f9; color:#475569; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px;">
                                    <th style="padding:20px;">Asset / Expiry</th>
                                    <th style="padding:20px;">Current Bid</th>
                                    <th style="padding:20px;">Market Value (FMV)</th>
                                    <th style="padding:20px; color:#2b6cb0;">Equity Spread</th>
                                    <th style="padding:20px; color:#2f855a;">HIC Success Fee</th>
                                    <th style="padding:20px; text-align:right;">Source</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </body>
            </html>
        `);
    } catch (err) { res.status(500).send("Database Error: " + err.message); }
});

app.listen(3000, () => console.log('HIC USD Dashboard Live at http://localhost:3000'));
