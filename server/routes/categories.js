import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query('SELECT * FROM categories WHERE family_id=$1 ORDER BY type,name', [family_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { family_id } = req.user;
  const { name, type } = req.body;
  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (id,family_id,name,type,is_default) VALUES ($1,$2,$3,$4,false) RETURNING *',
      [id, family_id, name, type]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const { family_id } = req.user;
  try {
    await pool.query('DELETE FROM categories WHERE id=$1 AND family_id=$2 AND is_default=false', [req.params.id, family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
