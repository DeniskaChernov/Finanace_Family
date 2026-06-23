import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool, types } = pg;

// КРИТИЧНО: pg возвращает NUMERIC как строку ("5000"), из-за чего на клиенте
// сумма + "5000" склеивалась в строку → неверные итоги. Парсим NUMERIC (OID 1700)
// и int8 (OID 20) в число, чтобы все расчёты были корректными.
types.setTypeParser(1700, v => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, v => (v === null ? null : parseInt(v, 10)));

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
