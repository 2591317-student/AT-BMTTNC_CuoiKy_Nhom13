import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-time">{d.timeLabel}</div>
      <div className="chart-tooltip-temp" style={{ color: d.color }}>
        {d.temperature != null ? `${d.temperature.toFixed(2)}°C` : '—'}
      </div>
      <div className="chart-tooltip-status">{d.isValidSignature ? '✓ Valid' : '✗ Tampered'}</div>
      <div className="chart-tooltip-device">{d.deviceId}</div>
    </div>
  )
}

export default function TemperatureChart({ records }) {
  if (records.length === 0) return null

  // Show last 30 records, oldest first for the chart
  const data = [...records].reverse().slice(-30).map(r => ({
    ...r,
    timeLabel: new Date(r.timestamp * 1000).toLocaleTimeString('en-GB', { hour12: false }),
    // Dot color: tampered=red, high=orange, normal=green
    color: !r.isValidSignature ? '#f85149'
         : r.temperature > 38  ? '#d29922'
         :                        '#3fb950',
  }))

  return (
    <section className="chart-section">
      <div className="chart-header">
        <span className="section-title">Temperature History</span>
        <span className="chart-hint">Last 30 readings · red = tampered · orange = high (&gt;38°C)</span>
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
            <ReferenceLine y={38} stroke="#d29922" strokeDasharray="4 4" label={{ value: '38°C', fill: '#d29922', fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#58a6ff"
              strokeWidth={2}
              dot={({ cx, cy, payload }) => (
                <circle key={`dot-${payload.id}`} cx={cx} cy={cy} r={4}
                  fill={payload.color} stroke="#0d1117" strokeWidth={1.5} />
              )}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
