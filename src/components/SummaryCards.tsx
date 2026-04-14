import React from 'react'
import type { RedmineIssue, SeriesCondition, SummaryCardConfig, SummaryCardDenominator, SummaryCardSlot } from '../types'
import { countIssues } from '../utils/issueAggregator'

interface Props {
  cards: SummaryCardConfig[]
  issues: RedmineIssue[] | null  // null = ローディング中
  onNumeratorClick?: (conditions: SeriesCondition[]) => void
  onExtraValueClick?: (conditions: SeriesCondition[]) => void
}

function parseRedTags(text: string, fontWeight: number): React.ReactNode[] {
  const parts = text.split(/(\[r\].*?\[\/r\])/g)
  return parts.map((part, i) => {
    const match = part.match(/^\[r\](.*)\[\/r\]$/)
    if (match) {
      return <span key={i} style={{ fontWeight, color: '#ef4444' }}>{match[1]}</span>
    }
    return <span key={i} style={{ fontWeight }}>{part}</span>
  })
}

function getEffectiveDenominators(card: SummaryCardConfig): SummaryCardDenominator[] {
  if (card.denominators && card.denominators.length > 0) return card.denominators
  if (card.denominator) return [{ conditions: card.denominator.conditions }]
  return []
}

// カードの表示スロット一覧を取得（slots フィールドが優先）
function getSlotsForDisplay(card: SummaryCardConfig): SummaryCardSlot[] {
  if (card.slots && card.slots.length > 0) return card.slots
  // レガシーフィールドから構築
  const denoms = getEffectiveDenominators(card)
  return [
    { kind: 'value', label: card.numerator.label, conditions: card.numerator.conditions },
    ...denoms.map(d => ({ kind: 'value' as const, label: d.label, conditions: d.conditions })),
    ...(card.computedValues ?? []).map(cv => ({ kind: 'computed' as const, label: cv.label, formula: cv.formula })),
  ]
}

// 計算値スロットの計算（valueIndex は kind='value' スロットの順序インデックス）
function computeFormulaValue(
  issues: RedmineIssue[],
  valueSlots: Extract<SummaryCardSlot, { kind: 'value' }>[],
  formula: { valueIndex: number; coefficient: number }[]
): number {
  const values = valueSlots.map(s => countIssues(issues, s.conditions))
  return formula.reduce((sum, term) => sum + (values[term.valueIndex] ?? 0) * term.coefficient, 0)
}

export function SummaryCards({ cards, issues, onNumeratorClick, onExtraValueClick }: Props) {
  if (cards.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
      {cards.map((card, i) => {
        const slots = getSlotsForDisplay(card)
        const valueSlots = slots.filter((s): s is Extract<SummaryCardSlot, { kind: 'value' }> => s.kind === 'value')

        return (
          <div
            key={i}
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderTop: `4px solid ${card.color}`,
              padding: '16px 20px',
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, whiteSpace: 'pre-wrap' }}>
              {card.title.split('\n').map((line, idx) => (
                <span key={idx}>
                  {idx > 0 ? '\n' : ''}{parseRedTags(line, idx === 0 ? 700 : 400)}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              {slots.map((slot, slotIdx) => {
                const isFirst = slotIdx === 0

                if (slot.kind === 'value') {
                  const count = issues !== null ? countIssues(issues, slot.conditions) : null
                  if (isFirst) {
                    const clickable = onNumeratorClick && slot.conditions.length > 0
                    return (
                      <span key={slotIdx} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span
                          onClick={clickable ? () => onNumeratorClick!(slot.conditions) : undefined}
                          style={{
                            fontSize: 36,
                            fontWeight: 700,
                            color: card.color,
                            lineHeight: 1,
                            cursor: clickable ? 'pointer' : 'default',
                            textDecoration: clickable ? 'underline' : 'none',
                            textDecorationColor: card.color,
                            textUnderlineOffset: 3,
                          }}
                        >
                          {count !== null ? count : '—'}
                        </span>
                        {slot.label && (
                          <span style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1, marginTop: 2 }}>
                            {slot.label}
                          </span>
                        )}
                      </span>
                    )
                  }
                  const clickable = onExtraValueClick && slot.conditions.length > 0
                  return (
                    <span key={slotIdx} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span
                        onClick={clickable ? () => onExtraValueClick!(slot.conditions) : undefined}
                        style={{
                          fontSize: 20,
                          color: '#9ca3af',
                          cursor: clickable ? 'pointer' : 'default',
                          textDecoration: clickable ? 'underline' : 'none',
                          textUnderlineOffset: 3,
                        }}
                      >
                        / {count !== null ? count : '—'}
                      </span>
                      {slot.label && (
                        <span style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1, marginTop: 2 }}>
                          {slot.label}
                        </span>
                      )}
                    </span>
                  )
                }

                // kind === 'computed'
                const value = issues !== null ? computeFormulaValue(issues, valueSlots, slot.formula ?? []) : null
                return (
                  <span key={slotIdx} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: isFirst ? 36 : 20, fontWeight: isFirst ? 700 : 400, color: isFirst ? card.color : '#9ca3af', lineHeight: 1 }}>
                      {isFirst ? '' : '/ '}{value !== null ? value : '—'}
                    </span>
                    {slot.label && (
                      <span style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1, marginTop: 2 }}>
                        {slot.label}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
