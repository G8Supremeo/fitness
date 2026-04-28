import { useEffect, useRef } from 'react'

/**
 * Schedules a browser notification reminder if no activity has been logged today
 * by the configured time. Checks every 60 seconds.
 */
export function useNotificationReminder(reminderTime, logsToday) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (!reminderTime) return undefined

    // Reset the flag at midnight
    firedRef.current = false

    const check = () => {
      if (firedRef.current) return

      const now = new Date()
      const [hours, minutes] = reminderTime.split(':').map(Number)
      const targetTime = new Date()
      targetTime.setHours(hours, minutes, 0, 0)

      if (now >= targetTime && logsToday === 0) {
        firedRef.current = true

        if (Notification.permission === 'granted') {
          new Notification('Suprimify Reminder 💪', {
            body: "You haven't logged any activity today. Time to move!",
            icon: '/favicon.svg',
            tag: 'fitness-reminder',
          })
        }
      }
    }

    const interval = setInterval(check, 60000)
    check() // Run immediately once

    return () => clearInterval(interval)
  }, [reminderTime, logsToday])
}
