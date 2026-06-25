import pool from './db.js';

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS families (
        id TEXT PRIMARY KEY,
        family_name TEXT NOT NULL,
        created_by TEXT,
        invite_code TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        family_id TEXT REFERENCES families(id),
        role TEXT DEFAULT 'member',
        avatar TEXT,
        color TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT DEFAULT 'UZS',
        description TEXT DEFAULT '',
        receipt_url TEXT,
        created_by TEXT,
        created_by_name TEXT,
        updated_by TEXT,
        updated_by_name TEXT,
        updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        name TEXT NOT NULL,
        target_amount NUMERIC NOT NULL,
        target_currency TEXT DEFAULT 'UZS',
        deadline TEXT,
        note TEXT,
        priority TEXT DEFAULT 'medium',
        created_by_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS goal_allocations (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        family_id TEXT NOT NULL,
        amount NUMERIC DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        family_id TEXT UNIQUE NOT NULL,
        usd_rate NUMERIC DEFAULT 12700,
        dark_mode BOOLEAN DEFAULT FALSE,
        quick_actions TEXT DEFAULT 'Продукты,Такси,Кафе,Интернет',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        type TEXT DEFAULT 'system',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recurring_payments (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        frequency TEXT DEFAULT 'monthly',
        next_date TEXT NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_by_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        category TEXT NOT NULL,
        month_limit NUMERIC NOT NULL,
        month TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        entity_type TEXT DEFAULT 'transaction',
        entity_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        family_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        subscription JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      );

      -- Пространства (личное / бизнесы). spaces.id — это scope, который пишется
      -- в колонку family_id всех данных. spaces.family_id — владелец-аккаунт (стабильный).
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'business',   -- personal | family | business
        icon TEXT DEFAULT '💼',
        color TEXT DEFAULT '#6366f1',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Контрагенты (клиенты/поставщики) — scoped по family_id (= пространство)
      CREATE TABLE IF NOT EXISTS contractors (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'client',   -- client | supplier | both
        phone TEXT,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Ожидаемые доходы/траты (планирование, прогноз)
      CREATE TABLE IF NOT EXISTS planned_items (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        type TEXT NOT NULL,                 -- income | expense
        title TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT DEFAULT 'UZS',
        category TEXT DEFAULT '',
        due_date TEXT NOT NULL,             -- YYYY-MM-DD
        recurrence TEXT DEFAULT 'once',     -- once | monthly
        status TEXT DEFAULT 'planned',      -- planned | done
        note TEXT,
        created_by_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Связь с контрагентами (добавляется к существующим таблицам)
    await client.query(`ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS contractor_id TEXT;`);
    await client.query(`ALTER TABLE planned_items ADD COLUMN IF NOT EXISTS contractor_id TEXT;`);
    console.log('✅ Database migrated');

    // ── Идемпотентный самоисцеляющий сид (выполняется при каждом старте) ──

    // 1. Семья всегда существует
    await client.query(`
      INSERT INTO families (id, family_name, created_by, invite_code)
      VALUES ('fam-001', 'Наша семья', 'usr-001', 'FAMILY01')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Пользователи существуют
    await client.query(`
      INSERT INTO users (id, name, password_hash, family_id, role, avatar, color)
      VALUES
        ('usr-001', 'Денис', '$2a$10$4PH7DEqDO8dsKCUziayagenhssnnCmyFnTaRacGMm3ig1m3oahgG.', 'fam-001', 'owner', 'Д', 'bg-blue-500'),
        ('usr-002', 'Софья', '$2a$10$HubmM.A9gQNPnYwc9vtn/uKfNJZTJIFfQfPJ9PLfAhAUvGA0jAO46', 'fam-001', 'member', 'С', 'bg-pink-500')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. КРИТИЧНО: чиним пароли и NULL/неверный family_id у пользователей.
    //    Если family_id = NULL, то WHERE family_id=$1 в SQL возвращает пусто
    //    (NULL = NULL → ложь) — отсюда «0 категорий» и пропавшие данные.
    await client.query(`
      UPDATE users SET password_hash = '$2a$10$4PH7DEqDO8dsKCUziayagenhssnnCmyFnTaRacGMm3ig1m3oahgG.'
      WHERE id = 'usr-001' AND (password_hash IS NULL OR password_hash = '');
      UPDATE users SET password_hash = '$2a$10$HubmM.A9gQNPnYwc9vtn/uKfNJZTJIFfQfPJ9PLfAhAUvGA0jAO46'
      WHERE id = 'usr-002' AND (password_hash IS NULL OR password_hash = '');
      UPDATE users SET family_id = 'fam-001' WHERE id IN ('usr-001','usr-002');
      UPDATE users SET family_id = 'fam-001' WHERE family_id IS NULL;
    `);

    // 4. Привязываем осиротевшие данные (family_id IS NULL) к семье —
    //    чтобы уже добавленные транзакции/категории/цели снова стали видны.
    await client.query(`UPDATE transactions       SET family_id = 'fam-001' WHERE family_id IS NULL;`);
    await client.query(`UPDATE categories         SET family_id = 'fam-001' WHERE family_id IS NULL;`);
    await client.query(`UPDATE goals              SET family_id = 'fam-001' WHERE family_id IS NULL;`);
    await client.query(`UPDATE goal_allocations   SET family_id = 'fam-001' WHERE family_id IS NULL;`);
    await client.query(`UPDATE budgets            SET family_id = 'fam-001' WHERE family_id IS NULL;`);
    await client.query(`UPDATE recurring_payments SET family_id = 'fam-001' WHERE family_id IS NULL;`);

    // 5. Настройки существуют
    await client.query(`
      INSERT INTO settings (id, family_id, usd_rate, quick_actions)
      VALUES ('set-001', 'fam-001', 12700, 'Продукты,Такси,Кафе,Интернет')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 5b. Пространство по умолчанию (его id = 'fam-001' = scope существующих данных)
    await client.query(`
      INSERT INTO spaces (id, family_id, name, type, icon, color)
      VALUES ('fam-001', 'fam-001', 'Личное', 'family', '🏠', '#6366f1')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Категории по умолчанию существуют (восстанавливаются, если пропали)
    const defaultCats = [
      ['cat-i-1','fam-001','Зарплата Денис','income',true],
      ['cat-i-2','fam-001','Зарплата Софья','income',true],
      ['cat-i-3','fam-001','Подработка','income',true],
      ['cat-i-4','fam-001','Прочее','income',true],
      ['cat-e-1','fam-001','Продукты','expense',true],
      ['cat-e-2','fam-001','Кафе и рестораны','expense',true],
      ['cat-e-3','fam-001','Транспорт','expense',true],
      ['cat-e-4','fam-001','Коммунальные','expense',true],
      ['cat-e-5','fam-001','Одежда','expense',true],
      ['cat-e-6','fam-001','Здоровье','expense',true],
      ['cat-e-7','fam-001','Развлечения','expense',true],
      ['cat-e-8','fam-001','Прочее','expense',true],
    ];
    for (const [id,fid,name,type,is_default] of defaultCats) {
      await client.query(
        'INSERT INTO categories (id,family_id,name,type,is_default) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
        [id,fid,name,type,is_default]
      );
    }
    console.log('✅ Сид проверен: семья, пользователи, категории, family_id вычищен от NULL');
  } finally {
    client.release();
  }
}
