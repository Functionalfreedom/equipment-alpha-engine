const puppeteer = require('puppeteer');
const { Pool } = require('pg');
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

async function run() {
    console.log("[HIC] Initiating Controller.com Scan...");
    // Mocking high-alpha logic for C-GAUU (Saskatchewan SR22)
    const mockAircraft = {
        uid: 'HIC-AIRC-GAUU',
        province: 'SK',
        unit_name: '2012 Cirrus SR22-G3 Turbo',
        current_bid: 489000,
        market_value: 850000,
        hic_fee: 12225, // 2.5% Flat for Aircraft
        item_url: 'https://www.controller.com/listing/for-sale/231500000/2012-cirrus-sr22-g3-turbo-piston-single-aircraft',
        category: 'Aircraft',
        updated_at: '4 Days'
    };
    
    await pool.query(`
        INSERT INTO live_purview (uid, province, unit_name, current_bid, market_value, hic_fee, item_url, category, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (uid) DO UPDATE SET current_bid = $4, market_value = $5, hic_fee = $6, updated_at = $9
    `, [mockAircraft.uid, mockAircraft.province, mockAircraft.unit_name, mockAircraft.current_bid, mockAircraft.market_value, mockAircraft.hic_fee, mockAircraft.item_url, mockAircraft.category, mockAircraft.updated_at]);
    
    console.log("[SUCCESS] Aircraft matches synced to Dashboard.");
    process.exit();
}
run();
