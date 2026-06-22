import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query('SELECT * FROM settings WHERE family_id=$1', [family_id]);
    if (rows.length) return res.json(rows[0]);
    const def = { id: randomUUID(), family_id, usd_rate: 12700, dark_mode: false, quick_actions: 'Продукты,Такси,Кафе,Интернет' };
    await pool.query(
      'INSERT INTO settings (id,family_id,usd_rate,dark_mode,quick_actions) VALUES ($1,$2,$3,$4,$5)',
      [def.id, def.family_id, def.usd_rate, def.dark_mode, def.quick_actions]
    );
    res.json(def);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/', async (req, res) => {
  const { family_id } = req.user;
  const { usd_rate, dark_mode, quick_actions } = req.body;
  try {
    // Мерж с текущими значениями — частичное обновление не затирает прочие поля
    const { rows: cur } = await pool.query('SELECT * FROM settings WHERE family_id=$1', [family_id]);
    const prev = cur[0];
    const merged = {
      id: prev?.id || randomUUID(),
      usd_rate: usd_rate ?? prev?.usd_rate ?? 12700,
      dark_mode: dark_mode ?? prev?.dark_mode ?? false,
      quick_actions: quick_actions ?? prev?.quick_actions ?? 'Продукты,Такси,Кафе,Интернет',
    };
    const { rows } = await pool.query(
      `INSERT INTO settings (id,family_id,usd_rate,dark_mode,quick_actions,updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (family_id) DO UPDATE SET
         usd_rate=EXCLUDED.usd_rate,
         dark_mode=EXCLUDED.dark_mode,
         quick_actions=EXCLUDED.quick_actions,
         updated_at=NOW()
       RETURNING *`,
      [merged.id, family_id, merged.usd_rate, merged.dark_mode, merged.quick_actions]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
