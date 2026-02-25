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
import type { ComboDataPoint, GraphConfig } from '../types'

interface Props {
  data: ComboDataPoint[]
  config: Pick<GraphConfig, 'comboLeft' | 'comboRight'>
}

const LABEL: Record<string, string> = {
  cumulative: '累計チケット数',
  daily: '日別チケット数',
}

export function ComboChart({ data, config }: Props) {
  const leftKey = config.comboLeft
  const rightKey = config.comboRight

  // 左軸が折れ線、右軸が棒グラフ（または逆）を設定で切り替え
  // comboLeft が 'cumulative' なら左軸=折れ線(累計)、右軸=棒(日別) がデフォルト
  // ユーザーが入れ替えた場合はそれぞれの役割が入れ替わる
  const isLeftLine = leftKey === 'cumulative'

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />

        {isLeftLine ? (
          <>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={leftKey}
              name={LABEL[leftKey]}
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
            />
            <Bar
              yAxisId="right"
              dataKey={rightKey}
              name={LABEL[rightKey]}
              fill="#93c5fd"
              barSize={12}
            />
          </>
        ) : (
          <>
            <Bar
              yAxisId="left"
              dataKey={leftKey}
              name={LABEL[leftKey]}
              fill="#93c5fd"
              barSize={12}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={rightKey}
              name={LABEL[rightKey]}
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
