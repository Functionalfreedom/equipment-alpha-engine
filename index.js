const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = 3000;

const pool = new Pool({
  database: 'taskdb',
  port: 5432,
});

app.use(express.json());

app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tasks', async (req, res) => {
  try {
    const { item } = req.body;
    const result = await pool.query('INSERT INTO tasks (item) VALUES ($1) RETURNING *', [item]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    res.json({ message: "Deleted", task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// UPDATE: Change the text of a task
app.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { item } = req.body;
    const result = await pool.query(
      'UPDATE tasks SET item = $1 WHERE id = $2 RETURNING *',
      [item, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`ONLINE: http://localhost:${PORT}`);
});

