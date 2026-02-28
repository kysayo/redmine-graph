import { forwardRef } from 'react'
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
} from 'recharts'
import type { SeriesConfig, SeriesDataPoint } from '../types'

interface Props {
  data: SeriesDataPoint[]
  series: SeriesConfig[]
  yAxisLeftMin?: number
  yAxisRightMax?: number
  dateFormat?: 'yyyy-mm-dd' | 'M/D'
  chartHeight?: number
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
  function ComboChart({ data, series, yAxisLeftMin, yAxisRightMax, dateFormat, chartHeight }, ref) {
    const fmt = dateFormat ?? 'yyyy-mm-dd'
    const maxTicks = fmt === 'M/D' ? 20 : 10
    const tickInterval = Math.max(0, Math.ceil(data.length / maxTicks) - 1)

    const visibleSeries = series.filter(s => s.visible ?? true)
    const hasLeft = visibleSeries.some(s => s.yAxisId === 'left')
    const hasRight = visibleSeries.some(s => s.yAxisId === 'right')

    return (
      <div ref={ref}>
        <ResponsiveContainer width="100%" height={chartHeight ?? 320}>
          <ComposedChart data={data} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              interval={0}
              tick={<CustomXAxisTick tickInterval={tickInterval} fmt={fmt} />}
            />
            <YAxis yAxisId="left" orientation="left" hide={!hasLeft} tick={{ fontSize: 11 }} domain={yAxisLeftMin !== undefined ? [yAxisLeftMin, (dataMax: number) => Math.max(dataMax, yAxisLeftMin + 1)] : undefined} allowDataOverflow={yAxisLeftMin !== undefined} />
            <YAxis yAxisId="right" orientation="right" hide={!hasRight} tick={{ fontSize: 11 }} domain={yAxisRightMax !== undefined ? [(dataMin: number) => Math.min(dataMin, yAxisRightMax - 1), yAxisRightMax] : undefined} allowDataOverflow={yAxisRightMax !== undefined} />
            <Tooltip />
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
