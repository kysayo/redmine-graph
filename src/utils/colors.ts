// 設定UIのカラーピッカー・系列の自動色割り当てで共有するパレット
export const COLOR_PALETTE = [
  '#93c5fd', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6',
]

/**
 * 分割キー（splitBy）で自動生成された系列に割り当てる色を返す。
 * index はタイル内の分割系列を通しでカウントした番号（複数の分割系列で色が衝突しないようにするため）。
 */
export function splitColorAt(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length]
}
