'use client'

import { useState } from 'react'
import { updateItem, getItinerary } from '@/lib/itinerary-store'
import { getQUOSType, getCityCode, getAttractionNameEn, getQUOSOrder, saveQUOSOrder, DEFAULT_QUOS_ORDER, QUOS_LABELS } from '@/lib/quos-mapping'
import { getAllEntities } from '@/lib/entity-store'

// ---- helpers ----
function isFreeItem(item) {
  if (item.costCategory === 'free') return true
  if (item.costCategory === 'paid') return false
  return !item.price || item.price === 0
}

function getItemNameEn(item) {
  // attractions: use QUOS standard first, then entity store
  if (item.type === 'attraction') {
    const quosName = getAttractionNameEn(item.name)
    if (quosName) return quosName
    if (typeof window !== 'undefined') {
      const entities = getAllEntities()
      const match = entities.find((e) => e.type === 'attraction' && e.name === item.name)
      if (match?.nameEn) return match.nameEn
    }
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
                className="w-5 h-5 rounded flex items-center justify-center text-xs disabled:opacity-20"
                style={{ color: 'var(--text-tertiary)' }}
              >▲</button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === items.length - 1}
                className="w-5 h-5 rounded flex items-center justify-center text-xs disabled:opacity-20"
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
export default function QUOSList({ itinerary, onItineraryChange }) {
  const [viewMode, setViewMode] = useState('by-day') // 'by-day' | 'by-type'
  const [hideFree, setHideFree] = useState(true)
  const [showSortSettings, setShowSortSettings] = useState(false)
  const [quosOrder, setQUOSOrder] = useState(getQUOSOrder())

  const refresh = () => {
    const fresh = getItinerary(itinerary.id)
    if (fresh) onItineraryChange(fresh)
  }

  const handleQUOSChange = (dayId, itemId, newCode) => {
    updateItem(itinerary.id, dayId, itemId, { quosOverride: newCode })
    refresh()
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

  const renderRow = (row) => (
    <tr
      key={`${row.dayId}-${row.id}`}
      className="border-b text-xs"
      style={{ borderColor: 'var(--border-color)', height: 36 }}
    >
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
            <option key={code} value={code}>{code}</option>
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
      const dayItems = flatItems.filter((it) => it.dayId === day.id)
      // Sort by QUOS order within day
      dayItems.sort((a, b) => quosOrder.indexOf(a.quosCode) - quosOrder.indexOf(b.quosCode))

      const cityInfo = getCityCode(day.cityName, day.cityNameEn)
      tableBody.push(
        <tr key={`sep-${day.id}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          <td colSpan={9} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            Day {day.dayNumber} — {day.cityName}
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
            <td colSpan={9} className="px-2 py-3 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              {hideFree ? '本日仅有免费项目' : '暂无项目'}
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
    flatItems.forEach((row) => {
      if (!grouped[row.quosCode]) grouped[row.quosCode] = []
      grouped[row.quosCode].push(row)
    })

    tableBody = []
    quosOrder.forEach((code) => {
      const items = grouped[code]
      if (!items || items.length === 0) return
      tableBody.push(
        <tr key={`sep-${code}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          <td colSpan={9} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            {code} — {QUOS_LABELS[code]} ({items.length}项)
          </td>
        </tr>,
      )
      items.forEach((row) => tableBody.push(renderRow(row)))
    })
  }

  // Compute column widths for the header colgroup
  const colWidths = [60, 36, 36, 'auto', 72, 52, 56, 32, 90]

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
            <span>{hideFree ? '隐藏免费' : '显示全部'}</span>
          </button>
        </div>
        <button
          onClick={() => setShowSortSettings(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all hover:bg-[var(--bg-surface)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <span>⚙️</span>
          <span>排序设置</span>
        </button>
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
                <td colSpan={9} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {hideFree ? '所有项目均为免费项目' : '暂无数据'}
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
