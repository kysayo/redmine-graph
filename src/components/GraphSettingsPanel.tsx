import { useState } from 'react'
import type { RedmineStatus, SeriesConfig, UserSettings } from '../types'

const COLOR_PALETTE = ['#93c5fd', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

interface SeriesRowProps {
  series: SeriesConfig
  statuses: RedmineStatus[]
  statusesLoading: boolean
  canDelete: boolean
  onChange: (updated: SeriesConfig) => void
  onDelete: () => void
}

function SeriesRow({ series, statuses, statusesLoading, canDelete, onChange, onDelete }: SeriesRowProps) {
  function update<K extends keyof SeriesConfig>(key: K, value: SeriesConfig[K]) {
    onChange({ ...series, [key]: value })
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(e.target.selectedOptions, (opt) => Number(opt.value))
    update('statusIds', selected)
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
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '8px 0', borderBottom: '1px solid #eee', flexWrap: 'wrap' }}>
      {/* 色インジケーター */}
      <div style={{ width: 12, height: 12, borderRadius: 2, background: series.color, flexShrink: 0, marginBottom: 4 }} />

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
          onChange={(e) => update('dateField', e.target.value as SeriesConfig['dateField'])}
          style={selectStyle}
        >
          <option value="created_on">作成日</option>
          <option value="closed_on">完了日</option>
        </select>
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
            style={{ ...selectStyle, height: 72, minWidth: 140 }}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 削除ボタン */}
      {canDelete && (
        <button
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
}

export function GraphSettingsPanel({ settings, statuses, statusesLoading, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)

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
    if (settings.series.length >= 2) return
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
            </div>
          </div>

          {settings.series.map((s, i) => (
            <SeriesRow
              key={s.id}
              series={s}
              statuses={statuses}
              statusesLoading={statusesLoading}
              canDelete={settings.series.length > 1}
              onChange={(updated) => updateSeries(i, updated)}
              onDelete={() => deleteSeries(i)}
            />
          ))}

          {settings.series.length < 2 && (
            <button
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
          )}
        </div>
      )}
    </div>
  )
}
