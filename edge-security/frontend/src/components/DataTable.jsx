import { useState, useEffect } from 'react'
import EncryptionModal from './EncryptionModal'
import Pagination from './Pagination'

const PAGE_SIZE = 10

export default function DataTable({ records, prevIds, filter = 'all' }) {
  const [selected, setSelected] = useState(null)
  const [page, setPage]         = useState(1)

  const visible = filter === 'all'   ? records
                : filter === 'valid' ? records.filter(r =>  r.isValidSignature)
                :                     records.filter(r => !r.isValidSignature)

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1) }, [filter])

  if (records.length === 0) {
    return <div className="table-empty">Waiting for data from sensor…</div>
  }

  if (visible.length === 0) {
    return <div className="table-empty">No {filter} records yet.</div>
  }

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Device ID</th>
            <th>Temperature</th>
            <th>Timestamp</th>
            <th>Encrypted in DB (AES-256-GCM)</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {paged.map(r => (
            <Row key={r.id} record={r} isNew={!prevIds.has(r.id)} onInspect={setSelected} />
          ))}
        </tbody>
      </table>

      <Pagination
        page={page}
        total={visible.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {selected && (
        <EncryptionModal record={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function Row({ record: r, isNew, onInspect }) {
  const time = new Date(r.timestamp * 1000).toLocaleTimeString('vi-VN', { hour12: false })

  const tempClass = r.isValidSignature
    ? (r.temperature > 38 ? 'cell-temp--high' : 'cell-temp--normal')
    : 'cell-temp--tampered'

  const encPreview = r.encryptedTemp
    ? r.encryptedTemp.slice(0, 44) + '…'
    : '—'

  return (
    <tr className={isNew ? 'row-new' : ''}>
      <td className="cell-id">{r.id}</td>
      <td className="cell-device">{r.deviceId}</td>
      <td className={`cell-temp ${tempClass}`}>
        {r.temperature != null ? `${r.temperature.toFixed(2)}°C` : '—'}
      </td>
      <td className="cell-time">{time}</td>
      <td className="cell-enc" title={r.encryptedTemp ?? ''}>{encPreview}</td>
      <td>
        {r.isValidSignature
          ? <span className="badge badge--valid">✓ Valid</span>
          : <span className="badge badge--tampered">✗ Tampered</span>
        }
      </td>
      <td>
        <button className="btn-inspect-row" onClick={() => onInspect(r)} title="View encryption details">
          🔍
        </button>
      </td>
    </tr>
  )
}
