import { useEffect } from 'react'

export default function EncryptionModal({ record, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!record) return null

  const enc     = record.encryptedTemp ?? ''
  const tempStr = record.temperature != null ? record.temperature.toFixed(2) : 'null'
  const time    = new Date(record.timestamp * 1000).toLocaleTimeString('en-GB', { hour12: false })

  // AES-GCM binary layout: nonce(12B) | ciphertext | tag(16B)
  // base64 of 12 bytes = 16 chars (12 divisible by 3, no padding)
  // base64 of 16 bytes = 24 chars (with padding)
  const noncePreview  = enc.slice(0, 16)
  const tagPreview    = enc.slice(-24)
  const cipherPreview = enc.slice(16, -24)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>🔒 AES-256-GCM — Record #{record.id}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-row">
            <span className="modal-label">Plaintext</span>
            <span className="modal-plain">{tempStr}°C</span>
            <span className="modal-meta">stored in memory only — never in DB</span>
          </div>

          <div className="modal-arrow">
            ↓ &nbsp; AES-256-GCM( key=SHA-256(AES_KEY)[32B], nonce=random[12B] )
          </div>

          <div className="modal-row modal-row--col">
            <span className="modal-label">Ciphertext breakdown</span>
            <div className="modal-enc-breakdown">
              <span className="modal-enc-nonce"  title="12-byte random nonce">[nonce · {noncePreview}]</span>
              <span className="modal-enc-cipher" title="Encrypted temperature bytes">[cipher · {cipherPreview || '…'}]</span>
              <span className="modal-enc-tag"    title="16-byte GCM authentication tag">[tag · {tagPreview}]</span>
            </div>
          </div>

          <div className="modal-row modal-row--col">
            <span className="modal-label">Full Base64 ({enc.length} chars stored in DB)</span>
            <code className="modal-cipher-full">{enc}</code>
          </div>

          <div className="modal-row">
            <span className="modal-label">HMAC status</span>
            <span className={record.isValidSignature ? 'modal-badge modal-badge--valid' : 'modal-badge modal-badge--tampered'}>
              {record.isValidSignature ? '✓ Signature verified' : '✗ Tampered — HMAC mismatch'}
            </span>
          </div>

          <div className="modal-row">
            <span className="modal-label">Timestamp</span>
            <span className="modal-meta">{time} · device: {record.deviceId}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
