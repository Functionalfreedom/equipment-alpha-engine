require('dotenv').config({ path: '../../.env' });
const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({ 
    user: 'belgienunez', 
    host: 'localhost', 
    database: 'postgres', 
    port: 5432 
});

app.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM live_purview WHERE spread_value > 5000 ORDER BY spread_value DESC");
        
        let rows = result.rows.map(i => {
            const today = new Date();
            // Appending 2026 to ensure the Date object parses correctly
            const expiryDate = new Date(i.expiry_date + ", 2026"); 
            const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            const urgencyColor = diffDays <= 3 ? '#e74c3c' : '#2c3e50';

            return `
            <tr style="border-bottom: 1px solid #eee; font-family: sans-serif;">
                <td style="padding:15px;">
                    <b style="font-size:14px; color:#1a202c;">${i.unit_name}</b><br>
                    <span style="color:${urgencyColor}; font-weight:bold; font-size:11px;">
                        ${diffDays <= 0 ? '⚠️ CLOSING SOON' : '⏳ ' + diffDays + ' DAYS LEFT'}
                    </span>
                </td>
                <td style="padding:15px; color:#4a5568;">$${Number(i.current_bid).toLocaleString()}</td>
                <td style="padding:15px; color:#27ae60; font-weight:900;">$${Number(i.market_value * 0.10).toLocaleString()}</td>
                <td style="padding:15px;">
                    <button onclick="copyPitch('${i.uid}')" style="background:#1a202c; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">
                        GENERATE PITCH
                    </button>
                </td>
            </tr>`;
        }).join('');

        const html = `
        <html>
            <body style="background:#f7fafc; padding:40px;">
                <h1 style="font-family:serif; color:#1a202c;">HIERARCHY INVESTMENT CAPITAL</h1>
                <table style="width:100%; background:white; border-collapse:collapse; border-radius:8px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                    <tr style="background:#1a202c; color:white; text-align:left;">
                        <th style="padding:15px;">ASSET</th>
                        <th style="padding:15px;">CURRENT BID</th>
                        <th style="padding:15px;">HIC FEE (EST)</th>
                        <th style="padding:15px;">ACTION</th>
                    </tr>
                    ${rows}
                </table>
                <script>
                    function copyPitch(uid) {
                        alert('Generating pitch for ' + uid + '... (Ready for Zero-Touch Outreach)');
                    }
                </script>
            </body>
        </html>`;
        
        res.send(html);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(8080, () => console.log('\x1b[36m[DASHBOARD]\x1b[0m Live at http://localhost:8080'));
