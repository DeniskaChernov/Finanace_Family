import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'family-budget-secret-2024';

export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Токен недействителен' });
  }
  req.user = payload;
  // Самоисцеление: старый токен мог быть без family_id (баг NULL) —
  // берём актуальный family_id из БД, чтобы данные не «терялись».
  if (!req.user.family_id && req.user.id) {
    try {
      const { rows } = await pool.query('SELECT family_id FROM users WHERE id=$1', [req.user.id]);
      if (rows[0]?.family_id) req.user.family_id = rows[0].family_id;
    } catch { /* ignore */ }
  }
  next();
}
