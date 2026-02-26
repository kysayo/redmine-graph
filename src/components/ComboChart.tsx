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
}

export function ComboChart({ data, series, yAxisLeftMin }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} domain={yAxisLeftMin !== undefined ? [yAxisLeftMin, (dataMax: number) => Math.max(dataMax, yAxisLeftMin + 1)] : undefined} allowDataOverflow={yAxisLeftMin !== undefined} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
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
  )
}
