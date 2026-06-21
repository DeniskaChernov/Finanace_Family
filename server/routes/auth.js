import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

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
    res.json({ id: u.id, name: u.name, phone: u.phone, family_id: u.family_id, role: u.role, avatar: u.avatar, color: u.color, created_at: u.created_at });
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
});

// GET /api/auth/family-members
router.get('/family-members', async (req, res) => {
  const fid = req.user?.family_id;
  if (!fid) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const { rows } = await pool.query('SELECT id,name,phone,family_id,role,avatar,color,created_at FROM users WHERE family_id=$1', [fid]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
