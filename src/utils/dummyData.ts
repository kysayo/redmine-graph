import type { ComboDataPoint, PieDataPoint, SeriesConfig, SeriesDataPoint } from '../types'

/** 日付文字列を YYYY-MM-DD 形式で生成 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** from から to までの日付配列を生成（hideWeekends=true のとき土日をスキップ） */
function generateDateRange(from: Date, to: Date, hideWeekends = false): Date[] {
  const dates: Date[] = []
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    const day = current.getDay()
    if (!hideWeekends || (day !== 0 && day !== 6)) {
      dates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

interface DummyDataOptions {
  /** ユーザー指定のグラフX軸開始日（YYYY-MM-DD）。未設定=自動 */
  startDate?: string
  /** true のとき土日をX軸から除外 */
  hideWeekends?: boolean
}

/**
 * 2軸グラフ用ダミーデータを生成する
 * startDate があればその期間、なければ直近14日分
 */
export function generateComboDummyData(options: DummyDataOptions = {}): ComboDataPoint[] {
  const { startDate, hideWeekends = false } = options

  const fromDate = startDate ? new Date(startDate) : (() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d
  })()
  const toDate = new Date()

  const dates = generateDateRange(fromDate, toDate, hideWeekends)

  let cumulative = 0
  return dates.map((date) => {
    const daily = Math.floor(Math.random() * 8) + 1
    cumulative += daily
    return {
      date: formatDate(date),
      daily,
      cumulative,
    }
  })
}

/**
 * 複数系列対応のダミーデータを生成する
 * 各系列の aggregation に応じて日別 or 累計値を返す
 */
export function generateSeriesDummyData(
  series: SeriesConfig[],
  options: DummyDataOptions = {}
): SeriesDataPoint[] {
  const { startDate, hideWeekends = false } = options

  const fromDate = startDate ? new Date(startDate) : (() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d
  })()
  const toDate = new Date()

  const dates = generateDateRange(fromDate, toDate, hideWeekends)

  // 各系列の累計カウンター
  const cumulatives: Record<string, number> = {}
  series.forEach((s) => { cumulatives[s.id] = 0 })

  return dates.map((date) => {
    const point: SeriesDataPoint = { date: formatDate(date) }
    series.forEach((s) => {
      const daily = Math.floor(Math.random() * 8) + 1
      cumulatives[s.id] += daily
      point[s.id] = s.aggregation === 'cumulative' ? cumulatives[s.id] : daily
    })
    return point
  })
}

/**
 * 円グラフ用ダミーデータを生成する
 * pieGroupBy に応じたダミーラベルを返す
 */
export function generatePieDummyData(pieGroupBy: string): PieDataPoint[] {
  const presets: Record<string, PieDataPoint[]> = {
    status: [
      { name: '新規', value: 12 },
      { name: '進行中', value: 8 },
      { name: 'フィードバック', value: 3 },
      { name: '解決', value: 15 },
      { name: '終了', value: 5 },
    ],
    tracker: [
      { name: 'バグ', value: 18 },
      { name: '機能', value: 12 },
      { name: 'サポート', value: 7 },
      { name: 'タスク', value: 6 },
    ],
  }

  return presets[pieGroupBy] ?? [
    { name: `${pieGroupBy} A`, value: 10 },
    { name: `${pieGroupBy} B`, value: 8 },
    { name: `${pieGroupBy} C`, value: 5 },
    { name: `${pieGroupBy} D`, value: 3 },
  ]
}
