import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows: goals } = await pool.query('SELECT * FROM goals WHERE family_id=$1 ORDER BY created_at DESC', [family_id]);
    const { rows: allocs } = await pool.query('SELECT * FROM goal_allocations WHERE family_id=$1', [family_id]);
    const result = goals.map(g => ({
      ...g,
      allocated: allocs.filter(a => a.goal_id === g.id).reduce((s, a) => s + Number(a.amount), 0),
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { family_id, name: userName } = req.user;
  const { name, target_amount, target_currency = 'UZS', deadline, note, priority = 'medium' } = req.body;
  const id = randomUUID();
  const allocId = randomUUID();
  try {
    const { rows } = await pool.query(
      `INSERT INTO goals (id,family_id,name,target_amount,target_currency,deadline,note,priority,created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, family_id, name, target_amount, target_currency, deadline || null, note || null, priority, userName]
    );
    await pool.query(
      'INSERT INTO goal_allocations (id,goal_id,family_id,amount) VALUES ($1,$2,$3,0)',
      [allocId, id, family_id]
    );
    res.status(201).json({ ...rows[0], allocated: 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { family_id } = req.user;
  const { name, target_amount, target_currency = 'UZS', deadline, note, priority = 'medium' } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE goals SET name=$1,target_amount=$2,target_currency=$3,deadline=$4,note=$5,priority=$6
       WHERE id=$7 AND family_id=$8 RETURNING *`,
      [name, target_amount, target_currency, deadline || null, note || null, priority, req.params.id, family_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    const { rows: allocs } = await pool.query('SELECT amount FROM goal_allocations WHERE goal_id=$1', [req.params.id]);
    const allocated = allocs.reduce((s, a) => s + Number(a.amount), 0);
    res.json({ ...rows[0], allocated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const { family_id } = req.user;
  try {
    await pool.query('DELETE FROM goal_allocations WHERE goal_id=$1', [req.params.id]);
    await pool.query('DELETE FROM goals WHERE id=$1 AND family_id=$2', [req.params.id, family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/goals/allocations/:goalId
router.put('/allocations/:goalId', async (req, res) => {
  const { family_id } = req.user;
  const { amount } = req.body;
  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM goal_allocations WHERE goal_id=$1 AND family_id=$2',
      [req.params.goalId, family_id]
    );
    if (existing.length) {
      await pool.query('UPDATE goal_allocations SET amount=$1,updated_at=NOW() WHERE goal_id=$2 AND family_id=$3', [amount, req.params.goalId, family_id]);
    } else {
      await pool.query(
        'INSERT INTO goal_allocations (id,goal_id,family_id,amount) VALUES ($1,$2,$3,$4)',
        [randomUUID(), req.params.goalId, family_id, amount]
      );
    }
    res.json({ ok: true, amount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
