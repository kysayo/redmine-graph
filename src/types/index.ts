// グラフの設定（data属性から読み取る）
export interface GraphConfig {
  // 2軸グラフの左軸の内容
  comboLeft: 'cumulative' | 'daily'
  // 2軸グラフの右軸の内容
  comboRight: 'cumulative' | 'daily'
  // 円グラフのグループキー（例: 'status', 'tracker'）
  pieGroupBy: string
}

// Redmineフィルタ条件（URLパラメータから取得）
export interface RedmineFilter {
  createdOn?: {
    from?: string  // YYYY-MM-DD
    to?: string    // YYYY-MM-DD
  }
  trackerId?: string[]
}

// 2軸グラフの1データポイント
export interface ComboDataPoint {
  date: string       // YYYY-MM-DD
  daily: number      // その日の発生チケット数
  cumulative: number // 累計チケット数
}

// 円グラフの1データポイント
export interface PieDataPoint {
  name: string
  value: number
}
