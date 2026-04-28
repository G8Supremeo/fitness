export default function Toast({ toasts, removeToast }) {
  if (toasts.length === 0) return null

  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  const titles = { success: 'Success', error: 'Error', info: 'Info' }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}${toast.exiting ? ' exiting' : ''}`}>
          <span className="toast-icon">{icons[toast.type] || '✅'}</span>
          <div className="toast-body">
            <div className="toast-title">{toast.title || titles[toast.type]}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
