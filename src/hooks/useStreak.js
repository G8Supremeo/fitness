import { useMemo } from 'react'

/**
 * Compute the current streak of consecutive days with at least one logged activity.
 * Uses local dates (not UTC) so timezone-offset users get correct results.
 */
const toLocalDateKey = (value) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useStreak = (logs) =>
  useMemo(() => {
    if (!logs.length) {
      return 0
    }

    const uniqueDays = new Set(logs.map((log) => toLocalDateKey(log.date)))
    let streak = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)

    while (uniqueDays.has(toLocalDateKey(cursor))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return streak
  }, [logs])
