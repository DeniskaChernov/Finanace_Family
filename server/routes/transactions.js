import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

// GET /api/transactions
router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM transactions WHERE family_id=$1 ORDER BY date DESC, created_at DESC',
      [family_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  const { id: user_id, name: userName, family_id } = req.user;
  const { date, type, category, amount, currency = 'UZS', description = '', receipt_url = null } = req.body;
  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (id,family_id,user_id,date,type,category,amount,currency,description,receipt_url,created_by,created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id, family_id, user_id, date, type, category, amount, currency, description, receipt_url, user_id, userName]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  const { id: user_id, name: userName, family_id } = req.user;
  const { date, type, category, amount, currency, description, receipt_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE transactions SET date=$1,type=$2,category=$3,amount=$4,currency=$5,description=$6,receipt_url=$7,
       updated_by=$8,updated_by_name=$9,updated_at=NOW()
       WHERE id=$10 AND family_id=$11 RETURNING *`,
      [date, type, category, amount, currency, description, receipt_url, user_id, userName, req.params.id, family_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  const { family_id } = req.user;
  try {
    await pool.query('DELETE FROM transactions WHERE id=$1 AND family_id=$2', [req.params.id, family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
