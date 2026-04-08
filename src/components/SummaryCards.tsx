import React from 'react'
import type { RedmineIssue, SeriesCondition, SummaryCardConfig, SummaryCardDenominator } from '../types'
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

export function SummaryCards({ cards, issues, onNumeratorClick, onExtraValueClick }: Props) {
  if (cards.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
      {cards.map((card, i) => {
        const numeratorCount = issues !== null ? countIssues(issues, card.numerator.conditions) : null
        const hasClickableNumerator = onNumeratorClick && card.numerator.conditions.length > 0
        const effectiveDenominators = getEffectiveDenominators(card)

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
              <span
                onClick={hasClickableNumerator ? () => onNumeratorClick!(card.numerator.conditions) : undefined}
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: card.color,
                  lineHeight: 1,
                  cursor: hasClickableNumerator ? 'pointer' : 'default',
                  textDecoration: hasClickableNumerator ? 'underline' : 'none',
                  textDecorationColor: card.color,
                  textUnderlineOffset: 3,
                }}
              >
                {numeratorCount !== null ? numeratorCount : '—'}
              </span>
              {effectiveDenominators.map((denom, idx) => {
                const count = issues !== null ? countIssues(issues, denom.conditions) : null
                const clickable = onExtraValueClick && denom.conditions.length > 0
                return (
                  <span
                    key={idx}
                    style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <span
                      onClick={clickable ? () => onExtraValueClick!(denom.conditions) : undefined}
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
                    {denom.label && (
                      <span style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1, marginTop: 2 }}>
                        {denom.label}
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
