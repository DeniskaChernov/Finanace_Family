import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query('SELECT * FROM budgets WHERE family_id=$1 ORDER BY month DESC', [family_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { family_id } = req.user;
  const { category, month_limit, month } = req.body;
  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      'INSERT INTO budgets (id,family_id,category,month_limit,month) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, family_id, category, month_limit, month]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { family_id } = req.user;
  const { category, month_limit, month } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE budgets SET category=$1,month_limit=$2,month=$3 WHERE id=$4 AND family_id=$5 RETURNING *',
      [category, month_limit, month, req.params.id, family_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const { family_id } = req.user;
  try {
    await pool.query('DELETE FROM budgets WHERE id=$1 AND family_id=$2', [req.params.id, family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
