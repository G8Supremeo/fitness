import { useMemo, useState } from 'react'
import { ProgressRing, GoalBarChart } from './Charts'

const weeklyRange = () => {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export default function GoalsPage({ goals, logs, addGoal, deleteGoal, addToast }) {
  const [form, setForm] = useState({ period: 'weekly', target: 4 })
  const [submitting, setSubmitting] = useState(false)

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

  const thisMonth = useMemo(() => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    return logs.filter((l) => new Date(l.date) >= start).length
  }, [logs])

  const thisWeek = useMemo(
    () => logs.filter((l) => new Date(l.date) >= weeklyRange()).length,
    [logs]
  )

  const createGoal = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await addGoal({ ...form, target: Number(form.target) })
      addToast('Goal created!', 'success', '🎯 New Goal')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteGoal(id)
      addToast('Goal removed', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>🎯 Goal Management</h2>
        <p>Set weekly or monthly targets and track your progress</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon streak">📅</div>
          <div className="stat-value streak">{thisWeek}</div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon minutes">🗓️</div>
          <div className="stat-value minutes">{thisMonth}</div>
          <div className="stat-label">This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon workouts">🎯</div>
          <div className="stat-value workouts">{goals.length}</div>
          <div className="stat-label">Active Goals</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon calories">✅</div>
          <div className="stat-value calories">{progress.filter((g) => g.done).length}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Create Goal */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2><span className="icon">➕</span> Set a New Goal</h2>
        <form onSubmit={createGoal} className="goal-form">
          <div className="form-group">
            <label htmlFor="goal-period">Period</label>
            <select
              id="goal-period"
              value={form.period}
              onChange={(e) => setForm((s) => ({ ...s, period: e.target.value }))}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="goal-target">Target Workouts</label>
            <input
              id="goal-target"
              type="number"
              min="1"
              max="100"
              value={form.target}
              onChange={(e) => setForm((s) => ({ ...s, target: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-end' }}>
            {submitting ? 'Creating…' : 'Create Goal'}
          </button>
        </form>
      </section>

      {/* Goal Cards with Progress Rings */}
      {progress.length > 0 ? (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2><span className="icon">📈</span> Your Goals</h2>
          <div className="goal-cards">
            {progress.map((goal) => (
              <div key={goal.id} className={`goal-card${goal.done ? ' completed' : ''}`}>
                <ProgressRing current={goal.count} target={goal.target} />
                <div className="goal-info">
                  <div className="goal-period">{goal.period}</div>
                  <div className="goal-count">
                    {goal.count} / {goal.target} workouts
                  </div>
                  <div className={`goal-status${goal.done ? ' done' : ''}`}>
                    {goal.done ? '🎉 Goal achieved!' : `${goal.target - goal.count} more to go`}
                  </div>
                </div>
                <button className="goal-delete" onClick={() => handleDelete(goal.id)} title="Remove goal">
                  🗑
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No goals yet</h3>
            <p>Create your first fitness goal above!</p>
          </div>
        </section>
      )}

      {/* Goal Chart */}
      {progress.length > 0 && (
        <section className="card">
          <h2><span className="icon">📊</span> Goal Comparison</h2>
          <GoalBarChart goals={progress} />
        </section>
      )}
    </div>
  )
}
