import { useRef, useState, useEffect } from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PieDataPoint } from '../types'

const CHART_HEIGHT = 300
const OUTER_RADIUS = 108
const LINE_EXTEND = 35
const RADIAN = Math.PI / 180

interface LabelData {
  key: number
  sx: number; sy: number
  ex: number; ey: number
  bcos: number
  color: string
  text: string
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: { name?: string; value?: number; payload?: { fill?: string } }[] }) {
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
        <span style={{ width: 10, height: 10, borderRadius: 2, background: entry.payload?.fill ?? '#ccc', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: '#374151' }}>{entry.name}</span>
        <span style={{ fontWeight: 600, color: '#111827', marginLeft: 4 }}>{entry.value}件</span>
      </p>
    </div>
  )
}

interface Props {
  data: PieDataPoint[]
  groupBy: string
  onSliceClick?: (slice: PieDataPoint) => void
  wide?: boolean
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7',
]

export function PieChart({ data, groupBy, onSliceClick, wide }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const title = `${groupBy} ${total}件`

  // コンテナ幅をトラッキング（ラベル座標計算用）
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.offsetWidth)
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 各スライスのラベル座標を計算（Rechartsの SVG 外にオーバーレイ描画するため）
  const cx = containerWidth / 2
  const cy = CHART_HEIGHT / 2  // = 150

  const pieLabels: LabelData[] = []
  if (total > 0 && containerWidth > 0) {
    let currentAngle = 90  // startAngle=90（12時方向から時計回り）
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 360
      const midAngle = currentAngle - sliceAngle / 2
      currentAngle -= sliceAngle

      const percent = item.value / total
      if (percent < 0.01) return

      const cos = Math.cos(-midAngle * RADIAN)
      const sin = Math.sin(-midAngle * RADIAN)
      const sx = cx + OUTER_RADIUS * cos
      const sy = cy + OUTER_RADIUS * sin

      // 上方向(70-110°)・下方向(250-290°)のスライスは横にずらして見切れを防ぐ
      // midAngle は負になることがあるため 0-360° に正規化してから判定する
      const normalizedMid = ((midAngle % 360) + 360) % 360
      let bendAngle = midAngle
      if (normalizedMid > 70 && normalizedMid < 110) {
        // 各スライスの角度に比例したプッシュ量で分散させる（固定ターゲットだと重なる）
        bendAngle = midAngle + (normalizedMid <= 90 ? -25 : 25)
      } else if (normalizedMid > 250 && normalizedMid < 290) {
        bendAngle = midAngle + (normalizedMid <= 270 ? -20 : 20)
      }

      const bcos = Math.cos(-bendAngle * RADIAN)
      const bsin = Math.sin(-bendAngle * RADIAN)
      const ex = cx + (OUTER_RADIUS + LINE_EXTEND) * bcos
      const ey = cy + (OUTER_RADIUS + LINE_EXTEND) * bsin

      pieLabels.push({
        key: index,
        sx, sy, ex, ey, bcos,
        color: COLORS[index % COLORS.length],
        text: `${item.name}:${item.value}件:${(percent * 100).toFixed(0)}%`,
      })
    })
  }

  if (wide) {
    return (
      <div style={{ width: '100%' }}>
        <p style={{ textAlign: 'center', fontSize: 13, margin: '0 0 4px' }}>{title}</p>
        <ResponsiveContainer width="100%" height={350}>
          <RechartsPieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={150}
              cursor={onSliceClick ? 'pointer' : undefined}
              onClick={onSliceClick ? (entry) => onSliceClick(entry as PieDataPoint) : undefined}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', padding: '8px 16px', justifyContent: 'center' }}>
          {data.map((item, index) => (
            <span
              key={index}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: onSliceClick ? 'pointer' : undefined }}
              onClick={() => onSliceClick?.(item)}
            >
              <span style={{ width: 12, height: 12, background: COLORS[index % COLORS.length], display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ color: '#374151' }}>{item.name}</span>
              <span style={{ color: '#6b7280' }}>{((item.value / total) * 100).toFixed(0)}%</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{item.value}件</span>
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <p style={{ textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 4px 8px' }}>{groupBy}</p>
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <RechartsPieChart margin={{ top: 40, right: 80, bottom: 40, left: 80 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={OUTER_RADIUS}
              startAngle={90}
              endAngle={-270}
              labelLine={false}
              cursor={onSliceClick ? 'pointer' : undefined}
              onClick={onSliceClick ? (entry) => onSliceClick(entry as PieDataPoint) : undefined}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>
        {/* ラベルオーバーレイ: Recharts の SVG 外に独立した SVG を配置することで
            Recharts が設定する overflow:hidden の影響を完全に回避 */}
        {containerWidth > 0 && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: containerWidth,
              height: CHART_HEIGHT,
              overflow: 'visible',
              pointerEvents: 'none',
            }}
          >
            {pieLabels.map(l => (
              <g key={l.key}>
                <line x1={l.sx} y1={l.sy} x2={l.ex} y2={l.ey} stroke={l.color} strokeWidth={1} />
                <text
                  x={l.ex + (l.bcos >= 0 ? 5 : -5)}
                  y={l.ey}
                  textAnchor={l.bcos >= 0 ? 'start' : 'end'}
                  dominantBaseline="central"
                  fill={l.color}
                  fontSize={11}
                >
                  {l.text}
                </text>
              </g>
            ))}
          </svg>
        )}
        <div style={{ position: 'absolute', top: cy, left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Case</div>
        </div>
      </div>
      <div style={{ padding: '4px 8px' }}>
        {data.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 4px',
              borderBottom: index < data.length - 1 ? '1px solid #f3f4f6' : 'none',
              cursor: onSliceClick ? 'pointer' : undefined,
            }}
            onClick={() => onSliceClick?.(item)}
          >
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[index % COLORS.length], flexShrink: 0, marginRight: 10 }} />
            <span style={{ flex: 1, color: '#374151', fontSize: 13 }}>{item.name}</span>
            <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
