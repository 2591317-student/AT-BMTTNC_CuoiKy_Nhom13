export default function DataTable({ records, prevIds }) {
  if (records.length === 0) {
    return (
      <div className="table-empty">
        Waiting for data from sensor…
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Device ID</th>
            <th>Temperature</th>
            <th>Timestamp</th>
            <th>Encrypted (DB)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <Row key={r.id} record={r} isNew={!prevIds.has(r.id)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ record: r, isNew }) {
  const time = new Date(r.timestamp * 1000).toLocaleTimeString('vi-VN', { hour12: false })

  const tempClass = r.isValidSignature
    ? (r.temperature > 38 ? 'cell-temp--high' : 'cell-temp--normal')
    : 'cell-temp--tampered'

  const encPreview = r.encryptedTemp
    ? r.encryptedTemp.slice(0, 22) + '…'
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
    </tr>
  )
}
