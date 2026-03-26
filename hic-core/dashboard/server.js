const express = require('express');
const { Pool } = require('pg');
const app = express();
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

app.use(express.static(__dirname));

app.get('/api/assets', async (req, res) => {
    try {
        const result = await pool.query('SELECT uid, province, unit_name, current_bid, market_value, hic_fee, item_url, expiry_date FROM live_purview ORDER BY hic_fee DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3000, () => console.log('HIC Dashboard Live: http://localhost:3000'));
