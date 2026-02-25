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
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function PieChart({ data, groupBy }: Props) {
  const title = `チケット割合（${groupBy}別）`

  return (
    <div style={{ width: '100%' }}>
      <p style={{ textAlign: 'center', fontSize: 13, margin: '0 0 4px' }}>{title}</p>
      <ResponsiveContainer width="100%" height={280}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={true}
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
