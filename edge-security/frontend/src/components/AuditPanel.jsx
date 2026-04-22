import { useState } from 'react'
import Pagination from './Pagination'
import { exportAuditCsv } from '../utils/csv'

const PAGE_SIZE = 10

export default function AuditPanel({ log }) {
  const [page, setPage] = useState(1)

  const paged = log.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="audit-panel">
      <div className="audit-header">
        <span className="section-title">
          Request Audit Log
          <span className="table-count">{log.length}</span>
        </span>
        <span className="audit-hint">
          L1 = API Key &nbsp;·&nbsp; L2a = Timestamp &nbsp;·&nbsp; L2b = Replay &nbsp;·&nbsp; L3 = HMAC &nbsp;·&nbsp; L4 = Rate Limit
        </span>
        {log.length > 0 && (
          <button className="btn-csv" onClick={() => exportAuditCsv(log)} title="Export audit log as CSV">
            ↓ Export CSV
          </button>
        )}
      </div>

      {log.length === 0
        ? <div className="audit-empty">No requests yet — press a demo button above…</div>
        : (
          <>
            <div className="audit-list">
              {paged.map((entry, i) => <AuditEntry key={i} entry={entry} />)}
            </div>
            <Pagination
              page={page}
              total={log.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
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
    : entry.code === 429 ? 'ratelimit'
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
