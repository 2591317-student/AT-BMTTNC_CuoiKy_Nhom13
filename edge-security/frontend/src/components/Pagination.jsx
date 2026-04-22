export default function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)

  return (
    <div className="pagination">
      <button className="pg-btn" disabled={page === 1} onClick={() => onChange(1)}>«</button>
      <button className="pg-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      <span className="pg-info">
        {start}–{end} / {total}
      </span>
      <button className="pg-btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
      <button className="pg-btn" disabled={page === totalPages} onClick={() => onChange(totalPages)}>»</button>
    </div>
  )
}
