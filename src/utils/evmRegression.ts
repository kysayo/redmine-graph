import type { RedmineIssue, EVMTileConfig } from '../types'
import { aggregateEVM } from './issueAggregator'

// 折れ線グラフ用の1データポイント
export interface EvmRegressionChartPoint {
  month: string
  actualEffort: number    // ユーザー手入力工数
  predictedEffort: number // 逆算係数による予測工数 Σ(t_ij * c_j)
}

// 係数逆算の計算結果
export interface EvmRegressionResult {
  months: string[]              // ["2026-01", "2026-02", ...] ソート済み
  groupNames: string[]          // config.groups の groupName 順（n次元）
  currentCoefficients: number[] // config.groups[j].effortPerTicket（現在の設定値）
  solvedCoefficients: number[]  // 逆算結果（config.groups と同順。負はクランプ済み、ゼロデータ列は0）
  clampedGroups: string[]       // 逆算値が負のため0にクランプしたグループ名
  zeroDataGroups: string[]      // 全月0件でスキップしたグループ名（逆算対象外）
  chartData: EvmRegressionChartPoint[]
  isUnderdetermined: boolean    // true = 月数 < グループ数（解が不定）
  requiredMonths: number        // 解を求めるのに必要な最低月数（= グループ数）
}

/**
 * 月末日を返す（例: "2026-02" → 28）
 */
function lastDayOfMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/**
 * 月×グループの実績チケット数行列を計算する。
 * 各月の startDate/endDate を当月の範囲に変えて aggregateEVM を呼び出し、
 * rows[j].actualCount を取り出す。
 * 戻り値: counts[monthIdx][groupIdx] = チケット数
 */
function computeMonthlyTicketCounts(
  issues: RedmineIssue[],
  config: EVMTileConfig,
  months: string[]
): number[][] {
  return months.map(month => {
    const last = lastDayOfMonth(month)
    const monthConfig: EVMTileConfig = {
      ...config,
      startDate: `${month}-01`,
      endDate: `${month}-${String(last).padStart(2, '0')}`,
    }
    const result = aggregateEVM(issues, monthConfig)
    return result.rows.map(r => r.actualCount)
  })
}

/**
 * 部分ピボット付き Gauss-Jordan 消去で連立方程式を解く。
 * Normal equations: T^T T c = T^T a
 * @param T m×n 行列（月×グループ。有効列のみ）
 * @param a m次元ベクトル（月別実際工数）
 * @returns 解ベクトル（n次元）。特異行列の場合は isValid = false
 */
function solveLeastSquares(
  T: number[][],
  a: number[]
): { solution: number[]; isValid: boolean } {
  const n = T[0].length

  // T^T T (n×n)
  const ATA: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      T.reduce((s, row) => s + row[i] * row[j], 0)
    )
  )

  // T^T a (n×1)
  const ATa: number[] = Array.from({ length: n }, (_, i) =>
    T.reduce((s, row, ri) => s + row[i] * a[ri], 0)
  )

  // 拡大行列 [ATA | ATa] を作成
  const aug: number[][] = ATA.map((row, i) => [...row, ATa[i]])

  // 部分ピボット付き Gauss-Jordan 消去
  for (let col = 0; col < n; col++) {
    // 最大絶対値の行を探してピボット選択
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row
      }
    }
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

    // ピボットが実質ゼロなら特異行列
    if (Math.abs(aug[col][col]) < 1e-10) {
      return { solution: [], isValid: false }
    }

    // 他の全行からこの列を消去（Jordan法: 前進・後退同時）
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row][col] / aug[col][col]
      for (let c = col; c <= n; c++) {
        aug[row][c] -= factor * aug[col][c]
      }
    }
  }

  // 解を取り出す（aug[i][i] で割る）
  const solution = aug.map((row, i) => row[n] / row[i])
  return { solution, isValid: true }
}

/**
 * EVM係数逆算を計算する。
 * - monthlyActuals が空なら null を返す
 * - 月数 < グループ数なら isUnderdetermined: true で返す
 * - 最小二乗法で各グループの係数を逆算し、結果と折れ線グラフデータを返す
 */
export function computeEvmRegression(
  issues: RedmineIssue[],
  config: EVMTileConfig
): EvmRegressionResult | null {
  const actuals = config.monthlyActuals ?? []
  if (actuals.length === 0) return null

  const months = [...actuals.map(a => a.month)].sort()
  const groupNames = config.groups.map(g => g.groupName)
  const currentCoefficients = config.groups.map(g => g.effortPerTicket)
  const n = config.groups.length
  const requiredMonths = n

  // 月数不足チェック
  if (months.length < n) {
    return {
      months,
      groupNames,
      currentCoefficients,
      solvedCoefficients: new Array(n).fill(0),
      clampedGroups: [],
      zeroDataGroups: [],
      chartData: [],
      isUnderdetermined: true,
      requiredMonths,
    }
  }

  // 月×グループの実績チケット数行列 counts[monthIdx][groupIdx]
  const counts = computeMonthlyTicketCounts(issues, config, months)

  // 実際工数ベクトル a（月順に並べ替え）
  const monthToEffort = new Map(actuals.map(a => [a.month, a.actualEffort]))
  const a = months.map(m => monthToEffort.get(m) ?? 0)

  // ゼロ列（全月0件）のグループを検出
  const zeroDataGroups: string[] = []
  const validGroupIndices: number[] = []
  for (let j = 0; j < n; j++) {
    const colSum = counts.reduce((s, row) => s + row[j], 0)
    if (colSum === 0) {
      zeroDataGroups.push(groupNames[j])
    } else {
      validGroupIndices.push(j)
    }
  }

  // 有効列のみで行列を構築
  const T: number[][] = counts.map(row => validGroupIndices.map(j => row[j]))

  // 最小二乗法で解く
  const { solution, isValid } = solveLeastSquares(T, a)

  // config.groups と同順の係数ベクトル（ゼロ列は0）を構築
  const solvedCoefficients = new Array(n).fill(0)
  const clampedGroups: string[] = []

  if (isValid) {
    validGroupIndices.forEach((gi, si) => {
      const val = solution[si]
      if (val < 0) {
        solvedCoefficients[gi] = 0
        clampedGroups.push(groupNames[gi])
      } else {
        solvedCoefficients[gi] = Math.round(val * 1000) / 1000  // 小数点3桁で丸め
      }
    })
  }

  // 折れ線グラフ用データを生成
  const chartData: EvmRegressionChartPoint[] = months.map((month, mi) => {
    const predictedEffort = counts[mi].reduce(
      (s, t, gi) => s + t * solvedCoefficients[gi],
      0
    )
    return {
      month,
      actualEffort: a[mi],
      predictedEffort: Math.round(predictedEffort * 100) / 100,
    }
  })

  return {
    months,
    groupNames,
    currentCoefficients,
    solvedCoefficients,
    clampedGroups,
    zeroDataGroups,
    chartData,
    isUnderdetermined: false,
    requiredMonths,
  }
}
