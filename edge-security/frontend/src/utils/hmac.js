import { HMAC_SECRET } from '../config'

/** Replicates Python: json.dumps(payload, sort_keys=True, separators=(',',':')) */
function canonicalize(obj) {
  const sorted = {}
  Object.keys(obj).sort().forEach(k => { sorted[k] = obj[k] })
  return JSON.stringify(sorted)
}

export async function hmacSign(payload) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(canonicalize(payload)))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function buildPayload(deviceId) {
  return {
    deviceId,
    temperature: +(Math.random() * 10 + 30).toFixed(2),
    timestamp:   Math.floor(Date.now() / 1000),
    nonce:       crypto.randomUUID(),
  }
}
