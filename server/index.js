import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { migrate } from './migrate.js';
import { authMiddleware } from './middleware/auth.js';

import authRouter from './routes/auth.js';
import transactionsRouter from './routes/transactions.js';
import categoriesRouter from './routes/categories.js';
import goalsRouter from './routes/goals.js';
import budgetsRouter from './routes/budgets.js';
import recurringRouter from './routes/recurring.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';
import commentsRouter from './routes/comments.js';
import pushRouter from './routes/push.js';
import plannedRouter from './routes/planned.js';
import spacesRouter from './routes/spaces.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check (no auth)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Диагностика БД (no auth) — видно прямо в приложении, постоянна ли база
app.get('/api/diag', async (req, res) => {
  const info = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    host: null,
    transactions: null,
    goals: null,
    error: null,
  };
  try {
    if (process.env.DATABASE_URL) {
      info.host = new URL(process.env.DATABASE_URL).hostname;
    }
    const { default: pool } = await import('./db.js');
    const t = await pool.query('SELECT COUNT(*)::int AS n FROM transactions');
    const g = await pool.query('SELECT COUNT(*)::int AS n FROM goals');
    info.transactions = t.rows[0].n;
    info.goals = g.rows[0].n;
  } catch (e) {
    info.error = e.message;
  }
  res.json(info);
});

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/transactions', authMiddleware, transactionsRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/goals', authMiddleware, goalsRouter);
app.use('/api/budgets', authMiddleware, budgetsRouter);
app.use('/api/recurring', authMiddleware, recurringRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/comments', authMiddleware, commentsRouter);
app.use('/api/push', authMiddleware, pushRouter);
app.use('/api/planned', authMiddleware, plannedRouter);
app.use('/api/spaces', authMiddleware, spacesRouter);

// Serve React app in production
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(join(distPath, 'index.html'));
});

// Start
async function start() {
  try {
    await migrate();
    // Диагностика постоянства данных: сколько записей уже в БД на старте
    try {
      const { default: pool } = await import('./db.js');
      const t = await pool.query('SELECT COUNT(*)::int AS n FROM transactions');
      const g = await pool.query('SELECT COUNT(*)::int AS n FROM goals');
      console.log(`📊 В базе на старте: транзакций=${t.rows[0].n}, целей=${g.rows[0].n}`);
      console.log(t.rows[0].n > 0
        ? '✅ Данные на месте — БД постоянная.'
        : 'ℹ️  Транзакций нет (новая БД или данные ещё не добавлялись).');
    } catch (e) { console.error('Диагностика БД не удалась:', e.message); }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (e) {
    console.error('Failed to start:', e);
    process.exit(1);
  }
}

start();
