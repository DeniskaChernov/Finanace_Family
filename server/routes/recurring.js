import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query('SELECT * FROM recurring_payments WHERE family_id=$1 ORDER BY next_date ASC', [family_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { family_id, name: userName } = req.user;
  const { name, category, amount, frequency, next_date } = req.body;
  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      `INSERT INTO recurring_payments (id,family_id,name,category,amount,frequency,next_date,active,created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) RETURNING *`,
      [id, family_id, name, category, amount, frequency, next_date, userName]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const { family_id } = req.user;
  try {
    await pool.query('DELETE FROM recurring_payments WHERE id=$1 AND family_id=$2', [req.params.id, family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/recurring/:id/mark-paid
router.post('/:id/mark-paid', async (req, res) => {
  const { family_id } = req.user;
  const { next_date } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE recurring_payments SET next_date=$1 WHERE id=$2 AND family_id=$3 RETURNING *',
      [next_date, req.params.id, family_id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
