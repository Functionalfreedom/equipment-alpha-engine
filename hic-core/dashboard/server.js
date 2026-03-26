const express = require('express');
const { Pool } = require('pg');
const app = express();
const pool = new Pool({ user: 'belgienunez', host: 'localhost', database: 'postgres', port: 5432 });

app.use(express.static(__dirname));
app.get('/api/assets', async (req, res) => {
    try {
        const result = await pool.query('SELECT uid, province, unit_name, current_bid, market_value, hic_fee, item_url, category, updated_at FROM live_purview ORDER BY hic_fee DESC');
        const latestUpdate = await pool.query('SELECT MAX(updated_at) as last_sync FROM live_purview');
        res.json({
            assets: result.rows,
            lastSync: latestUpdate.rows[0].last_sync || new Date()
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.listen(3000, () => console.log('HIC Dashboard Live: http://localhost:3000'));
