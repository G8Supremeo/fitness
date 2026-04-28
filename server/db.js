import postgres from 'postgres'
import dotenv from 'dotenv'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.warn("DATABASE_URL environment variable is missing! Ensure it is set in production or Vercel.")
}

// Supabase requires SSL, so we set ssl: 'require'
const sql = postgres(DATABASE_URL || 'postgres://placeholder', { 
  ssl: 'require',
  max: 10 // Max connections for serverless
})

async function initializeDB() {
  if (!DATABASE_URL) return; // Prevent crashing during local build tests without URL

  try {
    await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#6366f1',
      recovery_phrase TEXT DEFAULT '',
      age INTEGER,
      weight_kg REAL,
      height_cm REAL,
      gender TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

    await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

    await sql`
    CREATE TABLE IF NOT EXISTS sync_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_name TEXT NOT NULL,
      device_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      records_synced INTEGER DEFAULT 0,
      details TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

    await sql`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

    await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period TEXT NOT NULL CHECK(period IN ('weekly', 'monthly')),
      target INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

    await sql`
    CREATE TABLE IF NOT EXISTS device_connections (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'connected',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, provider)
    );`
    
    console.log("Supabase Postgres DB initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize database schema:", err);
  }
}

// Initialize tables on startup
initializeDB();

export default sql;
