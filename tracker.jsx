const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({ database: 'taskdb' });

async function trackBitcoin() {
  try {
    // Using Coinbase API instead (more reliable)
    const response = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    
    // Coinbase returns data as { data: { amount: "65000.00" } }
    const price = parseFloat(response.data.data.amount);

    await pool.query(
      'INSERT INTO prices (symbol, price) VALUES ($1, $2)',
      ['BTC', price]
    );

    console.log(`[${new Date().toLocaleTimeString()}] Saved BTC Price: $${price.toFixed(2)}`);
  } catch (err) {
    console.error("Connection Error:", err.message);
  }
}

setInterval(trackBitcoin, 10000);
trackBitcoin();
