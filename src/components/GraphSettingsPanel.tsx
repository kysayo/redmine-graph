import { useEffect, useState } from 'react'
import Select from 'react-select'
import type { ElapsedDaysBucket, FilterField, FilterFieldOption, PieGroupRule, Preset, PresetSettings, RedmineStatus, SeriesCondition, SeriesConfig, SummaryCardConfig, TeamPreset, UserSettings } from '../types'
import { loadPresets, savePresets } from '../utils/storage'

const fieldSelectStyles = {
  control: (base: object) => ({
    ...base,
    minHeight: 28,
    fontSize: 12,
    borderColor: '#ccc',
    borderRadius: 3,
    boxShadow: 'none',
    '&:hover': { borderColor: '#aaa' },
  }),
  valueContainer: (base: object) => ({
    ...base,
    padding: '0 4px',
  }),
  input: (base: object) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  menu: (base: object) => ({
    ...base,
    fontSize: 12,
    zIndex: 9999,
  }),
  option: (base: object) => ({
    ...base,
    padding: '4px 8px',
  }),
  dropdownIndicator: (base: object) => ({
    ...base,
    padding: '0 4px',
  }),
  clearIndicator: (base: object) => ({
    ...base,
    padding: '0 4px',
  }),
}

const COLOR_PALETTE = [
  '#93c5fd', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6',
]

interface ElapsedDaysBucketsEditorProps {
  buckets: ElapsedDaysBucket[]
  onChange: (buckets: ElapsedDaysBucket[]) => void
}

function ElapsedDaysBucketsEditor({ buckets, onChange }: ElapsedDaysBucketsEditorProps) {
  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '2px 4px',
    border: '1px solid #ccc',
    borderRadius: 3,
    background: '#fff',
  }

  function addBucket() {
    onChange([...buckets, { label: '', min: 0 }])
  }

  function removeBucket(idx: number) {
    onChange(buckets.filter((_, i) => i !== idx))
  }

  function updateBucket(idx: number, patch: Partial<ElapsedDaysBucket>) {
    onChange(buckets.map((b, i) => i === idx ? { ...b, ...patch } : b))
  }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>バケット定義</div>
      {buckets.map((bucket, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={bucket.label}
            onChange={(e) => updateBucket(idx, { label: e.target.value })}
            placeholder="ラベル"
            style={{ ...inputStyle, width: 80 }}
          />
          <span style={{ fontSize: 11, color: '#777' }}>最小</span>
          <input
            type="number"
            min={0}
            value={bucket.min}
            onChange={(e) => updateBucket(idx, { min: Number(e.target.value) })}
            style={{ ...inputStyle, width: 50 }}
          />
          <span style={{ fontSize: 11, color: '#777' }}>最大</span>
          <input
            type="number"
            min={0}
            value={bucket.max ?? ''}
            onChange={(e) => updateBucket(idx, { max: e.target.value !== '' ? Number(e.target.value) : undefined })}
            placeholder="以上"
            style={{ ...inputStyle, width: 50 }}
          />
          <button
            type="button"
            onClick={() => removeBucket(idx)}
            style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
          >×</button>
        </div>
      ))}
      <button
        type="button"
        onClick={addBucket}
        style={{ fontSize: 11, padding: '1px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer' }}
      >
        + バケットを追加
      </button>
    </div>
  )
}

interface PieGroupRulesEditorProps {
  groupBy: string
  groupRules: PieGroupRule[]
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onChange: (rules: PieGroupRule[] | undefined) => void
}

function PieGroupRulesEditor({ groupBy, groupRules, getFieldOptions, onChange }: PieGroupRulesEditorProps) {
  const [options, setOptions] = useState<FilterFieldOption[]>([])
  const [loading, setLoading] = useState(false)

  const enabled = groupRules.length > 0

  // groupBy が変わったら選択肢を取得
  useEffect(() => {
    if (!groupBy) return
    setLoading(true)
    getFieldOptions(groupBy).then(opts => {
      setOptions(opts)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy])

  function handleToggle(checked: boolean) {
    if (checked) {
      onChange([{ name: '', values: [] }])
    } else {
      onChange(undefined)
    }
  }

  function addRule() {
    onChange([...groupRules, { name: '', values: [] }])
  }

  function removeRule(idx: number) {
    const next = groupRules.filter((_, i) => i !== idx)
    onChange(next.length ? next : undefined)
  }

  function updateRuleName(idx: number, name: string) {
    onChange(groupRules.map((r, i) => i === idx ? { ...r, name } : r))
  }

  function updateRuleValues(idx: number, values: string[]) {
    onChange(groupRules.map((r, i) => i === idx ? { ...r, values } : r))
  }

  const selectStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '2px 4px',
    border: '1px solid #ccc',
    borderRadius: 3,
    background: '#fff',
  }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: enabled ? 6 : 0 }}>
        <input
          type="checkbox"
          id={`pie-group-${groupBy}`}
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          style={{ cursor: 'pointer', width: 13, height: 13 }}
        />
        <label htmlFor={`pie-group-${groupBy}`} style={{ fontSize: 12, color: '#555', cursor: 'pointer' }}>
          グルーピングを使用
        </label>
      </div>
      {enabled && (
        <div>
          {loading && <span style={{ fontSize: 11, color: '#999' }}>選択肢を読み込み中...</span>}
          {groupRules.map((rule, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={rule.name}
                onChange={(e) => updateRuleName(idx, e.target.value)}
                placeholder="グループ名"
                style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 110 }}
              />
              <select
                multiple
                value={rule.values}
                onChange={(e) => updateRuleValues(idx, Array.from(e.target.selectedOptions, o => o.value))}
                style={{ ...selectStyle, height: 60, minWidth: 130 }}
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRule(idx)}
                style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRule}
            style={{ fontSize: 11, padding: '1px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer' }}
          >
            + グループを追加
          </button>
        </div>
      )}
    </div>
  )
}

interface ConditionsEditorProps {
  conditions: SeriesCondition[]
  filterFields: FilterField[]
  dateFilterFields: FilterField[]
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onChange: (next: SeriesCondition[] | undefined) => void
}

const ELAPSED_DAYS_FIELD: FilterField = { key: 'elapsed_days', name: '経過日数(日)' }

const BUILTIN_DATE_FIELDS: FilterField[] = [
  { key: 'updated_on', name: '更新日' },
  { key: 'created_on', name: '作成日' },
  { key: 'closed_on', name: '完了日' },
]

function ConditionsEditor({ conditions, filterFields, dateFilterFields, getFieldOptions, onChange }: ConditionsEditorProps) {
  const [fieldOptions, setFieldOptions] = useState<Record<string, FilterFieldOption[]>>({})
  const [loadingField, setLoadingField] = useState<string | null>(null)

  const allFields = [ELAPSED_DAYS_FIELD, ...filterFields]

  // conditions のフィールドが変わったとき（プリセット読み込み含む）、未取得のフィールドの選択肢を取得
  const fieldsKey = [...new Set(conditions.map(c => c.field).filter(f => f && f !== 'elapsed_days'))].sort().join(',')
  useEffect(() => {
    const fields = fieldsKey ? fieldsKey.split(',') : []
    for (const field of fields) {
      if (fieldOptions[field]) continue
      getFieldOptions(field).then(opts => {
        setFieldOptions(prev => ({ ...prev, [field]: opts }))
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsKey])

  function addCondition() {
    onChange([...conditions, { field: '', operator: '=', values: [] }])
  }

  function removeCondition(idx: number) {
    const next = conditions.filter((_, i) => i !== idx)
    onChange(next.length ? next : undefined)
  }

  async function handleConditionFieldChange(idx: number, newField: string) {
    const next = conditions.map((c, i) => i === idx ? { ...c, field: newField, values: [] } : c)
    onChange(next)
    if (newField && !fieldOptions[newField]) {
      setLoadingField(newField)
      const opts = await getFieldOptions(newField)
      setFieldOptions(prev => ({ ...prev, [newField]: opts }))
      setLoadingField(null)
    }
  }

  function updateConditionOperator(idx: number, operator: SeriesCondition['operator']) {
    onChange(conditions.map((c, i) => i === idx ? { ...c, operator } : c))
  }

  function updateConditionValues(idx: number, values: string[]) {
    onChange(conditions.map((c, i) => i === idx ? { ...c, values } : c))
  }

  function updateConditionBaseField(idx: number, baseField: string) {
    onChange(conditions.map((c, i) => i === idx ? { ...c, elapsedDaysBaseField: baseField } : c))
  }

  const elapsedDaysBaseFields = [...BUILTIN_DATE_FIELDS, ...dateFilterFields]

  const selectStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '2px 4px',
    border: '1px solid #ccc',
    borderRadius: 3,
    background: '#fff',
  }

  return (
    <div>
      {conditions.map((cond, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
          {/* フィールド選択 */}
          <div style={{ minWidth: 160, flex: '0 0 auto' }}>
            <Select
              options={allFields.map(f => ({ label: f.name, value: f.key }))}
              value={cond.field ? { label: allFields.find(f => f.key === cond.field)?.name ?? cond.field, value: cond.field } : null}
              onChange={(selected) => handleConditionFieldChange(idx, selected?.value ?? '')}
              styles={fieldSelectStyles}
              placeholder="項目を選択..."
              noOptionsMessage={() => '候補なし'}
              isClearable
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>
          {/* 演算子 */}
          <select
            value={cond.operator}
            onChange={(e) => updateConditionOperator(idx, e.target.value as SeriesCondition['operator'])}
            style={selectStyle}
          >
            <option value="=">=</option>
            <option value="!">!=</option>
            <option value=">=">&gt;=（以上）</option>
          </select>
          {/* 値選択 */}
          {cond.field && (
            cond.field === 'elapsed_days' ? (
              <>
                <select
                  value={cond.elapsedDaysBaseField ?? 'updated_on'}
                  onChange={(e) => updateConditionBaseField(idx, e.target.value)}
                  style={selectStyle}
                  title="経過日数の基準となる日付フィールド"
                >
                  {elapsedDaysBaseFields.map(f => (
                    <option key={f.key} value={f.key}>{f.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={cond.values[0] ?? ''}
                  onChange={(e) => updateConditionValues(idx, e.target.value !== '' ? [e.target.value] : [])}
                  style={{ ...selectStyle, width: 60 }}
                  placeholder="日数"
                />
              </>
            ) : loadingField === cond.field ? (
              <span style={{ fontSize: 11, color: '#999' }}>読み込み中...</span>
            ) : (
              <select
                multiple
                value={cond.values}
                onChange={(e) => updateConditionValues(idx, Array.from(e.target.selectedOptions, o => o.value))}
                style={{ ...selectStyle, height: 60, minWidth: 120 }}
              >
                {(fieldOptions[cond.field] ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )
          )}
          {/* 条件削除 */}
          <button
            type="button"
            onClick={() => removeCondition(idx)}
            style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addCondition}
        style={{ fontSize: 11, padding: '1px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer' }}
      >
        + 条件を追加
      </button>
    </div>
  )
}

interface SeriesRowProps {
  series: SeriesConfig
  allSeries: SeriesConfig[]
  statuses: RedmineStatus[]
  statusesLoading: boolean
  canDelete: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  filterFields: FilterField[]
  dateFilterFields: FilterField[]
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onChange: (updated: SeriesConfig) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function SeriesRow({ series, allSeries, statuses, statusesLoading, canDelete, canMoveUp, canMoveDown, filterFields, dateFilterFields, getFieldOptions, onChange, onDelete, onMoveUp, onMoveDown }: SeriesRowProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  function update<K extends keyof SeriesConfig>(key: K, value: SeriesConfig[K]) {
    onChange({ ...series, [key]: value })
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(e.target.selectedOptions, (opt) => Number(opt.value))
    update('statusIds', selected)
  }

  function handleAggregationChange(newAgg: SeriesConfig['aggregation']) {
    if (newAgg === 'difference') {
      const candidates = allSeries.filter(s => s.id !== series.id && s.aggregation !== 'difference')
      onChange({
        ...series,
        aggregation: 'difference',
        refSeriesIds: candidates.length >= 2 ? [candidates[0].id, candidates[1].id] : undefined,
      })
    } else {
      onChange({ ...series, aggregation: newAgg, refSeriesIds: undefined })
    }
  }

  // 参照系列の選択肢（自身 + difference 系列を除く）
  const refCandidates = allSeries.filter(s => s.id !== series.id && s.aggregation !== 'difference')

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#555',
    display: 'block',
    marginBottom: 2,
  }
  const selectStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '2px 4px',
    border: '1px solid #ccc',
    borderRadius: 3,
    background: '#fff',
  }
  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '2px 6px',
    border: '1px solid #ccc',
    borderRadius: 3,
    width: 140,
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '8px 0', borderBottom: '1px solid #eee', flexWrap: 'wrap', opacity: (series.visible ?? true) ? 1 : 0.45 }}>
      {/* 表示/非表示チェックボックス */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: 4 }}>
        <input
          type="checkbox"
          id={`visible-${series.id}`}
          checked={series.visible ?? true}
          onChange={(e) => update('visible', e.target.checked)}
          style={{ cursor: 'pointer', width: 14, height: 14 }}
          title="系列を表示"
        />
      </div>

      {/* 色インジケーター＋カラーピッカー */}
      <div style={{ position: 'relative', flexShrink: 0, marginBottom: 4 }}>
        <div
          onClick={() => setColorPickerOpen(!colorPickerOpen)}
          style={{ width: 14, height: 14, borderRadius: 2, background: series.color, cursor: 'pointer', border: '1px solid #aaa' }}
        />
        {colorPickerOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setColorPickerOpen(false)}
            />
            <div style={{ position: 'absolute', top: 18, left: 0, zIndex: 100, background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: 6, display: 'flex', flexWrap: 'wrap', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: 156 }}>
              {COLOR_PALETTE.map((c) => (
                <div
                  key={c}
                  onClick={() => { update('color', c); setColorPickerOpen(false) }}
                  style={{ width: 16, height: 16, borderRadius: 2, background: c, cursor: 'pointer', border: c === series.color ? '2px solid #333' : '1px solid #aaa' }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 系列名 */}
      <div>
        <label style={labelStyle}>系列名</label>
        <input
          type="text"
          value={series.label}
          onChange={(e) => update('label', e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* 日付フィールド（difference の場合は非表示） */}
      {series.aggregation !== 'difference' && (
        <div>
          <label style={labelStyle}>集計軸</label>
          <select
            value={series.dateField}
            onChange={(e) => {
              const newDateField = e.target.value as SeriesConfig['dateField']
              onChange({
                ...series,
                dateField: newDateField,
                customDateFieldKey: newDateField !== 'custom' ? undefined : series.customDateFieldKey,
              })
            }}
            style={selectStyle}
          >
            <option value="created_on">作成日</option>
            <option value="closed_on">完了日</option>
            <option value="custom">特殊な日付</option>
          </select>
          {series.dateField === 'custom' && (
            <div style={{ marginTop: 4, minWidth: 180 }}>
              <Select
                options={dateFilterFields.map(f => ({ label: f.name, value: f.key }))}
                value={
                  series.customDateFieldKey
                    ? {
                        label: dateFilterFields.find(f => f.key === series.customDateFieldKey)?.name ?? series.customDateFieldKey,
                        value: series.customDateFieldKey,
                      }
                    : null
                }
                onChange={(selected) => update('customDateFieldKey', selected?.value ?? undefined)}
                styles={fieldSelectStyles}
                placeholder="日付フィールドを選択..."
                noOptionsMessage={() => '候補なし'}
                isClearable
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          )}
        </div>
      )}

      {/* グラフ種類 */}
      <div>
        <label style={labelStyle}>グラフ種類</label>
        <select
          value={series.chartType}
          onChange={(e) => update('chartType', e.target.value as SeriesConfig['chartType'])}
          style={selectStyle}
        >
          <option value="bar">棒グラフ</option>
          <option value="line">折れ線</option>
        </select>
      </div>

      {/* 軸 */}
      <div>
        <label style={labelStyle}>軸</label>
        <select
          value={series.yAxisId}
          onChange={(e) => update('yAxisId', e.target.value as SeriesConfig['yAxisId'])}
          style={selectStyle}
        >
          <option value="left">左軸</option>
          <option value="right">右軸</option>
        </select>
      </div>

      {/* 集計方法 */}
      <div>
        <label style={labelStyle}>集計方法</label>
        <select
          value={series.aggregation}
          onChange={(e) => handleAggregationChange(e.target.value as SeriesConfig['aggregation'])}
          style={selectStyle}
        >
          <option value="daily">日別</option>
          <option value="cumulative">累計</option>
          <option value="difference">差 (A − B)</option>
        </select>
      </div>

      {/* difference の場合: 参照系列選択 */}
      {series.aggregation === 'difference' && (
        <>
          <div>
            <label style={labelStyle}>系列A（被減数）</label>
            <select
              value={series.refSeriesIds?.[0] ?? ''}
              onChange={(e) => onChange({ ...series, refSeriesIds: [e.target.value, series.refSeriesIds?.[1] ?? ''] as [string, string] })}
              style={selectStyle}
            >
              <option value="">選択...</option>
              {refCandidates.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>系列B（減数）</label>
            <select
              value={series.refSeriesIds?.[1] ?? ''}
              onChange={(e) => onChange({ ...series, refSeriesIds: [series.refSeriesIds?.[0] ?? '', e.target.value] as [string, string] })}
              style={selectStyle}
            >
              <option value="">選択...</option>
              {refCandidates.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </>
      )}

      {/* 対象ステータス・絞り込み条件（difference の場合は非表示） */}
      {series.aggregation !== 'difference' && (
        <>
          <div>
            <label style={labelStyle}>対象ステータス（未選択=全て）</label>
            {statusesLoading ? (
              <span style={{ fontSize: 12, color: '#999' }}>読み込み中...</span>
            ) : (
              <select
                multiple
                value={series.statusIds.map(String)}
                onChange={handleStatusChange}
                disabled={series.dateField === 'custom'}
                style={{
                  ...selectStyle,
                  height: 72,
                  minWidth: 140,
                  opacity: series.dateField === 'custom' ? 0.4 : 1,
                  cursor: series.dateField === 'custom' ? 'not-allowed' : 'default',
                }}
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            {series.dateField === 'custom' && (
              <span style={{ fontSize: 11, color: '#999', display: 'block', marginTop: 2 }}>
                ※ 特殊な日付ではステータス絞り込みは無効
              </span>
            )}
          </div>

          <div style={{ width: '100%', marginTop: 6, paddingTop: 6, borderTop: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>絞り込み条件</div>
            <ConditionsEditor
              conditions={series.conditions ?? []}
              filterFields={filterFields}
              dateFilterFields={dateFilterFields}
              getFieldOptions={getFieldOptions}
              onChange={(next) => update('conditions', next)}
            />
          </div>
        </>
      )}

      {/* 上下移動ボタン */}
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: canMoveUp ? 'pointer' : 'default', color: canMoveUp ? '#333' : '#ccc', marginBottom: 4 }}
        title="上へ移動"
      >↑</button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: canMoveDown ? 'pointer' : 'default', color: canMoveDown ? '#333' : '#ccc', marginBottom: 4 }}
        title="下へ移動"
      >↓</button>

      {/* 削除ボタン */}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          style={{
            fontSize: 12,
            padding: '2px 8px',
            border: '1px solid #ccc',
            borderRadius: 3,
            background: '#fff',
            cursor: 'pointer',
            color: '#e53e3e',
            marginBottom: 4,
          }}
        >
          削除
        </button>
      )}
    </div>
  )
}

interface SummaryCardEditorRowProps {
  card: SummaryCardConfig
  filterFields: FilterField[]
  dateFilterFields: FilterField[]
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onChange: (updated: SummaryCardConfig) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

function SummaryCardEditorRow({ card, filterFields, dateFilterFields, getFieldOptions, onChange, onDelete, onMoveUp, onMoveDown }: SummaryCardEditorRowProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [showDenominator, setShowDenominator] = useState(!!card.denominator)

  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }
  const inputStyle: React.CSSProperties = { fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', width: 140 }

  function handleToggleDenominator(checked: boolean) {
    setShowDenominator(checked)
    if (!checked) {
      onChange({ ...card, denominator: undefined })
    } else {
      onChange({ ...card, denominator: { conditions: [] } })
    }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', marginBottom: 8, borderLeft: `4px solid ${card.color}` }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* 色インジケーター＋カラーピッカー */}
        <div style={{ position: 'relative', flexShrink: 0, paddingTop: 18 }}>
          <div
            onClick={() => setColorPickerOpen(!colorPickerOpen)}
            style={{ width: 14, height: 14, borderRadius: 2, background: card.color, cursor: 'pointer', border: '1px solid #aaa' }}
          />
          {colorPickerOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setColorPickerOpen(false)}
              />
              <div style={{ position: 'absolute', top: 32, left: 0, zIndex: 100, background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: 6, display: 'flex', flexWrap: 'wrap', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: 156 }}>
                {COLOR_PALETTE.map((c) => (
                  <div
                    key={c}
                    onClick={() => { onChange({ ...card, color: c }); setColorPickerOpen(false) }}
                    style={{ width: 16, height: 16, borderRadius: 2, background: c, cursor: 'pointer', border: c === card.color ? '2px solid #333' : '1px solid #aaa' }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* タイトル */}
        <div>
          <label style={labelStyle}>タイトル</label>
          <input
            type="text"
            value={card.title}
            onChange={(e) => onChange({ ...card, title: e.target.value })}
            placeholder="未完了チケット"
            style={inputStyle}
          />
        </div>

        {/* ↑↓・削除ボタン */}
        <div style={{ marginLeft: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: onMoveUp ? 'pointer' : 'default', color: onMoveUp ? '#333' : '#ccc' }}
            title="上へ移動"
          >↑</button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: onMoveDown ? 'pointer' : 'default', color: onMoveDown ? '#333' : '#ccc' }}
            title="下へ移動"
          >↓</button>
          <button
            type="button"
            onClick={onDelete}
            style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
          >
            削除
          </button>
        </div>
      </div>

      {/* 分子条件 */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 4, fontWeight: 'bold' }}>分子（件数）の絞り込み条件</div>
        <ConditionsEditor
          conditions={card.numerator.conditions}
          filterFields={filterFields}
          dateFilterFields={dateFilterFields}
          getFieldOptions={getFieldOptions}
          onChange={(next) => onChange({ ...card, numerator: { conditions: next ?? [] } })}
        />
      </div>

      {/* 分母トグル */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: showDenominator ? 6 : 0 }}>
          <input
            type="checkbox"
            id={`denom-toggle-${card.title}-${card.color}`}
            checked={showDenominator}
            onChange={(e) => handleToggleDenominator(e.target.checked)}
            style={{ cursor: 'pointer', width: 13, height: 13 }}
          />
          <label
            htmlFor={`denom-toggle-${card.title}-${card.color}`}
            style={{ fontSize: 11, color: '#555', cursor: 'pointer' }}
          >
            分母の条件を指定する（指定時は「分子 / 分母」形式で表示）
          </label>
        </div>
        {showDenominator && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4, fontWeight: 'bold' }}>分母の絞り込み条件</div>
            <ConditionsEditor
              conditions={card.denominator?.conditions ?? []}
              filterFields={filterFields}
              dateFilterFields={dateFilterFields}
              getFieldOptions={getFieldOptions}
              onChange={(next) => onChange({ ...card, denominator: { conditions: next ?? [] } })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  settings: UserSettings
  statuses: RedmineStatus[]
  statusesLoading: boolean
  onChange: (settings: UserSettings) => void
  onReset?: () => void
  teamPresets?: TeamPreset[]
  filterFields?: FilterField[]
  dateFilterFields?: FilterField[]
  getFieldOptions?: (key: string) => Promise<FilterFieldOption[]>
}

export function GraphSettingsPanel({ settings, statuses, statusesLoading, onChange, onReset, teamPresets, filterFields = [], dateFilterFields = [], getFieldOptions = async () => [] }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets())
  const [presetNameInput, setPresetNameInput] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [jsonModalName, setJsonModalName] = useState('設定')

  function handleSavePreset() {
    const name = presetNameInput.trim()
    if (!name) return
    const { version: _version, ...presetSettings } = settings
    const newPreset: Preset = {
      id: String(Date.now()),
      name,
      settings: presetSettings,
    }
    const next = [...presets, newPreset]
    setPresets(next)
    savePresets(next)
    setPresetNameInput('')
  }

  // JSON.stringify は undefined を省略するため、スプレッドだけではオプショナルフィールドが
  // プリセット側で「未設定」でも現在値が残ってしまう。明示的に再設定することで正しくクリアされる。
  function mergePresetSettings(base: UserSettings, preset: PresetSettings): UserSettings {
    return {
      ...base,
      ...preset,
      startDate: preset.startDate,
      hideWeekends: preset.hideWeekends,
      yAxisLeftMin: preset.yAxisLeftMin,
      yAxisLeftMinAuto: preset.yAxisLeftMinAuto,
      yAxisRightMax: preset.yAxisRightMax,
      weeklyMode: preset.weeklyMode,
      anchorDay: preset.anchorDay,
      dateFormat: preset.dateFormat,
      chartHeight: preset.chartHeight,
    }
  }

  function handleLoadPreset() {
    const preset = presets.find(p => p.id === selectedPresetId)
    if (!preset) return
    onChange(mergePresetSettings(settings, preset.settings))
  }

  function handleDownloadPresetJson(name: string) {
    const { version: _version, ...presetSettings } = settings
    const teamPreset: TeamPreset = {
      name,
      settings: presetSettings,
    }
    const json = JSON.stringify(teamPreset)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'redmine-graph-preset.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowJsonModal(false)
  }

  function handleDeletePreset(id: string) {
    const next = presets.filter(p => p.id !== id)
    setPresets(next)
    savePresets(next)
    if (selectedPresetId === id) setSelectedPresetId('')
  }

  function updateSeries(index: number, updated: SeriesConfig) {
    const next = [...settings.series]
    next[index] = updated
    onChange({ ...settings, series: next })
  }

  function deleteSeries(index: number) {
    const next = settings.series.filter((_, i) => i !== index)
    onChange({ ...settings, series: next })
  }

  function moveSeries(from: number, to: number) {
    const next = [...settings.series]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange({ ...settings, series: next })
  }

  function movePie(from: number, to: number) {
    const pies = [...(settings.pies ?? [])]
    const [item] = pies.splice(from, 1)
    pies.splice(to, 0, item)
    onChange({ ...settings, pies })
  }

  function addSeries() {
    const colorIndex = settings.series.length % COLOR_PALETTE.length
    const newSeries: SeriesConfig = {
      id: `series-${Date.now()}`,
      label: `系列${settings.series.length + 1}`,
      dateField: 'created_on',
      statusIds: [],
      chartType: 'bar',
      yAxisId: 'left',
      aggregation: 'daily',
      color: COLOR_PALETTE[colorIndex],
    }
    onChange({ ...settings, series: [...settings.series, newSeries] })
  }

  function addSummaryCard() {
    const colorIndex = (settings.summaryCards?.length ?? 0) % COLOR_PALETTE.length
    const newCard: SummaryCardConfig = {
      title: '',
      color: COLOR_PALETTE[colorIndex],
      numerator: { conditions: [] },
    }
    onChange({ ...settings, summaryCards: [...(settings.summaryCards ?? []), newCard] })
  }

  function updateSummaryCard(index: number, updated: SummaryCardConfig) {
    const next = [...(settings.summaryCards ?? [])]
    next[index] = updated
    onChange({ ...settings, summaryCards: next })
  }

  function deleteSummaryCard(index: number) {
    const next = (settings.summaryCards ?? []).filter((_, i) => i !== index)
    onChange({ ...settings, summaryCards: next.length ? next : undefined })
  }

  function moveSummaryCard(from: number, to: number) {
    const next = [...(settings.summaryCards ?? [])]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange({ ...settings, summaryCards: next })
  }

  return (
    <div style={{ marginBottom: 16, border: '1px solid #ddd', borderRadius: 4 }}>
      {/* Preset JSON DL モーダル */}
      {showJsonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 6, padding: 24, minWidth: 280, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 'bold' }}>プリセット名</p>
            <input
              type="text"
              value={jsonModalName}
              onChange={(e) => setJsonModalName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDownloadPresetJson(jsonModalName.trim() || '設定') }}
              style={{ width: '100%', padding: '4px 6px', fontSize: 13, border: '1px solid #ccc', borderRadius: 3, boxSizing: 'border-box' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                style={{ fontSize: 12, padding: '3px 12px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPresetJson(jsonModalName.trim() || '設定')}
                style={{ fontSize: 12, padding: '3px 12px', border: '1px solid #93c5fd', borderRadius: 3, background: '#eff6ff', cursor: 'pointer', color: '#1d4ed8' }}
              >
                ダウンロード
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ヘッダー */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 12px',
          cursor: 'pointer',
          background: '#f5f5f5',
          borderBottom: isOpen ? '1px solid #ddd' : 'none',
          borderRadius: isOpen ? '4px 4px 0 0' : 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          fontSize: 13,
          fontWeight: 'bold',
          color: '#444',
        }}
      >
        <span>グラフ設定</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onReset && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReset() }}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                border: '1px solid #ccc',
                borderRadius: 3,
                background: '#fff',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              全条件をクリア
            </button>
          )}
          <span style={{ fontSize: 11, color: '#888' }}>{isOpen ? '▲ 閉じる' : '▼ 開く'}</span>
        </div>
      </div>

      {/* パネル本体 */}
      {isOpen && (
        <div style={{ padding: '8px 12px 12px' }}>
          {/* グラフ表示設定 */}
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {/* 開始日 */}
              <div>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>開始日</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="date"
                    value={settings.startDate ?? ''}
                    onChange={(e) => onChange({ ...settings, startDate: e.target.value || undefined })}
                    style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 140 }}
                  />
                  {settings.startDate && (
                    <button
                      onClick={() => onChange({ ...settings, startDate: undefined })}
                      title="空欄に戻す（自動=14日前）"
                      style={{ fontSize: 11, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', background: '#fff' }}
                    >
                      クリア
                    </button>
                  )}
                  <span style={{ fontSize: 11, color: '#999' }}>（空欄=14日前）</span>
                </div>
              </div>
              {/* 日付形式 */}
              <div>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>日付形式</label>
                <select
                  value={settings.dateFormat ?? 'yyyy-mm-dd'}
                  onChange={(e) => onChange({ ...settings, dateFormat: e.target.value as UserSettings['dateFormat'] })}
                  style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, background: '#fff' }}
                >
                  <option value="yyyy-mm-dd">2026-02-10</option>
                  <option value="M/D">2/10</option>
                </select>
              </div>
              {/* 土日非表示 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <input
                  type="checkbox"
                  id="hideWeekends"
                  checked={settings.hideWeekends ?? false}
                  onChange={(e) => onChange({ ...settings, hideWeekends: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="hideWeekends" style={{ fontSize: 12, color: '#555', cursor: 'pointer' }}>
                  土日を非表示
                </label>
              </div>
              {/* 週次集計 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <input
                  type="checkbox"
                  id="weeklyMode"
                  checked={settings.weeklyMode ?? false}
                  onChange={(e) => onChange({ ...settings, weeklyMode: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="weeklyMode" style={{ fontSize: 12, color: '#555', cursor: 'pointer' }}>
                  週次集計
                </label>
              </div>
              {/* 基準曜日（週次モード時のみ） */}
              {(settings.weeklyMode ?? false) && (
                <div>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>基準曜日</label>
                  <select
                    value={settings.anchorDay ?? 1}
                    onChange={(e) => onChange({ ...settings, anchorDay: Number(e.target.value) })}
                    style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, background: '#fff' }}
                  >
                    <option value={1}>月曜</option>
                    <option value={2}>火曜</option>
                    <option value={3}>水曜</option>
                    <option value={4}>木曜</option>
                    <option value={5}>金曜</option>
                  </select>
                </div>
              )}
              {/* 左軸の最小値 */}
              <div>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>左軸の最小値</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.yAxisLeftMinAuto ?? false}
                      onChange={(e) => onChange({ ...settings, yAxisLeftMinAuto: e.target.checked })}
                    />
                    最大値の8割
                  </label>
                  <input
                    type="number"
                    value={settings.yAxisLeftMinAuto ? '' : (settings.yAxisLeftMin ?? '')}
                    disabled={settings.yAxisLeftMinAuto ?? false}
                    onChange={(e) => {
                      const raw = e.target.value
                      onChange({ ...settings, yAxisLeftMin: raw === '' ? undefined : Number(raw) })
                    }}
                    placeholder="0"
                    style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 80, opacity: settings.yAxisLeftMinAuto ? 0.4 : 1 }}
                  />
                  <span style={{ fontSize: 11, color: '#999' }}>（空欄=自動）</span>
                </div>
              </div>
              {/* 右軸の最大値 */}
              <div>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>右軸の最大値</label>
                <input
                  type="number"
                  value={settings.yAxisRightMax ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    onChange({ ...settings, yAxisRightMax: raw === '' ? undefined : Number(raw) })
                  }}
                  placeholder="自動"
                  style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 80 }}
                />
                <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>（空欄=自動）</span>
              </div>
              {/* グラフ高さ */}
              <div>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>グラフ高さ (px)</label>
                <input
                  type="number"
                  min={100}
                  max={800}
                  step={10}
                  value={settings.chartHeight ?? 320}
                  onChange={(e) => {
                    const raw = e.target.value
                    onChange({ ...settings, chartHeight: raw === '' ? undefined : Number(raw) })
                  }}
                  style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 80 }}
                />
              </div>
            </div>

          </div>

          {/* チームプリセット（管理者定義・読取専用） */}
          {teamPresets && teamPresets.length > 0 && (
            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>チームプリセット</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {teamPresets.map((tp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange(mergePresetSettings(settings, tp.settings))}
                    style={{
                      fontSize: 12,
                      padding: '2px 10px',
                      border: '1px solid #93c5fd',
                      borderRadius: 3,
                      background: '#eff6ff',
                      cursor: 'pointer',
                      color: '#1d4ed8',
                    }}
                  >
                    {tp.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* プリセット */}
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>プリセット</div>
            {/* 保存 */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                placeholder="プリセット名"
                style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 160 }}
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!presetNameInput.trim()}
                style={{ fontSize: 12, padding: '2px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: presetNameInput.trim() ? 'pointer' : 'default', color: presetNameInput.trim() ? '#333' : '#aaa' }}
              >
                プリセットとして保存
              </button>
              <button
                type="button"
                onClick={() => { setJsonModalName('設定'); setShowJsonModal(true) }}
                style={{ fontSize: 12, padding: '2px 8px', border: '1px solid #93c5fd', borderRadius: 3, background: '#eff6ff', cursor: 'pointer', color: '#1d4ed8' }}
              >
                Preset JSON DL
              </button>
            </div>
            {/* 読み込み */}
            {presets.length > 0 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3 }}
                >
                  <option value="">-- プリセットを選択 --</option>
                  {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleLoadPreset}
                  disabled={!selectedPresetId}
                  style={{ fontSize: 12, padding: '2px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: selectedPresetId ? 'pointer' : 'default', color: selectedPresetId ? '#333' : '#aaa' }}
                >
                  読み込む
                </button>
                {selectedPresetId && (
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(selectedPresetId)}
                    style={{ fontSize: 12, padding: '2px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
                  >
                    削除
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2軸グラフ設定 */}
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>2軸グラフ設定</div>
            {settings.series.map((s, i) => (
              <SeriesRow
                key={s.id}
                series={s}
                allSeries={settings.series}
                statuses={statuses}
                statusesLoading={statusesLoading}
                canDelete={settings.series.length > 1}
                canMoveUp={i > 0}
                canMoveDown={i < settings.series.length - 1}
                filterFields={filterFields}
                dateFilterFields={dateFilterFields}
                getFieldOptions={getFieldOptions}
                onChange={(updated) => updateSeries(i, updated)}
                onDelete={() => deleteSeries(i)}
                onMoveUp={() => moveSeries(i, i - 1)}
                onMoveDown={() => moveSeries(i, i + 1)}
              />
            ))}
            <button
              type="button"
              onClick={addSeries}
              style={{
                marginTop: 8,
                fontSize: 12,
                padding: '3px 10px',
                border: '1px solid #ccc',
                borderRadius: 3,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              ＋ 系列を追加
            </button>
          </div>

          {/* 集計カード設定 */}
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>集計カード設定</div>
            {(settings.summaryCards ?? []).map((card, i) => (
              <SummaryCardEditorRow
                key={i}
                card={card}
                filterFields={filterFields}
                dateFilterFields={dateFilterFields}
                getFieldOptions={getFieldOptions}
                onChange={(updated) => updateSummaryCard(i, updated)}
                onDelete={() => deleteSummaryCard(i)}
              onMoveUp={i > 0 ? () => moveSummaryCard(i, i - 1) : undefined}
              onMoveDown={i < (settings.summaryCards ?? []).length - 1 ? () => moveSummaryCard(i, i + 1) : undefined}
              />
            ))}
            <button
              type="button"
              onClick={addSummaryCard}
              style={{
                marginTop: 4,
                fontSize: 12,
                padding: '3px 10px',
                border: '1px solid #ccc',
                borderRadius: 3,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              ＋ カードを追加
            </button>
          </div>

          {/* 円グラフ設定 */}
          <div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>円グラフ設定</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(settings.pies ?? []).map((pie, i) => {
                const pies = settings.pies ?? []
                return (
                  <div key={i} style={{ minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <label style={{ fontSize: 12, color: '#555' }}>円グラフ {i + 1}</label>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => movePie(i, i - 1)}
                          disabled={i === 0}
                          style={{ fontSize: 11, padding: '1px 5px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i > 0 ? 'pointer' : 'default', color: i > 0 ? '#333' : '#ccc' }}
                          title="左へ移動"
                        >←</button>
                        <button
                          type="button"
                          onClick={() => movePie(i, i + 1)}
                          disabled={i === pies.length - 1}
                          style={{ fontSize: 11, padding: '1px 5px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i < pies.length - 1 ? 'pointer' : 'default', color: i < pies.length - 1 ? '#333' : '#ccc' }}
                          title="右へ移動"
                        >→</button>
                        {pies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onChange({ ...settings, pies: pies.filter((_, j) => j !== i) })}
                            style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#666' }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>タイトル（省略可）</label>
                      <input
                        type="text"
                        value={pie.label ?? ''}
                        onChange={(e) => {
                          const next = pies.map((p, j) => j === i ? { ...p, label: e.target.value || undefined } : p)
                          onChange({ ...settings, pies: next })
                        }}
                        placeholder={filterFields.find(f => f.key === pie.groupBy)?.name ?? pie.groupBy}
                        style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, boxSizing: 'border-box' }}
                      />
                    </div>
                    <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>グループキー</label>
                    <Select
                      options={[ELAPSED_DAYS_FIELD, ...filterFields].map(f => ({ label: f.name, value: f.key }))}
                      value={(() => {
                        const allGroupByFields = [ELAPSED_DAYS_FIELD, ...filterFields]
                        const field = allGroupByFields.find(f => f.key === pie.groupBy)
                        return field ? { label: field.name, value: pie.groupBy } : { label: pie.groupBy, value: pie.groupBy }
                      })()}
                      onChange={(selected) => {
                        const next = pies.map((p, j) => j === i ? { ...p, groupBy: selected?.value ?? 'status_id' } : p)
                        onChange({ ...settings, pies: next })
                      }}
                      styles={fieldSelectStyles}
                      placeholder="項目を選択..."
                      noOptionsMessage={() => '候補なし'}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    <div style={{ marginTop: 6 }}>
                      <ConditionsEditor
                        conditions={pie.conditions ?? []}
                        filterFields={filterFields}
                        dateFilterFields={dateFilterFields}
                        getFieldOptions={getFieldOptions}
                        onChange={(next) => {
                          const updated = pies.map((p, j) => j === i ? { ...p, conditions: next } : p)
                          onChange({ ...settings, pies: updated })
                        }}
                      />
                    </div>
                    {pie.groupBy === 'elapsed_days' ? (
                      <>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#666' }}>ベース日付:</span>
                          <select
                            value={pie.elapsedDaysBaseField ?? 'updated_on'}
                            onChange={(e) => {
                              const updated = pies.map((p, j) => j === i ? { ...p, elapsedDaysBaseField: e.target.value } : p)
                              onChange({ ...settings, pies: updated })
                            }}
                            style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, background: '#fff' }}
                          >
                            {[...BUILTIN_DATE_FIELDS, ...dateFilterFields].map(f => (
                              <option key={f.key} value={f.key}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                        <ElapsedDaysBucketsEditor
                          buckets={pie.elapsedDaysBuckets ?? []}
                          onChange={(buckets) => {
                            const updated = pies.map((p, j) => j === i ? { ...p, elapsedDaysBuckets: buckets } : p)
                            onChange({ ...settings, pies: updated })
                          }}
                        />
                      </>
                    ) : (
                      <PieGroupRulesEditor
                        groupBy={pie.groupBy}
                        groupRules={pie.groupRules ?? []}
                        getFieldOptions={getFieldOptions}
                        onChange={(rules) => {
                          const updated = pies.map((p, j) => j === i ? { ...p, groupRules: rules } : p)
                          onChange({ ...settings, pies: updated })
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...settings, pies: [...(settings.pies ?? []), { groupBy: 'status_id' }] })}
              style={{
                marginTop: 8,
                fontSize: 12,
                padding: '3px 10px',
                border: '1px solid #ccc',
                borderRadius: 3,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              ＋ 円グラフを追加
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
