import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

// Таблицы, чьи данные scoping-ся колонкой family_id (= id пространства)
const SCOPED_TABLES = [
  'transactions', 'categories', 'goals', 'goal_allocations', 'budgets',
  'recurring_payments', 'planned_items', 'settings', 'notifications', 'comments',
];

// GET /api/spaces — все пространства аккаунта
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM spaces WHERE family_id=$1 ORDER BY created_at ASC',
      [req.account]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/spaces — создать бизнес/пространство
router.post('/', async (req, res) => {
  const { name, type = 'business', icon = '💼', color = '#6366f1', usd_rate = 12700 } = req.body;
  if (!name) return res.status(400).json({ error: 'Укажите название' });
  const id = `spc-${randomUUID().slice(0, 8)}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO spaces (id, family_id, name, type, icon, color)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, req.account, name, type, icon, color]
    );
    // Свои настройки пространства (курс) + базовые категории
    await pool.query(
      `INSERT INTO settings (id, family_id, usd_rate, quick_actions)
       VALUES ($1,$2,$3,'') ON CONFLICT (family_id) DO NOTHING`,
      [`set-${id}`, id, usd_rate]
    );
    const defaultCats = type === 'business'
      ? [['Выручка', 'income'], ['Прочий доход', 'income'], ['Закупки', 'expense'], ['Зарплаты', 'expense'], ['Аренда', 'expense'], ['Налоги', 'expense'], ['Маркетинг', 'expense'], ['Прочее', 'expense']]
      : [['Зарплата', 'income'], ['Прочее', 'income'], ['Продукты', 'expense'], ['Транспорт', 'expense'], ['Прочее', 'expense']];
    for (const [cname, ctype] of defaultCats) {
      await pool.query(
        'INSERT INTO categories (id,family_id,name,type,is_default) VALUES ($1,$2,$3,$4,true) ON CONFLICT DO NOTHING',
        [randomUUID(), id, cname, ctype]
      );
    }
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/spaces/:id — переименование / иконка / цвет
router.put('/:id', async (req, res) => {
  const { name, type, icon, color } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE spaces SET name=COALESCE($1,name), type=COALESCE($2,type), icon=COALESCE($3,icon), color=COALESCE($4,color)
       WHERE id=$5 AND family_id=$6 RETURNING *`,
      [name ?? null, type ?? null, icon ?? null, color ?? null, req.params.id, req.account]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/spaces/:id — удалить пространство и все его данные
router.delete('/:id', async (req, res) => {
  const spaceId = req.params.id;
  // Нельзя удалить дефолтное пространство (его id = аккаунт)
  if (spaceId === req.account) return res.status(400).json({ error: 'Нельзя удалить основное пространство' });
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id FROM spaces WHERE id=$1 AND family_id=$2', [spaceId, req.account]);
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    await client.query('BEGIN');
    for (const t of SCOPED_TABLES) {
      await client.query(`DELETE FROM ${t} WHERE family_id=$1`, [spaceId]);
    }
    await client.query('DELETE FROM spaces WHERE id=$1', [spaceId]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

export default router;
