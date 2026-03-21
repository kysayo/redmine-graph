import type { EVMTileConfig } from '../types'
import type { EVMAggregateResult } from '../utils/issueAggregator'

interface EvmTileProps {
  config: EVMTileConfig
  result: EVMAggregateResult
}

const fmtEffort = (v: number) => {
  const rounded = Math.round(v * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function EvmTile({ config, result }: EvmTileProps) {
  const { title, startDate, endDate } = config
  const { rows, otherActualCount, totalBizDays, elapsedBizDays, plannedTotal, earnedEffort, actualTotal } = result
  const ratioPercent = totalBizDays > 0 ? Math.round((elapsedBizDays / totalBizDays) * 100) : 0

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
  const tdNameStyle: React.CSSProperties = {
    padding: '5px 12px',
    fontSize: 13,
    color: '#111827',
    borderBottom: '1px solid #f3f4f6',
  }
  const tdNumStyle: React.CSSProperties = {
    padding: '5px 12px',
    fontSize: 13,
    color: '#374151',
    textAlign: 'right',
    borderBottom: '1px solid #f3f4f6',
    whiteSpace: 'nowrap',
  }
  const tdTotalStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
    textAlign: 'right',
    borderTop: '2px solid #e5e7eb',
    whiteSpace: 'nowrap',
  }

  return (
    <div>
      {/* タイトル */}
      <h2 style={{ fontSize: 15, margin: '0 0 12px', fontWeight: 600, color: '#111827' }}>
        {title || 'チケット数EVM'}
      </h2>

      {/* サマリーヘッダ */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          <div>対象期間</div>
          <div style={{ fontWeight: 600, color: '#374151', marginTop: 2 }}>
            {startDate || '未設定'} 〜 {endDate || '未設定'}
          </div>
          <div style={{ marginTop: 2 }}>({totalBizDays} 営業日)</div>
        </div>

        {/* Earned */}
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          <div>Earned 進捗</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
              {elapsedBizDays}<span style={{ fontSize: 12, fontWeight: 400 }}>/{totalBizDays} 営業日</span>
            </span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>({ratioPercent}%)</span>
          </div>
          {/* 進捗バー */}
          <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, width: 160, marginTop: 4 }}>
            <div
              style={{
                background: '#10b981',
                borderRadius: 4,
                height: '100%',
                width: `${Math.min(100, ratioPercent)}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* KPIボックス群 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginLeft: 'auto' }}>
          <KpiBox label="Planned" value={fmtEffort(plannedTotal)} color="#3b82f6" />
          <KpiBox label="Earned" value={fmtEffort(earnedEffort)} color="#10b981" />
          <KpiBox label="Actual" value={fmtEffort(actualTotal)} color="#f59e0b" />
        </div>
      </div>

      {/* テーブル */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 500 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: '25%' }}>グループ</th>
              <th style={thStyle}>Planned 件数</th>
              <th style={thStyle}>工数/枚</th>
              <th style={thStyle}>Planned 工数</th>
              <th style={{ ...thStyle, borderLeft: '2px solid #d1d5db' }}>Actual 件数</th>
              <th style={thStyle}>Actual 工数</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={tdNameStyle}>{row.groupName}</td>
                <td style={tdNumStyle}>{row.plannedCount}</td>
                <td style={tdNumStyle}>{row.effortPerTicket}</td>
                <td style={tdNumStyle}>{fmtEffort(row.plannedEffort)}</td>
                <td style={{ ...tdNumStyle, borderLeft: '2px solid #e5e7eb' }}>{row.actualCount}</td>
                <td style={tdNumStyle}>{fmtEffort(row.actualEffort)}</td>
              </tr>
            ))}
            {otherActualCount > 0 && (
              <tr style={{ background: rows.length % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ ...tdNameStyle, color: '#9ca3af', fontStyle: 'italic' }}>その他</td>
                <td style={tdNumStyle}>—</td>
                <td style={tdNumStyle}>—</td>
                <td style={tdNumStyle}>—</td>
                <td style={{ ...tdNumStyle, borderLeft: '2px solid #e5e7eb', color: '#9ca3af' }}>{otherActualCount}</td>
                <td style={{ ...tdNumStyle, color: '#9ca3af' }}>0</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...tdTotalStyle, textAlign: 'left' }}>合計</td>
              <td style={tdTotalStyle}>
                {rows.reduce((s, r) => s + r.plannedCount, 0)}
              </td>
              <td style={{ ...tdTotalStyle, color: '#9ca3af', fontWeight: 400 }}>—</td>
              <td style={tdTotalStyle}>{fmtEffort(plannedTotal)}</td>
              <td style={{ ...tdTotalStyle, borderLeft: '2px solid #e5e7eb' }}>
                {rows.reduce((s, r) => s + r.actualCount, 0) + otherActualCount}
              </td>
              <td style={tdTotalStyle}>{fmtEffort(actualTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function KpiBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      border: `2px solid ${color}`,
      borderRadius: 8,
      padding: '6px 14px',
      textAlign: 'center',
      minWidth: 80,
    }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
