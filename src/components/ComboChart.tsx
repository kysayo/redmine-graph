import { forwardRef, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts'
import type { SeriesConfig, SeriesDataPoint } from '../types'

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      padding: '8px 12px',
      fontSize: 12,
      minWidth: 120,
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#374151', fontSize: 11 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '2px 0', color: entry.color, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{entry.name}</span>
          <span style={{ fontWeight: 600 }}>{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

interface Props {
  data: SeriesDataPoint[]
  series: SeriesConfig[]
  yAxisLeftMin?: number
  yAxisLeftMinAuto?: boolean
  yAxisRightMax?: number
  dateFormat?: 'yyyy-mm-dd' | 'M/D'
  chartHeight?: number
  showBrush?: boolean
}

function formatDateTick(dateStr: string, fmt: 'yyyy-mm-dd' | 'M/D'): string {
  if (fmt === 'yyyy-mm-dd') return dateStr
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}/${Number(d)}`
}

interface CustomTickProps {
  x?: number
  y?: number
  payload?: { value: string }
  index?: number
  tickInterval: number
  fmt: 'yyyy-mm-dd' | 'M/D'
}

function CustomXAxisTick({ x = 0, y = 0, payload, index = 0, tickInterval, fmt }: CustomTickProps) {
  const showLabel = tickInterval === 0 || index % (tickInterval + 1) === 0
  const label = payload ? formatDateTick(payload.value, fmt) : ''
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={6} stroke="#666" strokeWidth={1} />
      {showLabel && (
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={11}>
          {label}
        </text>
      )}
    </g>
  )
}

export const ComboChart = forwardRef<HTMLDivElement, Props>(
  function ComboChart({ data, series, yAxisLeftMin, yAxisLeftMinAuto, yAxisRightMax, dateFormat, chartHeight, showBrush }, ref) {
    const fmt = dateFormat ?? 'yyyy-mm-dd'
    const maxTicks = fmt === 'M/D' ? 20 : 10
    const tickInterval = Math.max(0, Math.ceil(data.length / maxTicks) - 1)
    const brushEnabled = showBrush ?? data.length > 30

    const visibleSeries = series.filter(s => s.visible ?? true)
    const hasLeft = visibleSeries.some(s => s.yAxisId === 'left')
    const hasRight = visibleSeries.some(s => s.yAxisId === 'right')

    const autoLeftMin = useMemo(() => {
      if (!yAxisLeftMinAuto) return undefined
      const leftSeriesIds = series
        .filter(s => s.yAxisId === 'left' && (s.visible ?? true))
        .map(s => s.id)
      if (leftSeriesIds.length === 0) return undefined
      const dataMax = data.reduce((max, point) => {
        const vals = leftSeriesIds.map(id => (point[id] as number) ?? 0)
        return Math.max(max, ...vals)
      }, 0)
      return Math.floor(dataMax * 0.8 / 10) * 10
    }, [yAxisLeftMinAuto, data, series])

    const effectiveLeftMin = yAxisLeftMinAuto ? autoLeftMin : yAxisLeftMin

    return (
      <div ref={ref}>
        <ResponsiveContainer width="100%" height={(chartHeight ?? 320) + (brushEnabled ? 40 : 0)}>
          <ComposedChart data={data} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              interval={0}
              tick={<CustomXAxisTick tickInterval={tickInterval} fmt={fmt} />}
            />
            <YAxis yAxisId="left" orientation="left" hide={!hasLeft} tick={{ fontSize: 11 }} domain={effectiveLeftMin !== undefined ? [effectiveLeftMin, (dataMax: number) => Math.max(dataMax, effectiveLeftMin + 1)] : undefined} allowDataOverflow={effectiveLeftMin !== undefined} />
            <YAxis yAxisId="right" orientation="right" hide={!hasRight} tick={{ fontSize: 11 }} domain={yAxisRightMax !== undefined ? [(dataMin: number) => Math.min(dataMin, yAxisRightMax - 1), yAxisRightMax] : undefined} allowDataOverflow={yAxisRightMax !== undefined} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              content={() => (
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 16px', padding: '4px 0', fontSize: 12, color: '#666' }}>
                  {visibleSeries.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {s.chartType === 'line' ? (
                        <svg width={14} height={14}><line x1={0} y1={7} x2={14} y2={7} stroke={s.color} strokeWidth={2} /></svg>
                      ) : (
                        <div style={{ width: 10, height: 10, background: s.color }} />
                      )}
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            />

            {brushEnabled && (
              <Brush
                dataKey="date"
                height={24}
                stroke="#d1d5db"
                fill="#f9fafb"
                travellerWidth={6}
                tickFormatter={(v: string) => formatDateTick(v, fmt)}
              />
            )}

            {series.map((s) => {
              if (!(s.visible ?? true)) return null
              return s.chartType === 'line' ? (
                <Line
                  key={s.id}
                  yAxisId={s.yAxisId}
                  type="monotone"
                  dataKey={s.id}
                  name={s.label}
                  stroke={s.color}
                  dot={false}
                  strokeWidth={2}
                />
              ) : (
                <Bar
                  key={s.id}
                  yAxisId={s.yAxisId}
                  dataKey={s.id}
                  name={s.label}
                  fill={s.color}
                  barSize={12}
                />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }
)
