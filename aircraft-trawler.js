const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const crypto = require('crypto');
puppeteer.use(StealthPlugin());

const pool = new Pool({ database: 'postgres', host: 'localhost', port: 5432 });

async function scrapeController() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    // Broadened target to ensure results
    const url = "https://www.controller.com/listings/for-sale/canadian-aircraft/12?Country=32";

    try {
        console.log("[HIC] Accessing Controller.com...");
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        
        // Wait 5 seconds for anti-bot to settle
        await new Promise(r => setTimeout(r, 5000));

        const aircraft = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.listing-card, .result-item, [class*="ListingCard"]'));
            return cards.map(el => {
                const title = el.querySelector('.listing-name, h2, [class*="ListingName"]')?.innerText || "Aviation Asset";
                const priceText = el.querySelector('.price-value, .price, [class*="Price"]')?.innerText || "$0";
                const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
                const url = el.querySelector('a')?.href;
                return { title, price, url };
            }).filter(a => a.price > 30000 && a.url);
        });

        console.log(`[HIC] Successfully parsed ${aircraft.length} Canadian aircraft.`);

        for (let a of aircraft) {
            const uid = 'HIC-AIR-' + crypto.createHash('md5').update(a.url).digest('hex').substring(0, 5).toUpperCase();
            // 2026 Sovereign Multiplier: 1.45x for FMV spread on Canadian Piston/Turbine
            const fmv = a.price * 1.45;
            const fee = (fmv - a.price) * 0.025;

            await pool.query(`
                INSERT INTO live_purview (uid, unit_name, current_bid, market_value, spread_value, hic_fee, category, province, item_url, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'Aircraft', 'Canada', $7, NOW())
                ON CONFLICT (uid) DO UPDATE SET updated_at = NOW(), hic_fee = EXCLUDED.hic_fee;
            `, [uid, a.title, a.price, fmv, (fmv - a.price), Math.round(fee), a.url]);
        }
        console.log("[SUCCESS] Aviation fleet synced to Dashboard.");
    } catch (e) {
        console.error("[ERR] Sync Failed:", e.message);
    } finally {
        await browser.close();
        process.exit();
    }
}
scrapeController();
