import { useCallback, useEffect, useState } from 'react'
import Select from 'react-select'
import type { AssignmentMappingConfig, AssignmentMappingPerson, ComboChartConfig, CrossTableConfig, ElapsedDaysBucket, EvmMonthlyActual, EVMGroupRow, EVMTileConfig, FilterField, FilterFieldOption, HeadingConfig, JournalCollectorConfig, JournalCountConfig, PieGroupRule, PieGroupRuleAndCondition, Preset, PresetSettings, RedmineStatus, SeriesCondition, SeriesConfig, SummaryCardConfig, TeamPreset, TileRef, UserSettings } from '../types'
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
          <span style={{ fontSize: 11, color: '#777' }}>最小(営業日)</span>
          <input
            type="number"
            value={bucket.min}
            onChange={(e) => updateBucket(idx, { min: Number(e.target.value) })}
            style={{ ...inputStyle, width: 50 }}
          />
          <span style={{ fontSize: 11, color: '#777' }}>最大(営業日)</span>
          <input
            type="number"
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
  instanceId: string
  groupBy: string
  groupRules: PieGroupRule[]
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onChange: (rules: PieGroupRule[] | undefined) => void
  filterFields?: FilterField[]
  enableAndConditions?: boolean
}

function PieGroupRulesEditor({ instanceId, groupBy, groupRules, getFieldOptions, onChange, filterFields, enableAndConditions }: PieGroupRulesEditorProps) {
  const [options, setOptions] = useState<FilterFieldOption[]>([])
  const [loading, setLoading] = useState(false)
  // AND条件の選択肢キャッシュ（fieldKey → options）
  const [andCondOptionsCache, setAndCondOptionsCache] = useState<Record<string, FilterFieldOption[]>>({})

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

  function addAndCondition(ruleIdx: number) {
    onChange(groupRules.map((r, i) => i === ruleIdx
      ? { ...r, andConditions: [...(r.andConditions ?? []), { field: '', values: [] }] }
      : r
    ))
  }

  function removeAndCondition(ruleIdx: number, condIdx: number) {
    onChange(groupRules.map((r, i) => {
      if (i !== ruleIdx) return r
      const next = (r.andConditions ?? []).filter((_, ci) => ci !== condIdx)
      return { ...r, andConditions: next.length ? next : undefined }
    }))
  }

  function updateAndCondField(ruleIdx: number, condIdx: number, field: string) {
    // フィールドが変わったら選択肢を取得してキャッシュ
    if (field && !andCondOptionsCache[field]) {
      getFieldOptions(field).then(opts => {
        setAndCondOptionsCache(prev => ({ ...prev, [field]: opts }))
      })
    }
    onChange(groupRules.map((r, i) => {
      if (i !== ruleIdx) return r
      const conds = (r.andConditions ?? []).map((c, ci): PieGroupRuleAndCondition =>
        ci === condIdx ? { field, values: [] } : c
      )
      return { ...r, andConditions: conds }
    }))
  }

  function updateAndCondValues(ruleIdx: number, condIdx: number, values: string[]) {
    onChange(groupRules.map((r, i) => {
      if (i !== ruleIdx) return r
      const conds = (r.andConditions ?? []).map((c, ci) =>
        ci === condIdx ? { ...c, values } : c
      )
      return { ...r, andConditions: conds }
    }))
  }

  // AND条件フィールドの選択肢を非同期フェッチ（まだキャッシュにない場合）
  useEffect(() => {
    if (!enableAndConditions) return
    const fields = groupRules.flatMap(r => (r.andConditions ?? []).map(c => c.field)).filter(f => f && !andCondOptionsCache[f])
    const unique = [...new Set(fields)]
    unique.forEach(field => {
      getFieldOptions(field).then(opts => {
        setAndCondOptionsCache(prev => ({ ...prev, [field]: opts }))
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '2px 4px',
    border: '1px solid #ccc',
    borderRadius: 3,
    background: '#fff',
  }

  const fieldSelectOptions = (filterFields ?? []).map(f => ({ value: f.key, label: f.name }))

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: enabled ? 6 : 0 }}>
        <input
          type="checkbox"
          id={`pie-group-${instanceId}`}
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          style={{ cursor: 'pointer', width: 13, height: 13 }}
        />
        <label htmlFor={`pie-group-${instanceId}`} style={{ fontSize: 12, color: '#555', cursor: 'pointer' }}>
          グルーピングを使用
        </label>
      </div>
      {enabled && (
        <div>
          {loading && <span style={{ fontSize: 11, color: '#999' }}>選択肢を読み込み中...</span>}
          {groupRules.map((rule, idx) => (
            <div key={idx} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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
                  <option value="(No data)">(No data)</option>
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
              {/* AND条件 */}
              {enableAndConditions && (
                <div style={{ marginTop: 4, paddingLeft: 8 }}>
                  {(rule.andConditions ?? []).map((cond, ci) => {
                    const condOpts = cond.field ? (andCondOptionsCache[cond.field] ?? []) : []
                    return (
                      <div key={ci} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#888' }}>AND</span>
                        <Select
                          options={fieldSelectOptions}
                          value={fieldSelectOptions.find(o => o.value === cond.field) ?? null}
                          onChange={opt => updateAndCondField(idx, ci, opt?.value ?? '')}
                          placeholder="フィールド"
                          styles={{
                            ...fieldSelectStyles,
                            container: (base: object) => ({ ...base, width: 160 }),
                          }}
                          isClearable={false}
                        />
                        <select
                          multiple
                          value={cond.values}
                          onChange={e => updateAndCondValues(idx, ci, Array.from(e.target.selectedOptions, o => o.value))}
                          style={{ ...selectStyle, height: 52, minWidth: 120 }}
                        >
                          <option value="(No data)">(No data)</option>
                          {condOpts.map(opt => (
                            <option key={opt.value} value={opt.label}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeAndCondition(idx, ci)}
                          style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
                        >×</button>
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => addAndCondition(idx)}
                    style={{ fontSize: 11, padding: '1px 8px', border: '1px solid #93c5fd', borderRadius: 3, background: '#eff6ff', cursor: 'pointer', color: '#1d4ed8' }}
                  >
                    + AND条件を追加
                  </button>
                </div>
              )}
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

export function ConditionsEditor({ conditions, filterFields, dateFilterFields, getFieldOptions, onChange }: ConditionsEditorProps) {
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

  function updateConditionMode(idx: number, mode: 'past' | 'future') {
    onChange(conditions.map((c, i) => i === idx ? { ...c, elapsedDaysMode: mode } : c))
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
            {cond.field === 'elapsed_days' && (
              <option value="<=">&lt;=（以内）</option>
            )}
          </select>
          {/* 値選択 */}
          {cond.field && (
            cond.field === 'elapsed_days' ? (
              <>
                <select
                  value={cond.elapsedDaysMode ?? 'past'}
                  onChange={(e) => updateConditionMode(idx, e.target.value as 'past' | 'future')}
                  style={selectStyle}
                  title="経過日数（過去→今日）か到来日数（今日→未来）かを選択"
                >
                  <option value="past">経過日数</option>
                  <option value="future">到来日数</option>
                </select>
                <select
                  value={cond.elapsedDaysBaseField ?? 'updated_on'}
                  onChange={(e) => updateConditionBaseField(idx, e.target.value)}
                  style={selectStyle}
                  title="経過日数/到来日数の基準となる日付フィールド"
                >
                  {elapsedDaysBaseFields.map(f => (
                    <option key={f.key} value={f.key}>{f.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={cond.values[0] ?? ''}
                  onChange={(e) => updateConditionValues(idx, e.target.value !== '' ? [e.target.value] : [])}
                  style={{ ...selectStyle, width: 60 }}
                  placeholder="日数"
                />
                <span style={{ fontSize: 11, color: '#777' }}>(Business days)</span>
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
  showFuture?: boolean
}

function SeriesRow({ series, allSeries, statuses, statusesLoading, canDelete, canMoveUp, canMoveDown, filterFields, dateFilterFields, getFieldOptions, onChange, onDelete, onMoveUp, onMoveDown, showFuture }: SeriesRowProps) {
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

      {/* 未来を非表示（showFuture が有効な場合のみ） */}
      {showFuture && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', alignSelf: 'flex-end', paddingBottom: 2 }}>
          <input
            type="checkbox"
            checked={series.hideFuture ?? false}
            onChange={(e) => update('hideFuture', e.target.checked)}
          />
          未来を非表示
        </label>
      )}

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
          <textarea
            value={card.title}
            onChange={(e) => onChange({ ...card, title: e.target.value })}
            placeholder="未完了チケット"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4, width: 260 }}
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

// 担当者追加エディタ
interface AssignmentPersonEditorProps {
  mapping: AssignmentMappingConfig
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onChange: (persons: AssignmentMappingPerson[]) => void
}

function AssignmentPersonEditor({ mapping, getFieldOptions, onChange }: AssignmentPersonEditorProps) {
  const [inputText, setInputText] = useState('')
  const [candidates, setCandidates] = useState<FilterFieldOption[]>([])
  const [allOptions, setAllOptions] = useState<FilterFieldOption[]>([])

  // assigneeField が変わったら選択肢を取得
  useEffect(() => {
    if (!mapping.assigneeField) return
    getFieldOptions(mapping.assigneeField).then(opts => {
      setAllOptions(opts)
    }).catch(() => {})
  }, [mapping.assigneeField, getFieldOptions])

  // 入力テキストに応じて候補を絞り込む
  useEffect(() => {
    if (!inputText.trim()) {
      setCandidates([])
      return
    }
    const lower = inputText.toLowerCase()
    setCandidates(allOptions.filter(opt => opt.label.toLowerCase().includes(lower)).slice(0, 8))
  }, [inputText, allOptions])

  function addPerson(opt: FilterFieldOption) {
    // 同じIDがすでに追加されていれば無視
    if (mapping.persons.some(p => p.id === opt.value)) return
    onChange([...mapping.persons, { name: opt.label, id: opt.value }])
    setInputText('')
    setCandidates([])
  }

  function removePerson(id: string) {
    onChange(mapping.persons.filter(p => p.id !== id))
  }

  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '2px 6px',
    border: '1px solid #ccc',
    borderRadius: 3,
    width: 160,
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>担当者</div>
      {/* 追加済み担当者 */}
      {mapping.persons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {mapping.persons.map(p => (
            <span
              key={p.id}
              style={{ fontSize: 11, padding: '2px 6px', background: '#e0e7ff', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {p.name}
              <button
                type="button"
                onClick={() => removePerson(p.id)}
                style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 0, lineHeight: 1 }}
              >×</button>
            </span>
          ))}
        </div>
      )}
      {/* 担当者追加 オートコンプリート */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="名前で検索して追加..."
          style={inputStyle}
        />
        {candidates.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 3,
            zIndex: 9999,
            minWidth: 200,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}>
            {candidates.map(opt => (
              <div
                key={opt.value}
                onClick={() => addPerson(opt)}
                style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#111827' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// JSON.stringify は undefined を省略するため、スプレッドだけではオプショナルフィールドが
// プリセット側で「未設定」でも現在値が残ってしまう。明示的に再設定することで正しくクリアされる。
export function mergePresetSettings(base: UserSettings, preset: PresetSettings): UserSettings {
  const merged: UserSettings = {
    ...base,
    ...preset,
    combos: preset.combos,
    tileOrder: preset.tileOrder,
    evmTiles: preset.evmTiles,
    pies: preset.pies,
    summaryCards: preset.summaryCards,
    tables: preset.tables,
    assignmentMappings: preset.assignmentMappings,
  }
  // 古いプリセットには tileOrder がない場合があるため、欠落時は combos/pies 等から再構築
  if (!merged.tileOrder) {
    merged.tileOrder = [
      ...(merged.combos ?? []).map(c => ({ type: 'combo' as const, id: c.id })),
      ...(merged.pies ?? []).map(p => ({ type: 'pie' as const, id: p.id! })),
      ...(merged.tables ?? []).map(t => ({ type: 'table' as const, id: t.id! })),
      ...(merged.evmTiles ?? []).map(e => ({ type: 'evm' as const, id: e.id! })),
      ...(merged.assignmentMappings ?? []).map(a => ({ type: 'assignment' as const, id: a.id! })),
    ]
  }
  return merged
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

interface HeadingEditorRowProps {
  heading: HeadingConfig
  onChange: (updated: HeadingConfig) => void
  onDelete: () => void
}

function HeadingEditorRow({ heading, onChange, onDelete }: HeadingEditorRowProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
      {/* 色インジケーター＋カラーピッカー */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          onClick={() => setColorPickerOpen(!colorPickerOpen)}
          style={{ width: 14, height: 14, borderRadius: 2, background: heading.color, cursor: 'pointer', border: '1px solid #aaa' }}
        />
        {colorPickerOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setColorPickerOpen(false)} />
            <div style={{ position: 'absolute', top: 18, left: 0, zIndex: 100, background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: 6, display: 'flex', flexWrap: 'wrap', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: 156 }}>
              {COLOR_PALETTE.map((c) => (
                <div
                  key={c}
                  onClick={() => { onChange({ ...heading, color: c }); setColorPickerOpen(false) }}
                  style={{ width: 16, height: 16, borderRadius: 2, background: c, cursor: 'pointer', border: c === heading.color ? '2px solid #333' : '1px solid #aaa' }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {/* テキスト入力 */}
      <input
        type="text"
        value={heading.text}
        onChange={e => onChange({ ...heading, text: e.target.value })}
        style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, flex: 1 }}
        placeholder="見出しテキスト"
      />
      {/* 削除ボタン */}
      <button
        type="button"
        onClick={onDelete}
        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #fca5a5', borderRadius: 3, background: '#fff', color: '#dc2626', cursor: 'pointer' }}
      >×</button>
    </div>
  )
}

export function GraphSettingsPanel({ settings, statuses, statusesLoading, onChange, onReset, teamPresets, filterFields = [], dateFilterFields = [], getFieldOptions = async () => [] }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets())
  const [presetNameInput, setPresetNameInput] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [jsonModalName, setJsonModalName] = useState('設定')

  // 手動設定変更時に appliedTeamPreset をクリアするラッパー
  const onChangeManual = useCallback(
    (s: UserSettings) => onChange({ ...s, appliedTeamPreset: undefined }),
    [onChange]
  )

  function handleSavePreset() {
    const name = presetNameInput.trim()
    if (!name) return
    const { version: _version, ...presetSettings } = settings
    const existing = presets.find(p => p.name === name)
    const next = existing
      ? presets.map(p => p.name === name ? { ...p, settings: presetSettings } : p)
      : [...presets, { id: String(Date.now()), name, settings: presetSettings }]
    setPresets(next)
    savePresets(next)
    setPresetNameInput('')
  }

  function handleLoadPreset() {
    const preset = presets.find(p => p.id === selectedPresetId)
    if (!preset) return
    onChangeManual(mergePresetSettings(settings, preset.settings))
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

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  // --- Combo (2軸グラフ) 管理 ---
  function updateCombo(comboIdx: number, patch: Partial<ComboChartConfig>) {
    const combos = (settings.combos ?? []).map((c, i) => i === comboIdx ? { ...c, ...patch } : c)
    onChangeManual({ ...settings, combos })
  }

  function updateComboSeries(comboIdx: number, seriesIdx: number, updated: SeriesConfig) {
    const combos = (settings.combos ?? []).map((c, i) => {
      if (i !== comboIdx) return c
      const series = [...c.series]
      series[seriesIdx] = updated
      return { ...c, series }
    })
    onChangeManual({ ...settings, combos })
  }

  function deleteComboSeries(comboIdx: number, seriesIdx: number) {
    const combos = (settings.combos ?? []).map((c, i) => {
      if (i !== comboIdx) return c
      return { ...c, series: c.series.filter((_, j) => j !== seriesIdx) }
    })
    onChangeManual({ ...settings, combos })
  }

  function moveComboSeries(comboIdx: number, from: number, to: number) {
    const combos = (settings.combos ?? []).map((c, i) => {
      if (i !== comboIdx) return c
      const series = [...c.series]
      const [item] = series.splice(from, 1)
      series.splice(to, 0, item)
      return { ...c, series }
    })
    onChangeManual({ ...settings, combos })
  }

  function addComboSeries(comboIdx: number) {
    const combo = (settings.combos ?? [])[comboIdx]
    if (!combo) return
    const colorIndex = combo.series.length % COLOR_PALETTE.length
    const newSeries: SeriesConfig = {
      id: `series-${Date.now()}`,
      label: `系列${combo.series.length + 1}`,
      dateField: 'created_on',
      statusIds: [],
      chartType: 'bar',
      yAxisId: 'left',
      aggregation: 'daily',
      color: COLOR_PALETTE[colorIndex],
    }
    const combos = (settings.combos ?? []).map((c, i) =>
      i === comboIdx ? { ...c, series: [...c.series, newSeries] } : c
    )
    onChangeManual({ ...settings, combos })
  }

  function addCombo() {
    const id = generateId()
    const startDate = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 14)
      return d.toISOString().slice(0, 10)
    })()
    const newCombo: ComboChartConfig = {
      id,
      name: '',
      startDate,
      hideWeekends: false,
      series: [
        {
          id: `series-${Date.now()}`,
          label: '発生チケット数',
          dateField: 'created_on',
          statusIds: [],
          chartType: 'bar',
          yAxisId: 'left',
          aggregation: 'daily',
          color: '#93c5fd',
        },
      ],
    }
    const tileOrder: TileRef[] = [...(settings.tileOrder ?? []), { type: 'combo', id }]
    onChangeManual({ ...settings, combos: [...(settings.combos ?? []), newCombo], tileOrder })
  }

  function deleteCombo(comboId: string) {
    const combos = (settings.combos ?? []).filter(c => c.id !== comboId)
    const tileOrder = (settings.tileOrder ?? []).filter(r => !(r.type === 'combo' && r.id === comboId))
    onChangeManual({ ...settings, combos, tileOrder })
  }

  // --- タイル順序 ---
  function moveTileOrder(from: number, to: number) {
    const order = [...(settings.tileOrder ?? [])]
    const [item] = order.splice(from, 1)
    order.splice(to, 0, item)
    onChangeManual({ ...settings, tileOrder: order })
  }

  // --- Pie 管理（tileOrder同期つき） ---
  function movePie(from: number, to: number) {
    const pies = [...(settings.pies ?? [])]
    const [item] = pies.splice(from, 1)
    pies.splice(to, 0, item)
    // tileOrder の pie エントリも同様に入れ替える
    const tileOrder = [...(settings.tileOrder ?? [])]
    const fromTOIdx = tileOrder.findIndex(r => r.type === 'pie' && r.id === (settings.pies ?? [])[from]?.id)
    const toTOIdx = tileOrder.findIndex(r => r.type === 'pie' && r.id === (settings.pies ?? [])[to]?.id)
    if (fromTOIdx !== -1 && toTOIdx !== -1) {
      ;[tileOrder[fromTOIdx], tileOrder[toTOIdx]] = [tileOrder[toTOIdx], tileOrder[fromTOIdx]]
    }
    onChangeManual({ ...settings, pies, tileOrder })
  }

  function addSummaryCard() {
    const colorIndex = (settings.summaryCards?.length ?? 0) % COLOR_PALETTE.length
    const newCard: SummaryCardConfig = {
      title: '',
      color: COLOR_PALETTE[colorIndex],
      numerator: { conditions: [] },
    }
    onChangeManual({ ...settings, summaryCards: [...(settings.summaryCards ?? []), newCard] })
  }

  function updateSummaryCard(index: number, updated: SummaryCardConfig) {
    const next = [...(settings.summaryCards ?? [])]
    next[index] = updated
    onChangeManual({ ...settings, summaryCards: next })
  }

  function deleteSummaryCard(index: number) {
    const next = (settings.summaryCards ?? []).filter((_, i) => i !== index)
    onChangeManual({ ...settings, summaryCards: next.length ? next : undefined })
  }

  function moveSummaryCard(from: number, to: number) {
    const next = [...(settings.summaryCards ?? [])]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChangeManual({ ...settings, summaryCards: next })
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
        <span>Graph Setting</span>
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
          {/* タイル順序 */}
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>タイル順序</div>
            {(settings.tileOrder ?? []).length === 0 && (
              <div style={{ fontSize: 12, color: '#aaa' }}>タイルがありません</div>
            )}
            {(settings.tileOrder ?? []).map((ref, i) => {
              const order = settings.tileOrder ?? []
              // タイル名を取得
              let label = ''
              if (ref.type === 'combo') {
                const combo = (settings.combos ?? []).find(c => c.id === ref.id)
                label = `2軸グラフ: ${combo?.name || '（名前なし）'}`
              } else if (ref.type === 'pie') {
                const pie = (settings.pies ?? []).find(p => p.id === ref.id)
                label = `${pie?.chartType === 'bar' ? '横棒グラフ' : '円グラフ'}: ${pie?.label || pie?.groupBy || ''}`
              } else if (ref.type === 'table') {
                const table = (settings.tables ?? []).find(t => t.id === ref.id)
                label = `クロス集計: ${table?.label || table?.rowGroupBy || ''}`
              } else if (ref.type === 'evm') {
                const evm = (settings.evmTiles ?? []).find(e => e.id === ref.id)
                label = `EVM: ${evm?.title || ''}`
              } else if (ref.type === 'assignment') {
                const a = (settings.assignmentMappings ?? []).find(x => x.id === ref.id)
                label = `担当数マッピング: ${a?.title || ''}`
              } else if (ref.type === 'heading') {
                const h = (settings.headings ?? []).find(x => x.id === ref.id)
                label = `見出し: ${h?.text || ''}`
              }
              return (
                <div key={ref.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, padding: '3px 6px', background: '#f9f9f9', borderRadius: 3, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  <button
                    type="button"
                    onClick={() => moveTileOrder(i, i - 1)}
                    disabled={i === 0}
                    style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i > 0 ? 'pointer' : 'default', color: i > 0 ? '#333' : '#ccc' }}
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => moveTileOrder(i, i + 1)}
                    disabled={i === order.length - 1}
                    style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i < order.length - 1 ? 'pointer' : 'default', color: i < order.length - 1 ? '#333' : '#ccc' }}
                  >↓</button>
                </div>
              )
            })}
          </div>

          {/* チームプリセット（管理者定義・読取専用） */}
          {teamPresets && teamPresets.length > 0 && (
            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>Team Preset</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {teamPresets.map((tp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange({ ...mergePresetSettings(settings, tp.settings), appliedTeamPreset: tp.name })}
                    style={{
                      fontSize: 12,
                      padding: '2px 10px',
                      border: '1px solid #93c5fd',
                      borderRadius: 3,
                      background: settings.appliedTeamPreset === tp.name ? '#dbeafe' : '#eff6ff',
                      cursor: 'pointer',
                      color: '#1d4ed8',
                      fontWeight: settings.appliedTeamPreset === tp.name ? 'bold' : 'normal',
                    }}
                  >
                    {tp.name}
                  </button>
                ))}
              </div>
              {settings.appliedTeamPreset && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Applied: {settings.appliedTeamPreset}</span>
                  <button
                    type="button"
                    onClick={() => onChangeManual({ ...settings, appliedTeamPreset: undefined })}
                    style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #93c5fd', borderRadius: 3, background: 'none', cursor: 'pointer', color: '#6b7280' }}
                    title="チームプリセットの自動追従を解除"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* プリセット */}
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>Preset</div>
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
            {(settings.combos ?? []).map((combo, comboIdx) => (
              <div
                key={combo.id}
                style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', marginBottom: 12, background: '#fafafa' }}
              >
                {/* グラフ名・削除 */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>グラフ名</span>
                  <input
                    type="text"
                    value={combo.name ?? ''}
                    onChange={(e) => updateCombo(comboIdx, { name: e.target.value || undefined })}
                    placeholder="チケット推移"
                    style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, flex: 1, minWidth: 80 }}
                  />
                  {(settings.combos ?? []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteCombo(combo.id)}
                      style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
                    >
                      削除
                    </button>
                  )}
                </div>
                {/* 軸設定 */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                  {/* 開始日 */}
                  <div>
                    <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>開始日</label>
                    {/* 相対指定モード（N週前から） */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={combo.startWeeksAgo != null}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateCombo(comboIdx, { startWeeksAgo: 2, startDate: undefined })
                            } else {
                              updateCombo(comboIdx, { startWeeksAgo: undefined })
                            }
                          }}
                        />
                      </label>
                      {combo.startWeeksAgo != null ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            max={52}
                            value={combo.startWeeksAgo}
                            onChange={(e) => updateCombo(comboIdx, { startWeeksAgo: Math.max(1, Number(e.target.value)) })}
                            style={{ width: 48, fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3 }}
                          />
                          <span style={{ fontSize: 12 }}>週前から</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: '#999' }}>N週前から指定</span>
                      )}
                    </div>
                    {/* 固定日付指定（相対モードがオフの時のみ） */}
                    {combo.startWeeksAgo == null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="date"
                          value={combo.startDate ?? ''}
                          onChange={(e) => updateCombo(comboIdx, { startDate: e.target.value || undefined })}
                          style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 140 }}
                        />
                        {combo.startDate && (
                          <button
                            type="button"
                            onClick={() => updateCombo(comboIdx, { startDate: undefined })}
                            style={{ fontSize: 11, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', background: '#fff' }}
                          >
                            クリア
                          </button>
                        )}
                        <span style={{ fontSize: 11, color: '#999' }}>（空=14日前）</span>
                      </div>
                    )}
                  </div>
                  {/* 日付形式 */}
                  <div>
                    <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>日付形式</label>
                    <select
                      value={combo.dateFormat ?? 'yyyy-mm-dd'}
                      onChange={(e) => updateCombo(comboIdx, { dateFormat: e.target.value as ComboChartConfig['dateFormat'] })}
                      style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, background: '#fff' }}
                    >
                      <option value="yyyy-mm-dd">2026-02-10</option>
                      <option value="M/D">2/10</option>
                    </select>
                  </div>
                  {/* 土日非表示 */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={combo.hideWeekends ?? false}
                      onChange={(e) => updateCombo(comboIdx, { hideWeekends: e.target.checked })}
                    />
                    土日非表示
                  </label>
                  {/* 未来を表示 */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={combo.showFuture ?? false}
                      onChange={(e) => updateCombo(comboIdx, { showFuture: e.target.checked })}
                    />
                    未来を表示
                  </label>
                  {(combo.showFuture ?? false) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <span>先</span>
                      <input
                        type="number"
                        min={1}
                        max={52}
                        value={combo.futureWeeks ?? 1}
                        onChange={(e) => updateCombo(comboIdx, { futureWeeks: Math.max(1, Number(e.target.value)) })}
                        style={{ width: 48, fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3 }}
                      />
                      <span>週</span>
                    </div>
                  )}
                  {/* 週次集計 */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={combo.weeklyMode ?? false}
                      onChange={(e) => updateCombo(comboIdx, { weeklyMode: e.target.checked })}
                    />
                    週次集計
                  </label>
                  {/* 基準曜日 */}
                  {(combo.weeklyMode ?? false) && (
                    <div>
                      <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>基準曜日</label>
                      <select
                        value={combo.anchorDay ?? 1}
                        onChange={(e) => updateCombo(comboIdx, { anchorDay: Number(e.target.value) })}
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
                  {/* 左軸 件数表示 */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={combo.showLabelsLeft ?? false}
                      onChange={(e) => updateCombo(comboIdx, { showLabelsLeft: e.target.checked })}
                    />
                    左軸の件数表示
                  </label>
                  {/* 左軸の最小値 */}
                  <div>
                    <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>左軸の最小値</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={combo.yAxisLeftMinAuto ?? false}
                          onChange={(e) => updateCombo(comboIdx, { yAxisLeftMinAuto: e.target.checked })}
                        />
                        最大値の8割
                      </label>
                      <input
                        type="number"
                        value={combo.yAxisLeftMinAuto ? '' : (combo.yAxisLeftMin ?? '')}
                        disabled={combo.yAxisLeftMinAuto ?? false}
                        onChange={(e) => {
                          const raw = e.target.value
                          updateCombo(comboIdx, { yAxisLeftMin: raw === '' ? undefined : Number(raw) })
                        }}
                        placeholder="0"
                        style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 70, opacity: combo.yAxisLeftMinAuto ? 0.4 : 1 }}
                      />
                    </div>
                  </div>
                  {/* 右軸の最大値 */}
                  <div>
                    <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>右軸の最大値</label>
                    <input
                      type="number"
                      value={combo.yAxisRightMax ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        updateCombo(comboIdx, { yAxisRightMax: raw === '' ? undefined : Number(raw) })
                      }}
                      placeholder="自動"
                      style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 70 }}
                    />
                  </div>
                  {/* 右軸 件数表示 */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={combo.showLabelsRight ?? false}
                      onChange={(e) => updateCombo(comboIdx, { showLabelsRight: e.target.checked })}
                    />
                    右軸の件数表示
                  </label>
                  {/* グラフ高さ */}
                  <div>
                    <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>グラフ高さ (px)</label>
                    <input
                      type="number"
                      min={100}
                      max={800}
                      step={10}
                      value={combo.chartHeight ?? 320}
                      onChange={(e) => {
                        const raw = e.target.value
                        updateCombo(comboIdx, { chartHeight: raw === '' ? undefined : Number(raw) })
                      }}
                      style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 70 }}
                    />
                  </div>
                </div>
                {/* 系列設定 */}
                {combo.series.map((s, i) => (
                  <SeriesRow
                    key={s.id}
                    series={s}
                    allSeries={combo.series}
                    statuses={statuses}
                    statusesLoading={statusesLoading}
                    canDelete={combo.series.length > 1}
                    canMoveUp={i > 0}
                    canMoveDown={i < combo.series.length - 1}
                    filterFields={filterFields}
                    dateFilterFields={dateFilterFields}
                    getFieldOptions={getFieldOptions}
                    onChange={(updated) => updateComboSeries(comboIdx, i, updated)}
                    onDelete={() => deleteComboSeries(comboIdx, i)}
                    onMoveUp={() => moveComboSeries(comboIdx, i, i - 1)}
                    onMoveDown={() => moveComboSeries(comboIdx, i, i + 1)}
                    showFuture={combo.showFuture ?? false}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addComboSeries(comboIdx)}
                  style={{ marginTop: 8, fontSize: 12, padding: '3px 10px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer' }}
                >
                  ＋ 系列を追加
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCombo}
              style={{ fontSize: 12, padding: '3px 10px', border: '1px solid #3b82f6', borderRadius: 3, background: '#eff6ff', cursor: 'pointer', color: '#1d4ed8' }}
            >
              ＋ 2軸グラフを追加
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

          {/* 円グラフ・横棒グラフ設定 */}
          <div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>円グラフ・横棒グラフ設定</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(settings.pies ?? []).map((pie, i) => {
                const pies = settings.pies ?? []
                return (
                  <div key={i} style={{ minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <label style={{ fontSize: 12, color: '#555' }}>{pie.chartType === 'bar' ? '横棒グラフ' : '円グラフ'} {i + 1}</label>
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
                        <button
                            type="button"
                            onClick={() => {
                              const removedId = pie.id
                              onChangeManual({ ...settings, pies: pies.filter((_, j) => j !== i), tileOrder: removedId ? (settings.tileOrder ?? []).filter(r => !(r.type === 'pie' && r.id === removedId)) : (settings.tileOrder ?? []) })
                            }}
                            style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#666' }}
                          >
                            ×
                          </button>
                      </div>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>タイトル（省略可）</label>
                      <input
                        type="text"
                        value={pie.label ?? ''}
                        onChange={(e) => {
                          const next = pies.map((p, j) => j === i ? { ...p, label: e.target.value || undefined } : p)
                          onChangeManual({ ...settings, pies: next })
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
                        onChangeManual({ ...settings, pies: next })
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
                          onChangeManual({ ...settings, pies: updated })
                        }}
                      />
                    </div>
                    {pie.chartType === 'bar' ? (
                      <div style={{ marginTop: 6 }}>
                        <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>表示上限件数（空欄=全件）</label>
                        <input
                          type="number"
                          min={1}
                          value={pie.topN ?? ''}
                          onChange={(e) => {
                            const v = e.target.value !== '' ? Number(e.target.value) : undefined
                            const updated = pies.map((p, j) => j === i ? { ...p, topN: v } : p)
                            onChangeManual({ ...settings, pies: updated })
                          }}
                          placeholder="全件"
                          style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, width: 80 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <input
                            type="checkbox"
                            id={`bar-fullwidth-${i}`}
                            checked={pie.fullWidth !== false}
                            onChange={(e) => {
                              const updated = pies.map((p, j) => j === i ? { ...p, fullWidth: e.target.checked } : p)
                              onChangeManual({ ...settings, pies: updated })
                            }}
                            style={{ cursor: 'pointer', width: 13, height: 13 }}
                          />
                          <label htmlFor={`bar-fullwidth-${i}`} style={{ fontSize: 12, color: '#555', cursor: 'pointer' }}>
                            全幅表示
                          </label>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>色分けキー（空欄=色分けなし）</label>
                          <Select
                            options={filterFields.map(f => ({ label: f.name, value: f.key }))}
                            value={pie.colorBy ? (filterFields.find(f => f.key === pie.colorBy) ? { label: filterFields.find(f => f.key === pie.colorBy)!.name, value: pie.colorBy } : { label: pie.colorBy, value: pie.colorBy }) : null}
                            onChange={(selected) => {
                              const updated = pies.map((p, j) => j === i ? { ...p, colorBy: selected?.value ?? undefined, colorRules: undefined } : p)
                              onChangeManual({ ...settings, pies: updated })
                            }}
                            isClearable
                            styles={fieldSelectStyles}
                            placeholder="色分けなし..."
                            noOptionsMessage={() => '候補なし'}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                          />
                          {pie.colorBy && (
                            <PieGroupRulesEditor
                              instanceId={`color-${i}`}
                              groupBy={pie.colorBy}
                              groupRules={pie.colorRules ?? []}
                              getFieldOptions={getFieldOptions}
                              onChange={(rules) => {
                                const updated = pies.map((p, j) => j === i ? { ...p, colorRules: rules } : p)
                                onChangeManual({ ...settings, pies: updated })
                              }}
                            />
                          )}
                        </div>
                      </div>
                    ) : pie.groupBy === 'elapsed_days' ? (
                      <>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#666' }}>モード:</span>
                          <select
                            value={pie.elapsedDaysMode ?? 'past'}
                            onChange={(e) => {
                              const updated = pies.map((p, j) => j === i ? { ...p, elapsedDaysMode: e.target.value as 'past' | 'future' } : p)
                              onChangeManual({ ...settings, pies: updated })
                            }}
                            style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, background: '#fff' }}
                            title="経過日数（過去→今日）か到来日数（今日→未来）かを選択"
                          >
                            <option value="past">経過日数（今日←ベース日付）</option>
                            <option value="future">到来日数（今日→ベース日付）</option>
                          </select>
                          <span style={{ fontSize: 11, color: '#666' }}>ベース日付:</span>
                          <select
                            value={pie.elapsedDaysBaseField ?? 'updated_on'}
                            onChange={(e) => {
                              const updated = pies.map((p, j) => j === i ? { ...p, elapsedDaysBaseField: e.target.value } : p)
                              onChangeManual({ ...settings, pies: updated })
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
                            onChangeManual({ ...settings, pies: updated })
                          }}
                        />
                      </>
                    ) : (
                      <PieGroupRulesEditor
                        instanceId={String(i)}
                        groupBy={pie.groupBy}
                        groupRules={pie.groupRules ?? []}
                        getFieldOptions={getFieldOptions}
                        onChange={(rules) => {
                          const updated = pies.map((p, j) => j === i ? { ...p, groupRules: rules } : p)
                          onChangeManual({ ...settings, pies: updated })
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  const id = generateId()
                  onChangeManual({ ...settings, pies: [...(settings.pies ?? []), { id, groupBy: 'status_id' }], tileOrder: [...(settings.tileOrder ?? []), { type: 'pie', id }] })
                }}
                style={{
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
              <button
                type="button"
                onClick={() => {
                  const id = generateId()
                  onChangeManual({ ...settings, pies: [...(settings.pies ?? []), { id, groupBy: 'assigned_to_id', chartType: 'bar' }], tileOrder: [...(settings.tileOrder ?? []), { type: 'pie', id }] })
                }}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  border: '1px solid #ccc',
                  borderRadius: 3,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                ＋ 横棒グラフを追加
              </button>
            </div>
          </div>

          {/* クロス集計テーブル設定 */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>クロス集計テーブル設定</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(settings.tables ?? []).map((table, i) => {
                const tables = settings.tables ?? []
                return (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      padding: '10px 12px',
                      background: '#fafafa',
                    }}
                  >
                    {/* タイトル・削除・並べ替え */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>タイトル</span>
                      <input
                        type="text"
                        value={table.label ?? ''}
                        onChange={(e) => {
                          const next = tables.map((t, j) => j === i ? { ...t, label: e.target.value || undefined } : t)
                          onChangeManual({ ...settings, tables: next })
                        }}
                        placeholder="（省略可）"
                        style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, flex: 1, minWidth: 80 }}
                      />
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...tables]
                          ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                          const idA = tables[i].id, idB = tables[i - 1].id
                          const order = [...(settings.tileOrder ?? [])]
                          const tA = order.findIndex(r => r.type === 'table' && r.id === idA)
                          const tB = order.findIndex(r => r.type === 'table' && r.id === idB)
                          if (tA !== -1 && tB !== -1) [order[tA], order[tB]] = [order[tB], order[tA]]
                          onChangeManual({ ...settings, tables: next, tileOrder: order })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#bbb' : '#444' }}
                      >↑</button>
                      <button
                        type="button"
                        disabled={i === tables.length - 1}
                        onClick={() => {
                          const next = [...tables]
                          ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                          const idA = tables[i].id, idB = tables[i + 1].id
                          const order = [...(settings.tileOrder ?? [])]
                          const tA = order.findIndex(r => r.type === 'table' && r.id === idA)
                          const tB = order.findIndex(r => r.type === 'table' && r.id === idB)
                          if (tA !== -1 && tB !== -1) [order[tA], order[tB]] = [order[tB], order[tA]]
                          onChangeManual({ ...settings, tables: next, tileOrder: order })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i === tables.length - 1 ? 'default' : 'pointer', color: i === tables.length - 1 ? '#bbb' : '#444' }}
                      >↓</button>
                      <button
                        type="button"
                        onClick={() => {
                          const removedId = table.id
                          onChangeManual({ ...settings, tables: tables.filter((_, j) => j !== i), tileOrder: removedId ? (settings.tileOrder ?? []).filter(r => !(r.type === 'table' && r.id === removedId)) : (settings.tileOrder ?? []) })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
                      >削除</button>
                    </div>

                    {/* 行・列フィールド選択 */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
                        <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>行のフィールド</span>
                        <div style={{ flex: 1 }}>
                          <Select
                            instanceId={`table-row-${i}`}
                            styles={fieldSelectStyles}
                            options={filterFields.map(f => ({ label: f.name, value: f.key }))}
                            value={table.rowGroupBy ? (filterFields.find(f => f.key === table.rowGroupBy) ? { label: filterFields.find(f => f.key === table.rowGroupBy)!.name, value: table.rowGroupBy } : { label: table.rowGroupBy, value: table.rowGroupBy }) : null}
                            onChange={(selected) => {
                              const next = tables.map((t, j) => j === i ? { ...t, rowGroupBy: selected?.value ?? '' } : t)
                              onChangeManual({ ...settings, tables: next })
                            }}
                            placeholder="フィールドを選択..."
                            isClearable={false}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
                        <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>列のフィールド</span>
                        <div style={{ flex: 1 }}>
                          <Select
                            instanceId={`table-col-${i}`}
                            styles={fieldSelectStyles}
                            options={filterFields.map(f => ({ label: f.name, value: f.key }))}
                            value={table.colGroupBy ? (filterFields.find(f => f.key === table.colGroupBy) ? { label: filterFields.find(f => f.key === table.colGroupBy)!.name, value: table.colGroupBy } : { label: table.colGroupBy, value: table.colGroupBy }) : null}
                            onChange={(selected) => {
                              const next = tables.map((t, j) => j === i ? { ...t, colGroupBy: selected?.value ?? '' } : t)
                              onChangeManual({ ...settings, tables: next })
                            }}
                            placeholder="フィールドを選択..."
                            isClearable={false}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 行のグルーピング */}
                    {table.rowGroupBy && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>行のグルーピング</div>
                        <PieGroupRulesEditor
                          instanceId={`table-row-rules-${i}`}
                          groupBy={table.rowGroupBy}
                          groupRules={table.rowGroupRules ?? []}
                          getFieldOptions={getFieldOptions}
                          filterFields={filterFields}
                          enableAndConditions={true}
                          onChange={(rules) => {
                            const next = tables.map((t, j) => j === i ? { ...t, rowGroupRules: rules ?? undefined } : t)
                            onChangeManual({ ...settings, tables: next })
                          }}
                        />
                      </div>
                    )}

                    {/* 列のグルーピング */}
                    {table.colGroupBy && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>列のグルーピング</div>
                        <PieGroupRulesEditor
                          instanceId={`table-col-rules-${i}`}
                          groupBy={table.colGroupBy}
                          groupRules={table.colGroupRules ?? []}
                          getFieldOptions={getFieldOptions}
                          filterFields={filterFields}
                          enableAndConditions={true}
                          onChange={(rules) => {
                            const next = tables.map((t, j) => j === i ? { ...t, colGroupRules: rules ?? undefined } : t)
                            onChangeManual({ ...settings, tables: next })
                          }}
                        />
                      </div>
                    )}

                    {/* 絞り込み条件 */}
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>絞り込み条件</div>
                      <ConditionsEditor
                        conditions={table.conditions ?? []}
                        filterFields={filterFields}
                        dateFilterFields={dateFilterFields}
                        getFieldOptions={getFieldOptions}
                        onChange={(next) => {
                          const updated = tables.map((t, j) => j === i ? { ...t, conditions: next } : t)
                          onChangeManual({ ...settings, tables: updated })
                        }}
                      />
                    </div>
                    {/* 全幅表示 */}
                    <div style={{ marginTop: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={table.fullWidth !== false}
                          onChange={(e) => {
                            const next = tables.map((t, j) => j === i ? { ...t, fullWidth: e.target.checked } : t)
                            onChangeManual({ ...settings, tables: next })
                          }}
                        />
                        全幅表示
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  const id = generateId()
                  onChangeManual({ ...settings, tables: [...(settings.tables ?? []), { id, rowGroupBy: 'tracker_id', colGroupBy: 'status_id' } as CrossTableConfig], tileOrder: [...(settings.tileOrder ?? []), { type: 'table', id }] })
                }}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  border: '1px solid #ccc',
                  borderRadius: 3,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                ＋ 表を追加
              </button>
            </div>
          </div>

          {/* EVMタイル設定 */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>EVMタイル設定</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(settings.evmTiles ?? []).map((evm, i) => {
                const evmTiles = settings.evmTiles ?? []
                const actualDateOptions = [
                  { key: 'closed_on', name: '完了日' },
                  { key: 'created_on', name: '登録日' },
                  { key: 'updated_on', name: '更新日' },
                  ...dateFilterFields,
                ]
                return (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      padding: '10px 12px',
                      background: '#fafafa',
                    }}
                  >
                    {/* タイトル・並べ替え・削除 */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>タイトル</span>
                      <input
                        type="text"
                        value={evm.title}
                        onChange={(e) => {
                          const next = evmTiles.map((t, j) => j === i ? { ...t, title: e.target.value } : t)
                          onChangeManual({ ...settings, evmTiles: next })
                        }}
                        placeholder="チケット数EVM"
                        style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, flex: 1, minWidth: 80 }}
                      />
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...evmTiles]
                          ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                          const idA = evmTiles[i].id, idB = evmTiles[i - 1].id
                          const order = [...(settings.tileOrder ?? [])]
                          const tA = order.findIndex(r => r.type === 'evm' && r.id === idA)
                          const tB = order.findIndex(r => r.type === 'evm' && r.id === idB)
                          if (tA !== -1 && tB !== -1) [order[tA], order[tB]] = [order[tB], order[tA]]
                          onChangeManual({ ...settings, evmTiles: next, tileOrder: order })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#bbb' : '#444' }}
                      >↑</button>
                      <button
                        type="button"
                        disabled={i === evmTiles.length - 1}
                        onClick={() => {
                          const next = [...evmTiles]
                          ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                          const idA = evmTiles[i].id, idB = evmTiles[i + 1].id
                          const order = [...(settings.tileOrder ?? [])]
                          const tA = order.findIndex(r => r.type === 'evm' && r.id === idA)
                          const tB = order.findIndex(r => r.type === 'evm' && r.id === idB)
                          if (tA !== -1 && tB !== -1) [order[tA], order[tB]] = [order[tB], order[tA]]
                          onChangeManual({ ...settings, evmTiles: next, tileOrder: order })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i === evmTiles.length - 1 ? 'default' : 'pointer', color: i === evmTiles.length - 1 ? '#bbb' : '#444' }}
                      >↓</button>
                      <button
                        type="button"
                        onClick={() => {
                          const removedId = evm.id
                          onChangeManual({ ...settings, evmTiles: evmTiles.filter((_, j) => j !== i), tileOrder: removedId ? (settings.tileOrder ?? []).filter(r => !(r.type === 'evm' && r.id === removedId)) : (settings.tileOrder ?? []) })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
                      >削除</button>
                    </div>

                    {/* 対象期間 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>対象期間</span>
                      <input
                        type="date"
                        value={evm.startDate}
                        onChange={(e) => {
                          const next = evmTiles.map((t, j) => j === i ? { ...t, startDate: e.target.value } : t)
                          onChangeManual({ ...settings, evmTiles: next })
                        }}
                        style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3 }}
                      />
                      <span style={{ fontSize: 11, color: '#666' }}>〜</span>
                      <input
                        type="date"
                        value={evm.endDate}
                        onChange={(e) => {
                          const next = evmTiles.map((t, j) => j === i ? { ...t, endDate: e.target.value } : t)
                          onChangeManual({ ...settings, evmTiles: next })
                        }}
                        style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3 }}
                      />
                    </div>

                    {/* Actual日付フィールド */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>Actualとする日付項目</span>
                      <select
                        value={evm.actualDateField}
                        onChange={(e) => {
                          const next = evmTiles.map((t, j) => j === i ? { ...t, actualDateField: e.target.value } : t)
                          onChangeManual({ ...settings, evmTiles: next })
                        }}
                        style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, background: '#fff' }}
                      >
                        {actualDateOptions.map(f => (
                          <option key={f.key} value={f.key}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* グルーピングフィールド */}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>グルーピングに使う項目</span>
                      <div style={{ maxWidth: 280 }}>
                        <Select
                          instanceId={`evm-group-${i}`}
                          styles={fieldSelectStyles}
                          options={filterFields.map(f => ({ label: f.name, value: f.key }))}
                          value={evm.groupByField ? (filterFields.find(f => f.key === evm.groupByField) ? { label: filterFields.find(f => f.key === evm.groupByField)!.name, value: evm.groupByField } : { label: evm.groupByField, value: evm.groupByField }) : null}
                          onChange={(selected) => {
                            const next = evmTiles.map((t, j) => j === i ? { ...t, groupByField: selected?.value ?? '' } : t)
                            onChangeManual({ ...settings, evmTiles: next })
                          }}
                          placeholder="フィールドを選択..."
                          isClearable={false}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                    </div>

                    {/* チケット絞り込み条件 */}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>対象とするチケット条件</span>
                      <ConditionsEditor
                        conditions={evm.conditions ?? []}
                        filterFields={filterFields}
                        dateFilterFields={dateFilterFields}
                        getFieldOptions={getFieldOptions}
                        onChange={(next) => {
                          const updated = evmTiles.map((t, j) => j === i ? { ...t, conditions: next } : t)
                          onChangeManual({ ...settings, evmTiles: updated })
                        }}
                      />
                    </div>

                    {/* グループ設定テーブル */}
                    <div>
                      <span style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>
                        グループ設定（グループ名はグルーピング項目の実際の値と一致させてください）
                      </span>
                      <table style={{ borderCollapse: 'collapse', fontSize: 12, marginBottom: 6 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '3px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: 11, color: '#666', fontWeight: 600 }}>グループ名</th>
                            <th style={{ padding: '3px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontSize: 11, color: '#666', fontWeight: 600 }}>予定数</th>
                            <th style={{ padding: '3px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontSize: 11, color: '#666', fontWeight: 600 }}>工数/枚</th>
                            <th style={{ padding: '3px 8px', borderBottom: '1px solid #e5e7eb', fontSize: 11 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {evm.groups.map((group, gi) => (
                            <tr key={gi}>
                              <td style={{ padding: '2px 4px' }}>
                                <input
                                  type="text"
                                  value={group.groupName}
                                  onChange={(e) => {
                                    const newGroups = evm.groups.map((g, gj) => gj === gi ? { ...g, groupName: e.target.value } : g)
                                    const next = evmTiles.map((t, j) => j === i ? { ...t, groups: newGroups } : t)
                                    onChangeManual({ ...settings, evmTiles: next })
                                  }}
                                  placeholder="グループ名"
                                  style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, width: 120 }}
                                />
                              </td>
                              <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                                <input
                                  type="number"
                                  min={0}
                                  value={group.plannedCount}
                                  onChange={(e) => {
                                    const newGroups = evm.groups.map((g, gj) => gj === gi ? { ...g, plannedCount: Number(e.target.value) } : g)
                                    const next = evmTiles.map((t, j) => j === i ? { ...t, groups: newGroups } : t)
                                    onChangeManual({ ...settings, evmTiles: next })
                                  }}
                                  style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, width: 60, textAlign: 'right' }}
                                />
                              </td>
                              <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={group.effortPerTicket}
                                  onChange={(e) => {
                                    const newGroups = evm.groups.map((g, gj) => gj === gi ? { ...g, effortPerTicket: Number(e.target.value) } : g)
                                    const next = evmTiles.map((t, j) => j === i ? { ...t, groups: newGroups } : t)
                                    onChangeManual({ ...settings, evmTiles: next })
                                  }}
                                  style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, width: 60, textAlign: 'right' }}
                                />
                              </td>
                              <td style={{ padding: '2px 4px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGroups = evm.groups.filter((_, gj) => gj !== gi)
                                    const next = evmTiles.map((t, j) => j === i ? { ...t, groups: newGroups } : t)
                                    onChangeManual({ ...settings, evmTiles: next })
                                  }}
                                  style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
                                >×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        type="button"
                        onClick={() => {
                          const newGroup: EVMGroupRow = { groupName: '', plannedCount: 0, effortPerTicket: 1 }
                          const next = evmTiles.map((t, j) => j === i ? { ...t, groups: [...t.groups, newGroup] } : t)
                          onChangeManual({ ...settings, evmTiles: next })
                        }}
                        style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer' }}
                      >
                        ＋ グループを追加
                      </button>

                      {/* 月別実績工数（係数逆算用） */}
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
                        <span style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                          月別実績工数（係数逆算用）
                        </span>
                        {(evm.monthlyActuals ?? []).length > 0 && (
                          <table style={{ borderCollapse: 'collapse', fontSize: 12, marginBottom: 6 }}>
                            <thead>
                              <tr>
                                <th style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 11, borderBottom: '1px solid #e5e7eb' }}>年月</th>
                                <th style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600, color: '#555', fontSize: 11, borderBottom: '1px solid #e5e7eb' }}>実際工数</th>
                                <th style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(evm.monthlyActuals ?? []).map((ma, mi) => (
                                <tr key={mi}>
                                  <td style={{ padding: '2px 4px' }}>
                                    <input
                                      type="month"
                                      value={ma.month}
                                      onChange={(e) => {
                                        const newActuals = (evm.monthlyActuals ?? []).map((a, aj) =>
                                          aj === mi ? { ...a, month: e.target.value } : a
                                        )
                                        const next = evmTiles.map((t, j) => j === i ? { ...t, monthlyActuals: newActuals } : t)
                                        onChangeManual({ ...settings, evmTiles: next })
                                      }}
                                      style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3 }}
                                    />
                                  </td>
                                  <td style={{ padding: '2px 4px' }}>
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.1"
                                      value={ma.actualEffort}
                                      onChange={(e) => {
                                        const newActuals = (evm.monthlyActuals ?? []).map((a, aj) =>
                                          aj === mi ? { ...a, actualEffort: Number(e.target.value) } : a
                                        )
                                        const next = evmTiles.map((t, j) => j === i ? { ...t, monthlyActuals: newActuals } : t)
                                        onChangeManual({ ...settings, evmTiles: next })
                                      }}
                                      style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, width: 70, textAlign: 'right' }}
                                    />
                                  </td>
                                  <td style={{ padding: '2px 4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newActuals = (evm.monthlyActuals ?? []).filter((_, aj) => aj !== mi)
                                        const next = evmTiles.map((t, j) => j === i ? { ...t, monthlyActuals: newActuals } : t)
                                        onChangeManual({ ...settings, evmTiles: next })
                                      }}
                                      style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
                                    >×</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date()
                            const newMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
                            const newActual: EvmMonthlyActual = { month: newMonth, actualEffort: 0 }
                            const next = evmTiles.map((t, j) =>
                              j === i ? { ...t, monthlyActuals: [...(t.monthlyActuals ?? []), newActual] } : t
                            )
                            onChangeManual({ ...settings, evmTiles: next })
                          }}
                          style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer' }}
                        >
                          ＋ 月を追加
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  const y = today.getFullYear()
                  const m = String(today.getMonth() + 1).padStart(2, '0')
                  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
                  const evmId = generateId()
                  const newEvm: EVMTileConfig = {
                    id: evmId,
                    title: 'チケット数EVM',
                    startDate: `${y}-${m}-01`,
                    endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
                    conditions: [],
                    actualDateField: 'closed_on',
                    groupByField: filterFields[0]?.key ?? 'tracker_id',
                    groups: [],
                  }
                  onChangeManual({ ...settings, evmTiles: [...(settings.evmTiles ?? []), newEvm], tileOrder: [...(settings.tileOrder ?? []), { type: 'evm', id: evmId }] })
                }}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  border: '1px solid #ccc',
                  borderRadius: 3,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                ＋ EVMタイルを追加
              </button>
            </div>

          {/* 担当数マッピング設定 */}
          <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>担当数マッピング設定</div>
            <div>
              {(settings.assignmentMappings ?? []).map((mapping, i) => {
                const mappings = settings.assignmentMappings ?? []
                return (
                  <div
                    key={i}
                    style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10, marginBottom: 8, background: '#fafafa' }}
                  >
                    {/* ヘッダ行: タイトル・↑↓・削除 */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={mapping.title ?? ''}
                        onChange={(e) => {
                          const next = mappings.map((t, j) => j === i ? { ...t, title: e.target.value || undefined } : t)
                          onChangeManual({ ...settings, assignmentMappings: next })
                        }}
                        placeholder="タイトル（省略可）"
                        style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, flex: 1, minWidth: 120 }}
                      />
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...mappings]
                          ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                          const idA = mappings[i].id, idB = mappings[i - 1].id
                          const order = [...(settings.tileOrder ?? [])]
                          const tA = order.findIndex(r => r.type === 'assignment' && r.id === idA)
                          const tB = order.findIndex(r => r.type === 'assignment' && r.id === idB)
                          if (tA !== -1 && tB !== -1) [order[tA], order[tB]] = [order[tB], order[tA]]
                          onChangeManual({ ...settings, assignmentMappings: next, tileOrder: order })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#bbb' : '#444' }}
                      >↑</button>
                      <button
                        type="button"
                        disabled={i === mappings.length - 1}
                        onClick={() => {
                          const next = [...mappings]
                          ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                          const idA = mappings[i].id, idB = mappings[i + 1].id
                          const order = [...(settings.tileOrder ?? [])]
                          const tA = order.findIndex(r => r.type === 'assignment' && r.id === idA)
                          const tB = order.findIndex(r => r.type === 'assignment' && r.id === idB)
                          if (tA !== -1 && tB !== -1) [order[tA], order[tB]] = [order[tB], order[tA]]
                          onChangeManual({ ...settings, assignmentMappings: next, tileOrder: order })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: i === mappings.length - 1 ? 'default' : 'pointer', color: i === mappings.length - 1 ? '#bbb' : '#444' }}
                      >↓</button>
                      <button
                        type="button"
                        onClick={() => {
                          const removedId = mapping.id
                          onChangeManual({ ...settings, assignmentMappings: mappings.filter((_, j) => j !== i), tileOrder: removedId ? (settings.tileOrder ?? []).filter(r => !(r.type === 'assignment' && r.id === removedId)) : (settings.tileOrder ?? []) })
                        }}
                        style={{ fontSize: 11, padding: '1px 6px', border: '1px solid #e53e3e', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e53e3e' }}
                      >削除</button>
                    </div>

                    {/* 担当者フィールド選択 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#555', minWidth: 100 }}>担当者フィールド</span>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <Select
                          styles={fieldSelectStyles}
                          options={filterFields.map(f => ({ label: f.name, value: f.key }))}
                          value={mapping.assigneeField
                            ? { label: filterFields.find(f => f.key === mapping.assigneeField)?.name ?? mapping.assigneeField, value: mapping.assigneeField }
                            : null}
                          onChange={(selected) => {
                            const next = mappings.map((t, j) => j === i ? { ...t, assigneeField: selected?.value ?? '', persons: [] } : t)
                            onChangeManual({ ...settings, assignmentMappings: next })
                          }}
                          placeholder="フィールドを選択..."
                        />
                      </div>
                    </div>

                    {/* 終了日フィールド選択 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#555', minWidth: 100 }}>終了日フィールド</span>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <Select
                          styles={fieldSelectStyles}
                          options={dateFilterFields.map(f => ({ label: f.name, value: f.key }))}
                          value={mapping.endDateField
                            ? { label: dateFilterFields.find(f => f.key === mapping.endDateField)?.name ?? mapping.endDateField, value: mapping.endDateField }
                            : null}
                          onChange={(selected) => {
                            const next = mappings.map((t, j) => j === i ? { ...t, endDateField: selected?.value ?? '' } : t)
                            onChangeManual({ ...settings, assignmentMappings: next })
                          }}
                          placeholder="フィールドを選択..."
                        />
                      </div>
                    </div>

                    {/* 終了日未記入時の営業日数 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#555', minWidth: 100 }}>終了日空の場合</span>
                      <input
                        type="number"
                        min={0}
                        value={mapping.fallbackDays}
                        onChange={(e) => {
                          const next = mappings.map((t, j) => j === i ? { ...t, fallbackDays: Number(e.target.value) } : t)
                          onChangeManual({ ...settings, assignmentMappings: next })
                        }}
                        style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3, width: 50 }}
                      />
                      <span style={{ fontSize: 11, color: '#777' }}>営業日後まで</span>
                    </div>

                    {/* 表示期間 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#555', minWidth: 100 }}>表示期間</span>
                      <input
                        type="date"
                        value={mapping.displayStartDate}
                        onChange={(e) => {
                          const next = mappings.map((t, j) => j === i ? { ...t, displayStartDate: e.target.value } : t)
                          onChangeManual({ ...settings, assignmentMappings: next })
                        }}
                        style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3 }}
                      />
                      <span style={{ fontSize: 11, color: '#777' }}>〜</span>
                      <input
                        type="date"
                        value={mapping.displayEndDate}
                        onChange={(e) => {
                          const next = mappings.map((t, j) => j === i ? { ...t, displayEndDate: e.target.value } : t)
                          onChangeManual({ ...settings, assignmentMappings: next })
                        }}
                        style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #ccc', borderRadius: 3 }}
                      />
                    </div>

                    {/* オプション */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={mapping.hideWeekends ?? false}
                          onChange={(e) => {
                            const next = mappings.map((t, j) => j === i ? { ...t, hideWeekends: e.target.checked } : t)
                            onChangeManual({ ...settings, assignmentMappings: next })
                          }}
                        />
                        土日を非表示
                      </label>
                      <label style={{ fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={mapping.fullWidth !== false}
                          onChange={(e) => {
                            const next = mappings.map((t, j) => j === i ? { ...t, fullWidth: e.target.checked } : t)
                            onChangeManual({ ...settings, assignmentMappings: next })
                          }}
                        />
                        全幅表示
                      </label>
                    </div>

                    {/* 絞り込み条件 */}
                    <div style={{ marginBottom: 8 }}>
                      <ConditionsEditor
                        conditions={mapping.conditions ?? []}
                        filterFields={filterFields}
                        dateFilterFields={dateFilterFields}
                        getFieldOptions={getFieldOptions}
                        onChange={(next) => {
                          const updated = mappings.map((t, j) => j === i ? { ...t, conditions: next } : t)
                          onChangeManual({ ...settings, assignmentMappings: updated })
                        }}
                      />
                    </div>

                    {/* 担当者リスト */}
                    <AssignmentPersonEditor
                      mapping={mapping}
                      getFieldOptions={getFieldOptions}
                      onChange={(persons) => {
                        const next = mappings.map((t, j) => j === i ? { ...t, persons } : t)
                        onChangeManual({ ...settings, assignmentMappings: next })
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  const y = today.getFullYear()
                  const m = String(today.getMonth() + 1).padStart(2, '0')
                  const d = String(today.getDate()).padStart(2, '0')
                  const endDay = new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000)
                  const ey = endDay.getFullYear()
                  const em = String(endDay.getMonth() + 1).padStart(2, '0')
                  const ed = String(endDay.getDate()).padStart(2, '0')
                  const assignmentId = generateId()
                  const newMapping: AssignmentMappingConfig = {
                    id: assignmentId,
                    assigneeField: filterFields.find(f => f.key === 'assigned_to_id')?.key ?? filterFields[0]?.key ?? 'assigned_to_id',
                    endDateField: dateFilterFields.find(f => f.key === 'due_date')?.key ?? dateFilterFields[0]?.key ?? 'due_date',
                    fallbackDays: 5,
                    displayStartDate: `${y}-${m}-${d}`,
                    displayEndDate: `${ey}-${em}-${ed}`,
                    persons: [],
                  }
                  onChangeManual({ ...settings, assignmentMappings: [...(settings.assignmentMappings ?? []), newMapping], tileOrder: [...(settings.tileOrder ?? []), { type: 'assignment', id: assignmentId }] })
                }}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  border: '1px solid #ccc',
                  borderRadius: 3,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                ＋ 担当数マッピングを追加
              </button>
            </div>
          </div>

          {/* 見出し設定 */}
          <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' }}>見出し設定</div>
            <div>
              {(settings.headings ?? []).map((heading, i) => {
                const headings = settings.headings ?? []
                function updateHeading(updated: HeadingConfig) {
                  const next = headings.map((h, idx) => idx === i ? updated : h)
                  onChangeManual({ ...settings, headings: next })
                }
                function deleteHeading() {
                  const next = headings.filter((_, idx) => idx !== i)
                  const nextOrder = (settings.tileOrder ?? []).filter(r => !(r.type === 'heading' && r.id === heading.id))
                  onChangeManual({ ...settings, headings: next, tileOrder: nextOrder })
                }
                return (
                  <HeadingEditorRow
                    key={heading.id ?? i}
                    heading={heading}
                    onChange={updateHeading}
                    onDelete={deleteHeading}
                  />
                )
              })}
              <button
                type="button"
                onClick={() => {
                  const headingId = generateId()
                  onChangeManual({
                    ...settings,
                    headings: [...(settings.headings ?? []), { id: headingId, text: '見出し', color: COLOR_PALETTE[0] }],
                    tileOrder: [...(settings.tileOrder ?? []), { type: 'heading', id: headingId }],
                  })
                }}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  border: '1px solid #ccc',
                  borderRadius: 3,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                ＋ 見出しを追加
              </button>
            </div>
          </div>

          {/* ジャーナル収集タイル設定 */}
          <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 'bold' }}>ジャーナル収集タイル</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
              各タイルの設定・削除はタイル上の「設定」ボタンから行えます
            </div>
            <button
              type="button"
              onClick={() => {
                const newId = generateId()
                const newCollector: JournalCollectorConfig = {
                  id: newId,
                  name: 'ジャーナル収集',
                  targetIssueId: 0,
                  conditions: [],
                  lastCollectedAt: null,
                }
                onChangeManual({
                  ...settings,
                  journalCollectors: [...(settings.journalCollectors ?? []), newCollector],
                  tileOrder: [...(settings.tileOrder ?? []), { type: 'journal-collector', id: newId }],
                })
              }}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                border: '1px solid #ccc',
                borderRadius: 3,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              ＋ ジャーナル収集タイルを追加
            </button>
          </div>

          {/* ジャーナル更新回数タイル設定 */}
          <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 'bold' }}>ジャーナル更新回数タイル</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
              各タイルの設定・削除はタイル上の「設定」ボタンから行えます
            </div>
            <button
              type="button"
              onClick={() => {
                const newId = generateId()
                const today = new Date().toISOString().slice(0, 10)
                const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                const newCount: JournalCountConfig = {
                  id: newId,
                  name: 'ジャーナル更新回数',
                  sourceIssueId: 0,
                  persons: [],
                  filterTrackerIds: [],
                  startDate: oneMonthAgo,
                  endDate: today,
                }
                onChangeManual({
                  ...settings,
                  journalCounts: [...(settings.journalCounts ?? []), newCount],
                  tileOrder: [...(settings.tileOrder ?? []), { type: 'journal-count', id: newId }],
                })
              }}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                border: '1px solid #ccc',
                borderRadius: 3,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              ＋ ジャーナル更新回数タイルを追加
            </button>
          </div>

          </div>
        </div>
      )}
    </div>
  )
}
