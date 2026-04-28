import { useCallback, useRef, useState } from 'react'

/**
 * Custom hook for Web Bluetooth heart rate monitor integration.
 * Connects to BLE devices exposing the standard Heart Rate GATT service (0x180D).
 */
export function useBluetooth() {
  const [status, setStatus] = useState('idle') // idle | scanning | connecting | connected | error
  const [device, setDevice] = useState(null)
  const [heartRate, setHeartRate] = useState(0)
  const [batteryLevel, setBatteryLevel] = useState(null)
  const [error, setError] = useState('')
  const charRef = useRef(null)
  const serverRef = useRef(null)

  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator

  const handleHeartRateChange = useCallback((event) => {
    const value = event.target.value
    // Heart Rate Measurement format — bit 0 indicates if HR is uint8 or uint16
    const flags = value.getUint8(0)
    const is16Bit = flags & 0x01
    const hr = is16Bit ? value.getUint16(1, true) : value.getUint8(1)
    setHeartRate(hr)
  }, [])

  const scan = useCallback(async () => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported in this browser. Use Chrome or Edge.')
      setStatus('error')
      return
    }

    try {
      setStatus('scanning')
      setError('')

      const bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      })

      setDevice({ name: bleDevice.name || 'Unknown Device', id: bleDevice.id })
      setStatus('connecting')

      bleDevice.addEventListener('gattserverdisconnected', () => {
        setStatus('idle')
        setHeartRate(0)
        setDevice(null)
        charRef.current = null
        serverRef.current = null
      })

      const server = await bleDevice.gatt.connect()
      serverRef.current = server

      // Heart rate service
      const hrService = await server.getPrimaryService('heart_rate')
      const hrChar = await hrService.getCharacteristic('heart_rate_measurement')
      charRef.current = hrChar

      await hrChar.startNotifications()
      hrChar.addEventListener('characteristicvaluechanged', handleHeartRateChange)

      // Try battery level (optional)
      try {
        const battService = await server.getPrimaryService('battery_service')
        const battChar = await battService.getCharacteristic('battery_level')
        const battValue = await battChar.readValue()
        setBatteryLevel(battValue.getUint8(0))
      } catch {
        // Battery service not available — that's fine
      }

      setStatus('connected')
    } catch (err) {
      if (err.name === 'NotFoundError') {
        // User cancelled the device picker
        setStatus('idle')
      } else {
        setError(err.message || 'Failed to connect')
        setStatus('error')
      }
    }
  }, [isSupported, handleHeartRateChange])

  const disconnect = useCallback(() => {
    if (charRef.current) {
      charRef.current.removeEventListener('characteristicvaluechanged', handleHeartRateChange)
      charRef.current = null
    }
    if (serverRef.current?.connected) {
      serverRef.current.disconnect()
    }
    serverRef.current = null
    setDevice(null)
    setHeartRate(0)
    setBatteryLevel(null)
    setStatus('idle')
  }, [handleHeartRateChange])

  return { isSupported, status, device, heartRate, batteryLevel, error, scan, disconnect }
}
