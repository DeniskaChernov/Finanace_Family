import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'family-budget-secret-2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'Укажите имя и пароль' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(name)=LOWER($1)', [name]);
    if (!rows.length) return res.status(401).json({ error: 'Пользователь не найден' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный пароль' });

    const token = jwt.sign(
      { id: user.id, name: user.name, family_id: user.family_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        public_id: user.public_id,
        name: user.name,
        phone: user.phone,
        family_id: user.family_id,
        role: user.role,
        avatar: user.avatar,
        color: user.color,
        created_at: user.created_at,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Нет токена' });
  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [payload.id]);
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    const u = rows[0];
    res.json({ id: u.id, public_id: u.public_id, name: u.name, phone: u.phone, family_id: u.family_id, role: u.role, avatar: u.avatar, color: u.color, created_at: u.created_at });
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 4) return res.status(400).json({ error: 'Новый пароль слишком короткий (мин. 4 символа)' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
    const ok = await bcrypt.compare(oldPassword || '', rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный текущий пароль' });
    const hash = await bcrypt.hash(String(newPassword), 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/profile — имя, телефон, цвет аватара
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, phone, color } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE($1,name), phone=$2, color=COALESCE($3,color)
       WHERE id=$4 RETURNING id,name,phone,family_id,role,avatar,color,created_at`,
      [name ?? null, phone ?? null, color ?? null, req.user.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/family-members
router.get('/family-members', authMiddleware, async (req, res) => {
  const fid = req.account; // стабильный аккаунт, не активное пространство
  if (!fid) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const { rows } = await pool.query('SELECT id,name,phone,family_id,role,avatar,color,created_at FROM users WHERE family_id=$1', [fid]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
