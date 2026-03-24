require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');

const pool = new Pool({
    database: process.env.DB_NAME || 'taskdb',
    port: process.env.DB_PORT || 5432
});

// HIGH-VALUE TARGETS: 1500 (Aircraft), 2330 (Heavy Trucks), 2400 (Tractors/Industrial)
const TARGETS = [
    { name: 'Aircraft & Marine', url: 'https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&sc=ach-shop&hpcs=1500,1900&vndsld=0' },
    { name: 'Heavy Industrial', url: 'https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&sc=ach-shop&hpcs=2330,2400&vndsld=0' },
    { name: 'BC Fleet (High Margin)', url: 'https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&sc=ach-shop&hpcs=2300&vndsld=0&hpsr=VA0' }
];

async function logMatch(demand, itemTitle, bid) {
    const spread = demand.max_budget - bid;
    try {
        await pool.query(
            `INSERT INTO matches (buyer_name, asset_name, bid_price, buyer_budget, potential_spread) 
             VALUES ($1, $2, $3, $4, $5)`,
            [demand.buyer_name, itemTitle, bid, demand.max_budget, spread]
        );
        console.log(`\n\x1b[42m\x1b[30m MATCH LOGGED: $${spread.toLocaleString()} POTENTIAL SPREAD \x1b[0m`);
        console.log(`Buyer: ${demand.buyer_name} | Asset: ${itemTitle}\n`);
    } catch (err) { console.error("Logging Error:", err.message); }
}

async function checkMatches(itemTitle, itemPriceText, category) {
    try {
        const demands = await pool.query('SELECT * FROM buyer_demands');
        const currentBid = parseFloat(itemPriceText.replace(/[$,]/g, ''));

        for (let demand of demands.rows) {
            if (itemTitle.toLowerCase().includes(demand.keywords.toLowerCase()) && currentBid <= demand.max_budget) {
                await logMatch(demand, itemTitle, currentBid);
            }
        }
    } catch (err) { console.error("Match Check Failed:", err.message); }
}

async function runInfrastructure() {
    console.log(`--- [${new Date().toLocaleTimeString()}] Hierarchy Infrastructure Active ---`);
    
    for (let target of TARGETS) {
        console.log(`Scanning ${target.name}...`);
        try {
            const { data } = await axios.get(target.url, { headers: { 'User-Agent': 'Hierarchy-Bot/2.0' } });
            const $ = cheerio.load(data);

            $('.item-info, .product-description, tr').each(async (i, el) => {
                const text = $(el).text().replace(/\s\s+/g, ' ').trim();
                const titleMatch = text.match(/^(.*?)-\d+/);
                const priceMatch = text.match(/\$([0-9,.]+)/);

                if (titleMatch && priceMatch) {
                    await checkMatches(titleMatch[1].trim(), priceMatch[0], target.name);
                }
            });
        } catch (err) { console.error(`Scan Failed (${target.name}):`, err.message); }
    }

    console.log(`Scan Complete. Next run in 15 minutes.`);
    setTimeout(runInfrastructure, 15 * 60 * 1000);
}

runInfrastructure();
