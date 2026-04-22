import { useState, useRef, useEffect } from 'react'
import { API_KEY, DEVICE_ID } from '../config'
import { hmacSign, buildPayload } from '../utils/hmac'

const AUTO_INTERVAL_MS = 2000   // send every 2s in auto mode

// ── Layer Status ──────────────────────────────────────────────────────────────

const LAYERS = ['L1', 'L2a', 'L2b', 'L3', 'L4']
const LAYER_LABELS = { L1: 'API Key', L2a: 'Timestamp', L2b: 'Replay', L3: 'HMAC', L4: 'Rate Limit' }

const LAYER_DESC = {
  L1: {
    pass: 'API key hợp lệ — thiết bị được nhận diện',
    fail: 'API key sai — thiết bị bị từ chối ngay, không xử lý tiếp',
    skip: 'Không kiểm tra — bị chặn trước đó',
  },
  L2a: {
    pass: 'Timestamp còn trong tolerance 30s — gói tin đủ tươi',
    fail: 'Timestamp quá cũ (35s > 30s) — ngăn attacker delay và replay',
    skip: 'Không kiểm tra — bị chặn ở L1',
  },
  L2b: {
    pass: 'Nonce chưa từng xuất hiện — không phải replay',
    fail: 'Nonce đã dùng rồi — gói tin này đã được gửi trước đó',
    skip: 'Không kiểm tra — bị chặn ở L1 hoặc L2a',
  },
  L3: {
    pass: 'HMAC khớp — payload không bị sửa sau khi ký',
    fail: 'HMAC không khớp — payload đã bị thay đổi sau khi ký (record vẫn lưu với isValidSignature=0)',
    skip: 'Không kiểm tra — bị chặn ở L1/L2a/L2b',
  },
  L4: {
    pass: 'Trong giới hạn rate limit (30 req/min)',
    fail: 'Vượt quá 30 requests/phút — ngăn tấn công flood',
    skip: 'Không kiểm tra — bị chặn trước đó',
  },
}

function LayerStatus({ result }) {
  const [hovered, setHovered] = useState(null)
  if (!result) return null

  return (
    <div className="layer-status">
      <span className="layer-status-label">Security layers:</span>
      <div className="layer-chips">
        {LAYERS.map(layer => {
          const state = result[layer]
          return (
            <div
              key={layer}
              className={`layer-chip layer-chip--${state}${hovered === layer ? ' layer-chip--active' : ''}`}
              onMouseEnter={() => setHovered(layer)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="layer-chip-name">{layer} · {LAYER_LABELS[layer]}</span>
              <span className="layer-chip-icon">
                {state === 'pass' ? '✓' : state === 'fail' ? '✗' : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {hovered && (
        <div className={`layer-popup layer-popup--${result[hovered]}`}>
          <span className="layer-popup-layer">{hovered} · {LAYER_LABELS[hovered]}</span>
          <span className="layer-popup-desc">{LAYER_DESC[hovered][result[hovered]]}</span>
        </div>
      )}
    </div>
  )
}

// ── Tooltip wrapper ───────────────────────────────────────────────────────────

function Tip({ text, children }) {
  return (
    <div className="tip-wrap" data-tip={text}>
      {children}
    </div>
  )
}

// ── Layer result presets ──────────────────────────────────────────────────────

const LAYER_OK       = { L1: 'pass', L2a: 'pass', L2b: 'pass', L3: 'pass', L4: 'pass' }
const LAYER_TAMPERED = { L1: 'pass', L2a: 'pass', L2b: 'pass', L3: 'fail', L4: 'pass' }
const LAYER_REPLAY   = { L1: 'pass', L2a: 'pass', L2b: 'fail', L3: 'skip', L4: 'pass' }
const LAYER_EXPIRED  = { L1: 'pass', L2a: 'fail', L2b: 'skip', L3: 'skip', L4: 'pass' }
const LAYER_WRONGKEY = { L1: 'fail', L2a: 'skip', L2b: 'skip', L3: 'skip', L4: 'pass' }

// ── Main component ────────────────────────────────────────────────────────────

export default function DemoControls({ onSent }) {
  const [log, setLog]               = useState({ msg: 'Press a button to start the demo…', type: 'idle' })
  const [busy, setBusy]             = useState(false)
  const [replayReady, setReplayReady] = useState(false)
  const [preview, setPreview]       = useState(null)
  const [layers, setLayers]         = useState(null)
  const [autoSend, setAutoSend]     = useState(false)
  const [autoCount, setAutoCount]   = useState(0)
  const lastValid   = useRef(null)
  const autoTimerRef = useRef(null)

  useEffect(() => {
    if (!autoSend) {
      clearInterval(autoTimerRef.current)
      return
    }
    autoTimerRef.current = setInterval(() => {
      handleNormal()
      setAutoCount(c => c + 1)
    }, AUTO_INTERVAL_MS)
    return () => clearInterval(autoTimerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend])

  async function post(payload, signature, apiKey = API_KEY) {
    return fetch('/api/data', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key':    apiKey,
        'X-Signature':  signature,
      },
      body: JSON.stringify(payload),
    })
  }

  async function handleNormal() {
    setBusy(true); setLayers(null)
    setLog({ msg: 'Sending normal payload…', type: 'idle' })
    try {
      const payload   = buildPayload(DEVICE_ID)
      const signature = await hmacSign(payload)
      const res       = await post(payload, signature)

      if (res.ok) {
        lastValid.current = { payload, signature }
        setReplayReady(true)
        setLayers(LAYER_OK)
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
    setBusy(true); setLayers(null)
    setLog({ msg: 'Building tampered payload…', type: 'idle' })
    try {
      const payload   = buildPayload(DEVICE_ID)
      const signature = await hmacSign(payload)          // sign BEFORE tampering
      const tampered  = { ...payload, temperature: 99.9 }

      setLog({ msg: `⚠ Injecting 99.9°C (original ${payload.temperature}°C) — signature unchanged…`, type: 'warning' })
      await new Promise(r => setTimeout(r, 500))

      const res  = await post(tampered, signature)
      const body = await res.json().catch(() => ({}))
      setLayers(LAYER_TAMPERED)
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
    setBusy(true); setLayers(null)
    const { payload, signature } = lastValid.current
    setLog({ msg: `Replaying nonce ${payload.nonce.slice(0, 8)}… (already used)`, type: 'warning' })
    try {
      const res  = await post(payload, signature)
      const body = await res.json().catch(() => ({}))
      setLayers(LAYER_REPLAY)
      setLog({ msg: `✗ ${res.status} — ${body.reason ?? 'Forbidden'} — replay blocked`, type: 'error' })
    } catch (e) {
      setLog({ msg: `✗ Cannot reach server — ${e.message}`, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function handleExpiredTs() {
    setBusy(true); setLayers(null)
    setLog({ msg: 'Building payload with timestamp 35s in the past…', type: 'warning' })
    try {
      const payload   = buildPayload(DEVICE_ID)
      payload.timestamp = Math.floor(Date.now() / 1000) - 35   // 35s old, tolerance is 30s
      const signature = await hmacSign(payload)
      const res       = await post(payload, signature)
      const body      = await res.json().catch(() => ({}))
      setLayers(LAYER_EXPIRED)
      setLog({ msg: `✗ ${res.status} — ${body.reason ?? 'Forbidden'} — timestamp too old (35s > 30s tolerance)`, type: 'error' })
    } catch (e) {
      setLog({ msg: `✗ Cannot reach server — ${e.message}`, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function handleWrongKey() {
    setBusy(true); setLayers(null)
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
      setLayers(LAYER_WRONGKEY)
      setLog({ msg: `✗ ${res.status} — ${body.reason ?? 'Unauthorized'} — unknown device rejected`, type: 'error' })
    } catch (e) {
      setLog({ msg: `✗ Cannot reach server — ${e.message}`, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    setBusy(true)
    setLog({ msg: 'Resetting demo — clearing DB and audit log…', type: 'idle' })
    try {
      const res  = await fetch('/api/reset', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setLayers(null)
        setReplayReady(false)
        lastValid.current = null
        setLog({ msg: '✓ Demo reset — all records and audit log cleared', type: 'ok' })
      } else {
        setLog({ msg: `✗ Reset failed — ${body.message ?? res.statusText}`, type: 'error' })
      }
    } catch (e) {
      setLog({ msg: `✗ Cannot reach server — ${e.message}`, type: 'error' })
    } finally {
      setBusy(false)
      onSent()
    }
  }

  async function toggleInspect() {
    if (preview) { setPreview(null); return }
    const payload   = buildPayload(DEVICE_ID)
    const signature = await hmacSign(payload)
    setPreview({ payload, signature })
  }

  return (
    <section className="controls">
      <div className="controls-header">
        <span className="section-title">Demo Controls</span>
        <span className="controls-hint">Each button simulates a real attack — watch the Audit Log to see which layer blocks it</span>
      </div>

      <div className="controls-row">
        <Tip text="Send a valid signed payload — all 4 security layers pass">
          <button className="btn btn--normal" onClick={handleNormal} disabled={busy}>
            ▶ Send Normal
          </button>
        </Tip>
        <Tip text="Sign payload first, then change temperature to 99.9°C — HMAC mismatch detected at L3">
          <button className="btn btn--tampered" onClick={handleTampered} disabled={busy}>
            ⚠ Send Tampered
          </button>
        </Tip>
        <Tip text="Resend the last valid nonce — server blocks it at L2b (replay guard)">
          <button className="btn btn--replay" onClick={handleReplay} disabled={busy || !replayReady}>
            ↻ Replay Attack
          </button>
        </Tip>
        <Tip text="Send a payload timestamped 35 seconds ago — server rejects at L2a (>30s tolerance)">
          <button className="btn btn--expired" onClick={handleExpiredTs} disabled={busy}>
            ⏱ Expired Timestamp
          </button>
        </Tip>
        <Tip text="Use an unknown API key — device rejected immediately at L1 (401 Unauthorized)">
          <button className="btn btn--wrongkey" onClick={handleWrongKey} disabled={busy}>
            🔑 Wrong API Key
          </button>
        </Tip>
        <Tip text="Preview a freshly-built payload and its HMAC signature before sending">
          <button className="btn btn--inspect" onClick={toggleInspect}>
            {preview ? '✕ Close Inspector' : '🔍 Inspect Payload'}
          </button>
        </Tip>
        <Tip text="Clear all DB records and the audit log — start the demo fresh">
          <button className="btn btn--reset" onClick={handleReset} disabled={busy}>
            ⟳ Reset Demo
          </button>
        </Tip>
        <Tip text={autoSend ? `Auto-sending every ${AUTO_INTERVAL_MS/1000}s — click to stop (${autoCount} sent)` : `Continuously send valid payloads every ${AUTO_INTERVAL_MS/1000}s to simulate a live sensor`}>
          <button
            className={`btn ${autoSend ? 'btn--auto-on' : 'btn--auto-off'}`}
            onClick={() => { setAutoSend(v => !v); if (autoSend) setAutoCount(0) }}
          >
            {autoSend ? `⏸ Auto-Send ON (${autoCount})` : '▶▶ Auto-Send'}
          </button>
        </Tip>
      </div>

      <div className={`action-log action-log--${log.type}`}>
        {log.msg}
      </div>

      <LayerStatus result={layers} />

      {preview && (
        <div className="inspector">
          <div className="inspector-title">Payload fields — all fields are signed; temperature is also encrypted in DB</div>
          <div className="inspector-fields">
            <div className="inspector-row">
              <span className="inspector-key">deviceId</span>
              <span className="inspector-val inspector-val--auth">{preview.payload.deviceId}</span>
              <span className="inspector-hint">Device identity — verified against API key (L1)</span>
            </div>
            <div className="inspector-row">
              <span className="inspector-key">temperature</span>
              <span className="inspector-val inspector-val--enc">{preview.payload.temperature}</span>
              <span className="inspector-hint">Stored as AES-256-GCM ciphertext in DB · covered by HMAC (L3)</span>
            </div>
            <div className="inspector-row">
              <span className="inspector-key">timestamp</span>
              <span className="inspector-val inspector-val--time">{preview.payload.timestamp}</span>
              <span className="inspector-hint">Freshness — server rejects if older than 30s (L2a)</span>
            </div>
            <div className="inspector-row">
              <span className="inspector-key">nonce</span>
              <span className="inspector-val inspector-val--nonce">{preview.payload.nonce}</span>
              <span className="inspector-hint">One-time token — server rejects if seen before (L2b replay guard)</span>
            </div>
          </div>
          <div className="inspector-sig">
            <span className="inspector-sig-label">X-Signature header — HMAC-SHA256 over all fields above (covers tampering)</span>
            <span className="inspector-sig-val">{preview.signature}</span>
          </div>
        </div>
      )}
    </section>
  )
}
