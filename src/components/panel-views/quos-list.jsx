'use client'

import { useState } from 'react'
import { updateItem, setDayChecked } from '@/lib/itinerary-store'
import { useIsMobile } from '@/lib/use-is-mobile'
import { getQUOSType, getCityCode, getAttractionNameEn, getQUOSOrder, saveQUOSOrder, DEFAULT_QUOS_ORDER, QUOS_LABELS } from '@/lib/quos-mapping'
import { getAllEntities } from '@/lib/entity-store'
import { EMPTY_TEXT } from '@/lib/config'

// ---- helpers ----
function isFreeItem(item) {
  if (item.costCategory === 'free') return true
  if (item.costCategory === 'paid') return false
  return !item.price || item.price === 0
}

function getItemNameEn(item) {
  // Priority 1: AI-parsed nameEn (covers attractions, hotels, etc.)
  if (item.nameEn) return item.nameEn
  // Priority 2: QUOS standard (KT 巴黎景点.xlsx)
  if (item.type === 'attraction') {
    const quosName = getAttractionNameEn(item.name)
    if (quosName) return quosName
  }
  // Priority 3: entity store (localStorage)
  if (typeof window !== 'undefined') {
    const entities = getAllEntities()
    const match = entities.find((e) => e.type === item.type && e.name === item.name)
    if (match?.nameEn) return match.nameEn
  }
  return ''
}

// ---- QUOS Sort Settings Popup ----
function SortSettings({ order, onSave, onClose }) {
  const [items, setItems] = useState([...order])

  const moveUp = (idx) => {
    if (idx <= 0) return
    const next = [...items]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setItems(next)
  }

  const moveDown = (idx) => {
    if (idx >= items.length - 1) return
    const next = [...items]
    ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
    setItems(next)
  }

  const reset = () => setItems([...DEFAULT_QUOS_ORDER])

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl p-4 w-80 max-h-[70vh] flex flex-col"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>QUOS 类型排序</h3>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--text-tertiary)' }}>✕</button>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          拖拽排序暂用按钮代替，调整后点保存
        </p>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 mb-3">
          {items.map((code, idx) => (
            <div
              key={code}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs"
              style={{ background: 'var(--bg-surface)' }}
            >
              <span className="font-mono font-bold w-8" style={{ color: 'var(--accent)' }}>{code}</span>
              <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{QUOS_LABELS[code]}</span>
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="w-7 h-7 rounded flex items-center justify-center text-xs disabled:opacity-20"
                style={{ color: 'var(--text-tertiary)' }}
              >▲</button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === items.length - 1}
                className="w-7 h-7 rounded flex items-center justify-center text-xs disabled:opacity-20"
                style={{ color: 'var(--text-tertiary)' }}
              >▼</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            重置默认
          </button>
          <button
            onClick={() => { saveQUOSOrder(items); onSave(items); onClose() }}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main Table ----
export default function QUOSList({ itinerary }) {
  const [viewMode, setViewMode] = useState('by-day') // 'by-day' | 'by-type'
  const [hideFree, setHideFree] = useState(true)
  const [showSortSettings, setShowSortSettings] = useState(false)
  const [quosOrder, setQUOSOrder] = useState(getQUOSOrder())
  const isMobile = useIsMobile()
  const [onlyUnchecked, setOnlyUnchecked] = useState(false)

  const handleQUOSChange = (dayId, itemId, newCode) => {
    updateItem(itinerary.id, dayId, itemId, { quosOverride: newCode })
  }

  const handleItemCheck = (dayId, itemId, checked) => {
    updateItem(itinerary.id, dayId, itemId, { quosChecked: checked })
  }

  const handleDayCheck = (dayId, checked) => {
    setDayChecked(itinerary.id, dayId, checked)
  }

  // Null guard: return empty state if no itinerary data
  if (!itinerary?.days) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>暂无行程数据</p>
      </div>
    )
  }

  // Build flat item list with day context
  const flatItems = []
  itinerary.days.forEach((day) => {
    day.items.forEach((item) => {
      if (hideFree && isFreeItem(item)) return
      const autoQUOS = getQUOSType(item)
      const effectiveQUOS = item.quosOverride || autoQUOS.code
      const cityInfo = getCityCode(day.cityName, day.cityNameEn)
      flatItems.push({
        ...item,
        dayNumber: day.dayNumber,
        dayId: day.id,
        cityName: day.cityName,
        cityCode: cityInfo?.cityCode || '',
        countryCode: cityInfo?.countryCode || '',
        quosCode: effectiveQUOS,
        quosLabel: QUOS_LABELS[effectiveQUOS] || effectiveQUOS,
        isAutoQUOS: !item.quosOverride,
        nameEn: getItemNameEn(item),
      })
    })
  })

  const totalCount = flatItems.length
  const doneCount = flatItems.filter((r) => r.quosChecked).length
  const hasAnyItems = itinerary.days.some((d) => d.items.length > 0)
  const visibleFlatItems = onlyUnchecked ? flatItems.filter((r) => !r.quosChecked) : flatItems

  // ---- Mobile: card checklist with progress ----
  if (isMobile) {
    const sortedDays = [...itinerary.days].sort((a, b) => a.dayNumber - b.dayNumber)

    return (
      <div className="flex flex-col h-full">
        {/* Progress header */}
        <div className="sticky top-0 z-10 px-3 py-2.5 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
              已录 {doneCount} / 共 {totalCount} {hideFree ? '收费项' : '项'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHideFree(!hideFree)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all"
                style={!hideFree
                  ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                  : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <span>{hideFree ? '👁️' : '👁️‍🗨️'}</span>
                <span>{hideFree ? '只看收费' : '显示全部'}</span>
              </button>
              <button
                onClick={() => setOnlyUnchecked((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={onlyUnchecked
                  ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                  : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <span>{onlyUnchecked ? '✅' : '☑️'}</span>
                <span>{onlyUnchecked ? '显示全部' : '只看未录'}</span>
              </button>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Item cards grouped by day */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {totalCount === 0 && (
            <p className="text-center text-sm py-10" style={{ color: 'var(--text-tertiary)' }}>
              {hasAnyItems ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
            </p>
          )}
          {sortedDays.map((day) => {
            const dayItems = visibleFlatItems.filter((it) => it.dayId === day.id)
            if (dayItems.length === 0) return null
            const cityInfo = getCityCode(day.cityName, day.cityNameEn)
            return (
              <div key={day.id}>
                <div className="flex items-center gap-2 mt-3 mb-1.5">
                  <span className="px-2 py-0.5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                    第{day.dayNumber}天
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{day.cityName}</span>
                  {cityInfo && <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{cityInfo.cityCode}</span>}
                </div>
                {dayItems.map((it) => (
                  <button
                    key={`${day.id}-${it.id}`}
                    onClick={() => handleItemCheck(day.id, it.id, !it.quosChecked)}
                    className="w-full text-left rounded-xl border mb-2 px-3 py-2.5 transition-all active:scale-[0.98]"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                      opacity: it.quosChecked ? 0.55 : 1,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                        style={{
                          background: it.quosChecked ? 'var(--accent)' : 'transparent',
                          border: `2px solid ${it.quosChecked ? 'var(--accent)' : 'var(--border-color)'}`,
                          color: '#fff',
                        }}
                      >
                        {it.quosChecked ? '✓' : ''}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', textDecoration: it.quosChecked ? 'line-through' : 'none' }}>
                            {it.name}
                          </span>
                          {it.nameEn && <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{it.nameEn}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs">
                          <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{it.quosCode}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{it.quosLabel}</span>
                          {it.cityCode && <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>{it.cityCode}</span>}
                          {it.estimatedCost > 0 && <span className="text-[10px]" style={{ color: 'var(--gold)' }}>¥{it.estimatedCost}</span>}
                          {it.startTime && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{it.startTime}{it.endTime ? `-${it.endTime}` : ''}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {it.price > 0 && <div className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>€{it.price}</div>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderRow = (row) => (
    <tr
      key={`${row.dayId}-${row.id}`}
      className="border-b text-xs"
      style={{ borderColor: 'var(--border-color)', height: 36 }}
    >
      <td className="px-1 py-1 text-center">
        <input
          type="checkbox"
          checked={!!row.quosChecked}
          onChange={(e) => handleItemCheck(row.dayId, row.id, e.target.checked)}
          className="w-3.5 h-3.5 cursor-pointer accent-[var(--accent)]"
        />
      </td>
      <td className="px-1.5 py-1 whitespace-nowrap">
        <select
          value={row.quosCode}
          onChange={(e) => handleQUOSChange(row.dayId, row.id, e.target.value)}
          className="px-1 py-0.5 rounded text-xs font-mono font-bold border outline-none"
          style={{
            background: row.isAutoQUOS ? 'var(--bg-surface)' : 'var(--accent-subtle)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            width: 60,
          }}
          title={row.isAutoQUOS ? '自动映射' : '手动覆盖'}
        >
          {quosOrder.map((code) => (
            <option key={code} value={code}>{code} · {QUOS_LABELS[code]}</option>
          ))}
        </select>
      </td>
      <td
        className="px-1.5 py-1 font-mono text-center whitespace-nowrap"
        style={{ color: row.countryCode ? 'var(--text-primary)' : 'var(--danger, #e53e3e)' }}
      >
        {row.countryCode || '--'}
      </td>
      <td
        className="px-1.5 py-1 font-mono text-center whitespace-nowrap"
        style={{ color: row.cityCode ? 'var(--text-primary)' : 'var(--danger, #e53e3e)' }}
      >
        {row.cityCode || '--'}
      </td>
      <td className="px-1.5 py-1 max-w-[200px] truncate" style={{ color: 'var(--text-primary)' }}>
        <span className="font-medium">{row.name}</span>
        {row.nameEn && (
          <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{row.nameEn}</span>
        )}
      </td>
      <td className="px-1.5 py-1 whitespace-nowrap font-mono" style={{ color: 'var(--text-secondary)' }}>
        {row.startTime}
        {row.endTime ? `-${row.endTime}` : ''}
      </td>
      <td className="px-1.5 py-1 text-center whitespace-nowrap">
        {isFreeItem(row) ? (
          <span className="text-xs px-1 py-0.5 rounded" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-elevated)' }}>免费</span>
        ) : (
          <span style={{ color: 'var(--gold)' }}>
            {row.price > 0 ? `€${row.price}` : '收费'}
          </span>
        )}
      </td>
      <td className="px-1.5 py-1 text-right whitespace-nowrap" style={{ color: 'var(--gold)' }}>
        {row.estimatedCost > 0 ? `¥${row.estimatedCost}` : ''}
      </td>
      <td className="px-1.5 py-1 text-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
        {row.quantity > 0 ? `×${row.quantity}` : ''}
      </td>
      <td className="px-1.5 py-1 max-w-[120px] truncate" style={{ color: 'var(--text-tertiary)' }} title={row.notes}>
        {row.notes}
      </td>
    </tr>
  )

  // Build rows grouped by view mode
  let tableBody
  if (viewMode === 'by-day') {
    tableBody = []
    const sortedDays = [...itinerary.days].sort((a, b) => a.dayNumber - b.dayNumber)
    sortedDays.forEach((day) => {
      const dayItems = visibleFlatItems.filter((it) => it.dayId === day.id)
      if (onlyUnchecked && dayItems.length === 0) return
      // Sort by QUOS order within day
      dayItems.sort((a, b) => quosOrder.indexOf(a.quosCode) - quosOrder.indexOf(b.quosCode))

      const cityInfo = getCityCode(day.cityName, day.cityNameEn)
      tableBody.push(
        <tr key={`sep-${day.id}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          <td className="px-1 py-1.5 text-center" style={{ background: 'var(--bg-surface)' }}>
            <input
              type="checkbox"
              checked={!!day.quosChecked}
              onChange={(e) => handleDayCheck(day.id, e.target.checked)}
              className="w-3.5 h-3.5 cursor-pointer accent-[var(--accent)]"
            />
          </td>
          <td colSpan={10} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            第{day.dayNumber}天 — {day.cityName}
            {cityInfo && (
              <span className="ml-1.5 font-mono font-normal" style={{ color: 'var(--text-tertiary)' }}>
                {cityInfo.cityCode} / {cityInfo.countryCode}
              </span>
            )}
            {!cityInfo && day.cityName && (
              <span className="ml-1.5 font-mono" style={{ color: 'var(--danger, #e53e3e)' }}>
                未匹配城市代码
              </span>
            )}
          </td>
        </tr>,
      )
      if (dayItems.length === 0) {
        tableBody.push(
          <tr key={`empty-${day.id}`}>
            <td colSpan={11} className="px-2 py-3 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              {hideFree ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
            </td>
          </tr>,
        )
      } else {
        dayItems.forEach((row) => tableBody.push(renderRow(row)))
      }
    })
  } else {
    // by-type view
    const grouped = {}
    visibleFlatItems.forEach((row) => {
      if (!grouped[row.quosCode]) grouped[row.quosCode] = []
      grouped[row.quosCode].push(row)
    })

    tableBody = []
    quosOrder.forEach((code) => {
      const items = grouped[code]
      if (!items || items.length === 0) return
      tableBody.push(
        <tr key={`sep-${code}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          <td colSpan={11} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            {code} — {QUOS_LABELS[code]} ({items.length}项)
          </td>
        </tr>,
      )
      items.forEach((row) => tableBody.push(renderRow(row)))
    })
  }

  // Compute column widths for the header colgroup
  const colWidths = [24, 60, 36, 36, 'auto', 72, 52, 56, 32, 90]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setViewMode('by-day')}
              className="px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                background: viewMode === 'by-day' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'by-day' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              按天
            </button>
            <button
              onClick={() => setViewMode('by-type')}
              className="px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                background: viewMode === 'by-type' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'by-type' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              按类型
            </button>
          </div>
          <button
            onClick={() => setHideFree(!hideFree)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
              hideFree ? 'border' : ''
            }`}
            style={
              hideFree
                ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                : { background: 'var(--accent)', color: '#fff' }
            }
          >
            <span>{hideFree ? '👁️' : '👁️‍🗨️'}</span>
            <span>{hideFree ? '只看收费' : '显示全部'}</span>
          </button>
          <button
            onClick={() => setOnlyUnchecked((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all"
            style={onlyUnchecked
              ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
              : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <span>{onlyUnchecked ? '✅' : '☑️'}</span>
            <span>{onlyUnchecked ? '显示全部' : '只看未录'}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
            已录 {doneCount}/{totalCount}
          </span>
          <button
            onClick={() => setShowSortSettings(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all hover:bg-[var(--bg-surface)]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <span>⚙️</span>
            <span>排序设置</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={typeof w === 'number' ? { width: w } : {}} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)' }}>
            <tr className="border-b text-xs" style={{ borderColor: 'var(--border-color)' }}>
              <th className="px-1 py-1.5 text-center font-semibold w-6" style={{ color: 'var(--text-secondary)' }}>✓</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>QUOS</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>国</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>城</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>项目</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>时间</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>收费</th>
              <th className="px-1.5 py-1.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>预估</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>量</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>备注</th>
            </tr>
          </thead>
          <tbody>
            {flatItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {hideFree ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
                </td>
              </tr>
            ) : visibleFlatItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  全部已录 🎉
                </td>
              </tr>
            ) : (
              tableBody
            )}
          </tbody>
        </table>
      </div>

      {/* Sort settings modal */}
      {showSortSettings && (
        <SortSettings
          order={quosOrder}
          onSave={(newOrder) => setQUOSOrder(newOrder)}
          onClose={() => setShowSortSettings(false)}
        />
      )}
    </div>
  )
}
