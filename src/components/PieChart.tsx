import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { PieDataPoint } from '../types'

interface Props {
  data: PieDataPoint[]
  groupBy: string
  onSliceClick?: (slice: PieDataPoint) => void
  wide?: boolean
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

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
            <Tooltip formatter={(value: number | undefined) => [`${value ?? 0}件`, '']} />
          </RechartsPieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', padding: '8px 16px', justifyContent: 'center' }}>
          {data.map((item, index) => (
            <span
              key={index}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: onSliceClick ? 'pointer' : undefined }}
              onClick={() => onSliceClick?.(item)}
            >
              <span style={{ width: 12, height: 12, background: COLORS[index % COLORS.length], display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
              {item.name}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const chartHeight = Math.max(300, 180 + data.length * 22)

  return (
    <div style={{ width: '100%' }}>
      <p style={{ textAlign: 'center', fontSize: 13, margin: '0 0 4px' }}>{title}</p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <RechartsPieChart margin={{ top: 30, right: 100, bottom: 10, left: 100 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent, value }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}% ${value}件`}
            labelLine={true}
            cursor={onSliceClick ? 'pointer' : undefined}
            onClick={onSliceClick ? (entry) => onSliceClick(entry as PieDataPoint) : undefined}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number | undefined) => [`${value ?? 0}件`, '']} />
          <Legend
            onClick={onSliceClick ? (entry) => {
              const slice = data.find(d => d.name === entry.value)
              if (slice) onSliceClick(slice)
            } : undefined}
            style={{ cursor: onSliceClick ? 'pointer' : undefined }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
