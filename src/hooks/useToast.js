import { useCallback, useState } from 'react'

let toastId = 0

/**
 * Toast notification system with auto-dismiss and stacking.
 * Returns { toasts, addToast, removeToast }
 */
export function useToast() {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 280)
  }, [])

  const addToast = useCallback((message, type = 'success', title = '') => {
    toastId += 1
    const id = toastId
    const toast = { id, message, type, title, exiting: false }
    setToasts((prev) => [...prev, toast])

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id)
    }, 4000)

    return id
  }, [removeToast])

  return { toasts, addToast, removeToast }
}
