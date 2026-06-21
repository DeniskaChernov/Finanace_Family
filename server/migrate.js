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
    `);
    console.log('✅ Database migrated');

    // Seed default family + users if not exists
    const { rows: families } = await client.query("SELECT id FROM families WHERE id='fam-001'");
    if (families.length === 0) {
      await client.query(`
        INSERT INTO families (id, family_name, created_by, invite_code)
        VALUES ('fam-001', 'Наша семья', 'usr-001', 'FAMILY01')
        ON CONFLICT DO NOTHING;
      `);

      // Passwords: "123Denis" and "123Sofia" - bcrypt hashed
      // We store plain for now, hash on first use
      await client.query(`
        INSERT INTO users (id, name, password_hash, family_id, role, avatar, color)
        VALUES
          ('usr-001', 'Денис', '$2b$10$YKqT2QQ1OZ9RkmYsIJa0MeKlBbWyBzKxeL9pNdJcV0lIEDQHl6Iam', 'fam-001', 'owner', 'Д', 'bg-blue-500'),
          ('usr-002', 'Софья', '$2b$10$Wz2HJpI1AQjcBNxTK4fPBeDQ3p3RPVE5qHSL2.4m8xNuI9HFWVaEi', 'fam-001', 'member', 'С', 'bg-pink-500')
        ON CONFLICT DO NOTHING;
      `);

      await client.query(`
        INSERT INTO settings (id, family_id, usd_rate, quick_actions)
        VALUES ('set-001', 'fam-001', 12700, 'Продукты,Такси,Кафе,Интернет')
        ON CONFLICT DO NOTHING;
      `);

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
          'INSERT INTO categories (id,family_id,name,type,is_default) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
          [id,fid,name,type,is_default]
        );
      }
      console.log('✅ Default data seeded');
    }
  } finally {
    client.release();
  }
}
