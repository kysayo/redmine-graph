import { useState } from 'react'
import type { CrossTableData } from '../types'

interface CrossTableProps {
  data: CrossTableData
  title: string
  onCellClick?: (
    rowKey: string,
    colKey: string,
    rowFilterValues: string[],
    colFilterValues: string[],
    sectionIndex?: number,
  ) => void
  onRowTotalClick?: (rowKey: string, rowFilterValues: string[]) => void
  onColTotalClick?: (
    colKey: string,
    colFilterValues: string[],
    sectionIndex?: number,
  ) => void
  onGrandTotalClick?: () => void
}

export function CrossTable({
  data,
  title,
  onCellClick,
  onRowTotalClick,
  onColTotalClick,
  onGrandTotalClick,
}: CrossTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const { rowKeys, colKeys, rowLabels, colLabels, rowFilterValues, colFilterValues, cells, rowTotals, colTotals, grandTotal, sections } = data

  const stickyColStyle: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    background: '#f3f4f6',
    zIndex: 1,
    fontWeight: 600,
    fontSize: 13,
    padding: '8px 12px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    border: '1px solid #d1d5db',
    borderRight: '2px solid #9ca3af',
  }

  const headerCellStyle: React.CSSProperties = {
    background: '#f3f4f6',
    fontWeight: 600,
    fontSize: 13,
    padding: '8px 12px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    border: '1px solid #d1d5db',
  }

  const totalColStyle: React.CSSProperties = {
    background: '#e5e7eb',
    fontWeight: 700,
    fontSize: 13,
    padding: '8px 12px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    border: '1px solid #d1d5db',
    borderLeft: '2px solid #9ca3af',
  }

  const totalRowCellStyle: React.CSSProperties = {
    background: '#e5e7eb',
    fontWeight: 700,
    fontSize: 13,
    padding: '8px 12px',
    textAlign: 'center',
    border: '1px solid #d1d5db',
    borderTop: '2px solid #9ca3af',
  }

  const totalRowLabelStyle: React.CSSProperties = {
    ...totalRowCellStyle,
    position: 'sticky',
    left: 0,
    zIndex: 1,
    textAlign: 'left',
    borderRight: '2px solid #9ca3af',
    background: '#e5e7eb',
  }

  const grandTotalCellStyle: React.CSSProperties = {
    ...totalRowCellStyle,
    borderLeft: '2px solid #9ca3af',
  }

  // --- 複数セクションモード ---
  if (sections) {
    const hasAnyRows = rowKeys.length > 0
    const hasAnyCols = sections.some(s => s.colKeys.length > 0)

    if (!hasAnyRows || !hasAnyCols) {
      return (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{title}</div>
          <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
            該当チケットがありません
          </div>
        </div>
      )
    }

    const sectionHeaderStyle: React.CSSProperties = {
      background: '#e8ecf0',
      fontWeight: 700,
      fontSize: 13,
      padding: '6px 12px',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      border: '1px solid #d1d5db',
      borderLeft: '2px solid #9ca3af',
      borderBottom: '1px solid #d1d5db',
    }

    const maxSubHeaderLevels = Math.max(0, ...sections.map(s => s.subHeaderLevels ?? 0))

    return (
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{title}</div>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: 13,
              tableLayout: 'auto',
            }}
          >
            <thead>
              {/* セクションラベル行 */}
              <tr>
                <th
                  rowSpan={2 + maxSubHeaderLevels}
                  style={{
                    ...stickyColStyle,
                    zIndex: 2,
                    background: '#f3f4f6',
                    verticalAlign: 'middle',
                  }}
                />
                {sections.map((section, si) => (
                  <th
                    key={si}
                    colSpan={section.colKeys.length}
                    style={{
                      ...sectionHeaderStyle,
                      borderLeft: '2px solid #9ca3af',
                    }}
                  >
                    {section.label ?? section.colGroupBy}
                  </th>
                ))}
              </tr>
              {/* サブヘッダ行 */}
              {Array.from({ length: maxSubHeaderLevels }, (_, lv) => (
                <tr key={`subheader-${lv}`}>
                  {sections.map((section, si) => {
                    const sectionSubLevels = section.subHeaderLevels ?? 0
                    if (lv >= sectionSubLevels) {
                      return (
                        <th
                          key={si}
                          colSpan={section.colKeys.length}
                          style={{
                            ...headerCellStyle,
                            borderLeft: '2px solid #9ca3af',
                          }}
                        />
                      )
                    }
                    const rules = section.colGroupRules ?? []
                    const groups: { label: string; colspan: number }[] = []
                    rules.forEach(rule => {
                      const label = rule.subHeaders?.[lv] ?? ''
                      if (label !== '' || groups.length === 0) {
                        groups.push({ label, colspan: 1 })
                      } else {
                        groups[groups.length - 1].colspan++
                      }
                    })
                    return groups.map((group, gi) => (
                      <th
                        key={`${si}-${gi}`}
                        colSpan={group.colspan}
                        style={{
                          ...headerCellStyle,
                          borderLeft: gi === 0 ? '2px solid #9ca3af' : '1px solid #d1d5db',
                        }}
                      >
                        {group.label}
                      </th>
                    ))
                  })}
                </tr>
              ))}
              {/* 列ヘッダ行 */}
              <tr>
                {sections.map((section, si) =>
                  section.colKeys.map((colKey, ci) => (
                    <th
                      key={`${si}-${colKey}`}
                      style={{
                        ...headerCellStyle,
                        borderLeft: ci === 0 ? '2px solid #9ca3af' : '1px solid #d1d5db',
                      }}
                    >
                      {section.colLabels[colKey]}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {rowKeys.map(rowKey => {
                const isHovered = hoveredRow === rowKey
                const rowBg = isHovered ? '#eff6ff' : '#fff'
                const rowFv = rowFilterValues[rowKey] ?? []
                return (
                  <tr
                    key={rowKey}
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td
                      style={{
                        ...stickyColStyle,
                        background: isHovered ? '#dbeafe' : '#f3f4f6',
                      }}
                    >
                      {rowLabels[rowKey]}
                    </td>
                    {sections.map((section, si) =>
                      section.colKeys.map((colKey, ci) => {
                        const count = section.cells[rowKey]?.[colKey]?.count ?? 0
                        const colFv = section.colFilterValues[colKey] ?? []
                        const clickable = count > 0 && !!onCellClick
                        return (
                          <td
                            key={`${si}-${colKey}`}
                            onClick={clickable ? () => onCellClick!(rowKey, colKey, rowFv, colFv, si) : undefined}
                            style={{
                              padding: '8px 12px',
                              textAlign: 'center',
                              border: '1px solid #d1d5db',
                              borderLeft: ci === 0 ? '2px solid #9ca3af' : '1px solid #d1d5db',
                              color: '#111827',
                              cursor: clickable ? 'pointer' : 'default',
                              background: isHovered ? rowBg : undefined,
                              transition: 'background 0.1s',
                              minWidth: 64,
                            }}
                          >
                            {count > 0 ? count : ''}
                          </td>
                        )
                      })
                    )}
                  </tr>
                )
              })}
              {/* 合計行 */}
              <tr>
                <td style={totalRowLabelStyle}>合計</td>
                {sections.map((section, si) =>
                  section.colKeys.map((colKey, ci) => {
                    const colTotal = section.colTotals[colKey] ?? 0
                    const colFv = section.colFilterValues[colKey] ?? []
                    return (
                      <td
                        key={`${si}-${colKey}`}
                        onClick={colTotal > 0 && onColTotalClick ? () => onColTotalClick(colKey, colFv, si) : undefined}
                        style={{
                          ...totalRowCellStyle,
                          borderLeft: ci === 0 ? '2px solid #9ca3af' : '1px solid #d1d5db',
                          cursor: colTotal > 0 && onColTotalClick ? 'pointer' : 'default',
                        }}
                      >
                        {colTotal > 0 ? colTotal : ''}
                      </td>
                    )
                  })
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // --- 既存の単一セクションモード ---
  if (rowKeys.length === 0 || colKeys.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{title}</div>
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          該当チケットがありません
        </div>
      </div>
    )
  }

  // 列グルーピング未設定（colKeys が空）の場合はガイドメッセージを表示
  if (colKeys.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{title}</div>
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          列のグルーピングを設定してください
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{title}</div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: 13,
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr>
              {/* 左上の空セル */}
              <th
                style={{
                  ...stickyColStyle,
                  zIndex: 2,
                  background: '#f3f4f6',
                }}
              />
              {/* 列ヘッダ */}
              {colKeys.map(colKey => (
                <th key={colKey} style={headerCellStyle}>
                  {colLabels[colKey]}
                </th>
              ))}
              {/* 合計列ヘッダ */}
              <th
                style={{
                  ...headerCellStyle,
                  background: '#e5e7eb',
                  borderLeft: '2px solid #9ca3af',
                }}
              >
                合計
              </th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map(rowKey => {
              const isHovered = hoveredRow === rowKey
              const rowBg = isHovered ? '#eff6ff' : '#fff'
              const rowFv = rowFilterValues[rowKey] ?? []
              const rowTotal = rowTotals[rowKey] ?? 0
              return (
                <tr
                  key={rowKey}
                  onMouseEnter={() => setHoveredRow(rowKey)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* 行ラベル（sticky） */}
                  <td
                    style={{
                      ...stickyColStyle,
                      background: isHovered ? '#dbeafe' : '#f3f4f6',
                    }}
                  >
                    {rowLabels[rowKey]}
                  </td>
                  {/* データセル */}
                  {colKeys.map(colKey => {
                    const count = cells[rowKey]?.[colKey]?.count ?? 0
                    const colFv = colFilterValues[colKey] ?? []
                    const clickable = count > 0 && !!onCellClick
                    return (
                      <td
                        key={colKey}
                        onClick={clickable ? () => onCellClick!(rowKey, colKey, rowFv, colFv) : undefined}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          border: '1px solid #d1d5db',
                          color: '#111827',
                          cursor: clickable ? 'pointer' : 'default',
                          background: isHovered ? rowBg : undefined,
                          transition: 'background 0.1s',
                          minWidth: 64,
                        }}
                      >
                        {count > 0 ? count : ''}
                      </td>
                    )
                  })}
                  {/* 行合計 */}
                  <td
                    onClick={rowTotal > 0 && onRowTotalClick ? () => onRowTotalClick(rowKey, rowFv) : undefined}
                    style={{
                      ...totalColStyle,
                      background: isHovered ? '#dbeafe' : '#e5e7eb',
                      cursor: rowTotal > 0 && onRowTotalClick ? 'pointer' : 'default',
                    }}
                  >
                    {rowTotal > 0 ? rowTotal : ''}
                  </td>
                </tr>
              )
            })}
            {/* 合計行 */}
            <tr>
              <td style={totalRowLabelStyle}>合計</td>
              {colKeys.map(colKey => {
                const colTotal = colTotals[colKey] ?? 0
                const colFv = colFilterValues[colKey] ?? []
                return (
                  <td
                    key={colKey}
                    onClick={colTotal > 0 && onColTotalClick ? () => onColTotalClick(colKey, colFv) : undefined}
                    style={{
                      ...totalRowCellStyle,
                      cursor: colTotal > 0 && onColTotalClick ? 'pointer' : 'default',
                    }}
                  >
                    {colTotal > 0 ? colTotal : ''}
                  </td>
                )
              })}
              {/* 総計 */}
              <td
                onClick={grandTotal > 0 && onGrandTotalClick ? onGrandTotalClick : undefined}
                style={{
                  ...grandTotalCellStyle,
                  cursor: grandTotal > 0 && onGrandTotalClick ? 'pointer' : 'default',
                }}
              >
                {grandTotal > 0 ? grandTotal : ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
