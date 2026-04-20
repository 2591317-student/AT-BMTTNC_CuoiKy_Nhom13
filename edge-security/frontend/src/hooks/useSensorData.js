import { useState, useEffect, useCallback } from 'react'
import { REFRESH_MS } from '../config'

export function useSensorData() {
  const [records, setRecords]   = useState([])
  const [online, setOnline]     = useState(null)   // null = connecting
  const [prevIds, setPrevIds]   = useState(new Set())

  const fetch_ = useCallback(async () => {
    try {
      const res  = await fetch('/api/data')
      const data = await res.json()
      setOnline(true)
      setRecords(prev => {
        setPrevIds(new Set(prev.map(r => r.id)))
        return data
      })
    } catch {
      setOnline(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetch_])

  const stats = {
    total:    records.length,
    valid:    records.filter(r => r.isValidSignature).length,
    tampered: records.filter(r => !r.isValidSignature).length,
  }

  return { records, stats, online, prevIds, refresh: fetch_ }
}
