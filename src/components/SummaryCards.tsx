import type { RedmineIssue, SeriesCondition, SummaryCardConfig } from '../types'
import { countIssues } from '../utils/issueAggregator'

interface Props {
  cards: SummaryCardConfig[]
  issues: RedmineIssue[] | null  // null = ローディング中
  onNumeratorClick?: (conditions: SeriesCondition[]) => void
  onDenominatorClick?: (conditions: SeriesCondition[]) => void
}

export function SummaryCards({ cards, issues, onNumeratorClick, onDenominatorClick }: Props) {
  if (cards.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
      {cards.map((card, i) => {
        const numeratorCount = issues !== null ? countIssues(issues, card.numerator.conditions) : null
        const denominatorCount = card.denominator && issues !== null
          ? countIssues(issues, card.denominator.conditions)
          : null
        const hasClickableNumerator = onNumeratorClick && card.numerator.conditions.length > 0
        const hasClickableDenominator = onDenominatorClick && card.denominator && card.denominator.conditions.length > 0

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
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>
              {card.title}
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
              {card.denominator && (
                <span
                  onClick={hasClickableDenominator ? () => onDenominatorClick!(card.denominator!.conditions) : undefined}
                  style={{
                    fontSize: 20,
                    color: '#9ca3af',
                    cursor: hasClickableDenominator ? 'pointer' : 'default',
                    textDecoration: hasClickableDenominator ? 'underline' : 'none',
                    textUnderlineOffset: 3,
                  }}
                >
                  / {denominatorCount !== null ? denominatorCount : '—'}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
