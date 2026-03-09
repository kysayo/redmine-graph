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
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function PieChart({ data, groupBy, onSliceClick }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const title = `${groupBy} ${total}件`

  return (
    <div style={{ width: '100%' }}>
      <p style={{ textAlign: 'center', fontSize: 13, margin: '0 0 4px' }}>{title}</p>
      <ResponsiveContainer width="100%" height={300}>
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
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
