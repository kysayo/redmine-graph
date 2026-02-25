import type { ComboDataPoint, PieDataPoint, RedmineFilter, SeriesConfig, SeriesDataPoint } from '../types'

/** 日付文字列を YYYY-MM-DD 形式で生成 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** 指定日数分の日付配列を生成（from から days 日分） */
function generateDateRange(from: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    return d
  })
}

/**
 * 2軸グラフ用ダミーデータを生成する
 * URLパラメータに日付範囲があればその期間、なければ直近30日分
 */
export function generateComboDummyData(filter: RedmineFilter): ComboDataPoint[] {
  let fromDate: Date
  let toDate: Date

  if (filter.createdOn?.from) {
    fromDate = new Date(filter.createdOn.from)
  } else {
    fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 29)
  }

  if (filter.createdOn?.to) {
    toDate = new Date(filter.createdOn.to)
  } else {
    toDate = new Date()
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay) + 1)
  const dates = generateDateRange(fromDate, days)

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
  filter: RedmineFilter
): SeriesDataPoint[] {
  let fromDate: Date
  let toDate: Date

  if (filter.createdOn?.from) {
    fromDate = new Date(filter.createdOn.from)
  } else {
    fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 29)
  }

  if (filter.createdOn?.to) {
    toDate = new Date(filter.createdOn.to)
  } else {
    toDate = new Date()
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay) + 1)
  const dates = generateDateRange(fromDate, days)

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
