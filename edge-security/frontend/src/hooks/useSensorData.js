import { useState, useEffect, useCallback } from 'react'
import { REFRESH_MS } from '../config'

export function useSensorData() {
  const [records, setRecords]         = useState([])
  const [online, setOnline]           = useState(null)
  const [prevIds, setPrevIds]         = useState(new Set())
  const [lastUpdated, setLastUpdated] = useState(null)
  const [auditLog, setAuditLog]       = useState([])
  const [extraStats, setExtraStats]   = useState({ replayAttempts: 0, activeDevices: 0 })

  const fetch_ = useCallback(async () => {
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
    const id = setInterval(fetch_, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetch_])

  const stats = {
    total:          records.length,
    valid:          records.filter(r => r.isValidSignature).length,
    tampered:       records.filter(r => !r.isValidSignature).length,
    replayAttempts: extraStats.replayAttempts,
    activeDevices:  extraStats.activeDevices,
  }

  return { records, stats, online, prevIds, lastUpdated, auditLog, refresh: fetch_ }
}
