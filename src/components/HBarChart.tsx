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
import type { PieDataPoint, StackedBarDataPoint } from '../types'

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
        <span style={{ fontWeight: 600, color: '#111827', marginLeft: 4 }}>{entry.value} Case</span>
      </p>
    </div>
  )
}

function StackedTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0)
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      padding: '8px 12px',
      fontSize: 12,
      minWidth: 140,
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#111827' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: p.fill, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: '#374151', flex: 1 }}>{p.name}</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{p.value} Case</span>
        </p>
      ))}
      <p style={{ margin: '6px 0 0', borderTop: '1px solid #e5e7eb', paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#6b7280' }}>合計</span>
        <span style={{ fontWeight: 700, color: '#111827' }}>{total} Case</span>
      </p>
    </div>
  )
}

interface Props {
  data: PieDataPoint[]
  title: string
  topN?: number
  onBarClick?: (slice: PieDataPoint) => void
  // 積み上げモード（colorBy指定時）
  stackedData?: StackedBarDataPoint[]
  onSegmentClick?: (
    name: string,
    mainFilterValues: string[] | undefined,
    segmentName: string,
    segmentFilterValues: string[] | undefined
  ) => void
  onLabelClick?: (name: string, filterValues: string[] | undefined) => void
}

function CustomYAxisTick(props: {
  x?: string | number
  y?: string | number
  payload?: { value: string }
  flatData: Record<string, unknown>[]
  onLabelClick: (name: string, filterValues: string[] | undefined) => void
}) {
  const { x, y, payload, flatData, onLabelClick } = props
  const xNum = typeof x === 'string' ? parseFloat(x) : (x ?? 0)
  const yNum = typeof y === 'string' ? parseFloat(y) : (y ?? 0)
  const name = payload?.value ?? ''
  const raw = flatData.find(d => d.name === name)?._raw as StackedBarDataPoint | undefined
  // 長い名前は折り返す（120px幅の中で）
  const words = name.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (test.length > 12 && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  const lineHeight = 14
  const totalHeight = lines.length * lineHeight
  return (
    <g transform={`translate(${xNum},${yNum})`} onClick={() => onLabelClick(name, raw?.filterValues)}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={i * lineHeight - totalHeight / 2 + lineHeight / 2}
          textAnchor="end"
          fill="#374151"
          fontSize={12}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

export function HBarChart({ data, title, topN, onBarClick, stackedData, onSegmentClick, onLabelClick }: Props) {
  // 積み上げモード
  if (stackedData) {
    const sorted = [...stackedData].sort((a, b) => b.total - a.total)
    const displayed = topN != null && topN > 0 ? sorted.slice(0, topN) : sorted

    // 全セグメント名を収集（表示順を決定）
    const segKeySet = new Set<string>()
    for (const d of displayed) {
      for (const k of Object.keys(d.segments)) {
        segKeySet.add(k)
      }
    }
    const segKeys = Array.from(segKeySet)

    // セグメント名 → 色のマップ
    const segColorMap: Record<string, string> = {}
    segKeys.forEach((k, i) => {
      segColorMap[k] = COLORS[i % COLORS.length]
    })

    // Recharts 用のフラットなデータに変換
    const flatData = displayed.map(d => {
      const flat: Record<string, unknown> = { name: d.name, total: d.total, _raw: d }
      for (const k of segKeys) {
        flat[k] = d.segments[k]?.count ?? 0
      }
      return flat
    })

    const chartHeight = Math.max(200, displayed.length * 36 + 40)

    return (
      <div style={{ width: '100%' }}>
        <p style={{ textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 4px 8px' }}>{title}</p>
        {/* 凡例 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginBottom: 8, paddingLeft: 8 }}>
          {segKeys.map(k => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#374151' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: segColorMap[k], display: 'inline-block', flexShrink: 0 }} />
              {k}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={flatData}
            margin={{ top: 4, right: 90, bottom: 4, left: 8 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={onLabelClick
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (tickProps: any) => (
                    <CustomYAxisTick {...tickProps} flatData={flatData} onLabelClick={onLabelClick} />
                  )
                : { fontSize: 12, fill: '#374151' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<StackedTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            {segKeys.map((segKey, idx) => (
              <Bar
                key={segKey}
                dataKey={segKey}
                stackId="stack"
                fill={segColorMap[segKey]}
                radius={idx === segKeys.length - 1 ? [0, 4, 4, 0] : undefined}
                cursor={onSegmentClick ? 'pointer' : undefined}
                onClick={onSegmentClick ? (barData) => {
                  const raw = (barData as unknown as Record<string, unknown>)._raw as StackedBarDataPoint
                  onSegmentClick(
                    raw.name,
                    raw.filterValues,
                    segKey,
                    raw.segments[segKey]?.filterValues,
                  )
                } : undefined}
              >
                {idx === segKeys.length - 1 && (
                  <LabelList
                    dataKey="total"
                    position="right"
                    formatter={(v: unknown) => `${v} Case`}
                    style={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
        {topN != null && topN > 0 && stackedData.length > topN && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280', paddingLeft: 8 }}>
            他 {stackedData.length - topN} 件（全 {stackedData.length} 件中）
          </div>
        )}
      </div>
    )
  }

  // 通常モード（色分けなし）
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
          margin={{ top: 4, right: 90, bottom: 4, left: 8 }}
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
              formatter={(v: unknown) => `${v} Case`}
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
