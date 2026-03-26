const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

puppeteer.use(StealthPlugin());
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });
const FX_RATE = 0.72;

async function runTrawler() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        console.log("[HIC] Final Precision Sync: Scrubbing Noise...");
        await page.goto('https://mcdougallauction.com/products.php?category=Construction+Equipment', { waitUntil: 'networkidle2', timeout: 60000 });
        
        for(let i=0; i<6; i++) { 
            await page.evaluate(() => window.scrollBy(0, 2500)); 
            await new Promise(r => setTimeout(r, 1500)); 
        }

        const assets = await page.evaluate(() => {
            const blacklist = ['steveletkeman', 'clay-dizzle', 'Select a category', 'Home /', 'Heavy Equipment Asset'];
            const blocks = Array.from(document.querySelectorAll('div'))
                .filter(el => el.innerText.includes('Lot:') && el.innerText.includes('$') && el.innerText.length > 60);

            return blocks.map(el => {
                const text = el.innerText;
                const lines = text.split('\n').map(l => l.trim());
                
                // Find title that isn't blacklisted and has a year or brand
                const title = lines.find(l => 
                    l.length > 12 && 
                    !blacklist.some(b => l.includes(b)) &&
                    (l.includes('20') || l.includes('19') || l.includes('John Deere') || l.includes('Bobcat'))
                );

                const bidMatch = text.match(/\$[\d,]+/);
                const expiryMatch = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s[A-Z][a-z]{2}\.?\s\d{1,2}/);
                const itemLink = el.querySelector('a[href*="item-details"]')?.href;

                return { title, bid: bidMatch ? bidMatch[0].replace(/[^0-9.]/g, '') : "0", url: itemLink, expiry: expiryMatch ? expiryMatch[0] : "Check Site" };
            }).filter(a => a.title && a.bid !== "0" && a.url);
        });

        for (let a of assets) {
            const uid = 'HIC-' + crypto.createHash('md5').update(a.url).digest('hex').substring(0, 10).toUpperCase();
            
            // Granular Underwriting (CAD)
            let fmv_cad = 25000; 
            const t = a.title.toLowerCase();
            if (t.includes('caterpillar') && t.includes('315')) fmv_cad = 135000;
            else if (t.includes('excavator') && (t.includes('agt') || t.includes('ats'))) fmv_cad = 15000; // Mini units
            else if (t.includes('excavator')) fmv_cad = 95000;
            else if (t.includes('loader') || t.includes('skid steer')) fmv_cad = 45000;
            else if (t.includes('container')) fmv_cad = 6500;

            const bid_usd = parseFloat(a.bid) * FX_RATE;
            const fmv_usd = fmv_cad * FX_RATE;
            const spread_usd = fmv_usd - bid_usd;
            const fee_usd = spread_usd * 0.08;

            await pool.query(`
                INSERT INTO live_purview (uid, unit_name, current_bid, market_value, spread_value, hic_fee, item_url, expiry_date, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (uid) DO UPDATE SET 
                    unit_name = EXCLUDED.unit_name,
                    current_bid = EXCLUDED.current_bid,
                    market_value = EXCLUDED.market_value,
                    spread_value = EXCLUDED.spread_value,
                    hic_fee = EXCLUDED.hic_fee, 
                    updated_at = NOW()
            `, [uid, a.title, bid_usd, fmv_usd, spread_usd, Math.round(fee_usd), a.url, a.expiry]);
        }
        console.log(`[SUCCESS] ${assets.length} Clean Assets Synced.`);
    } catch (e) { console.log("[ERR] " + e.message); }
    finally { await browser.close(); process.exit(); }
}
runTrawler();
