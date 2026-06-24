import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = Router();

// Сдвиг даты YYYY-MM-DD на N месяцев вперёд (локально, без UTC-сдвига)
function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// GET /api/planned
router.get('/', async (req, res) => {
  const { family_id } = req.user;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM planned_items WHERE family_id=$1 ORDER BY due_date ASC',
      [family_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/planned
router.post('/', async (req, res) => {
  const { family_id, name: userName } = req.user;
  const { type, title, amount, currency = 'UZS', category = '', due_date, recurrence = 'once', note = null, contractor_id = null } = req.body;
  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      `INSERT INTO planned_items (id,family_id,type,title,amount,currency,category,due_date,recurrence,status,note,contractor_id,created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'planned',$10,$11,$12) RETURNING *`,
      [id, family_id, type, title, amount, currency, category, due_date, recurrence, note, contractor_id, userName]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/planned/:id
router.put('/:id', async (req, res) => {
  const { family_id } = req.user;
  const { type, title, amount, currency, category, due_date, recurrence, note, contractor_id = null } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE planned_items SET type=$1,title=$2,amount=$3,currency=$4,category=$5,due_date=$6,recurrence=$7,note=$8,contractor_id=$9
       WHERE id=$10 AND family_id=$11 RETURNING *`,
      [type, title, amount, currency, category, due_date, recurrence, note || null, contractor_id, req.params.id, family_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/planned/:id
router.delete('/:id', async (req, res) => {
  const { family_id } = req.user;
  try {
    await pool.query('DELETE FROM planned_items WHERE id=$1 AND family_id=$2', [req.params.id, family_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/planned/:id/confirm — превратить план в реальную операцию
router.post('/:id/confirm', async (req, res) => {
  const { id: user_id, name: userName, family_id } = req.user;
  try {
    const { rows } = await pool.query('SELECT * FROM planned_items WHERE id=$1 AND family_id=$2', [req.params.id, family_id]);
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    const p = rows[0];

    // Создаём реальную транзакцию из плана
    const txId = randomUUID();
    const { rows: txRows } = await pool.query(
      `INSERT INTO transactions (id,family_id,user_id,date,type,category,amount,currency,description,contractor_id,created_by,created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [txId, family_id, user_id, p.due_date, p.type, p.category || 'Прочее', p.amount, p.currency, p.title, p.contractor_id, user_id, userName]
    );

    // Регулярный план — двигаем на следующий месяц; разовый — помечаем выполненным
    let planned;
    if (p.recurrence === 'monthly') {
      const { rows: up } = await pool.query(
        'UPDATE planned_items SET due_date=$1, status=\'planned\' WHERE id=$2 RETURNING *',
        [addMonths(p.due_date, 1), p.id]
      );
      planned = up[0];
    } else {
      const { rows: up } = await pool.query(
        'UPDATE planned_items SET status=\'done\' WHERE id=$1 RETURNING *',
        [p.id]
      );
      planned = up[0];
    }

    res.json({ transaction: txRows[0], planned });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
