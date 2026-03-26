const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

puppeteer.use(StealthPlugin());
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

async function runTrawler() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        console.log("[HIC] 2026 LIVE SYNC: Targeting Heavy Construction Category...");
        
        // Navigate to the precise category URL
        await page.goto('https://mcdougallauction.com/products.php?category=Construction+Equipment', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // WAIT FOR HYDRATION: Instead of a selector, we wait for the "Loading..." text to disappear
        await page.waitForFunction(() => !document.body.innerText.includes('Loading . . .'), { timeout: 30000 });
        
        // Final Scroll to ensure all lazy-loaded divs are in the DOM
        await page.evaluate(async () => {
            window.scrollBy(0, 1500);
            await new Promise(r => setTimeout(r, 2000));
        });

        const assets = await page.evaluate(() => {
            // Logic: Find all blocks containing "Lot:" and "$". 
            // This is the most resilient way to scrape the 2026 McDougall layout.
            const blocks = Array.from(document.querySelectorAll('div, section, article'))
                .filter(el => el.innerText.includes('Lot:') && el.innerText.includes('$'));

            return blocks.map(el => {
                const text = el.innerText;
                const lines = text.split('\n').map(l => l.trim());
                
                // Usually the first long line is the title
                const title = lines.find(l => l.length > 10 && !l.includes(':')) || "Heavy Equipment Asset";
                const bidMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
                const lotMatch = text.match(/Lot:\s*(\d+)/);
                const expiryMatch = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s[A-Z][a-z]{2}\.?\s\d{1,2}/);
                const link = el.querySelector('a')?.href || window.location.href;

                return {
                    title: title,
                    bid: bidMatch ? bidMatch[0].replace(/[^0-9.]/g, '') : "0",
                    url: link,
                    expiry: expiryMatch ? expiryMatch[0] : "Check Site",
                    lot: lotMatch ? lotMatch[1] : "N/A"
                };
            }).filter(a => a.bid !== "0");
        });

        console.log(`[HIC] Found ${assets.length} Valid Units. Saving to Hierarchy Core...`);

        for (let a of assets) {
            const uid = 'HIC-' + crypto.createHash('md5').update(a.url + a.lot).digest('hex').substring(0, 10).toUpperCase();
            
            // Calculate 8% Fee on-the-fly for the dashboard
            let fmv = 25000; 
            if (a.title.toLowerCase().includes('excavator')) fmv = 115000;
            if (a.title.toLowerCase().includes('telehandler')) fmv = 85000;
            
            const spread = fmv - parseFloat(a.bid);
            const fee = spread * 0.08;

            await pool.query(`
                INSERT INTO live_purview (uid, unit_name, current_bid, market_value, spread_value, hic_fee, item_url, expiry_date, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (uid) DO UPDATE SET current_bid = EXCLUDED.current_bid, updated_at = NOW()
            `, [uid, a.title, parseFloat(a.bid), fmv, spread, fee, a.url, a.expiry]);
        }
        console.log(\`[SUCCESS] Deep-Sync Complete.\`);
    } catch (e) { console.log(\`[ERR] \${e.message}\`); }
    finally { await browser.close(); process.exit(); }
}
runTrawler();
