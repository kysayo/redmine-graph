import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PieDataPoint } from '../types'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7',
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name?: string; value?: number; payload?: { fill?: string } }[] }) {
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
        <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[0], display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: '#374151' }}>{entry.name}</span>
        <span style={{ fontWeight: 600, color: '#111827', marginLeft: 4 }}>{entry.value}件</span>
      </p>
    </div>
  )
}

interface Props {
  data: PieDataPoint[]
  title: string
  topN?: number
  onBarClick?: (slice: PieDataPoint) => void
}

export function HBarChart({ data, title, topN, onBarClick }: Props) {
  // 件数降順にソートして topN でスライス
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const displayed = topN != null && topN > 0 ? sorted.slice(0, topN) : sorted

  const chartHeight = Math.max(200, displayed.length * 36 + 40)

  return (
    <div style={{ width: '100%' }}>
      <p style={{ textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 4px 8px' }}>{title}</p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={displayed}
          margin={{ top: 4, right: 72, bottom: 4, left: 8 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={onBarClick ? (barData) => onBarClick(barData as PieDataPoint) : undefined}
          >
            {displayed.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: unknown) => `${v}件`}
              style={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {topN != null && topN > 0 && data.length > topN && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280', paddingLeft: 8 }}>
          他 {data.length - topN} 件（全 {data.length} 件中）
        </div>
      )}
    </div>
  )
}
