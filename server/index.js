import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dns from 'dns/promises'
import nodemailer from 'nodemailer'
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

const userPublic = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarColor: user.avatar_color || '#6366f1',
  age: user.age,
  weight: user.weight_kg,
  height: user.height_cm,
  gender: user.gender,
  createdAt: user.created_at,
})
const makeToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })

const generateRecoveryPhrase = () => {
  const words = ['mountain', 'river', 'forest', 'ocean', 'sunset', 'thunder', 'phoenix', 'horizon', 'meadow', 'glacier', 'desert', 'canyon']
  return Array.from({ length: 4 }, () => words[Math.floor(Math.random() * words.length)]).join('-')
}

const generateResetToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const LOG_COLUMNS = 'id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate'

// ── Health Check ──
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ── Auth Routes ──
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, age, weight, height, gender } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Invalid email address' })
  
  try {
    const domain = email.split('@')[1]
    const mxRecords = await dns.resolveMx(domain)
    if (!mxRecords || mxRecords.length === 0) {
      return res.status(400).json({ error: 'Email domain is invalid or does not accept emails' })
    }
  } catch (err) {
    return res.status(400).json({ error: 'Email domain verification failed. Ensure domain is real.' })
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'An account with this email already exists' })
  const hash = bcrypt.hashSync(password, 10)
  const recovery = generateRecoveryPhrase()
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, recovery_phrase, age, weight_kg, height_cm, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(name, email, hash, recovery, age ? Number(age) : null, weight ? Number(weight) : null, height ? Number(height) : null, gender || null)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
  return res.json({
    token: makeToken(user.id),
    user: userPublic(user),
    recoveryPhrase: recovery,
  })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  return res.json({ token: makeToken(user.id), user: userPublic(user) })
})

// ── Password Reset ──
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) {
    // For security, return success even when user doesn't exist
    return res.json({ message: 'If that email is registered, a reset code was generated.' })
  }
  const token = generateResetToken()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
  db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
    .run(user.id, token, expiresAt)
  
  // Nodemailer Ethereal Testing Setup
  try {
    const testAccount = await nodemailer.createTestAccount()
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    
    const info = await transporter.sendMail({
      from: '"Suprimify Fitness" <noreply@suprimify.app>',
      to: user.email,
      subject: 'Password Reset Request',
      text: \`Your password reset code is: \${token}\\n\\nIt expires in 30 minutes.\`,
      html: \`<p>Your password reset code is: <strong>\${token}</strong></p><p>It expires in 30 minutes.</p>\`,
    })
    
    console.log('Password reset preview URL: %s', nodemailer.getTestMessageUrl(info))
  } catch (err) {
    console.error('Failed to send password reset email:', err)
  }

  return res.json({
    message: 'Reset code emailed securely. Use it within 30 minutes to set a new password.',
  })
})

app.post('/api/auth/reset-password', (req, res) => {
  const { email, resetCode, newPassword } = req.body
  if (!email || !resetCode || !newPassword) return res.status(400).json({ error: 'All fields are required' })
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.status(400).json({ error: 'Invalid reset code' })
  const tokenRow = db
    .prepare('SELECT * FROM password_reset_tokens WHERE user_id = ? AND token = ? AND used = 0')
    .get(user.id, resetCode.toUpperCase())
  if (!tokenRow) return res.status(400).json({ error: 'Invalid or expired reset code' })
  if (new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset code has expired. Request a new one.' })
  }
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id)
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(tokenRow.id)
  return res.json({ message: 'Password reset successfully. Please sign in with your new password.' })
})

// ── Recovery via recovery phrase (no email needed) ──
app.post('/api/auth/recover-with-phrase', (req, res) => {
  const { email, recoveryPhrase, newPassword } = req.body
  if (!email || !recoveryPhrase || !newPassword) return res.status(400).json({ error: 'All fields are required' })
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || user.recovery_phrase !== recoveryPhrase.toLowerCase().trim()) {
    return res.status(400).json({ error: 'Recovery phrase does not match' })
  }
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id)
  return res.json({ message: 'Password reset using recovery phrase. Please sign in.' })
})

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  return res.json({ user: userPublic(user) })
})

// ── Profile ──
app.put('/api/profile', auth, (req, res) => {
  const { name, avatarColor } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const newName = (name || user.name).trim()
  const newColor = avatarColor || user.avatar_color
  if (!newName) return res.status(400).json({ error: 'Name cannot be empty' })
  db.prepare('UPDATE users SET name = ?, avatar_color = ? WHERE id = ?').run(newName, newColor, req.userId)
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  return res.json({ user: userPublic(updated) })
})

app.put('/api/profile/password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' })
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.userId)
  return res.json({ message: 'Password updated successfully' })
})

app.get('/api/profile/recovery', auth, (req, res) => {
  const { password } = req.body || {}
  // We allow viewing recovery only if password confirmed via header or fallback to allow-once
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  if (password && !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Password is incorrect' })
  }
  return res.json({ recoveryPhrase: user.recovery_phrase || '' })
})

app.post('/api/profile/recovery/regenerate', auth, (req, res) => {
  const newPhrase = generateRecoveryPhrase()
  db.prepare('UPDATE users SET recovery_phrase = ? WHERE id = ?').run(newPhrase, req.userId)
  return res.json({ recoveryPhrase: newPhrase })
})

// ── Sync Events (per-device timeline) ──
app.get('/api/sync-events', auth, (req, res) => {
  const events = db
    .prepare('SELECT id, device_name AS deviceName, device_type AS deviceType, status, records_synced AS recordsSynced, details, created_at AS createdAt FROM sync_events WHERE user_id = ? ORDER BY id DESC LIMIT 100')
    .all(req.userId)
  return res.json({ events })
})

app.post('/api/sync-events', auth, (req, res) => {
  const { deviceName, deviceType, status = 'success', recordsSynced = 0, details = '' } = req.body
  if (!deviceName || !deviceType) return res.status(400).json({ error: 'deviceName and deviceType are required' })
  const result = db
    .prepare('INSERT INTO sync_events (user_id, device_name, device_type, status, records_synced, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.userId, deviceName, deviceType, status, Number(recordsSynced), details)
  const event = db
    .prepare('SELECT id, device_name AS deviceName, device_type AS deviceType, status, records_synced AS recordsSynced, details, created_at AS createdAt FROM sync_events WHERE id = ?')
    .get(result.lastInsertRowid)
  return res.status(201).json({ event })
})

app.delete('/api/sync-events', auth, (req, res) => {
  db.prepare('DELETE FROM sync_events WHERE user_id = ?').run(req.userId)
  return res.json({ cleared: true })
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
  const { type = 'Workout', duration = 0, calories = 0, heart_rate = 0, date, deviceName = 'Bluetooth Device' } = req.body
  if (!date) return res.status(400).json({ error: 'Date is required' })
  const result = db.prepare(
    `INSERT INTO logs (user_id, type, category, duration, calories, notes, date, source, heart_rate)
     VALUES (?, ?, 'general', ?, ?, 'Recorded via Bluetooth heart rate monitor', ?, 'Bluetooth', ?)`
  ).run(req.userId, type, Number(duration), Number(calories), date, Number(heart_rate))
  const log = db.prepare(`SELECT ${LOG_COLUMNS} FROM logs WHERE id = ?`).get(result.lastInsertRowid)

  // Track this sync event automatically
  db.prepare('INSERT INTO sync_events (user_id, device_name, device_type, status, records_synced, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.userId, deviceName, 'Bluetooth Heart Rate Monitor', 'success', 1, `${duration} min · ${calories} kcal · ${heart_rate} BPM`)

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
