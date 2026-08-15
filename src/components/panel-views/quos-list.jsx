'use client'

import { useState } from 'react'
import { updateItem, setDayChecked } from '@/lib/itinerary-store'
import { useIsMobile } from '@/lib/use-is-mobile'
import { getQUOSType, getCityCode, getQUOSOrder, QUOS_LABELS, isFreeItem, shouldHideItem } from '@/lib/quos-mapping'
import { getItemNameEn } from '@/lib/item-name'
import { recommendHotels } from '@/lib/hotel-recommend'
import { EMPTY_TEXT, CURRENCY_SYMBOLS } from '@/lib/config'

// ---- helpers ----
// getItemNameEn 统一实现在 @/lib/item-name（优先级：AI nameEn → QUOS 标准 → 实体库）

// Booking 评分配色：≥9 深绿 / ≥8 品牌蓝 / 7-8 琥珀
const ratingColor = (r) => {
  if (r >= 9) return '#1e7d32'
  if (r >= 8) return 'var(--accent-strong)'
  return '#b8860b'
}

// 推荐入住酒店块：按当天「最后入住城市」取静态库（Booking 评分≥7 + 欧元参考价，显示前2家）
function HotelRecommend({ day }) {
  const hotels = recommendHotels(
    day.finalCityName || day.cityName,
    day.finalCityNameEn || day.cityNameEn,
    2,
    day.cityCode,
  )
  if (!hotels.length) return null
  return (
    <div className="px-2.5 py-1.5 rounded-lg border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
        🏨 推荐入住酒店
        <span className="font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>
          Booking ≥7 · 欧元参考价
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {hotels.map((h, i) => (
          <div key={i} className="text-xs flex items-start gap-1.5">
            <span className="shrink-0 font-semibold w-8 text-right" style={{ color: ratingColor(h.rating) }}>
              ★{h.rating}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate" style={{ color: 'var(--text-primary)' }} title={h.name}>
                {h.name}
              </span>
              {h.area && (
                <span className="block truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {h.area}{h.near ? ` · 近${h.near}` : ''}
                </span>
              )}
            </span>
            <span className="shrink-0" style={{ color: 'var(--text-secondary)' }}>
              {h.priceEur ? `€${h.priceEur}/晚` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 报价注入项（保险/用车）优先排序：quoteOrder 越小越靠前；无 quoteOrder 按 QUOS 顺序回退
function quosSortKey(row, order) {
  return row.quoteOrder ?? (100 + order.indexOf(row.quosCode))
}

// ---- 导出工具（CSV）----

function fmtPrice(row) {
  if (row.price <= 0) return ''
  const symbol = row.currency === 'USD' ? '$' : row.currency === 'GBP' ? '£' : CURRENCY_SYMBOLS[row.currency] || '€'
  const unit = row.priceUnit === 'perPerson' ? '/人' : row.priceUnit === 'perGroup' ? '/团' : row.priceUnit === 'perDay' ? '/天' : ''
  return `${symbol}${row.price}${unit}${row.quantity > 0 ? `×${row.quantity}` : ''}`
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

// ---- Main Table ----
export default function QUOSList({ itinerary }) {
  const [viewMode, setViewMode] = useState('by-day') // 'by-day' | 'by-type'
  const [hideFree, setHideFree] = useState(true)
  const [hideMeals, setHideMeals] = useState(true)
  const [hideAttractions, setHideAttractions] = useState(true)
  const [hideInlandTransit, setHideInlandTransit] = useState(true)
  const quosOrder = getQUOSOrder()
  const isMobile = useIsMobile()
  const [onlyUnchecked, setOnlyUnchecked] = useState(false)

  const handleItemCheck = (dayId, itemId, checked) => {
    updateItem(itinerary.id, dayId, itemId, { quosChecked: checked })
  }

  const handleDayCheck = (dayId, checked) => {
    setDayChecked(itinerary.id, dayId, checked)
  }

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
          {/* 合计 + 导出 */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-xs min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
              {sumEstimated > 0 && <span style={{ color: 'var(--gold)' }}>预估 ¥{sumEstimated.toLocaleString()}</span>}
              {sumEstimated > 0 && sumPrice > 0 && <span> · </span>}
              {sumPrice > 0 && <span style={{ color: 'var(--gold)' }}>€单价 {sumPrice}</span>}
            </span>
            <div className="flex items-center gap-1 shrink-0">
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
                {/* 推荐入住酒店 */}
                <HotelRecommend day={day} />
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
        <tr key={`sep-${day.id}`} className="border-b" style={{ borderColor: 'var(--accent)' }}>
          <td className="px-1 py-1.5 text-center" style={{ background: 'linear-gradient(90deg, var(--accent-strong), var(--accent-dim))' }}>
            <input
              type="checkbox"
              checked={!!day.quosChecked}
              onChange={(e) => handleDayCheck(day.id, e.target.checked)}
              className="w-3.5 h-3.5 cursor-pointer"
            />
          </td>
          <td colSpan={10} className="px-2 py-1.5 text-xs font-bold whitespace-nowrap overflow-hidden" style={{ background: 'linear-gradient(90deg, var(--accent-strong), var(--accent-dim))', color: '#fff' }}>
            <span className="align-middle">
              第{day.dayNumber}天 — {day.cityName}
            </span>
            {dayCode && dayCountry && (
              <span className="ml-1.5 font-mono font-normal" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {dayCode} / {dayCountry}
              </span>
            )}
            {!dayCode && day.cityName && (
              <span className="ml-1.5 font-mono" style={{ color: '#ffe3e3' }}>
                未匹配城市代码
              </span>
            )}
          </td>
        </tr>,
      )
      if (dayItems.length === 0) {
        tableBody.push(
          <tr key={`empty-${day.id}`}>
            <td colSpan={10} className="px-3 py-1">
              <div
                className="border-t border-dashed"
                style={{ borderColor: 'var(--border-color)' }}
                title={hideFree ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
              />
            </td>
          </tr>,
        )
      } else {
        dayItems.forEach((row) => tableBody.push(renderRow(row)))
      }
      // 推荐入住酒店（当天最后入住城市）
      const hasHotels = recommendHotels(
        day.finalCityName || day.cityName,
        day.finalCityNameEn || day.cityNameEn,
        1,
        day.cityCode,
      ).length > 0
      if (hasHotels) {
        tableBody.push(
          <tr key={`hotels-${day.id}`}>
            <td colSpan={10} className="px-1.5 pb-1.5">
              <HotelRecommend day={day} />
            </td>
          </tr>,
        )
      }
    })
    // 合计行
    if (visibleFlatItems.length > 0 && (sumEstimated > 0 || sumPrice > 0)) {
      tableBody.push(
        <tr key="totals">
          <td colSpan={10} className="px-2 py-2 text-xs font-semibold text-right" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
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
          <td colSpan={10} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            {code} — {QUOS_LABELS[code]} ({items.length}项)
            {subtotal > 0 && (
              <span className="ml-1.5 font-normal" style={{ color: 'var(--gold)' }}>
                预估 ¥{subtotal.toLocaleString()}
              </span>
            )}
          </td>
        </tr>,
      )
      items.sort((a, b) => quosSortKey(a, quosOrder) - quosSortKey(b, quosOrder))
      items.forEach((row) => tableBody.push(renderRow(row)))
    })
  }

  // Compute column widths for the header colgroup
  const colWidths = [24, 52, 32, 32, 'auto', 64, 48, 52, 28, 80]

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
                <td colSpan={10} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {hideFree ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
                </td>
              </tr>
            ) : visibleFlatItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  全部已录 🎉
                </td>
              </tr>
            ) : (
              tableBody
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
