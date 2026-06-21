import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('\n❌ DATABASE_URL не задан! Данные НЕ сохранятся между деплоями.');
  console.error('   Railway: New → Database → PostgreSQL, затем в приложении');
  console.error('   Variables → добавить переменную DATABASE_URL = ${{Postgres.DATABASE_URL}}\n');
}

// Лог хоста БД (без пароля) — видно, та ли это база между деплоями
try {
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    console.log(`🗄  БД: ${u.hostname}:${u.port || 5432}${u.pathname} (user: ${u.username})`);
  }
} catch { /* ignore */ }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
