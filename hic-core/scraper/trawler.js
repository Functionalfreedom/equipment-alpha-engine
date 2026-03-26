const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: '/Users/belgienunez/my-first-api/.env' });

puppeteer.use(StealthPlugin());
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });
const FX_RATE = 0.72;

function calculateDynamicFMV(title) {
    const name = title.toLowerCase();
    if (/Account|Privacy|Terms|Login|Policy|Sign Up/i.test(name)) return 0;
    const currentYear = 2026;
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    const assetYear = yearMatch ? parseInt(yearMatch[0]) : 2018; 
    const age = currentYear - assetYear;
    let baseValue = 25000;
    if (name.includes('944k')) baseValue = 345000;
    else if (name.includes('470g')) baseValue = 185000;
    else if (name.includes('315')) baseValue = 125000;
    else if (name.includes('excavator') && !name.includes('mini')) baseValue = 85000;
    else if (name.includes('wheel loader')) baseValue = 85000;
    else if (name.includes('skid steer')) baseValue = 42000;
    else if (name.includes('mini excavator')) baseValue = 22000;
    else if (name.includes('shipping container')) return name.includes('40') ? 5500 : 3500;
    let adjustedFMV = baseValue * Math.pow(0.94, age); 
    if (name.includes('cat') || name.includes('caterpillar')) adjustedFMV *= 1.15;
    if (name.includes('john deere')) adjustedFMV *= 1.10;
    if (name.includes('hitachi') && age > 15) adjustedFMV *= 0.80;
    return Math.round(adjustedFMV);
}

async function runTrawler() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto('https://mcdougallauction.com/products.php?category=Construction+Equipment', { waitUntil: 'networkidle2' });
        for(let i=0; i<15; i++) { await page.evaluate(() => window.scrollBy(0, 2000)); await new Promise(r => setTimeout(r, 800)); }
        const assets = await page.evaluate(() => {
            const results = [];
            const links = Array.from(document.querySelectorAll('a[href*="arg="], a[href*="products-full-view"]'));
            links.forEach(link => {
                let container = link.parentElement;
                for (let i = 0; i < 12; i++) {
                    if (container && (container.innerText.includes('Lot:') || container.innerText.includes('Closes:'))) break;
                    container = container ? container.parentElement : null;
                }
                const text = container ? container.innerText : "";
                let bidValue = "0";
                const explicitBid = text.match(/Current Bid\s*:\s*\$([\d,]+)/i);
                if (explicitBid) bidValue = explicitBid[1].replace(/,/g, '');
                const lotMatch = text.match(/Lot\s*#?\s*(\d+)/i);
                const lotNumber = lotMatch ? lotMatch[1] : Math.random().toString(36).substring(7);
                const locMatch = text.match(/\b(SK|AB|MB|ON|BC)\b/);
                const expiryMatch = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s[A-Z][a-z]{2}\.?\s\d{1,2}/);
                if (bidValue !== "0" && link.innerText.trim().length > 10) {
                    results.push({ title: link.innerText.trim(), url: link.href, bid: bidValue, lot: lotNumber, province: locMatch ? locMatch[0].toUpperCase() : "SK", expiry: expiryMatch ? expiryMatch[0] : "Check Site" });
                }
            });
            return results;
        });
        await pool.query("TRUNCATE live_purview CASCADE;");
        for (let a of assets) {
            const uid = 'HIC-' + crypto.createHash('md5').update(a.url + a.lot).digest('hex').substring(0, 8).toUpperCase();
            const bid_usd = parseFloat(a.bid) * FX_RATE;
            const fmv = calculateDynamicFMV(a.title);
            if (fmv === 0) continue;
            const spread = fmv - bid_usd;
            let fee = Math.round(spread * 0.08);
            if (fee < 500) continue; 
            await pool.query(`
                INSERT INTO live_purview (uid, unit_name, current_bid, market_value, spread_value, hic_fee, item_url, province, expiry_date, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            `, [uid, a.title, bid_usd, fmv, spread, fee, a.url, a.province, a.expiry]);
        }
        console.log(`[SUCCESS] Purview Synced.`);
    } finally { await pool.end(); await browser.close(); process.exit(); }
}
runTrawler();
