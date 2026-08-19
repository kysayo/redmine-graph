import type { CSSProperties } from 'react'
import type { AssignmentMappingPerson, JournalCountExtraColumn } from '../types'

/**
 * 追加列（Resource 等）の数値セルを扱うユーティリティ。
 *
 * 空欄は「値なし」として常に許容する（無償参加メンバー = BK など、
 * リソース数を持たない担当者を表現するために空欄を使う運用のため）。
 * 空欄以外で数値として解釈できない値だけをエラーとして扱う。
 */

/** 数値列の値として許容できるか（空欄は許容、数値以外の文字列はNG） */
export function isNumericCellValue(value: string | undefined): boolean {
  const v = (value ?? '').trim()
  if (v === '') return true
  return !Number.isNaN(Number(v))
}

/**
 * 数値列の値を数値化する。空欄・数値以外は `null` を返す。
 *
 * この戻り値を割り算等の計算に使う場合、`null` のときは計算せず
 * 画面上はエラー表示（`renderNumericCellError()` の文字列）にして、
 * 表そのものは描画を続けること。
 */
export function toNumericCellValue(value: string | undefined): number | null {
  const v = (value ?? '').trim()
  if (v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/** 数値化できない値を割り算等に使ったときの表示文字列 */
export const NUMERIC_CELL_ERROR_TEXT = '—'

/** 数値化できない値を割り算等に使ったときの表示スタイル */
export const NUMERIC_CELL_ERROR_STYLE: CSSProperties = {
  color: '#dc2626',
  fontWeight: 400,
}

/** 数値列に数値以外が入っているセル */
export interface NumericCellIssue {
  personName: string
  columnLabel: string
  value: string
}

/**
 * 取り込んだ担当者・追加列・値から、数値列（type: 'number'）に
 * 数値以外が入っているセルを列挙する。空欄は含めない。
 */
export function collectNumericCellIssues(
  persons: AssignmentMappingPerson[],
  columns: JournalCountExtraColumn[],
  extraValues: Record<string, Record<string, string>>
): NumericCellIssue[] {
  const issues: NumericCellIssue[] = []
  const numericColumns = columns.filter(c => c.type === 'number')
  if (numericColumns.length === 0) return issues

  for (const person of persons) {
    const vals = extraValues[person.id]
    if (!vals) continue
    for (const col of numericColumns) {
      const raw = vals[col.key]
      if (isNumericCellValue(raw)) continue
      issues.push({
        personName: person.name,
        columnLabel: col.label,
        value: (raw ?? '').trim(),
      })
    }
  }
  return issues
}

/** 警告メッセージ文字列を組み立てる（先頭 maxItems 件まで列挙） */
export function formatNumericCellIssues(issues: NumericCellIssue[], maxItems = 5): string {
  if (issues.length === 0) return ''
  const head = issues.slice(0, maxItems)
    .map(i => `${i.personName}「${i.columnLabel}」= ${i.value}`)
    .join(' / ')
  const rest = issues.length > maxItems ? ` ほか${issues.length - maxItems}件` : ''
  return `数値列に数値以外の値が入っています（取り込みは完了。空欄にするか数値に修正してください）: ${head}${rest}`
}
