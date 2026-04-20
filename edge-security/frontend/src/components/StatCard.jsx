export default function StatCard({ value, label, variant }) {
  return (
    <div className={`stat-card stat-card--${variant ?? 'default'}`}>
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
