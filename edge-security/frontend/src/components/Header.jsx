export default function Header({ online }) {
  const dot   = online === null ? 'connecting' : online ? 'online' : 'offline'
  const label = online === null ? 'Connecting…' : online ? 'Connected' : 'Server offline'

  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-icon">🔒</span>
        <div>
          <h1 className="header-title">Edge Security Monitor</h1>
          <p className="header-sub">Secure IoT Temperature Monitoring System</p>
        </div>
      </div>
      <div className="header-status">
        <span className={`status-dot status-dot--${dot}`} />
        <span className="status-label">{label}</span>
      </div>
    </header>
  )
}
