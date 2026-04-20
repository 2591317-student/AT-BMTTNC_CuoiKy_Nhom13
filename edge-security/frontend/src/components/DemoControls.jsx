import { useState, useRef } from 'react'
import { API_KEY, DEVICE_ID } from '../config'
import { hmacSign, buildPayload } from '../utils/hmac'

export default function DemoControls({ onSent }) {
  const [log, setLog]         = useState({ msg: 'Nhấn nút để bắt đầu demo…', type: 'idle' })
  const [busy, setBusy]       = useState(false)
  const [replayReady, setReplayReady] = useState(false)
  const lastValid = useRef(null)

  async function post(payload, signature) {
    return fetch('/api/data', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key':    API_KEY,
        'X-Signature':  signature,
      },
      body: JSON.stringify(payload),
    })
  }

  async function handleNormal() {
    setBusy(true)
    setLog({ msg: 'Sending normal payload…', type: 'idle' })
    try {
      const payload   = buildPayload(DEVICE_ID)
      const signature = await hmacSign(payload)
      const res       = await post(payload, signature)

      if (res.ok) {
        lastValid.current = { payload, signature }
        setReplayReady(true)
        setLog({ msg: `✓ 200 OK — temp=${payload.temperature}°C  nonce=${payload.nonce.slice(0, 8)}…`, type: 'ok' })
      } else {
        const body = await res.json().catch(() => ({}))
        setLog({ msg: `✗ ${res.status} — ${body.reason ?? res.statusText}`, type: 'error' })
      }
    } catch (e) {
      setLog({ msg: `✗ Cannot reach server — ${e.message}`, type: 'error' })
    } finally {
      setBusy(false)
      onSent()
    }
  }

  async function handleTampered() {
    setBusy(true)
    setLog({ msg: 'Building tampered payload…', type: 'idle' })
    try {
      const payload   = buildPayload(DEVICE_ID)
      const signature = await hmacSign(payload)          // sign BEFORE tampering
      const tampered  = { ...payload, temperature: 99.9 }

      setLog({ msg: `⚠ Injecting 99.9°C (original ${payload.temperature}°C) — signature unchanged…`, type: 'warning' })
      await new Promise(r => setTimeout(r, 500))

      const res  = await post(tampered, signature)
      const body = await res.json().catch(() => ({}))

      setLog({
        msg:  `✗ ${res.status} — ${body.reason ?? 'Forbidden'} — isValidSignature=0 saved`,
        type: 'error',
      })
    } catch (e) {
      setLog({ msg: `✗ Cannot reach server — ${e.message}`, type: 'error' })
    } finally {
      setBusy(false)
      onSent()
    }
  }

  async function handleReplay() {
    if (!lastValid.current) return
    setBusy(true)
    const { payload, signature } = lastValid.current
    setLog({ msg: `Replaying nonce ${payload.nonce.slice(0, 8)}… (already used)`, type: 'warning' })
    try {
      const res  = await post(payload, signature)
      const body = await res.json().catch(() => ({}))
      setLog({ msg: `✗ ${res.status} — ${body.reason ?? 'Forbidden'} — replay blocked`, type: 'error' })
    } catch (e) {
      setLog({ msg: `✗ Cannot reach server — ${e.message}`, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function handleWrongKey() {
    setBusy(true)
    setLog({ msg: 'Sending with wrong API key…', type: 'idle' })
    try {
      const payload = buildPayload(DEVICE_ID)
      const res = await fetch('/api/data', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key':    'wrong-key-attacker',
          'X-Signature':  'doesnt-matter',
        },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      setLog({ msg: `✗ ${res.status} — ${body.reason ?? 'Unauthorized'} — thiết bị lạ bị từ chối`, type: 'error' })
    } catch (e) {
      setLog({ msg: `✗ Cannot reach server — ${e.message}`, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="controls">
      <div className="controls-header">
        <span className="section-title">Demo Controls</span>
        <span className="controls-hint">Gửi trực tiếp từ trình duyệt — không cần chạy sensor.py</span>
      </div>

      <div className="controls-row">
        <button className="btn btn--normal"   onClick={handleNormal}   disabled={busy}>
          ▶ Send Normal
        </button>
        <button className="btn btn--tampered" onClick={handleTampered} disabled={busy}>
          ⚠ Send Tampered
        </button>
        <button className="btn btn--replay"   onClick={handleReplay}   disabled={busy || !replayReady}>
          ↻ Replay Attack
        </button>
        <button className="btn btn--wrongkey" onClick={handleWrongKey} disabled={busy}>
          🔑 Wrong API Key
        </button>
      </div>

      <div className={`action-log action-log--${log.type}`}>
        {log.msg}
      </div>
    </section>
  )
}
