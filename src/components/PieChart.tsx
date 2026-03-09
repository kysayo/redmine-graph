import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PieDataPoint } from '../types'

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: { name?: string; value?: number; payload?: { fill?: string } }[] }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: entry.payload?.fill ?? '#ccc', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: '#374151' }}>{entry.name}</span>
        <span style={{ fontWeight: 600, color: '#111827', marginLeft: 4 }}>{entry.value}件</span>
      </p>
    </div>
  )
}

interface Props {
  data: PieDataPoint[]
  groupBy: string
  onSliceClick?: (slice: PieDataPoint) => void
  wide?: boolean
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7',
]

export function PieChart({ data, groupBy, onSliceClick, wide }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const title = `${groupBy} ${total}件`

  if (wide) {
    return (
      <div style={{ width: '100%' }}>
        <p style={{ textAlign: 'center', fontSize: 13, margin: '0 0 4px' }}>{title}</p>
        <ResponsiveContainer width="100%" height={350}>
          <RechartsPieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={150}
              cursor={onSliceClick ? 'pointer' : undefined}
              onClick={onSliceClick ? (entry) => onSliceClick(entry as PieDataPoint) : undefined}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', padding: '8px 16px', justifyContent: 'center' }}>
          {data.map((item, index) => (
            <span
              key={index}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: onSliceClick ? 'pointer' : undefined }}
              onClick={() => onSliceClick?.(item)}
            >
              <span style={{ width: 12, height: 12, background: COLORS[index % COLORS.length], display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ color: '#374151' }}>{item.name}</span>
              <span style={{ color: '#6b7280' }}>{((item.value / total) * 100).toFixed(0)}%</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{item.value}件</span>
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <p style={{ textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 4px 8px' }}>{groupBy}</p>
      <div style={{ position: 'relative', width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsPieChart margin={{ top: 40, right: 80, bottom: 40, left: 80 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={108}
              startAngle={90}
              endAngle={-270}
              label={({ cx, cy, midAngle, outerRadius, name, percent, value, index }) => {
                if ((percent ?? 0) < 0.05) return null
                const RADIAN = Math.PI / 180
                const angle = midAngle ?? 0
                const cos = Math.cos(-angle * RADIAN)
                const sin = Math.sin(-angle * RADIAN)
                const sx = cx + outerRadius * cos
                const sy = cy + outerRadius * sin
                // 上方向(70-110°)・下方向(250-290°)は横にずらす
                let bendAngle = angle
                if (angle > 70 && angle < 110) bendAngle = angle <= 90 ? 65 : 115
                else if (angle > 250 && angle < 290) bendAngle = angle <= 270 ? 245 : 295
                const bcos = Math.cos(-bendAngle * RADIAN)
                const bsin = Math.sin(-bendAngle * RADIAN)
                const ex = cx + (outerRadius + 35) * bcos
                const ey = cy + (outerRadius + 35) * bsin
                const color = COLORS[(index ?? 0) % COLORS.length]
                return (
                  <g>
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={1} />
                    <text x={ex + (bcos >= 0 ? 5 : -5)} y={ey} textAnchor={bcos >= 0 ? 'start' : 'end'} dominantBaseline="central" fill={color} fontSize={11}>
                      {`${name}:${value}件:${((percent ?? 0) * 100).toFixed(0)}%`}
                    </text>
                  </g>
                )
              }}
              labelLine={false}
              cursor={onSliceClick ? 'pointer' : undefined}
              onClick={onSliceClick ? (entry) => onSliceClick(entry as PieDataPoint) : undefined}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: 150, left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>件</div>
        </div>
      </div>
      <div style={{ padding: '4px 8px' }}>
        {data.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 4px',
              borderBottom: index < data.length - 1 ? '1px solid #f3f4f6' : 'none',
              cursor: onSliceClick ? 'pointer' : undefined,
            }}
            onClick={() => onSliceClick?.(item)}
          >
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[index % COLORS.length], flexShrink: 0, marginRight: 10 }} />
            <span style={{ flex: 1, color: '#374151', fontSize: 13 }}>{item.name}</span>
            <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
