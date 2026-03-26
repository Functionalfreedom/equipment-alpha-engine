const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

puppeteer.use(StealthPlugin());
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

const FX_RATE = 0.72; // Updated to 2026 Spot Rate (CAD to USD)

async function runTrawler() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        console.log("[HIC] 0.72 USD-ALPHA SYNC: Scanning Deep Construction Category...");
        await page.goto('https://mcdougallauction.com/products.php?category=Construction+Equipment', { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Deep Scroll to capture 80+ items
        for(let i=0; i<6; i++) { 
            await page.evaluate(() => window.scrollBy(0, 2500)); 
            await new Promise(r => setTimeout(r, 1500)); 
        }

        const assets = await page.evaluate(() => {
            const blocks = Array.from(document.querySelectorAll('div, section, article')).filter(el => el.innerText.includes('Lot:') && el.innerText.includes('$'));
            return blocks.map(el => {
                const text = el.innerText;
                const title = text.split('\n').find(l => l.length > 12 && !l.includes(':')) || "Industrial Asset";
                const bidMatch = text.match(/\$[\d,]+/);
                const expiryMatch = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s[A-Z][a-z]{2}\.?\s\d{1,2}/);
                return { title, bid: bidMatch ? bidMatch[0].replace(/[^0-9.]/g, '') : "0", url: el.querySelector('a')?.href || window.location.href, expiry: expiryMatch ? expiryMatch[0] : "Check Site" };
            }).filter(a => a.bid !== "0");
        });

        console.log(`[HIC] Converting ${assets.length} Units to USD...`);

        for (let a of assets) {
            const uid = 'HIC-' + crypto.createHash('md5').update(a.url).digest('hex').substring(0, 10).toUpperCase();
            
            // Standardizing FMV in CAD first
            let fmv_cad = 35000; 
            if (a.title.toLowerCase().includes('excavator')) fmv_cad = 135000;
            if (a.title.toLowerCase().includes('telehandler')) fmv_cad = 95000;
            if (a.title.toLowerCase().includes('loader')) fmv_cad = 105000;

            const bid_usd = parseFloat(a.bid) * FX_RATE;
            const fmv_usd = fmv_cad * FX_RATE;
            const fee_usd = (fmv_usd - bid_usd) * 0.08;

            await pool.query(`
                INSERT INTO live_purview (uid, unit_name, current_bid, market_value, spread_value, hic_fee, item_url, expiry_date, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (uid) DO UPDATE SET 
                    current_bid = EXCLUDED.current_bid, 
                    hic_fee = EXCLUDED.hic_fee, 
                    updated_at = NOW()
            `, [uid, a.title, bid_usd, fmv_usd, (fmv_usd - bid_usd), Math.round(fee_usd), a.url, a.expiry]);
        }
        console.log(`[SUCCESS] ${assets.length} Units Synced at 0.72 FX.`);
    } catch (e) { console.log("[ERR] " + e.message); }
    finally { await browser.close(); process.exit(); }
}
runTrawler();
