import { useState } from 'react'
import Header       from './components/Header'
import StatCard     from './components/StatCard'
import DemoControls from './components/DemoControls'
import DataTable         from './components/DataTable'
import AuditPanel        from './components/AuditPanel'
import TemperatureChart  from './components/TemperatureChart'
import { useSensorData } from './hooks/useSensorData'
import { exportRecordsCsv } from './utils/csv'
import './App.css'

export default function App() {
  const { records, stats, online, prevIds, lastUpdated, auditLog, countdown, refresh } = useSensorData()
  const [filter, setFilter] = useState('all')

  return (
    <div className="app">
      <Header online={online} />

      <section className="stats">
        <StatCard value={stats.total}          label="Total Records"     variant="default"  />
        <StatCard value={stats.valid}          label="Valid Signatures"  variant="valid"    />
        <StatCard value={stats.tampered}       label="Tampered Detected" variant="tampered" />
        <StatCard value={stats.replayAttempts} label="Replay Attempts"   variant="replay"   />
        <StatCard value={stats.activeDevices}  label="Active Devices"    variant="device"   />
      </section>

      <DemoControls onSent={refresh} />

      <TemperatureChart records={records} />

      <section className="table-section">
        <div className="table-toolbar">
          <span className="section-title">
            Recent Records
            <span className="table-count">{stats.total}</span>
          </span>

          <div className="filter-row">
            {['all', 'valid', 'tampered'].map(f => (
              <button
                key={f}
                className={`btn-filter ${filter === f ? 'btn-filter--active' : ''} btn-filter--${f}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'valid' ? '✓ Valid' : '✗ Tampered'}
              </button>
            ))}
          </div>

          <div className="table-toolbar-right">
            <span className="table-legend">
              <span className="legend-dot legend-dot--normal" /> Normal &nbsp;
              <span className="legend-dot legend-dot--high" /> High (&gt;38°C) &nbsp;
              <span className="legend-dot legend-dot--tampered" /> Tampered
            </span>
            {records.length > 0 && (
              <button className="btn-csv" onClick={() => exportRecordsCsv(records)} title="Export records as CSV">
                ↓ Export CSV
              </button>
            )}
            <span className="table-refresh">
              {lastUpdated ? `Updated: ${lastUpdated}` : 'Connecting…'}
              &nbsp;·&nbsp;
              <span className="countdown">refresh in {countdown}s</span>
            </span>
          </div>
        </div>
        <DataTable records={records} prevIds={prevIds} filter={filter} />
      </section>

      <AuditPanel log={auditLog} />

      <footer className="footer">
        AES-256-GCM &nbsp;·&nbsp; HMAC-SHA256 &nbsp;·&nbsp; Nonce Replay Guard
        &nbsp;·&nbsp; Edge Computing Security Demo
      </footer>
    </div>
  )
}
