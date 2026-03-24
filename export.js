require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const pool = new Pool({ database: process.env.DB_NAME || 'taskdb' });

async function runExport() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const baseFolder = path.join(os.homedir(), 'Desktop', 'Hierarchy_Exports');
        const dailyFolder = path.join(baseFolder, today);

        if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);
        if (!fs.existsSync(dailyFolder)) fs.mkdirSync(dailyFolder);

        // 1. DATA RETRIEVAL (Last 24 Hours)
        const allMatches = await pool.query(`
            SELECT id, asset_name, bid_price, potential_spread, status 
            FROM matches 
            WHERE match_date > NOW() - INTERVAL '24 hours' 
            ORDER BY potential_spread DESC
        `);

        // 2. REVENUE TRACKING ($100k/mo Target)
        const dailyTarget = 3333;
        const pendingDeals = allMatches.rows.filter(r => r.status === 'pending');
        const paidDeals = allMatches.rows.filter(r => r.status === 'paid');
        
        const potentialRevenue = pendingDeals.length * 2500;
        const actualRevenue = paidDeals.length * 2500;
        const totalValue = potentialRevenue + actualRevenue;
        const targetProgress = ((totalValue / dailyTarget) * 100).toFixed(1);

        // 3. DASHBOARD HTML GENERATION
        const tableRows = allMatches.rows.map(r => `
            <tr>
                <td style="padding:10px; border-bottom:1px solid #eee;">#${r.id}</td>
                <td style="padding:10px; border-bottom:1px solid #eee;">${r.asset_name}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; color:${r.status === 'paid' ? 'blue' : 'green'};">
                    ${r.status.toUpperCase()}
                </td>
                <td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold;">$${Number(r.potential_spread).toLocaleString()}</td>
            </tr>
        `).join('');

        const dashHtml = `
            <html><body style="font-family:sans-serif; padding:40px; color:#333;">
                <h1 style="border-bottom:4px solid #2c3e50; padding-bottom:10px;">HIERARCHY REVENUE REPORT: ${today}</h1>
                <div style="display:flex; gap:20px; margin:30px 0;">
                    <div style="flex:1; border:2px solid #27ae60; padding:20px; border-radius:10px; background:#f0fff4;">
                        <small>DAILY REVENUE POTENTIAL</small>
                        <h2 style="margin:5px 0; color:#27ae60;">$${totalValue.toLocaleString()}</h2>
                    </div>
                    <div style="flex:1; border:2px solid #2c3e50; padding:20px; border-radius:10px;">
                        <small>PROGRESS TO $100K/MO GOAL</small>
                        <h2 style="margin:5px 0;">${targetProgress}%</h2>
                    </div>
                </div>
                <h3>Active Deals (Last 24 Hours)</h3>
                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    <tr style="background:#f4f4f4;"><th style="padding:10px;">ID</th><th style="padding:10px;">Asset</th><th style="padding:10px;">Status</th><th style="padding:10px;">Spread</th></tr>
                    ${tableRows || '<tr><td colspan="4">Searching for Whales...</td></tr>'}
                </table>
            </body></html>`;

        // 4. GENERATE PAID INVOICES (For Deals marked 'paid')
        paidDeals.forEach(deal => {
            const invoiceHtml = `
                <html><body style="font-family:sans-serif; padding:60px;">
                    <div style="text-align:right;"><h1>PAID INVOICE</h1><p>#INV-${deal.id}</p></div>
                    <h2>HIERARCHY INVESTMENT CAPITAL</h2>
                    <hr>
                    <p><strong>DATE:</strong> ${today}</p>
                    <p><strong>ASSET:</strong> ${deal.asset_name}</p>
                    <p><strong>FEE:</strong> $2,500.00 CAD</p>
                    <div style="padding:20px; background:#e6fffa; border:2px solid #38b2ac; text-align:center;">
                        <h2 style="margin:0; color:#2c7a7b;">STATUS: PAID IN FULL</h2>
                    </div>
                </body></html>`;
            fs.writeFileSync(path.join(dailyFolder, `FINAL_INVOICE_DEAL_${deal.id}.html`), invoiceHtml);
        });

        // 5. WRITE DAILY DASHBOARD
        fs.writeFileSync(path.join(dailyFolder, `Dashboard.html`), dashHtml);

        console.log(`\x1b[42m\x1b[30m SUCCESS \x1b[0m Pipeline: $${totalValue.toLocaleString()} | Progress: ${targetProgress}%`);
    } catch (err) {
        console.error("Export Error:", err.message);
    } finally {
        pool.end();
    }
}

runExport();
