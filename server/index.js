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
      return res.status(400).json({ error: 'Email domain is invalid' })
    }
  } catch (err) {
    return res.status(400).json({ error: 'Email domain verification failed.' })
  }

  try {
    const [exists] = await db`SELECT id FROM users WHERE email = ${email}`
    if (exists) return res.status(409).json({ error: 'An account with this email already exists' })
    
    const hash = bcrypt.hashSync(password, 10)
    const recovery = generateRecoveryPhrase()
    
    const [user] = await db`
      INSERT INTO users (name, email, password_hash, recovery_phrase, age, weight_kg, height_cm, gender) 
      VALUES (${name}, ${email}, ${hash}, ${recovery}, ${age ? Number(age) : null}, ${weight ? Number(weight) : null}, ${height ? Number(height) : null}, ${gender || null})
      RETURNING *
    `
    
    return res.json({
      token: makeToken(user.id),
      user: userPublic(user),
      recoveryPhrase: recovery,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Database error during registration' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const [user] = await db`SELECT * FROM users WHERE email = ${email}`
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    return res.json({ token: makeToken(user.id), user: userPublic(user) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Database error during login' })
  }
})

// ── Password Reset ──
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  try {
    const [user] = await db`SELECT * FROM users WHERE email = ${email}`
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset code was generated.' })
    }
    const token = generateResetToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    await db`INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (${user.id}, ${token}, ${expiresAt})`
    
    try {
      const testAccount = await nodemailer.createTestAccount()
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      })
      
      const info = await transporter.sendMail({
        from: '"Suprimify Fitness" <noreply@suprimify.app>',
        to: user.email,
        subject: 'Password Reset Request',
        text: `Your password reset code is: ${token}\n\nIt expires in 30 minutes.`,
        html: `<p>Your password reset code is: <strong>${token}</strong></p><p>It expires in 30 minutes.</p>`,
      })
      console.log('Password reset preview URL: %s', nodemailer.getTestMessageUrl(info))
    } catch (err) {
      console.error('Failed to send reset email:', err)
    }

    return res.json({ message: 'Reset code emailed securely. Use it within 30 minutes to set a new password.' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Database error' })
  }
})

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, resetCode, newPassword } = req.body
  if (!email || !resetCode || !newPassword) return res.status(400).json({ error: 'All fields are required' })
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  
  try {
    const [user] = await db`SELECT * FROM users WHERE email = ${email}`
    if (!user) return res.status(400).json({ error: 'Invalid reset code' })
    const [tokenRow] = await db`SELECT * FROM password_reset_tokens WHERE user_id = ${user.id} AND token = ${resetCode.toUpperCase()} AND used = 0`
    if (!tokenRow) return res.status(400).json({ error: 'Invalid or expired reset code' })
    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired. Request a new one.' })
    }
    const hash = bcrypt.hashSync(newPassword, 10)
    await db`UPDATE users SET password_hash = ${hash} WHERE id = ${user.id}`
    await db`UPDATE password_reset_tokens SET used = 1 WHERE id = ${tokenRow.id}`
    return res.json({ message: 'Password reset successfully. Please sign in with your new password.' })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

// ── Recovery via recovery phrase (no email needed) ──
app.post('/api/auth/recover-with-phrase', async (req, res) => {
  const { email, recoveryPhrase, newPassword } = req.body
  if (!email || !recoveryPhrase || !newPassword) return res.status(400).json({ error: 'All fields are required' })
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  try {
    const [user] = await db`SELECT * FROM users WHERE email = ${email}`
    if (!user || user.recovery_phrase !== recoveryPhrase.toLowerCase().trim()) {
      return res.status(400).json({ error: 'Recovery phrase does not match' })
    }
    const hash = bcrypt.hashSync(newPassword, 10)
    await db`UPDATE users SET password_hash = ${hash} WHERE id = ${user.id}`
    return res.json({ message: 'Password reset using recovery phrase. Please sign in.' })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/me', auth, async (req, res) => {
  try {
    const [user] = await db`SELECT * FROM users WHERE id = ${req.userId}`
    return res.json({ user: userPublic(user) })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

// ── Profile ──
app.put('/api/profile', auth, async (req, res) => {
  const { name, avatarColor } = req.body
  try {
    const [user] = await db`SELECT * FROM users WHERE id = ${req.userId}`
    if (!user) return res.status(404).json({ error: 'User not found' })
    const newName = (name || user.name).trim()
    const newColor = avatarColor || user.avatar_color
    if (!newName) return res.status(400).json({ error: 'Name cannot be empty' })
    
    const [updated] = await db`UPDATE users SET name = ${newName}, avatar_color = ${newColor} WHERE id = ${req.userId} RETURNING *`
    return res.json({ user: userPublic(updated) })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.put('/api/profile/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' })
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })
  try {
    const [user] = await db`SELECT * FROM users WHERE id = ${req.userId}`
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    const hash = bcrypt.hashSync(newPassword, 10)
    await db`UPDATE users SET password_hash = ${hash} WHERE id = ${req.userId}`
    return res.json({ message: 'Password updated successfully' })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/profile/recovery', auth, async (req, res) => {
  const { password } = req.query || {}
  try {
    const [user] = await db`SELECT * FROM users WHERE id = ${req.userId}`
    if (password && !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Password is incorrect' })
    }
    return res.json({ recoveryPhrase: user.recovery_phrase || '' })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.post('/api/profile/recovery/regenerate', auth, async (req, res) => {
  try {
    const newPhrase = generateRecoveryPhrase()
    await db`UPDATE users SET recovery_phrase = ${newPhrase} WHERE id = ${req.userId}`
    return res.json({ recoveryPhrase: newPhrase })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

// ── Sync Events (per-device timeline) ──
app.get('/api/sync-events', auth, async (req, res) => {
  try {
    const events = await db`
      SELECT id, device_name AS "deviceName", device_type AS "deviceType", status, records_synced AS "recordsSynced", details, created_at AS "createdAt" 
      FROM sync_events WHERE user_id = ${req.userId} ORDER BY id DESC LIMIT 100
    `
    return res.json({ events })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.post('/api/sync-events', auth, async (req, res) => {
  const { deviceName, deviceType, status = 'success', recordsSynced = 0, details = '' } = req.body
  if (!deviceName || !deviceType) return res.status(400).json({ error: 'deviceName and deviceType are required' })
  try {
    const [event] = await db`
      INSERT INTO sync_events (user_id, device_name, device_type, status, records_synced, details) 
      VALUES (${req.userId}, ${deviceName}, ${deviceType}, ${status}, ${Number(recordsSynced)}, ${details})
      RETURNING id, device_name AS "deviceName", device_type AS "deviceType", status, records_synced AS "recordsSynced", details, created_at AS "createdAt"
    `
    return res.status(201).json({ event })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.delete('/api/sync-events', auth, async (req, res) => {
  try {
    await db`DELETE FROM sync_events WHERE user_id = ${req.userId}`
    return res.json({ cleared: true })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

// ── Logs Routes ──
app.get('/api/logs', auth, async (req, res) => {
  try {
    const logs = await db`SELECT id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate FROM logs WHERE user_id = ${req.userId} ORDER BY date DESC, id DESC`
    return res.json({ logs })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.post('/api/logs', auth, async (req, res) => {
  const {
    type, category = 'general', duration = 0, calories = 0, notes = '', date,
    source = 'Manual', distance = 0, pace = '', sets = 0, reps = 0,
    weight_kg = 0, sleep_hours = 0, water_ml = 0, mood = 0, heart_rate = 0,
  } = req.body
  if (!type || !date) return res.status(400).json({ error: 'Type and date are required' })
  try {
    const [log] = await db`
      INSERT INTO logs (user_id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate)
      VALUES (${req.userId}, ${type}, ${category}, ${Number(duration)}, ${Number(calories)}, ${notes}, ${date}, ${source}, ${Number(distance)}, ${pace}, ${Number(sets)}, ${Number(reps)}, ${Number(weight_kg)}, ${Number(sleep_hours)}, ${Number(water_ml)}, ${Number(mood)}, ${Number(heart_rate)})
      RETURNING id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate
    `
    return res.status(201).json({ log })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.delete('/api/logs/:id', auth, async (req, res) => {
  try {
    const [log] = await db`SELECT id FROM logs WHERE id = ${req.params.id} AND user_id = ${req.userId}`
    if (!log) return res.status(404).json({ error: 'Log not found' })
    await db`DELETE FROM logs WHERE id = ${req.params.id}`
    return res.json({ deleted: true })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.post('/api/logs/import', auth, async (req, res) => {
  const { logs = [] } = req.body
  if (!Array.isArray(logs)) return res.status(400).json({ error: 'logs must be an array' })

  try {
    const existingRows = await db`SELECT type, duration, calories, date FROM logs WHERE user_id = ${req.userId}`
    const existingSet = new Set(existingRows.map((row) => `${row.type}|${row.duration}|${row.calories}|${row.date}`))
    
    let imported = 0
    let skipped = 0
    let invalid = 0
    
    // Using transaction in postgres.js
    await db.begin(async sql => {
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
        
        await sql`
          INSERT INTO logs (user_id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate)
          VALUES (${req.userId}, ${type}, ${item.category || 'general'}, ${duration}, ${calories}, ${item.notes || ''}, ${date}, ${item.source || 'Smart Device'}, ${Number(item.distance || 0)}, ${item.pace || ''}, ${Number(item.sets || 0)}, ${Number(item.reps || 0)}, ${Number(item.weight_kg || 0)}, ${Number(item.sleep_hours || 0)}, ${Number(item.water_ml || 0)}, ${Number(item.mood || 0)}, ${Number(item.heart_rate || 0)})
        `
        existingSet.add(key)
        imported += 1
      }
    })
    
    return res.json({ imported, skipped, invalid })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Database error during import' })
  }
})

app.post('/api/logs/bluetooth', auth, async (req, res) => {
  const { type = 'Workout', duration = 0, calories = 0, heart_rate = 0, date, deviceName = 'Bluetooth Device' } = req.body
  if (!date) return res.status(400).json({ error: 'Date is required' })
  try {
    const [log] = await db`
      INSERT INTO logs (user_id, type, category, duration, calories, notes, date, source, heart_rate)
      VALUES (${req.userId}, ${type}, 'general', ${Number(duration)}, ${Number(calories)}, 'Recorded via Bluetooth heart rate monitor', ${date}, 'Bluetooth', ${Number(heart_rate)})
      RETURNING id, type, category, duration, calories, notes, date, source, distance, pace, sets, reps, weight_kg, sleep_hours, water_ml, mood, heart_rate
    `

    await db`
      INSERT INTO sync_events (user_id, device_name, device_type, status, records_synced, details) 
      VALUES (${req.userId}, ${deviceName}, 'Bluetooth Heart Rate Monitor', 'success', 1, ${duration + ' min · ' + calories + ' kcal · ' + heart_rate + ' BPM'})
    `

    return res.status(201).json({ log })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

// ── Goals Routes ──
app.get('/api/goals', auth, async (req, res) => {
  try {
    const goals = await db`SELECT id, period, target FROM goals WHERE user_id = ${req.userId} ORDER BY id DESC`
    return res.json({ goals })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.post('/api/goals', auth, async (req, res) => {
  const { period, target } = req.body
  if (!['weekly', 'monthly'].includes(period)) return res.status(400).json({ error: 'Period must be weekly or monthly' })
  if (!target || target < 1) return res.status(400).json({ error: 'Target must be at least 1' })
  try {
    const [goal] = await db`INSERT INTO goals (user_id, period, target) VALUES (${req.userId}, ${period}, ${Number(target)}) RETURNING id, period, target`
    return res.status(201).json({ goal })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

app.delete('/api/goals/:id', auth, async (req, res) => {
  try {
    const [goal] = await db`SELECT id FROM goals WHERE id = ${req.params.id} AND user_id = ${req.userId}`
    if (!goal) return res.status(404).json({ error: 'Goal not found' })
    await db`DELETE FROM goals WHERE id = ${req.params.id}`
    return res.json({ deleted: true })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

// ── Stats Route ──
app.get('/api/stats', auth, async (req, res) => {
  try {
    const [countRow] = await db`SELECT COUNT(*) AS count FROM logs WHERE user_id = ${req.userId}`
    const [totalRow] = await db`SELECT COALESCE(SUM(calories), 0) AS "totalCalories", COALESCE(SUM(duration), 0) AS "totalDuration" FROM logs WHERE user_id = ${req.userId}`
    return res.json({ 
      totalWorkouts: Number(countRow.count), 
      totalCalories: Number(totalRow.totalCalories), 
      totalDuration: Number(totalRow.totalDuration) 
    })
  } catch (err) {
    return res.status(500).json({ error: 'Database error' })
  }
})

// ── Vercel Support / Start Server ──
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Fitness API running on http://localhost:${PORT}`)
  })
}

export default app
