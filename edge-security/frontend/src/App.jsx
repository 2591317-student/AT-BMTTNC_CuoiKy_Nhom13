import Header       from './components/Header'
import StatCard     from './components/StatCard'
import DemoControls from './components/DemoControls'
import DataTable    from './components/DataTable'
import { useSensorData } from './hooks/useSensorData'
import './App.css'

export default function App() {
  const { records, stats, online, prevIds, refresh } = useSensorData()

  return (
    <div className="app">
      <Header online={online} />

      <section className="stats">
        <StatCard value={stats.total}    label="Total Records"     variant="default"  />
        <StatCard value={stats.valid}    label="Valid Signatures"  variant="valid"    />
        <StatCard value={stats.tampered} label="Tampered Detected" variant="tampered" />
      </section>

      <DemoControls onSent={refresh} />

      <section className="table-section">
        <div className="table-toolbar">
          <span className="section-title">
            Recent Records
            <span className="table-count">{stats.total}</span>
          </span>
          <span className="table-refresh">Auto-refresh: 3s</span>
        </div>
        <DataTable records={records} prevIds={prevIds} />
      </section>

      <footer className="footer">
        AES-256-GCM &nbsp;·&nbsp; HMAC-SHA256 &nbsp;·&nbsp; Nonce Replay Guard
        &nbsp;·&nbsp; Edge Computing Security Demo
      </footer>
    </div>
  )
}
