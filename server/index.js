import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import db from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4100
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret'

app.use(cors({ origin: (origin, cb) => cb(null, true) }))
app.use(express.json({ limit: '2mb' }))

app.get('/', (_req, res) => {
  res.status(200).send('Suprimify Fitness API is running.')
})

// ── Auth Middleware ──
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.userId
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

const userPublic = (user) => ({ id: user.id, name: user.name, email: user.email })
const makeToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })

const LOG_COLUMNS = 'id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate'

// ── Health Check ──
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ── Auth Routes ──
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Invalid email address' })
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'An account with this email already exists' })
  const hash = bcrypt.hashSync(password, 10)
  const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash)
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(result.lastInsertRowid)
  return res.json({ token: makeToken(user.id), user: userPublic(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  return res.json({ token: makeToken(user.id), user: userPublic(user) })
})

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.userId)
  return res.json({ user })
})

// ── Logs Routes ──
app.get('/api/logs', auth, (req, res) => {
  const logs = db
    .prepare(`SELECT ${LOG_COLUMNS} FROM logs WHERE user_id = ? ORDER BY date DESC, id DESC`)
    .all(req.userId)
  return res.json({ logs })
})

app.post('/api/logs', auth, (req, res) => {
  const {
    type, category = 'general', duration = 0, calories = 0, notes = '', date,
    source = 'Manual', distance = 0, pace = '', sets = 0, reps = 0,
    weight_kg = 0, sleep_hours = 0, water_ml = 0, mood = 0, heart_rate = 0,
  } = req.body
  if (!type || !date) return res.status(400).json({ error: 'Type and date are required' })
  const result = db.prepare(
    `INSERT INTO logs (user_id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.userId, type, category, Number(duration), Number(calories), notes, date, source,
    Number(distance), pace, Number(sets), Number(reps), Number(weight_kg),
    Number(sleep_hours), Number(water_ml), Number(mood), Number(heart_rate))
  const log = db.prepare(`SELECT ${LOG_COLUMNS} FROM logs WHERE id = ?`).get(result.lastInsertRowid)
  return res.status(201).json({ log })
})

app.delete('/api/logs/:id', auth, (req, res) => {
  const log = db.prepare('SELECT id FROM logs WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!log) return res.status(404).json({ error: 'Log not found' })
  db.prepare('DELETE FROM logs WHERE id = ?').run(req.params.id)
  return res.json({ deleted: true })
})

app.post('/api/logs/import', auth, (req, res) => {
  const { logs = [] } = req.body
  if (!Array.isArray(logs)) return res.status(400).json({ error: 'logs must be an array' })

  const existing = db
    .prepare('SELECT type, duration, calories, date FROM logs WHERE user_id = ?')
    .all(req.userId)
    .map((row) => `${row.type}|${row.duration}|${row.calories}|${row.date}`)
  const existingSet = new Set(existing)
  const insert = db.prepare(
    `INSERT INTO logs (user_id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  let imported = 0
  let skipped = 0
  let invalid = 0
  const tx = db.transaction(() => {
    for (const item of logs) {
      const type = item.type || item.activity
      const duration = Number(item.duration || item.minutes || 0)
      const calories = Number(item.calories || item.kcal || 0)
      const date = item.date || item.loggedAt
      if (!type || !date) {
        invalid += 1
        continue
      }
      const key = `${type}|${duration}|${calories}|${date}`
      if (existingSet.has(key)) {
        skipped += 1
        continue
      }
      insert.run(req.userId, type, item.category || 'general', duration, calories,
        item.notes || '', date, item.source || 'Smart Device',
        Number(item.distance || 0), item.pace || '', Number(item.sets || 0),
        Number(item.reps || 0), Number(item.weight_kg || 0),
        Number(item.sleep_hours || 0), Number(item.water_ml || 0),
        Number(item.mood || 0), Number(item.heart_rate || 0))
      existingSet.add(key)
      imported += 1
    }
  })
  tx()
  return res.json({ imported, skipped, invalid })
})

// Bluetooth data ingestion — accepts real workout data from the BLE connection
app.post('/api/logs/bluetooth', auth, (req, res) => {
  const { type = 'Workout', duration = 0, calories = 0, heart_rate = 0, date } = req.body
  if (!date) return res.status(400).json({ error: 'Date is required' })
  const result = db.prepare(
    `INSERT INTO logs (user_id, type, category, duration, calories, notes, date, source, heart_rate)
     VALUES (?, ?, 'general', ?, ?, 'Recorded via Bluetooth heart rate monitor', ?, 'Bluetooth', ?)`
  ).run(req.userId, type, Number(duration), Number(calories), date, Number(heart_rate))
  const log = db.prepare(`SELECT ${LOG_COLUMNS} FROM logs WHERE id = ?`).get(result.lastInsertRowid)
  return res.status(201).json({ log })
})

// ── Goals Routes ──
app.get('/api/goals', auth, (req, res) => {
  const goals = db.prepare('SELECT id, period, target FROM goals WHERE user_id = ? ORDER BY id DESC').all(req.userId)
  return res.json({ goals })
})

app.post('/api/goals', auth, (req, res) => {
  const { period, target } = req.body
  if (!['weekly', 'monthly'].includes(period)) return res.status(400).json({ error: 'Period must be weekly or monthly' })
  if (!target || target < 1) return res.status(400).json({ error: 'Target must be at least 1' })
  const result = db.prepare('INSERT INTO goals (user_id, period, target) VALUES (?, ?, ?)').run(req.userId, period, Number(target))
  const goal = db.prepare('SELECT id, period, target FROM goals WHERE id = ?').get(result.lastInsertRowid)
  return res.status(201).json({ goal })
})

app.delete('/api/goals/:id', auth, (req, res) => {
  const goal = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!goal) return res.status(404).json({ error: 'Goal not found' })
  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id)
  return res.json({ deleted: true })
})

// ── Stats Route ──
app.get('/api/stats', auth, (req, res) => {
  const totalWorkouts = db.prepare('SELECT COUNT(*) AS count FROM logs WHERE user_id = ?').get(req.userId).count
  const totalCalories = db.prepare('SELECT COALESCE(SUM(calories), 0) AS total FROM logs WHERE user_id = ?').get(req.userId).total
  const totalDuration = db.prepare('SELECT COALESCE(SUM(duration), 0) AS total FROM logs WHERE user_id = ?').get(req.userId).total
  return res.json({ totalWorkouts, totalCalories, totalDuration })
})

// ── Device Connections (kept for legacy support) ──
app.get('/api/device-connections', auth, (req, res) => {
  const connections = db
    .prepare('SELECT id, provider, status, created_at AS createdAt FROM device_connections WHERE user_id = ? ORDER BY id DESC')
    .all(req.userId)
  res.json({ connections })
})

app.post('/api/device-connections', auth, (req, res) => {
  const { provider } = req.body
  if (!provider) return res.status(400).json({ error: 'Provider is required' })
  db.prepare('INSERT OR IGNORE INTO device_connections (user_id, provider) VALUES (?, ?)').run(req.userId, provider)
  const connection = db
    .prepare('SELECT id, provider, status, created_at AS createdAt FROM device_connections WHERE user_id = ? AND provider = ?')
    .get(req.userId, provider)
  res.status(201).json({ connection })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fitness API running on http://localhost:${PORT}`)
})
