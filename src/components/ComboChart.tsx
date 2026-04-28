import { useMemo, useState } from 'react'
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
  LabelList,
  ReferenceLine,
} from 'recharts'
import type { ComboStackGroupConfig, SeriesConfig, SeriesDataPoint } from '../types'

// 展開済み系列。dataKey に `${origId}@${groupId}` を保持し、_stackGroupId でグループに逆引きできる
type RenderableSeries = SeriesConfig & { _stackGroupId?: string }

function CustomTooltip({ active, payload, label, renderableSeries, stackGroups, hoveredGroupId }: {
  active?: boolean
  payload?: { name: string; value: number; color: string; dataKey?: string | number }[]
  label?: string
  renderableSeries: RenderableSeries[]
  stackGroups?: ComboStackGroupConfig[]
  hoveredGroupId?: string | null
}) {
  if (!active || !payload?.length) return null

  const seriesById = new Map(renderableSeries.map(s => [s.id, s]))
  const groupById = new Map((stackGroups ?? []).map(g => [g.id, g]))

  // gid → entries（未割り当ては gid='' に集約）。Map の挿入順を維持して描画順を payload の出現順に合わせる
  const buckets = new Map<string, { groupLabel: string | null; entries: typeof payload }>()
  for (const e of payload) {
    const s = seriesById.get(String(e.dataKey ?? ''))
    const gid = (s?._stackGroupId && groupById.has(s._stackGroupId)) ? s._stackGroupId : ''
    // ホバー中のグループが特定されている場合、そのグループのバケットだけ残す（折れ線・未割り当て系列は常に表示）
    if (hoveredGroupId && gid && gid !== hoveredGroupId) continue
    let bucket = buckets.get(gid)
    if (!bucket) {
      bucket = { groupLabel: gid ? (groupById.get(gid)?.label ?? null) : null, entries: [] }
      buckets.set(gid, bucket)
    }
    bucket.entries.push(e)
  }

  if (buckets.size === 0) return null

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
      {[...buckets.entries()].map(([gid, b], bi) => (
        <div key={gid || '_unassigned'} style={{ marginTop: bi > 0 && b.groupLabel ? 6 : 0 }}>
          {b.groupLabel && (
            <p style={{ margin: '2px 0', fontSize: 11, fontWeight: 600, color: '#555' }}>
              [{b.groupLabel}]
            </p>
          )}
          {b.entries.map((entry, i) => (
            <p key={i} style={{ margin: '2px 0', color: entry.color, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{entry.name}</span>
              <span style={{ fontWeight: 600 }}>{entry.value}</span>
            </p>
          ))}
        </div>
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
  showLabelsLeft?: boolean
  showLabelsRight?: boolean
  barStackMode?: 'grouped' | 'stacked'
  stackGroups?: ComboStackGroupConfig[]
}

function formatDateTick(dateStr: string, fmt: 'yyyy-mm-dd' | 'M/D'): string {
  if (fmt === 'yyyy-mm-dd') return dateStr
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}/${Number(d)}`
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

export function ComboChart({ data, series, yAxisLeftMin, yAxisLeftMinAuto, yAxisRightMax, dateFormat, chartHeight, showBrush, showLabelsLeft, showLabelsRight, barStackMode, stackGroups }: Props) {
    const fmt = dateFormat ?? 'yyyy-mm-dd'
    const maxTicks = fmt === 'M/D' ? 20 : 10
    const tickInterval = Math.max(0, Math.ceil(data.length / maxTicks) - 1)
    const brushEnabled = showBrush ?? data.length > 30

    // ホバー中のスタックグループID（Bar のマウスエンター時にセット）
    const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)

    // 系列をスタックグループの数だけ展開（aggregateIssues と同じ規則）
    const renderableSeries: RenderableSeries[] = useMemo(() => {
      if (!stackGroups?.length) return series
      return series.flatMap(s => stackGroups.map(g => ({
        ...s,
        id: `${s.id}@${g.id}`,
        refSeriesIds: s.refSeriesIds
          ? [`${s.refSeriesIds[0]}@${g.id}`, `${s.refSeriesIds[1]}@${g.id}`] as [string, string]
          : undefined,
        _stackGroupId: g.id,
      })))
    }, [series, stackGroups])

    // 各 (stackGroupId, yAxisId) ごとに「最上端の Bar」のIDを特定（visibleな bar 系列のみ対象）
    // 積み上げの最上端の Bar に LabelList でグループ名を描画するため
    const topBarIdsByGroup = useMemo(() => {
      const top = new Map<string, string>()  // key=`${groupId}#${yAxisId}` → series.id
      if (!stackGroups?.length || barStackMode !== 'stacked') return top
      for (const s of renderableSeries) {
        if (s.chartType !== 'bar') continue
        if (!(s.visible ?? true)) continue
        if (!s._stackGroupId) continue
        top.set(`${s._stackGroupId}#${s.yAxisId}`, s.id)  // 後ろの方ほど最上端なので最後の値で上書き
      }
      return top
    }, [renderableSeries, stackGroups, barStackMode])

    const groupLabelById = useMemo(
      () => new Map((stackGroups ?? []).map(g => [g.id, g.label] as const)),
      [stackGroups],
    )

    // data の各 point に `_stackTotal#{groupId}#{yAxisId}` フィールドを事前計算して付与する。
    // グループラベル LabelList の dataKey をこの合計値にすることで、最上端 Bar の値が 0 でも
    // スタック全体に値があればラベルが表示される（=スタック全体が 0 の日だけラベル非表示）。
    const decoratedData = useMemo(() => {
      if (!stackGroups?.length || barStackMode !== 'stacked') return data
      // 各 (groupId, yAxisId) ペアに含まれる Bar 系列の id を事前列挙
      const groupYaxisToSeriesIds = new Map<string, string[]>()
      for (const s of renderableSeries) {
        if (s.chartType !== 'bar') continue
        if (!(s.visible ?? true)) continue
        if (!s._stackGroupId) continue
        const key = `_stackTotal#${s._stackGroupId}#${s.yAxisId}`
        if (!groupYaxisToSeriesIds.has(key)) groupYaxisToSeriesIds.set(key, [])
        groupYaxisToSeriesIds.get(key)!.push(s.id)
      }
      return data.map(point => {
        const next: SeriesDataPoint = { ...point }
        for (const [key, ids] of groupYaxisToSeriesIds) {
          let sum = 0
          for (const id of ids) {
            const v = point[id]
            if (typeof v === 'number') sum += v
          }
          next[key] = sum
        }
        return next
      })
    }, [data, stackGroups, renderableSeries, barStackMode])

    const visibleSeries = renderableSeries.filter(s => s.visible ?? true)
    const hasLeft = visibleSeries.some(s => s.yAxisId === 'left')
    const hasRight = visibleSeries.some(s => s.yAxisId === 'right')

    // 凡例の重複排除: 同一 label の系列は最初に登場した1個だけ凡例に表示する
    const legendEntries = useMemo(() => {
      const map = new Map<string, { label: string; color: string; chartType: 'bar' | 'line' }>()
      for (const s of visibleSeries) {
        if (!map.has(s.label)) {
          map.set(s.label, { label: s.label, color: s.color, chartType: s.chartType })
        }
      }
      return [...map.values()]
    }, [visibleSeries])

    const autoLeftMin = useMemo(() => {
      if (!yAxisLeftMinAuto) return undefined
      const leftSeriesIds = renderableSeries
        .filter(s => s.yAxisId === 'left' && (s.visible ?? true))
        .map(s => s.id)
      if (leftSeriesIds.length === 0) return undefined
      const dataMax = data.reduce((max, point) => {
        const vals = leftSeriesIds.map(id => (point[id] as number) ?? 0)
        return Math.max(max, ...vals)
      }, 0)
      return Math.floor(dataMax * 0.8 / 10) * 10
    }, [yAxisLeftMinAuto, data, renderableSeries])

    const effectiveLeftMin = yAxisLeftMinAuto ? autoLeftMin : yAxisLeftMin

    // 今日の日付文字列（YYYY-MM-DD）
    const todayStr = formatDate(new Date())
    // データに今日より後の日付があるか（= 未来表示が有効）
    const hasFuture = data.some(d => d.date > todayStr)
    // 今日以降の最初の日付（土日非表示時に今日が土日の場合は次の平日）
    const todayRefDate = hasFuture
      ? (data.find(d => d.date >= todayStr)?.date ?? todayStr)
      : null

    const marginTop = (showLabelsLeft || showLabelsRight) ? 32 : 8

    return (
      <div>
        <ResponsiveContainer width="100%" height={(chartHeight ?? 320) + (brushEnabled ? 40 : 0)}>
          <ComposedChart data={decoratedData} margin={{ top: marginTop, right: 40, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" vertical={false} yAxisId="left" />
            <XAxis
              dataKey="date"
              interval={0}
              tick={<CustomXAxisTick tickInterval={tickInterval} fmt={fmt} />}
            />
            <YAxis yAxisId="left" orientation="left" hide={!hasLeft} tick={{ fontSize: 11 }} domain={effectiveLeftMin !== undefined ? [effectiveLeftMin, (dataMax: number) => Math.max(dataMax, effectiveLeftMin + 1)] : undefined} allowDataOverflow={effectiveLeftMin !== undefined} />
            <YAxis yAxisId="right" orientation="right" hide={!hasRight} tick={{ fontSize: 11 }} domain={yAxisRightMax !== undefined ? [(dataMin: number) => Math.min(dataMin, yAxisRightMax - 1), yAxisRightMax] : undefined} allowDataOverflow={yAxisRightMax !== undefined} />
            <Tooltip content={<CustomTooltip renderableSeries={renderableSeries} stackGroups={stackGroups} hoveredGroupId={hoveredGroupId} />} />
            <Legend
              content={() => (
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 16px', padding: '4px 0', fontSize: 12, color: '#666' }}>
                  {legendEntries.map((e) => (
                    <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {e.chartType === 'line' ? (
                        <svg width={14} height={14}><line x1={0} y1={7} x2={14} y2={7} stroke={e.color} strokeWidth={2} /></svg>
                      ) : (
                        <div style={{ width: 10, height: 10, background: e.color }} />
                      )}
                      <span>{e.label}</span>
                    </div>
                  ))}
                </div>
              )}
            />

            {todayRefDate && (
              <ReferenceLine
                x={todayRefDate}
                yAxisId={hasLeft ? 'left' : 'right'}
                stroke="#f97316"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: '今日', position: 'insideTopLeft', fontSize: 10, fill: '#f97316' }}
              />
            )}

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

            {renderableSeries.map((s) => {
              if (!(s.visible ?? true)) return null
              const showLabel = s.yAxisId === 'left' ? (showLabelsLeft ?? false) : (showLabelsRight ?? false)
              return s.chartType === 'line' ? (
                <Line
                  key={s.id}
                  yAxisId={s.yAxisId}
                  type="monotone"
                  dataKey={s.id}
                  name={s.label}
                  stroke={s.color}
                  dot={{ r: 3, fill: s.color, stroke: '#fff', strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                  strokeWidth={2}
                >
                  {showLabel && (
                    <LabelList
                      dataKey={s.id}
                      position="top"
                      offset={12}
                      formatter={(v: unknown) => (v as number) === 0 ? '' : String(v)}
                      style={{ fontSize: 10, fill: s.color, fontWeight: 600 }}
                    />
                  )}
                </Line>
              ) : (
                <Bar
                  key={s.id}
                  yAxisId={s.yAxisId}
                  dataKey={s.id}
                  name={s.label}
                  fill={s.color}
                  barSize={12}
                  stackId={
                    barStackMode === 'stacked'
                      ? `${s.yAxisId}-${s._stackGroupId ?? '_default'}`
                      : undefined
                  }
                  onMouseEnter={() => {
                    if (s._stackGroupId) setHoveredGroupId(s._stackGroupId)
                  }}
                  onMouseLeave={() => setHoveredGroupId(null)}
                >
                  {showLabel && (
                    <LabelList
                      dataKey={s.id}
                      position={barStackMode === 'stacked' ? 'insideTop' : 'top'}
                      formatter={(v: unknown) => (v == null || v === 0) ? '' : String(v)}
                      style={{ fontSize: 10, fill: s.color, fontWeight: 600 }}
                    />
                  )}
                  {/* スタックグループ最上端のバーにのみグループ名ラベルを表示。
                      dataKey はスタック合計の事前計算フィールドを参照し、合計 0 の日のみ非表示にする */}
                  {s._stackGroupId && topBarIdsByGroup.get(`${s._stackGroupId}#${s.yAxisId}`) === s.id && (
                    <LabelList
                      dataKey={`_stackTotal#${s._stackGroupId}#${s.yAxisId}`}
                      position="top"
                      offset={showLabel && barStackMode === 'stacked' ? 4 : 6}
                      formatter={(v: unknown) => (v == null || v === 0) ? '' : (groupLabelById.get(s._stackGroupId!) || '')}
                      style={{ fontSize: 9, fill: '#666', fontWeight: 600 }}
                    />
                  )}
                </Bar>
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
}
