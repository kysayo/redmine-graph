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

    return (
      <div ref={ref}>
        <ResponsiveContainer width="100%" height={chartHeight ?? 320}>
          <ComposedChart data={data} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              interval={0}
              tick={<CustomXAxisTick tickInterval={tickInterval} fmt={fmt} />}
            />
            <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} domain={yAxisLeftMin !== undefined ? [yAxisLeftMin, (dataMax: number) => Math.max(dataMax, yAxisLeftMin + 1)] : undefined} allowDataOverflow={yAxisLeftMin !== undefined} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={yAxisRightMax !== undefined ? [(dataMin: number) => Math.min(dataMin, yAxisRightMax - 1), yAxisRightMax] : undefined} allowDataOverflow={yAxisRightMax !== undefined} />
            <Tooltip />
            <Legend />

            {series.map((s) =>
              s.chartType === 'line' ? (
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
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }
)
