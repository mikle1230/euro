'use client'

import { useState } from 'react'
import { updateItem, setDayChecked } from '@/lib/itinerary-store'
import { useIsMobile } from '@/lib/use-is-mobile'
import { getQUOSType, getCityCode, getQUOSOrder, saveQUOSOrder, DEFAULT_QUOS_ORDER, QUOS_LABELS, isFreeItem, shouldHideItem } from '@/lib/quos-mapping'
import { getItemNameEn } from '@/lib/item-name'
import { EMPTY_TEXT, CURRENCY_SYMBOLS } from '@/lib/config'
import Modal from '@/components/modal'

// ---- helpers ----
// getItemNameEn 统一实现在 @/lib/item-name（优先级：AI nameEn → QUOS 标准 → 实体库）

// 报价注入项（保险/用车）优先排序：quoteOrder 越小越靠前；无 quoteOrder 按 QUOS 顺序回退
function quosSortKey(row, order) {
  return row.quoteOrder ?? (100 + order.indexOf(row.quosCode))
}

// ---- 复制 / 导出工具（供 KT/QUOS 手工录入与 Excel 粘贴）----

function fmtPrice(row) {
  if (row.price <= 0) return ''
  const symbol = row.currency === 'USD' ? '$' : row.currency === 'GBP' ? '£' : CURRENCY_SYMBOLS[row.currency] || '€'
  const unit = row.priceUnit === 'perPerson' ? '/人' : row.priceUnit === 'perGroup' ? '/团' : row.priceUnit === 'perDay' ? '/天' : ''
  return `${symbol}${row.price}${unit}${row.quantity > 0 ? `×${row.quantity}` : ''}`
}

// Tab 分隔行：直接粘贴进 Excel/表格类软件即分列
function formatRow(row) {
  const time = [row.startTime, row.endTime].filter(Boolean).join('-')
  return [
    `D${row.dayNumber}`, row.quosCode, row.countryCode || '', row.cityCode || '',
    row.name, row.nameEn || '', time, fmtPrice(row),
    row.estimatedCost > 0 ? `¥${row.estimatedCost}` : '', row.notes || '',
  ].join('\t')
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

function copyText(text) {
  if (typeof navigator === 'undefined' || !text) return Promise.resolve(false)
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text))
  }
  return Promise.resolve(fallbackCopy(text))
}

function downloadCSV(rows, itineraryName) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['天', 'QUOS', '国', '城', '项目', '英文名', '时间', '单价', '预估¥', '数量', '备注']
  const lines = [header.join(',')]
  rows.forEach((r) => {
    const time = [r.startTime, r.endTime].filter(Boolean).join('-')
    lines.push([
      `D${r.dayNumber}`, r.quosCode, r.countryCode || '', r.cityCode || '', r.name, r.nameEn || '',
      time, fmtPrice(r), r.estimatedCost || 0, r.quantity || 0, r.notes || '',
    ].map(esc).join(','))
  })
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(itineraryName || 'itinerary').replace(/[\\/:*?"<>|]/g, '_')}-quos.csv`
  a.click()
  URL.revokeObjectURL(url)
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
    <Modal title="QUOS 类型排序" onClose={onClose} width="w-80" maxHeight="max-h-[70vh]">
      <p className="text-xs mb-3 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
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
        <div className="flex gap-2 shrink-0">
          <button onClick={reset} className="flex-1 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            重置默认
          </button>
          <button
            onClick={() => { saveQUOSOrder(items); onSave(items); onClose() }}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent-strong)', color: '#fff' }}
          >
            保存
          </button>
        </div>
    </Modal>
  )
}

// ---- Main Table ----
export default function QUOSList({ itinerary }) {
  const [viewMode, setViewMode] = useState('by-day') // 'by-day' | 'by-type'
  const [hideFree, setHideFree] = useState(true)
  const [hideMeals, setHideMeals] = useState(true)
  const [hideAttractions, setHideAttractions] = useState(true)
  const [hideInlandTransit, setHideInlandTransit] = useState(true)
  const [showSortSettings, setShowSortSettings] = useState(false)
  const [quosOrder, setQUOSOrder] = useState(getQUOSOrder())
  const isMobile = useIsMobile()
  const [onlyUnchecked, setOnlyUnchecked] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const handleItemCheck = (dayId, itemId, checked) => {
    updateItem(itinerary.id, dayId, itemId, { quosChecked: checked })
  }

  const handleDayCheck = (dayId, checked) => {
    setDayChecked(itinerary.id, dayId, checked)
  }

  // 复制反馈：短暂显示 ✓ 后还原
  const flashCopied = (id) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
  }

  const handleCopyRows = (rows, label) => {
    copyText(rows.map(formatRow).join('\n')).then((ok) => {
      if (ok) flashCopied(label)
    })
  }

  const handleCopyAll = () => handleCopyRows(visibleFlatItems, 'all')
  const handleCopyDay = (dayId) => handleCopyRows(visibleFlatItems.filter((r) => r.dayId === dayId), `day-${dayId}`)
  const handleCopyType = (code) => handleCopyRows(visibleFlatItems.filter((r) => r.quosCode === code), `type-${code}`)
  const handleCopyRow = (row) => handleCopyRows([row], row.id)
  const handleExportCSV = () => downloadCSV(visibleFlatItems, itinerary.name)

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
      if (shouldHideItem(item, { hideFree, hideMeals, hideAttractions, hideInlandTransit })) return
      const autoQUOS = getQUOSType(item)
      const cityInfo = getCityCode(day.cityName, day.cityNameEn)
      flatItems.push({
        ...item,
        dayNumber: day.dayNumber,
        dayId: day.id,
        cityName: day.cityName,
        cityCode: item.cityCode || day.cityCode || cityInfo?.cityCode || '',
        countryCode: item.countryCode || day.countryCode || cityInfo?.countryCode || '',
        quosCode: autoQUOS.code,
        quosLabel: autoQUOS.label,
        nameEn: getItemNameEn(item),
      })
    })
  })

  const totalCount = flatItems.length
  const doneCount = flatItems.filter((r) => r.quosChecked).length
  const hasAnyItems = itinerary.days.some((d) => d.items.length > 0)
  const visibleFlatItems = onlyUnchecked ? flatItems.filter((r) => !r.quosChecked) : flatItems

  // 合计（按当前可见项）
  const sumEstimated = visibleFlatItems.reduce((s, r) => s + (r.estimatedCost || 0), 0)
  const sumPrice = visibleFlatItems.reduce((s, r) => s + (r.price || 0), 0)

  // ---- Mobile: card checklist with progress ----
  if (isMobile) {
    const sortedDays = [...itinerary.days].sort((a, b) => a.dayNumber - b.dayNumber)

    return (
      <div className="flex flex-col h-full">
        {/* Progress header */}
        <div className="sticky top-0 z-10 px-3 py-2.5 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
              已录 {doneCount} / 共 {totalCount} {hideFree ? '收费项' : '项'}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setHideFree(!hideFree)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
                style={!hideFree
                  ? { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }
                  : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <span>{hideFree ? '👁️' : '👁️‍🗨️'}</span>
                <span>{hideFree ? '收费' : '全部'}</span>
              </button>
              <button
                onClick={() => setHideMeals(!hideMeals)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
                style={hideMeals
                  ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                  : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
              >
                <span>🍽️</span>
                <span style={hideMeals ? { textDecoration: 'line-through' } : {}}>用餐</span>
              </button>
              <button
                onClick={() => setHideAttractions(!hideAttractions)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
                style={hideAttractions
                  ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                  : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
              >
                <span>🎫</span>
                <span style={hideAttractions ? { textDecoration: 'line-through' } : {}}>景点</span>
              </button>
              <button
                onClick={() => setHideInlandTransit(!hideInlandTransit)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
                style={hideInlandTransit
                  ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                  : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
              >
                <span>🚄</span>
                <span style={hideInlandTransit ? { textDecoration: 'line-through' } : {}}>内陆</span>
              </button>
              <button
                onClick={() => setOnlyUnchecked((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
                style={onlyUnchecked
                  ? { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }
                  : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <span>{onlyUnchecked ? '✅' : '☑️'}</span>
                <span>{onlyUnchecked ? '全部' : '未录'}</span>
              </button>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%`, background: 'var(--accent-strong)' }}
            />
          </div>
          {/* 合计 + 复制/导出 */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-xs min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
              {sumEstimated > 0 && <span style={{ color: 'var(--gold)' }}>预估 ¥{sumEstimated.toLocaleString()}</span>}
              {sumEstimated > 0 && sumPrice > 0 && <span> · </span>}
              {sumPrice > 0 && <span style={{ color: 'var(--gold)' }}>€单价 {sumPrice}</span>}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCopyAll}
                disabled={visibleFlatItems.length === 0}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all disabled:opacity-40"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <span>{copiedId === 'all' ? '✅' : '📋'}</span>
                <span>复制</span>
              </button>
              <button
                onClick={handleExportCSV}
                disabled={visibleFlatItems.length === 0}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all disabled:opacity-40"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <span>📥</span>
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Item cards grouped by day */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {totalCount === 0 && (
            <p className="text-center text-xs py-4" style={{ color: 'var(--text-tertiary)' }}>
              {hasAnyItems ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
            </p>
          )}
          {sortedDays.map((day) => {
            const dayItems = visibleFlatItems.filter((it) => it.dayId === day.id)
            dayItems.sort((a, b) => quosSortKey(a, quosOrder) - quosSortKey(b, quosOrder))
            if (dayItems.length === 0) return null
            const cityInfo = getCityCode(day.cityName, day.cityNameEn)
            const dayCode = day.cityCode || cityInfo?.cityCode || ''
            return (
              <div key={day.id}>
                <div className="flex items-center gap-2 mt-3 mb-1.5">
                  <span className="px-2 py-0.5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--accent-strong)', color: '#fff' }}>
                    第{day.dayNumber}天
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{day.cityName}</span>
                  {dayCode && <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{dayCode}</span>}
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
      <td className="px-1.5 py-1 text-center whitespace-nowrap font-mono font-bold" style={{ color: 'var(--accent)' }}>
        {row.quosCode}
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
            {row.price > 0 ? `${CURRENCY_SYMBOLS[row.currency] || '€'}${row.price}` : '收费'}
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
      <td className="px-1 py-1 text-center">
        <button
          onClick={(e) => { e.stopPropagation(); handleCopyRow(row) }}
          className="w-6 h-6 rounded flex items-center justify-center text-xs transition-colors hover:bg-[var(--bg-surface)]"
          style={{ color: 'var(--text-tertiary)' }}
          title="复制此行（Tab 分隔，可直接粘贴进表格）"
        >
          {copiedId === row.id ? '✅' : '📋'}
        </button>
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
      // Sort: injected quote items first, then by QUOS order within day
      dayItems.sort((a, b) => quosSortKey(a, quosOrder) - quosSortKey(b, quosOrder))

      const cityInfo = getCityCode(day.cityName, day.cityNameEn)
      const dayCode = day.cityCode || cityInfo?.cityCode || ''
      const dayCountry = day.countryCode || cityInfo?.countryCode || ''
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
          <td colSpan={10} className="px-2 py-1.5 text-xs font-semibold whitespace-nowrap overflow-hidden" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            <span className="align-middle">
              第{day.dayNumber}天 — {day.cityName}
            </span>
            {dayCode && dayCountry && (
              <span className="ml-1.5 font-mono font-normal" style={{ color: 'var(--text-tertiary)' }}>
                {dayCode} / {dayCountry}
              </span>
            )}
            {!dayCode && day.cityName && (
              <span className="ml-1.5 font-mono" style={{ color: 'var(--danger, #e53e3e)' }}>
                未匹配城市代码
              </span>
            )}
            <button
              onClick={() => handleCopyDay(day.id)}
              disabled={dayItems.length === 0}
              className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-40"
              style={{ color: 'var(--text-secondary)' }}
              title="复制本天全部可见项"
            >
              {copiedId === `day-${day.id}` ? '✅' : '📋'}
              本天
            </button>
          </td>
        </tr>,
      )
      if (dayItems.length === 0) {
        tableBody.push(
          <tr key={`empty-${day.id}`}>
            <td colSpan={11} className="px-2 py-1.5 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              {hideFree ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
            </td>
          </tr>,
        )
      } else {
        dayItems.forEach((row) => tableBody.push(renderRow(row)))
      }
    })
    // 合计行
    if (visibleFlatItems.length > 0 && (sumEstimated > 0 || sumPrice > 0)) {
      tableBody.push(
        <tr key="totals">
          <td colSpan={11} className="px-2 py-2 text-xs font-semibold text-right" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
            合计：
            {sumPrice > 0 && <span style={{ color: 'var(--gold)' }}>€单价 {sumPrice}</span>}
            {sumPrice > 0 && sumEstimated > 0 && <span> · </span>}
            {sumEstimated > 0 && <span style={{ color: 'var(--gold)' }}>预估 ¥{sumEstimated.toLocaleString()}</span>}
          </td>
        </tr>,
      )
    }
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
      const subtotal = items.reduce((s, r) => s + (r.estimatedCost || 0), 0)
      tableBody.push(
        <tr key={`sep-${code}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          <td colSpan={11} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            {code} — {QUOS_LABELS[code]} ({items.length}项)
            {subtotal > 0 && (
              <span className="ml-1.5 font-normal" style={{ color: 'var(--gold)' }}>
                预估 ¥{subtotal.toLocaleString()}
              </span>
            )}
            <button
              onClick={() => handleCopyType(code)}
              className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium transition-colors hover:bg-[var(--bg-elevated)]"
              style={{ color: 'var(--text-secondary)' }}
              title="复制本类全部可见项"
            >
              {copiedId === `type-${code}` ? '✅' : '📋'}
              本类
            </button>
          </td>
        </tr>,
      )
      items.sort((a, b) => quosSortKey(a, quosOrder) - quosSortKey(b, quosOrder))
      items.forEach((row) => tableBody.push(renderRow(row)))
    })
  }

  // Compute column widths for the header colgroup
  const colWidths = [24, 52, 32, 32, 'auto', 64, 48, 52, 28, 80, 28]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar —— 紧凑布局：面板 50vw 也能一行放下；放不下时整组换行而不是把文字挤换行 */}
      <div className="flex items-start gap-x-3 gap-y-1.5 px-3 py-2 border-b shrink-0 flex-wrap" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          <div className="flex rounded-lg border overflow-hidden shrink-0" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setViewMode('by-day')}
              className="px-2 py-1 text-xs font-medium transition-all whitespace-nowrap"
              style={{
                background: viewMode === 'by-day' ? 'var(--accent-strong)' : 'transparent',
                color: viewMode === 'by-day' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              按天
            </button>
            <button
              onClick={() => setViewMode('by-type')}
              className="px-2 py-1 text-xs font-medium transition-all whitespace-nowrap"
              style={{
                background: viewMode === 'by-type' ? 'var(--accent-strong)' : 'transparent',
                color: viewMode === 'by-type' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              按类型
            </button>
          </div>
          <button
            onClick={() => setHideFree(!hideFree)}
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              hideFree ? 'border' : ''
            }`}
            style={
              hideFree
                ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                : { background: 'var(--accent-strong)', color: '#fff' }
            }
            title={hideFree ? '显示免费项目' : '隐藏免费项目'}
          >
            <span>{hideFree ? '👁️' : '👁️‍🗨️'}</span>
            <span>{hideFree ? '收费' : '全部'}</span>
          </button>
          <button
            onClick={() => setHideMeals(!hideMeals)}
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
            style={hideMeals
              ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
              : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
          >
            <span>🍽️</span>
            <span style={hideMeals ? { textDecoration: 'line-through' } : {}}>用餐</span>
          </button>
          <button
            onClick={() => setHideAttractions(!hideAttractions)}
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
            style={hideAttractions
              ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
              : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
          >
            <span>🎫</span>
            <span style={hideAttractions ? { textDecoration: 'line-through' } : {}}>景点</span>
          </button>
          <button
            onClick={() => setHideInlandTransit(!hideInlandTransit)}
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
            style={hideInlandTransit
              ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
              : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
          >
            <span>🚄</span>
            <span style={hideInlandTransit ? { textDecoration: 'line-through' } : {}}>内陆</span>
          </button>
          <button
            onClick={() => setOnlyUnchecked((v) => !v)}
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap"
            style={onlyUnchecked
              ? { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }
              : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <span>{onlyUnchecked ? '✅' : '☑️'}</span>
            <span>{onlyUnchecked ? '全部' : '未录'}</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap ml-auto">
          {/* 暂注释：已录计数（功能待定）
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            已录 {doneCount}/{totalCount}
          </span>
          */}
          {/* 暂注释：复制全部（功能待定）
          <button
            onClick={handleCopyAll}
            disabled={visibleFlatItems.length === 0}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm border transition-all hover:bg-[var(--bg-surface)] disabled:opacity-40"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            title="复制全部可见项（Tab 分隔，可直接粘贴进表格）"
          >
            {copiedId === 'all' ? '✅' : '📋'}
          </button>
          */}
          {/* 暂注释：导出 CSV（功能待定）
          <button
            onClick={handleExportCSV}
            disabled={visibleFlatItems.length === 0}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm border transition-all hover:bg-[var(--bg-surface)] disabled:opacity-40"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            title="导出可见项为 CSV（Excel 可直接打开）"
          >
            📥
          </button>
          */}
          <button
            onClick={() => setShowSortSettings(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm border transition-all hover:bg-[var(--bg-surface)]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            title="QUOS 类型排序设置"
          >
            ⚙️
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
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {flatItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {hideFree ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
                </td>
              </tr>
            ) : visibleFlatItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
