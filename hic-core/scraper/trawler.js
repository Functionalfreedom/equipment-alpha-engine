const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const crypto = require('crypto');

puppeteer.use(StealthPlugin());
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

async function runTrawler() {
    // SWITCHED TO HEADLESS: "NEW" FOR SILENT BACKGROUND SYNC
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'] 
    });
    const page = await browser.newPage();
    
    try {
        console.log(`[HIC] ${new Date().toLocaleTimeString()} - Engaging Silent Deep-Sync...`);
        await page.goto('https://mcdougallauction.com/products.php?category=Construction+Equipment', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });
        
        // Wait for the React hydration of bid data
        await page.waitForFunction(() => document.body.innerText.includes('Bid'), { timeout: 20000 });

        // SMART CHUNK-SCROLL: Slower cadence to catch all 88+ units
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 400; 
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 800); // 800ms pause ensures 2026 server-side hydration
            });
        });

        const assets = await page.evaluate(() => {
            const results = [];
            const blocks = Array.from(document.querySelectorAll('div, section, article'))
                .filter(el => el.innerText.includes('Lot:') && el.innerText.includes('$'));

            blocks.forEach(el => {
                const text = el.innerText;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
                const title = lines[0];
                const bidMatch = text.match(/(?:Bid|Current|Opening).*?\$?([\d,]+(?:\.\d{2})?)/i);
                const expiryMatch = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s[A-Z][a-z]{2}\.?\s\d{1,2}/);
                const link = el.querySelector('a')?.href;

                // FILTER: Ignore navigation noise and breadcrumbs
                if (title && !title.includes('/') && !title.includes('CATEGORIES') && bidMatch && link) {
                    results.push({
                        title: title,
                        bid: parseFloat(bidMatch[1].replace(/,/g, '')),
                        url: link,
                        expiry: expiryMatch ? expiryMatch[0] : "Check Site"
                    });
                }
            });
            return results;
        });

        // Deduplicate URL hashes
        const unique = Array.from(new Map(assets.map(a => [a.url, a])).values());
        console.log(`[SCAN] ${unique.length} Units Found. Syncing to Hierarchy DB...`);

        for (let a of unique) {
            // Valuation Logic (HIC Conservative Estimates)
            let fmv = 25000;
            const lowerTitle = a.title.toLowerCase();
            if (lowerTitle.includes('excavator')) fmv = 135000;
            if (lowerTitle.includes('mini')) fmv = 18500;
            if (lowerTitle.includes('loader')) fmv = 165000;
            if (lowerTitle.includes('container')) fmv = 6500;

            const spread = fmv - a.bid;
            
            // Generate Traceable UID
            const uid = 'HIC-' + crypto.createHash('md5').update(a.url).digest('hex').substring(0, 10).toUpperCase();

            await pool.query(`
                INSERT INTO live_purview (uid, unit_name, current_bid, market_value, spread_value, item_url, location_tag, usd_landed, expiry_date, hic_fee)
                VALUES ($1, $2, $3, $4, $5, $6, 'SK_ON', $7, $8, $9)
                ON CONFLICT (uid) DO UPDATE SET 
                    current_bid = EXCLUDED.current_bid, 
                    expiry_date = EXCLUDED.expiry_date,
                    spread_value = EXCLUDED.market_value - EXCLUDED.current_bid`,
                [uid, a.title, Math.floor(a.bid), fmv, spread, a.url, Math.round(fmv * 0.72), a.expiry, Math.round(fmv * 0.10)]
            );
        }
        console.log(`[SUCCESS] Deep-Sync Complete. Next scan scheduled for 06:00 EST.`);
    } catch (e) { console.log(`[ERR] ${e.message}`); }
    finally { await browser.close(); process.exit(); }
}

runTrawler();
