import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import { REFRESH_MS } from '../config'

const REFRESH_S = Math.round(REFRESH_MS / 1000)

export function useSensorData() {
  const [records, setRecords]         = useState([])
  const [online, setOnline]           = useState(null)
  const [prevIds, setPrevIds]         = useState(new Set())
  const [lastUpdated, setLastUpdated] = useState(null)
  const [auditLog, setAuditLog]       = useState([])
  const [extraStats, setExtraStats]   = useState({ replayAttempts: 0, activeDevices: 0 })
  const [countdown, setCountdown]     = useState(REFRESH_S)
  const countdownRef                  = useRef(REFRESH_S)

  const fetch_ = useCallback(async () => {
    // Reset countdown on each fetch
    countdownRef.current = REFRESH_S
    setCountdown(REFRESH_S)

    // Critical: main data — if this fails, mark offline
    try {
      const res  = await fetch('/api/data')
      const data = await res.json()
      setOnline(true)
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour12: false }))
      setRecords(prev => {
        setPrevIds(new Set(prev.map(r => r.id)))
        return data
      })
    } catch {
      setOnline(false)
      return
    }

    // Non-critical: audit + stats — failures don't affect online status
    try {
      const [auditRes, statsRes] = await Promise.all([
        fetch('/api/audit'),
        fetch('/api/stats'),
      ])
      const [auditData, statsData] = await Promise.all([
        auditRes.json(),
        statsRes.json(),
      ])
      setAuditLog(auditData)
      setExtraStats(statsData)
    } catch {
      // Endpoints unavailable — non-critical, skip silently
    }
  }, [])

  useEffect(() => {
    fetch_()
    const pollId = setInterval(fetch_, REFRESH_MS)
    const tickId = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1))
    }, 1000)

    // WebSocket — trigger immediate refresh when server pushes data_update
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] })
    socket.on('data_update', () => fetch_())

    return () => {
      clearInterval(pollId)
      clearInterval(tickId)
      socket.disconnect()
    }
  }, [fetch_])

  const stats = {
    total:          records.length,
    valid:          records.filter(r => r.isValidSignature).length,
    tampered:       records.filter(r => !r.isValidSignature).length,
    replayAttempts: extraStats.replayAttempts,
    activeDevices:  extraStats.activeDevices,
  }

  return { records, stats, online, prevIds, lastUpdated, auditLog, countdown, refresh: fetch_ }
}
