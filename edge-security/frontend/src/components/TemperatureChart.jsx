import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import { DEVICES } from '../config'

const DEVICE_COLORS = {
  'sensor-001': '#58a6ff',
  'sensor-002': '#3fb950',
  'sensor-003': '#a371f7',
}

function dotFill(deviceId, payload) {
  const status = payload[`_s_${deviceId}`]
  if (status === 'tampered') return '#f85149'
  if (status === 'high')     return '#d29922'
  return DEVICE_COLORS[deviceId] ?? '#8b949e'
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const entries = payload.filter(p => p.value != null)
  if (!entries.length) return null
  const p   = entries[0]
  const d   = p.payload
  const status = d[`_s_${p.dataKey}`]
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-time">{d.timeLabel}</div>
      <div className="chart-tooltip-device" style={{ color: DEVICE_COLORS[p.dataKey] }}>{p.dataKey}</div>
      <div className="chart-tooltip-temp" style={{ color: dotFill(p.dataKey, d) }}>
        {p.value.toFixed(2)}°C
      </div>
      <div className="chart-tooltip-status">
        {status === 'tampered' ? '✗ Tampered' : status === 'high' ? '⚠ High temp' : '✓ Valid'}
      </div>
    </div>
  )
}

export default function TemperatureChart({ records }) {
  if (records.length === 0) return null

  const data = [...records].reverse().slice(-30).map(r => {
    const entry = {
      timeLabel: new Date(r.timestamp * 1000).toLocaleTimeString('en-GB', { hour12: false }),
    }
    DEVICES.forEach(({ deviceId }) => {
      entry[deviceId]         = null
      entry[`_s_${deviceId}`] = null
    })
    entry[r.deviceId]         = r.temperature
    entry[`_s_${r.deviceId}`] = !r.isValidSignature ? 'tampered'
                               : r.temperature > 38  ? 'high'
                               :                       'normal'
    return entry
  })

  return (
    <section className="chart-section">
      <div className="chart-header">
        <span className="section-title">Temperature History</span>
        <span className="chart-hint">Last 30 readings · red dot = tampered · orange dot = high (&gt;38°C)</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fill: '#8b949e', fontSize: 11 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#8b949e', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}°`}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }}
              formatter={value => (
                <span style={{ color: DEVICE_COLORS[value] }}>{value}</span>
              )}
            />
            <ReferenceLine
              y={38} stroke="#d29922" strokeDasharray="4 4"
              label={{ value: '38°C', fill: '#d29922', fontSize: 11 }}
            />
            {DEVICES.map(({ deviceId }) => (
              <Line
                key={deviceId}
                type="monotone"
                dataKey={deviceId}
                name={deviceId}
                stroke={DEVICE_COLORS[deviceId]}
                strokeWidth={2}
                connectNulls
                dot={(props) => {
                  const { cx, cy, payload } = props
                  if (payload[deviceId] == null) return <g key={props.key} />
                  return (
                    <circle
                      key={props.key}
                      cx={cx} cy={cy} r={4}
                      fill={dotFill(deviceId, payload)}
                      stroke="#0d1117" strokeWidth={1.5}
                    />
                  )
                }}
                activeDot={{ r: 6, fill: DEVICE_COLORS[deviceId] }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
