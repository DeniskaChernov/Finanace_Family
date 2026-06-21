import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE family_id=$1 ORDER BY created_at DESC LIMIT 50',
      [family_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { family_id } = req.user;
  const { title, body, type = 'system' } = req.body;
  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      'INSERT INTO notifications (id,family_id,title,body,type) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, family_id, title, body, type]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/read', async (req, res) => {
  const { family_id } = req.user;
  try {
    await pool.query('UPDATE notifications SET read=true WHERE id=$1 AND family_id=$2', [req.params.id, family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/read-all', async (req, res) => {
  const { family_id } = req.user;
  try {
    await pool.query('UPDATE notifications SET read=true WHERE family_id=$1', [family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
