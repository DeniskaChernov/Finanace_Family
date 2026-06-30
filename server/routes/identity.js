import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

const router = Router();

// Секрет для кросс-приложенческих токенов (общий между приложениями проекта).
// Фоллбэк на JWT_SECRET, чтобы работало до настройки переменной.
const CROSS_APP_SECRET = process.env.CROSS_APP_SECRET || process.env.JWT_SECRET || 'family-budget-secret-2024';
const SERVICE_KEY = process.env.SERVICE_KEY || '';

// Проверка сервисного ключа (доступ только доверенным приложениям)
function requireServiceKey(req, res, next) {
  if (!SERVICE_KEY) {
    // ключ не задан — пропускаем, но предупреждаем (настройте SERVICE_KEY в проде!)
    return next();
  }
  if (req.headers['x-service-key'] !== SERVICE_KEY) {
    return res.status(401).json({ error: 'Неверный сервисный ключ' });
  }
  next();
}

// GET /api/identity/:publicId — проверка «Finance ID» и базовый профиль
router.get('/:publicId', requireServiceKey, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT public_id, name FROM users WHERE public_id=$1',
      [req.params.publicId]
    );
    if (!rows.length) return res.json({ exists: false });
    res.json({ exists: true, public_id: rows[0].public_id, name: rows[0].name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/identity/verify — { public_id, pin } → подтверждение + кросс-токен
router.post('/verify', requireServiceKey, async (req, res) => {
  const { public_id, pin } = req.body;
  try {
    const { rows } = await pool.query('SELECT id, public_id, name, password_hash FROM users WHERE public_id=$1', [public_id]);
    if (!rows.length) return res.status(404).json({ valid: false, error: 'ID не найден' });
    const ok = await bcrypt.compare(pin || '', rows[0].password_hash);
    if (!ok) return res.status(401).json({ valid: false, error: 'Неверный PIN' });
    const token = jwt.sign(
      { sub: rows[0].public_id, name: rows[0].name, iss: 'finance' },
      CROSS_APP_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ valid: true, public_id: rows[0].public_id, name: rows[0].name, token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
