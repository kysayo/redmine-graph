import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { EvmRegressionResult } from '../utils/evmRegression'

interface EvmRegressionPanelProps {
  result: EvmRegressionResult
  onApplyCoefficients: (coefficients: number[]) => void
}

const fmtCoef = (v: number) => {
  if (v === 0) return '—'
  return String(Math.round(v * 1000) / 1000)
}

const fmtDiff = (solved: number, current: number) => {
  if (solved === 0) return null
  const diff = Math.round((solved - current) * 1000) / 1000
  if (diff === 0) return null
  const sign = diff > 0 ? '+' : ''
  return { text: `${sign}${diff}`, positive: diff > 0 }
}

export function EvmRegressionPanel({ result, onApplyCoefficients }: EvmRegressionPanelProps) {
  const {
    months,
    groupNames,
    currentCoefficients,
    solvedCoefficients,
    clampedGroups,
    zeroDataGroups,
    chartData,
    isUnderdetermined,
    requiredMonths,
  } = result

  const thStyle: React.CSSProperties = {
    padding: '6px 12px',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
    background: '#f9fafb',
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '5px 12px',
    fontSize: 13,
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  }
  const tdNumStyle: React.CSSProperties = {
    ...tdStyle,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  }

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 10px' }}>
        係数逆算（最小二乗法）
      </h3>

      {/* 警告バナー群 */}
      {isUnderdetermined && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#92400e' }}>
          最低 <strong>{requiredMonths}</strong> ヶ月のデータが必要です（現在 {months.length} ヶ月）。
          月別実績工数を追加してください。
        </div>
      )}
      {zeroDataGroups.length > 0 && (
        <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#6b7280' }}>
          次のグループは全月0件のため逆算対象外です: <strong>{zeroDataGroups.join('、')}</strong>
        </div>
      )}
      {clampedGroups.length > 0 && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#be123c' }}>
          次のグループは逆算値が負のため 0 にクランプしました: <strong>{clampedGroups.join('、')}</strong>
        </div>
      )}

      {/* 折れ線グラフ */}
      {!isUnderdetermined && chartData.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                formatter={(value: string | number | undefined) =>
                  [typeof value === 'number' ? String(Math.round(value * 100) / 100) : String(value ?? '')] as [string]
                }
                labelFormatter={(label) => String(label)}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'actualEffort' ? '実際工数（入力値）' : '予測工数（逆算係数）'
                }
                iconType="line"
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="actualEffort"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="predictedEffort"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 4, fill: '#f59e0b' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 係数比較テーブル */}
      {!isUnderdetermined && (
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>グループ</th>
                <th style={thStyle}>現在の係数</th>
                <th style={thStyle}>逆算係数</th>
                <th style={thStyle}>差分</th>
              </tr>
            </thead>
            <tbody>
              {groupNames.map((name, i) => {
                const isZero = zeroDataGroups.includes(name)
                const isClamped = clampedGroups.includes(name)
                const solved = solvedCoefficients[i]
                const diff = fmtDiff(solved, currentCoefficients[i])
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={tdStyle}>{name}</td>
                    <td style={tdNumStyle}>{currentCoefficients[i]}</td>
                    <td style={{
                      ...tdNumStyle,
                      color: isZero || isClamped ? '#9ca3af' : '#111827',
                      fontStyle: isZero || isClamped ? 'italic' : 'normal',
                    }}>
                      {isZero || isClamped ? '—' : fmtCoef(solved)}
                    </td>
                    <td style={{
                      ...tdNumStyle,
                      color: !diff ? '#9ca3af' : diff.positive ? '#059669' : '#dc2626',
                      fontWeight: diff ? 600 : 400,
                    }}>
                      {diff ? diff.text : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 係数適用ボタン */}
      <button
        type="button"
        disabled={isUnderdetermined}
        onClick={() => onApplyCoefficients(solvedCoefficients)}
        style={{
          fontSize: 12,
          padding: '6px 14px',
          border: '1px solid',
          borderColor: isUnderdetermined ? '#d1d5db' : '#3b82f6',
          borderRadius: 5,
          background: isUnderdetermined ? '#f3f4f6' : '#eff6ff',
          color: isUnderdetermined ? '#9ca3af' : '#1d4ed8',
          cursor: isUnderdetermined ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        この係数を設定に適用
      </button>
    </div>
  )
}
