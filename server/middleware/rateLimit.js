// Простой in-memory rate limiter (без внешних зависимостей).
// Защита от перебора пароля/PIN на чувствительных эндпоинтах.
const buckets = new Map();

export function rateLimit({ windowMs = 60000, max = 10, key = 'rl' } = {}) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`;
    const now = Date.now();
    let b = buckets.get(id);
    if (!b || now > b.reset) { b = { count: 0, reset: now + windowMs }; buckets.set(id, b); }
    b.count++;
    if (b.count > max) {
      const retry = Math.ceil((b.reset - now) / 1000);
      res.set('Retry-After', String(retry));
      return res.status(429).json({ error: `Слишком много попыток. Подождите ${retry} с.` });
    }
    next();
  };
}

// Периодическая очистка устаревших корзин
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}, 300000);
cleanup.unref?.();
