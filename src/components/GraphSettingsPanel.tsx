import { useEffect, useState } from 'react'
import Select from 'react-select'
import type { FilterField, FilterFieldOption, Preset, RedmineStatus, SeriesCondition, SeriesConfig, TeamPreset, UserSettings } from '../types'
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

const COLOR_PALETTE = ['#93c5fd', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

interface SeriesRowProps {
  series: SeriesConfig
  statuses: RedmineStatus[]
  statusesLoading: boolean
  canDelete: boolean
  filterFields: FilterField[]
  dateFilterFields: FilterField[]
  getFieldOptions: (key: string) => Promise<FilterFieldOption[]>
  onChange: (updated: SeriesConfig) => void
  onDelete: () => void
}

function SeriesRow({ series, statuses, statusesLoading, canDelete, filterFields, dateFilterFields, getFieldOptions, onChange, onDelete }: SeriesRowProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [fieldOptions, setFieldOptions] = useState<Record<string, FilterFieldOption[]>>({})
  const [loadingField, setLoadingField] = useState<string | null>(null)

  // マウント時に既存 conditions のフィールド選択肢を事前取得（リロード後の表示復元）
  useEffect(() => {
    const fields = [...new Set(
      (series.conditions ?? []).map(c => c.field).filter(Boolean)
    )]
    for (const field of fields) {
      getFieldOptions(field).then(opts => {
        setFieldOptions(prev => ({ ...prev, [field]: opts }))
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof SeriesConfig>(key: K, value: SeriesConfig[K]) {
    onChange({ ...series, [key]: value })
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(e.target.selectedOptions, (opt) => Number(opt.value))
    update('statusIds', selected)
  }

  function addCondition() {
    const next: SeriesCondition[] = [...(series.conditions ?? []), { field: '', operator: '=', values: [] }]
    update('conditions', next)
  }

  function removeCondition(idx: number) {
    const next = (series.conditions ?? []).filter((_, i) => i !== idx)
    update('conditions', next.length ? next : undefined)
  }

  async function handleConditionFieldChange(idx: number, newField: string) {
    const next: SeriesCondition[] = (series.conditions ?? []).map((c, i) =>
      i === idx ? { ...c, field: newField, values: [] } : c
    )
    update('conditions', next)
    if (newField && !fieldOptions[newField]) {
      setLoadingField(newField)
      const opts = await getFieldOptions(newField)
      setFieldOptions(prev => ({ ...prev, [newField]: opts }))
      setLoadingField(null)
    }
  }

  function updateConditionOperator(idx: number, operator: SeriesCondition['operator']) {
    const next: SeriesCondition[] = (series.conditions ?? []).map((c, i) =>
      i === idx ? { ...c, operator } : c
    )
    update('conditions', next)
  }

  function updateConditionValues(idx: number, values: string[]) {
    const next: SeriesCondition[] = (series.conditions ?? []).map((c, i) =>
      i === idx ? { ...c, values } : c
    )
    update('conditions', next)
  }

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
            <div style={{ position: 'absolute', top: 18, left: 0, zIndex: 100, background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: 6, display: 'flex', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
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

      {/* 日付フィールド */}
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
          onChange={(e) => update('aggregation', e.target.value as SeriesConfig['aggregation'])}
          style={selectStyle}
        >
          <option value="daily">日別</option>
          <option value="cumulative">累計</option>
        </select>
      </div>

      {/* 対象ステータス */}
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

      {/* 絞り込み条件 */}
      <div style={{ width: '100%', marginTop: 6, paddingTop: 6, borderTop: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>絞り込み条件</div>
        {(series.conditions ?? []).map((cond, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            {/* フィールド選択 */}
            <div style={{ minWidth: 160, flex: '0 0 auto' }}>
              <Select
                options={filterFields.map(f => ({ label: f.name, value: f.key }))}
                value={cond.field ? { label: filterFields.find(f => f.key === cond.field)?.name ?? cond.field, value: cond.field } : null}
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
            </select>
            {/* 値選択 */}
            {cond.field && (
              loadingField === cond.field ? (
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

interface Props {
  settings: UserSettings
  statuses: RedmineStatus[]
  statusesLoading: boolean
  onChange: (settings: UserSettings) => void
  teamPresets?: TeamPreset[]
  filterFields?: FilterField[]
  dateFilterFields?: FilterField[]
  getFieldOptions?: (key: string) => Promise<FilterFieldOption[]>
}

export function GraphSettingsPanel({ settings, statuses, statusesLoading, onChange, teamPresets, filterFields = [], dateFilterFields = [], getFieldOptions = async () => [] }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets())
  const [presetNameInput, setPresetNameInput] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')

  function handleSavePreset() {
    const name = presetNameInput.trim()
    if (!name) return
    const newPreset: Preset = {
      id: String(Date.now()),
      name,
      settings: {
        series: settings.series,
        startDate: settings.startDate,
        hideWeekends: settings.hideWeekends,
        yAxisLeftMin: settings.yAxisLeftMin,
        yAxisRightMax: settings.yAxisRightMax,
        weeklyMode: settings.weeklyMode,
        anchorDay: settings.anchorDay,
        dateFormat: settings.dateFormat,
      },
    }
    const next = [...presets, newPreset]
    setPresets(next)
    savePresets(next)
    setPresetNameInput('')
  }

  function handleLoadPreset() {
    const preset = presets.find(p => p.id === selectedPresetId)
    if (!preset) return
    onChange({ ...settings, ...preset.settings })
  }

  function handleDownloadPresetJson() {
    const name = presetNameInput.trim() || '設定'
    const teamPreset: TeamPreset = {
      name,
      settings: {
        series: settings.series,
        startDate: settings.startDate,
        hideWeekends: settings.hideWeekends,
        yAxisLeftMin: settings.yAxisLeftMin,
        yAxisRightMax: settings.yAxisRightMax,
        weeklyMode: settings.weeklyMode,
        anchorDay: settings.anchorDay,
        dateFormat: settings.dateFormat,
        chartHeight: settings.chartHeight,
      },
    }
    const json = JSON.stringify([teamPreset], null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'redmine-graph-preset.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  return (
    <div style={{ marginBottom: 16, border: '1px solid #ddd', borderRadius: 4 }}>
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
        <span style={{ fontSize: 11, color: '#888' }}>{isOpen ? '▲ 閉じる' : '▼ 開く'}</span>
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
                <input
                  type="date"
                  value={settings.startDate ?? ''}
                  onChange={(e) => onChange({ ...settings, startDate: e.target.value || undefined })}
                  style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 140 }}
                />
                <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>（空欄=自動）</span>
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
                <input
                  type="number"
                  value={settings.yAxisLeftMin ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    onChange({ ...settings, yAxisLeftMin: raw === '' ? undefined : Number(raw) })
                  }}
                  placeholder="0"
                  style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, width: 80 }}
                />
                <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>（空欄=自動）</span>
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
                    onClick={() => onChange({ ...settings, ...tp.settings })}
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
                onClick={handleDownloadPresetJson}
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

          {settings.series.map((s, i) => (
            <SeriesRow
              key={s.id}
              series={s}
              statuses={statuses}
              statusesLoading={statusesLoading}
              canDelete={settings.series.length > 1}
              filterFields={filterFields}
              dateFilterFields={dateFilterFields}
              getFieldOptions={getFieldOptions}
              onChange={(updated) => updateSeries(i, updated)}
              onDelete={() => deleteSeries(i)}
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
      )}
    </div>
  )
}
