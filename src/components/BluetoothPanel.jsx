import { useBluetooth } from '../hooks/useBluetooth'

export default function BluetoothPanel() {
  const { isSupported, status, device, heartRate, batteryLevel, error, scan, disconnect } = useBluetooth()

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

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        {status !== 'connected' ? (
          <button
            className="btn btn-primary btn-sm btn-full"
            onClick={scan}
            disabled={status === 'scanning' || status === 'connecting'}
          >
            {status === 'scanning' ? '🔍 Scanning…' : status === 'connecting' ? '⏳ Connecting…' : '🔗 Scan & Connect'}
          </button>
        ) : (
          <button className="btn btn-danger btn-sm btn-full" onClick={disconnect}>
            Disconnect
          </button>
        )}
      </div>

      {status === 'error' && (
        <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  )
}
