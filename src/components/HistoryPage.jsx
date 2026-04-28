import { useMemo, useState } from 'react'

const CATEGORY_ICONS = {
  cardio: '🏃',
  weights: '🏋️',
  bodyweight: '🤸',
  yoga: '🧘',
  recovery: '💧',
  running: '🏃', // Legacy
  gym: '🏋️', // Legacy
  hydration: '💧', // Legacy
  general: '💪',
}

const PAGE_SIZE = 15

export default function HistoryPage({ logs, onDelete, addToast }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = [...logs]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.type.toLowerCase().includes(q) ||
          (l.notes && l.notes.toLowerCase().includes(q))
      )
    }
    if (categoryFilter !== 'all') {
      result = result.filter((l) => l.category === categoryFilter)
    }
    if (dateFrom) {
      result = result.filter((l) => l.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((l) => l.date <= dateTo)
    }
    return result
  }, [logs, search, categoryFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleDelete = async (id) => {
    try {
      await onDelete(id)
      addToast('Entry deleted', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const sourceClass = (source) => {
    if (source === 'Bluetooth') return 'bluetooth'
    if (source === 'Manual') return 'manual'
    return 'device'
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>📋 Log History</h2>
        <p>Browse and filter all your logged activities</p>
      </div>

      <section className="card">
        {/* Filters */}
        <div className="history-filters">
          <input
            type="text"
            placeholder="🔍 Search exercises…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ flex: 1, minWidth: '160px' }}
          />
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
            <option value="all">All Types</option>
            <option value="cardio">🏃 Cardio</option>
            <option value="weights">🏋️ Weights</option>
            <option value="bodyweight">🤸 Bodyweight</option>
            <option value="yoga">🧘 Yoga & Mind</option>
            <option value="recovery">💧 Recovery & Sleep</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} title="From date" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} title="To date" />
        </div>

        {paginated.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No entries found</h3>
            <p>Log your first workout from the Dashboard!</p>
          </div>
        ) : (
          <>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exercise</th>
                  <th>Duration</th>
                  <th>Calories</th>
                  <th>Details</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td>
                      <span className="category-icon">
                        {CATEGORY_ICONS[log.category] || '💪'} {log.type}
                      </span>
                    </td>
                    <td>{log.duration > 0 ? `${log.duration} min` : '—'}</td>
                    <td>{log.calories > 0 ? log.calories : '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {['running', 'cardio'].includes(log.category) && log.distance > 0 && `${log.distance}km`}
                      {['running', 'cardio'].includes(log.category) && log.pace && ` @ ${log.pace}`}
                      {['gym', 'weights'].includes(log.category) && log.sets > 0 && `${log.sets}×${log.reps} @ ${log.weight_kg}kg`}
                      {log.category === 'bodyweight' && log.sets > 0 && `${log.sets}×${log.reps}`}
                      {log.category === 'yoga' && log.mood > 0 && `Mood: ${['😞','😐','🙂','😊','🤩'][log.mood - 1]}`}
                      {['hydration', 'recovery'].includes(log.category) && log.water_ml > 0 && `${log.water_ml}ml`}
                      {['hydration', 'recovery'].includes(log.category) && log.sleep_hours > 0 && ` | ${log.sleep_hours}h sleep`}
                      {log.heart_rate > 0 && ` ❤️${log.heart_rate}`}
                      {!log.category || log.category === 'general' ? (log.notes || '') : ''}
                    </td>
                    <td>
                      <span className={`source-badge ${sourceClass(log.source)}`}>
                        {log.source}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-icon btn-danger btn-sm"
                        onClick={() => handleDelete(log.id)}
                        title="Delete entry"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
