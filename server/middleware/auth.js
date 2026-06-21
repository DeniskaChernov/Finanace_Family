import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'family-budget-secret-2024';

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}
