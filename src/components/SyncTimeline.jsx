import { useEffect, useMemo, useState } from 'react'

const formatRelative = (iso) => {
  const date = new Date(iso)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return date.toLocaleDateString()
}

const ICON_BY_TYPE = {
  'Bluetooth Heart Rate Monitor': '❤️',
  'Smartwatch': '⌚',
  'Fitness Tracker': '🏃',
  'Phone Sensor': '📱',
  'Manual Entry': '✍️',
}

export default function SyncTimeline({ api, addToast }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const refresh = async () => {
    try {
      const data = await api('/sync-events')
      setEvents(data.events || [])
    } catch (err) {
      addToast?.(err.message || 'Failed to load sync history', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const ev of events) {
      const key = ev.deviceName
      if (!map.has(key)) {
        map.set(key, {
          deviceName: ev.deviceName,
          deviceType: ev.deviceType,
          lastSyncAt: ev.createdAt,
          totalSyncs: 0,
          totalRecords: 0,
          events: [],
        })
      }
      const group = map.get(key)
      group.totalSyncs += 1
      group.totalRecords += ev.recordsSynced || 0
      group.events.push(ev)
    }
    return [...map.values()].sort((a, b) => new Date(b.lastSyncAt) - new Date(a.lastSyncAt))
  }, [events])

  const filtered = useMemo(() => {
    if (filter === 'all') return events
    return events.filter((e) => e.status === filter)
  }, [events, filter])

  const clearAll = async () => {
    if (!confirm('Clear all sync history? This cannot be undone.')) return
    try {
      await api('/sync-events', { method: 'DELETE' })
      addToast?.('Sync history cleared', 'success')
      setEvents([])
    } catch (err) {
      addToast?.(err.message || 'Failed to clear history', 'error')
    }
  }

  if (loading) {
    return (
      <section className="card">
        <h2><span className="icon">📡</span> Device Sync Timeline</h2>
        <p className="card-subtitle">Loading sync history…</p>
      </section>
    )
  }

  if (events.length === 0) {
    return (
      <section className="card">
        <h2><span className="icon">📡</span> Device Sync Timeline</h2>
        <div className="empty-state">
          <div className="empty-icon">📡</div>
          <p>No syncs yet. Connect a Bluetooth device to start your timeline.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="card sync-timeline-card">
      <div className="card-header-row">
        <div>
          <h2><span className="icon">📡</span> Device Sync Timeline</h2>
          <p className="card-subtitle">Per-device last-synced status and full event history.</p>
        </div>
        <div className="sync-filter-row">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="sync-filter">
            <option value="all">All events</option>
            <option value="success">Successful</option>
            <option value="error">Failed</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={refresh}>Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear</button>
        </div>
      </div>

      <div className="sync-devices">
        <h3>Connected devices</h3>
        <div className="sync-device-grid">
          {grouped.map((g) => (
            <div key={g.deviceName} className="sync-device-card">
              <div className="sync-device-icon">{ICON_BY_TYPE[g.deviceType] || '📡'}</div>
              <div className="sync-device-info">
                <strong>{g.deviceName}</strong>
                <span className="sync-device-type">{g.deviceType}</span>
                <span className="sync-device-last">
                  Last sync: <strong>{formatRelative(g.lastSyncAt)}</strong>
                </span>
                <span className="sync-device-stats">
                  {g.totalSyncs} sync{g.totalSyncs === 1 ? '' : 's'} · {g.totalRecords} record{g.totalRecords === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sync-events">
        <h3>Recent sync events</h3>
        <ul className="sync-event-list">
          {filtered.slice(0, 20).map((ev) => (
            <li key={ev.id} className={`sync-event-item sync-${ev.status}`}>
              <div className="sync-event-dot" />
              <div className="sync-event-body">
                <div className="sync-event-header">
                  <strong>{ev.deviceName}</strong>
                  <span className="sync-event-time">{formatRelative(ev.createdAt)}</span>
                </div>
                <div className="sync-event-meta">
                  <span className={`sync-status-badge sync-status-${ev.status}`}>
                    {ev.status === 'success' ? '✓ success' : '✕ failed'}
                  </span>
                  {ev.recordsSynced > 0 && <span>{ev.recordsSynced} record(s)</span>}
                  {ev.details && <span className="sync-event-details">{ev.details}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
