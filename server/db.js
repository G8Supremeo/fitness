import Database from 'better-sqlite3'

const db = new Database('fitness.db')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#6366f1',
  recovery_phrase TEXT DEFAULT '',
  age INTEGER,
  weight_kg REAL,
  height_cm REAL,
  gender TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  records_synced INTEGER DEFAULT 0,
  details TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  duration INTEGER NOT NULL DEFAULT 0,
  calories INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Manual',
  distance REAL DEFAULT 0,
  pace TEXT DEFAULT '',
  sets INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  weight_kg REAL DEFAULT 0,
  sleep_hours REAL DEFAULT 0,
  water_ml INTEGER DEFAULT 0,
  mood INTEGER DEFAULT 0,
  heart_rate INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  period TEXT NOT NULL CHECK(period IN ('weekly', 'monthly')),
  target INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS device_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`)

// Migrate existing databases that lack the new columns
const cols = db.prepare("PRAGMA table_info(logs)").all().map((c) => c.name)
const migrations = [
  ['category', "ALTER TABLE logs ADD COLUMN category TEXT NOT NULL DEFAULT 'general'"],
  ['distance', 'ALTER TABLE logs ADD COLUMN distance REAL DEFAULT 0'],
  ['pace', "ALTER TABLE logs ADD COLUMN pace TEXT DEFAULT ''"],
  ['sets', 'ALTER TABLE logs ADD COLUMN sets INTEGER DEFAULT 0'],
  ['reps', 'ALTER TABLE logs ADD COLUMN reps INTEGER DEFAULT 0'],
  ['weight_kg', 'ALTER TABLE logs ADD COLUMN weight_kg REAL DEFAULT 0'],
  ['sleep_hours', 'ALTER TABLE logs ADD COLUMN sleep_hours REAL DEFAULT 0'],
  ['water_ml', 'ALTER TABLE logs ADD COLUMN water_ml INTEGER DEFAULT 0'],
  ['mood', 'ALTER TABLE logs ADD COLUMN mood INTEGER DEFAULT 0'],
  ['heart_rate', 'ALTER TABLE logs ADD COLUMN heart_rate INTEGER DEFAULT 0'],
]
for (const [col, sql] of migrations) {
  if (!cols.includes(col)) {
    db.exec(sql)
  }
}

const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
const userMigrations = [
  ['avatar_color', "ALTER TABLE users ADD COLUMN avatar_color TEXT DEFAULT '#6366f1'"],
  ['recovery_phrase', "ALTER TABLE users ADD COLUMN recovery_phrase TEXT DEFAULT ''"],
  ['age', "ALTER TABLE users ADD COLUMN age INTEGER"],
  ['weight_kg', "ALTER TABLE users ADD COLUMN weight_kg REAL"],
  ['height_cm', "ALTER TABLE users ADD COLUMN height_cm REAL"],
  ['gender', "ALTER TABLE users ADD COLUMN gender TEXT"],
  ['created_at', "ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"],
]
for (const [col, sql] of userMigrations) {
  if (!userCols.includes(col)) {
    try {
      db.exec(sql)
    } catch {
      // SQLite doesn't allow adding NOT NULL DEFAULT CURRENT_TIMESTAMP to existing tables; ignore.
    }
  }
}

export default db
