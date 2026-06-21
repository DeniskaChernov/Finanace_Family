import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/:entityId', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM comments WHERE entity_id=$1 AND family_id=$2 ORDER BY created_at ASC',
      [req.params.entityId, family_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { family_id, name: userName } = req.user;
  const { entity_id, body } = req.body;
  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      'INSERT INTO comments (id,family_id,entity_type,entity_id,user_name,body) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, family_id, 'transaction', entity_id, userName, body]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
