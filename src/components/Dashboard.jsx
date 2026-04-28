import { useMemo, useState } from 'react'
import { useStreak } from '../hooks/useStreak'
import { useNotificationReminder } from '../hooks/useNotificationReminder'
import { ActivityChart } from './Charts'
import WorkoutLogger from './WorkoutLogger'
import BluetoothPanel from './BluetoothPanel'

const weeklyRange = () => {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const todayKey = () => new Date().toISOString().slice(0, 10)

export default function Dashboard({ user, logs, goals, addLog, addToast }) {
  const [reminderTime, setReminderTime] = useState('18:00')
  const streak = useStreak(logs)

  const logsToday = useMemo(
    () => logs.filter((l) => new Date(l.date).toISOString().slice(0, 10) === todayKey()).length,
    [logs]
  )

  useNotificationReminder(reminderTime, logsToday)

  const weeklyTotal = useMemo(
    () => logs.filter((l) => new Date(l.date) >= weeklyRange()).reduce((sum, l) => sum + Number(l.duration || 0), 0),
    [logs]
  )

  const totalCalories = useMemo(
    () => logs.reduce((sum, l) => sum + Number(l.calories || 0), 0),
    [logs]
  )

  const totalWorkouts = logs.length

  // Goal progress
  const progress = useMemo(
    () =>
      goals.map((goal) => {
        const now = new Date()
        const start = goal.period === 'weekly' ? weeklyRange() : new Date(now.getFullYear(), now.getMonth(), 1)
        const count = logs.filter((l) => new Date(l.date) >= start).length
        return { ...goal, count, done: count >= goal.target }
      }),
    [goals, logs]
  )

  // 30-day chart data
  const chartData = useMemo(() => {
    const map = new Map()
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      map.set(key, { date: key.slice(5), workouts: 0, calories: 0 })
    }
    logs.forEach((log) => {
      const key = new Date(log.date).toISOString().slice(0, 10)
      if (map.has(key)) {
        map.get(key).workouts += 1
        map.get(key).calories += Number(log.calories || 0)
      }
    })
    return [...map.values()]
  }, [logs])

  const requestNotifPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        addToast(
          perm === 'granted' ? 'Notifications enabled!' : 'Notifications blocked.',
          perm === 'granted' ? 'success' : 'info'
        )
      })
    }
  }

  return (
    <div className="dashboard-grid">
      {/* Welcome */}
      <section className="card welcome-banner">
        <div>
          <h2>Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="welcome-sub">Track, sync, and optimize every training day.</p>
        </div>
      </section>

      {/* Stat Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon streak">🔥</div>
          <div className="stat-value streak">{streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon minutes">⏱️</div>
          <div className="stat-value minutes">{weeklyTotal}</div>
          <div className="stat-label">Weekly Minutes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon calories">🔥</div>
          <div className="stat-value calories">{totalCalories.toLocaleString()}</div>
          <div className="stat-label">Total Calories</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon workouts">💪</div>
          <div className="stat-value workouts">{totalWorkouts}</div>
          <div className="stat-label">Total Workouts</div>
        </div>
      </div>

      {/* Quick Log */}
      <section className="card quick-log">
        <h2><span className="icon">📝</span> Quick Log</h2>
        <p className="card-subtitle">Choose your workout type and log your session</p>
        <WorkoutLogger onLog={addLog} addToast={addToast} />
      </section>

      {/* Sidebar */}
      <div className="sidebar-col">
        {/* Bluetooth Panel */}
        <section className="card">
          <BluetoothPanel />
        </section>

        {/* Goal Progress */}
        {progress.length > 0 && (
          <section className="card">
            <h2><span className="icon">🎯</span> Goal Progress</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {progress.map((goal) => {
                const pct = Math.min(Math.round((goal.count / goal.target) * 100), 100)
                return (
                  <div key={goal.id} style={{
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${goal.done ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {goal.period}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: goal.done ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                        {goal.done ? '✅ Complete!' : `${goal.count}/${goal.target}`}
                      </span>
                    </div>
                    <div style={{
                      height: '6px',
                      borderRadius: '99px',
                      background: 'rgba(99,102,241,0.1)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: '99px',
                        background: goal.done ? 'var(--gradient-success)' : 'var(--gradient-primary)',
                        transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Reminder */}
        <div className="reminder-panel">
          <label>⏰ Reminder:</label>
          <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          <button className="btn btn-ghost btn-sm" onClick={requestNotifPermission}>
            Enable
          </button>
        </div>
      </div>

      {/* 30-Day Chart */}
      <section className="card chart-card">
        <h2><span className="icon">📊</span> 30-Day Activity Analytics</h2>
        <p className="card-subtitle">Workouts and calories over the last month</p>
        <ActivityChart data={chartData} />
      </section>
    </div>
  )
}
