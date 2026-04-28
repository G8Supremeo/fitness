import { useEffect, useRef, useState } from 'react'
import { useBluetooth } from '../hooks/useBluetooth'

const TOKEN_KEY = 'fitness_token'
const API_BASE = 'http://localhost:4100/api'

export default function BluetoothPanel({ addToast, onLogged }) {
  const { isSupported, status, device, heartRate, batteryLevel, error, scan, disconnect } = useBluetooth()
  const [recording, setRecording] = useState(false)
  const [sessionStart, setSessionStart] = useState(null)
  const [hrHistory, setHrHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const recordingRef = useRef(false)

  // Capture HR samples while recording
  useEffect(() => {
    recordingRef.current = recording
  }, [recording])

  useEffect(() => {
    if (heartRate > 0 && recordingRef.current) {
      setHrHistory((prev) => [...prev, { hr: heartRate, t: Date.now() }])
    }
  }, [heartRate])

  if (!isSupported) {
    return (
      <div className="bluetooth-panel">
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📡</span> Bluetooth Heart Rate
        </h3>
        <div className="bt-unsupported">
          <div className="icon">🚫</div>
          <p>Web Bluetooth is not supported in this browser.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            Use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for Bluetooth smartwatch connectivity.
          </p>
        </div>
      </div>
    )
  }

  const statusLabels = {
    idle: 'Not connected',
    scanning: 'Scanning for devices…',
    connecting: 'Connecting…',
    connected: device?.name ? `Connected to ${device.name}` : 'Connected',
    error: error || 'Connection failed',
  }

  const startRecording = () => {
    setRecording(true)
    setSessionStart(Date.now())
    setHrHistory([])
    addToast?.(`Recording session from ${device?.name || 'device'}`, 'info')
  }

  const stopAndSave = async () => {
    setRecording(false)
    if (!sessionStart || hrHistory.length === 0) {
      addToast?.('No heart rate samples captured.', 'info')
      return
    }
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      addToast?.('Please sign in first.', 'error')
      return
    }
    const durationMin = Math.max(1, Math.round((Date.now() - sessionStart) / 60000))
    const avgHr = Math.round(hrHistory.reduce((s, x) => s + x.hr, 0) / hrHistory.length)
    const calories = Math.round(durationMin * (avgHr / 10)) // simple HR-based estimate

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/logs/bluetooth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'Cardio',
          duration: durationMin,
          calories,
          heart_rate: avgHr,
          date: new Date().toISOString().slice(0, 10),
          deviceName: device?.name || 'Bluetooth Device',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setLastSync(new Date())
      addToast?.(`Saved ${durationMin}-min session (avg ${avgHr} BPM, ${calories} kcal)`, 'success')
      onLogged?.()
    } catch (err) {
      addToast?.(err.message || 'Failed to save session', 'error')
    } finally {
      setSaving(false)
      setSessionStart(null)
      setHrHistory([])
    }
  }

  const sessionDuration = sessionStart ? Math.round((Date.now() - sessionStart) / 1000) : 0

  return (
    <div className="bluetooth-panel">
      <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>📡</span> Bluetooth Heart Rate
      </h3>

      <div className="bt-status">
        <span className={`bt-indicator ${status === 'connected' ? 'connected' : status === 'scanning' || status === 'connecting' ? 'scanning' : 'disconnected'}`} />
        <div className="bt-status-text">
          <strong>{statusLabels[status]}</strong>
          {batteryLevel !== null && status === 'connected' && (
            <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              🔋 {batteryLevel}%
            </span>
          )}
        </div>
      </div>

      {status === 'connected' && heartRate > 0 && (
        <div className="bt-heart-rate">
          <div className="bt-hr-value">❤️ {heartRate}</div>
          <div className="bt-hr-label">BPM — Live Heart Rate</div>
        </div>
      )}

      {status === 'connected' && heartRate === 0 && (
        <div className="bt-heart-rate" style={{ opacity: 0.5 }}>
          <div style={{ fontSize: '1.5rem' }}>⏳</div>
          <div className="bt-hr-label">Waiting for heart rate data…</div>
        </div>
      )}

      {recording && (
        <div className="bt-recording">
          <span className="bt-recording-dot" /> Recording · {Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s · {hrHistory.length} samples
        </div>
      )}

      {lastSync && !recording && (
        <p className="bt-last-sync">Last saved: {lastSync.toLocaleTimeString()}</p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {status !== 'connected' ? (
          <button
            className="btn btn-primary btn-sm btn-full"
            onClick={scan}
            disabled={status === 'scanning' || status === 'connecting'}
          >
            {status === 'scanning' ? '🔍 Scanning…' : status === 'connecting' ? '⏳ Connecting…' : '🔗 Scan & Connect'}
          </button>
        ) : (
          <>
            {!recording ? (
              <button className="btn btn-primary btn-sm" onClick={startRecording} style={{ flex: 1 }}>
                ▶ Start session
              </button>
            ) : (
              <button className="btn btn-success btn-sm" onClick={stopAndSave} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving…' : '⏹ Stop & save'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={disconnect}>
              Disconnect
            </button>
          </>
        )}
      </div>

      {status === 'error' && (
        <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  )
}
