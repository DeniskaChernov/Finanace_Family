import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { genPublicId, genUserId, genFamilyId } from '../util/id.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'family-budget-secret-2024';

const signToken = (u) => jwt.sign(
  { id: u.id, name: u.name, family_id: u.family_id, role: u.role },
  JWT_SECRET, { expiresIn: '30d' }
);
const publicUser = (u) => ({
  id: u.id, public_id: u.public_id, name: u.name, phone: u.phone,
  family_id: u.family_id, role: u.role, avatar: u.avatar, color: u.color, created_at: u.created_at,
});

// Личные категории по умолчанию для нового аккаунта
const DEFAULT_CATS = [
  ['Зарплата', 'income'], ['Подработка', 'income'], ['Прочее', 'income'],
  ['Продукты', 'expense'], ['Кафе и рестораны', 'expense'], ['Транспорт', 'expense'],
  ['Коммунальные', 'expense'], ['Одежда', 'expense'], ['Здоровье', 'expense'],
  ['Развлечения', 'expense'], ['Прочее', 'expense'],
];

// POST /api/auth/register — новый аккаунт по ID + PIN (бутстрап своего пространства)
router.post('/register', async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Укажите имя' });
  if (!pin || String(pin).length < 4) return res.status(400).json({ error: 'PIN минимум 4 символа' });
  const client = await pool.connect();
  try {
    const userId = genUserId();
    const familyId = genFamilyId();
    const hash = await bcrypt.hash(String(pin), 10);
    // уникальный public_id с парой попыток
    let publicId = genPublicId();
    for (let i = 0; i < 5; i++) {
      const { rows } = await client.query('SELECT 1 FROM users WHERE public_id=$1', [publicId]);
      if (!rows.length) break;
      publicId = genPublicId();
    }
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO families (id, family_name, created_by, invite_code) VALUES ($1,$2,$3,$4)',
      [familyId, `Аккаунт ${name.trim()}`, userId, publicId]
    );
    const { rows: urows } = await client.query(
      `INSERT INTO users (id, public_id, name, password_hash, family_id, role, avatar, color)
       VALUES ($1,$2,$3,$4,$5,'owner',$6,'bg-indigo-500') RETURNING *`,
      [userId, publicId, name.trim(), hash, familyId, name.trim()[0].toUpperCase()]
    );
    await client.query(
      `INSERT INTO settings (id, family_id, usd_rate, quick_actions) VALUES ($1,$2,12700,'Продукты,Такси,Кафе,Интернет')`,
      [`set-${familyId}`, familyId]
    );
    await client.query(
      `INSERT INTO spaces (id, family_id, name, type, icon, color) VALUES ($1,$2,'Личное','family','🏠','#6366f1')`,
      [familyId, familyId]
    );
    for (const [cname, ctype] of DEFAULT_CATS) {
      await client.query(
        'INSERT INTO categories (id,family_id,name,type,is_default) VALUES ($1,$2,$3,$4,true)',
        [genUserId().replace('usr-', 'cat-'), familyId, cname, ctype]
      );
    }
    await client.query('COMMIT');
    const u = urows[0];
    res.status(201).json({ token: signToken(u), user: publicUser(u) });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('register', e);
    res.status(500).json({ error: 'Не удалось создать аккаунт' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login-id — вход по public_id + PIN
router.post('/login-id', async (req, res) => {
  const { public_id, pin } = req.body;
  if (!public_id || !pin) return res.status(400).json({ error: 'Укажите ID и PIN' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE UPPER(public_id)=UPPER($1)', [public_id]);
    if (!rows.length) return res.status(401).json({ error: 'ID не найден' });
    const user = rows[0];
    const ok = await bcrypt.compare(String(pin), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный PIN' });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

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
