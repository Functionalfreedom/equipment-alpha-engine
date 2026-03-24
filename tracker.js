require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({ database: process.env.DB_NAME });

async function checkTriggers(currentPrice) {
    const result = await pool.query(
        'SELECT * FROM triggers WHERE target_price <= $1 AND is_fired = FALSE', 
        [currentPrice]
    );

    for (let trigger of result.rows) {
        console.log(`\x1b[42m\x1b[30m TRIGGER FIRED: ${trigger.action_note} \x1b[0m`);
        // Mark as fired so it doesn't repeat
        await pool.query('UPDATE triggers SET is_fired = TRUE WHERE id = $1', [trigger.id]);
    }
}

async function start() {
    const response = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const price = parseFloat(response.data.data.amount);
    
    console.log(`Checking market... Current: $${price}`);
    await checkTriggers(price);
}

setInterval(start, 10000);
