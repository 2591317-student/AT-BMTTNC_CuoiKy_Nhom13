export default function AuditPanel({ log }) {
  return (
    <section className="audit-panel">
      <div className="audit-header">
        <span className="section-title">
          Request Audit Log
          <span className="table-count">{log.length}</span>
        </span>
        <span className="audit-hint">last 20 requests · resets on server restart</span>
      </div>

      {log.length === 0
        ? <div className="audit-empty">No requests yet — press a demo button above…</div>
        : (
          <div className="audit-list">
            {log.map((entry, i) => <AuditEntry key={i} entry={entry} />)}
          </div>
        )
      }
    </section>
  )
}

function AuditEntry({ entry }) {
  const time = new Date(entry.time * 1000).toLocaleTimeString('en-GB', { hour12: false })

  const codeVariant =
    entry.code === 200 ? 'ok'
    : entry.code === 401 ? 'unauth'
    : entry.code === 403 ? 'forbidden'
    : 'error'

  const layerLabel = entry.layer
    ? <span className="audit-layer">{entry.layer}</span>
    : null

  return (
    <div className={`audit-entry audit-entry--${codeVariant}`}>
      <span className="audit-time">{time}</span>
      <span className={`audit-code audit-code--${codeVariant}`}>{entry.code}</span>
      {layerLabel}
      <span className="audit-device">{entry.device}</span>
      <span className="audit-reason">{entry.reason}</span>
    </div>
  )
}
