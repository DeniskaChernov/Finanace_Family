import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query('SELECT * FROM contractors WHERE family_id=$1 ORDER BY name ASC', [family_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { family_id } = req.user;
  const { name, type = 'client', phone = null, note = null } = req.body;
  if (!name) return res.status(400).json({ error: 'Укажите имя' });
  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      'INSERT INTO contractors (id,family_id,name,type,phone,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, family_id, name, type, phone, note]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { family_id } = req.user;
  const { name, type, phone, note } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE contractors SET name=COALESCE($1,name), type=COALESCE($2,type), phone=$3, note=$4
       WHERE id=$5 AND family_id=$6 RETURNING *`,
      [name ?? null, type ?? null, phone ?? null, note ?? null, req.params.id, family_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const { family_id } = req.user;
  try {
    // отвязываем операции/планы, затем удаляем контрагента
    await pool.query('UPDATE transactions  SET contractor_id=NULL WHERE contractor_id=$1 AND family_id=$2', [req.params.id, family_id]);
    await pool.query('UPDATE planned_items SET contractor_id=NULL WHERE contractor_id=$1 AND family_id=$2', [req.params.id, family_id]);
    await pool.query('DELETE FROM contractors WHERE id=$1 AND family_id=$2', [req.params.id, family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
