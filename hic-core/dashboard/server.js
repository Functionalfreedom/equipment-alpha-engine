const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

const pool = new Pool({ 
    database: 'postgres',
    host: 'localhost',
    port: 5432
});

app.use(express.static(path.join(__dirname)));

app.get('/api/assets', async (req, res) => {
    try {
        // Force the query to pull EVERYTHING from the table
        const result = await pool.query("SELECT *, expiry_date AS time_on_market FROM live_purview ORDER BY hic_fee DESC");
        const lastSync = result.rows.length > 0 ? result.rows[0].updated_at : new Date();
        res.json({ assets: result.rows, lastSync });
    } catch (err) {
        console.error('DB Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => console.log('Hierarchy Sovereign Dashboard Online'));
