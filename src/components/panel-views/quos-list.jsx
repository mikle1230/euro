'use client'

import { useState, useRef, useEffect, Fragment } from 'react'
import { updateItem, setDayChecked } from '@/lib/itinerary-store'
import { useIsMobile } from '@/lib/use-is-mobile'
import { getQUOSType, getCityCode, getQUOSOrder, QUOS_LABELS, isFreeItem, shouldHideItem } from '@/lib/quos-mapping'
import { getItemNameEn } from '@/lib/item-name'
import { recommendHotels, getHotelPriceRange } from '@/lib/hotel-recommend'
import { getMonthFromDate, getHotelQuotes, getQuoteRange, findHotelQuote } from '@/lib/hotel-prices'
import { EMPTY_TEXT, CURRENCY_SYMBOLS } from '@/lib/config'

// ---- helpers ----
// getItemNameEn 统一实现在 @/lib/item-name（优先级：AI nameEn → QUOS 标准 → 实体库）

// Booking 评分配色：≥9 深绿 / ≥8 品牌蓝 / 7-8 琥珀
const ratingColor = (r) => {
  if (r >= 9) return '#1e7d32'
  if (r >= 8) return 'var(--accent-strong)'
  return '#b8860b'
}

// 推荐入住酒店块：按「当天所在城市」取推荐库酒店（不限制数量）
// aligned=true（桌面表格）：用与表格列宽一致的 6 列网格，酒店名对齐「项目」列、特点对齐「备注」列
// aligned=false（移动端卡片）：纵向堆叠
// month：行程出发月份（'9月'），用于供应商报价过滤；空则显示该城全部报价
// 价格口径：优先供应商报价库（hotel list.xlsx，€/间），无匹配才回退推荐库参考价（€/晚）
function HotelRecommend({ day, aligned = false, month = null }) {
  const hotels = recommendHotels(
    day.cityName || day.finalCityName,
    day.cityNameEn || day.finalCityNameEn,
    99, // 不限制每城酒店数量
    day.cityCode,
  )
  // 供应商报价：按城市码（item/天优先，兜底 getCityCode 反查）
  const quoteCityCode = day.cityCode || getCityCode(day.cityName, day.cityNameEn)?.cityCode || ''
  const quotes = getHotelQuotes(quoteCityCode, month)
  if (!hotels.length && !quotes.length) return null
  // 推荐酒店的价格：优先匹配报价库（€/间，金色），无则显示推荐库参考价（€/晚，灰色）
  const priceOf = (h) => {
    const q = findHotelQuote(quoteCityCode, h.name, month)
    if (q && q.pp && !isNaN(parseFloat(q.pp))) {
      return <div className="text-xs mt-0.5 pl-9 font-semibold" style={{ color: 'var(--gold)' }}>€{q.pp}/间</div>
    }
    if (h.priceEur) {
      return <div className="text-xs mt-0.5 pl-9" style={{ color: 'var(--text-secondary)' }}>€{h.priceEur}/晚</div>
    }
    return null
  }
  const gridStyle = aligned ? { gridTemplateColumns: '28px 52px 34px 34px 1fr 1fr' } : undefined
  const nameCol = aligned ? { gridColumnStart: 5, paddingRight: 8 } : undefined
  const areaCol = aligned ? { gridColumnStart: 6 } : undefined
  return (
    <div className="px-2.5 py-1.5 rounded-lg border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
      {hotels.length > 0 && (
        <>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            🏨 推荐入住酒店
          </div>
          <div className="grid gap-y-1.5" style={gridStyle}>
            {hotels.map((h, i) => (
              <Fragment key={i}>
                {/* 酒店名 + 价格 → 项目列 */}
                <div className="min-w-0" style={nameCol}>
                  <div className="text-xs flex items-start gap-1.5">
                    <span className="shrink-0 font-semibold w-8 text-right" style={{ color: ratingColor(h.rating) }}>
                      ★{h.rating}
                    </span>
                    <span className="min-w-0 truncate" style={{ color: 'var(--text-primary)' }} title={h.name}>
                      {h.name}
                    </span>
                  </div>
                  {priceOf(h)}
                </div>
                {/* 酒店特点 → 备注列 */}
                <div className="min-w-0 text-xs mt-0.5 sm:mt-0" style={{ ...areaCol, color: 'var(--text-tertiary)', overflowWrap: 'break-word' }}>
                  {[h.area, h.near ? `近${h.near}` : ''].filter(Boolean).join(' · ')}
                </div>
              </Fragment>
            ))}
          </div>
        </>
      )}
      {quotes.length > 0 && (
        <div className={hotels.length > 0 ? 'mt-1.5 pt-1.5 border-t border-dashed' : ''} style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            💰 供应商报价{month ? `（${month}）` : ''}（€/间）
          </div>
          <div className="text-[11px] leading-snug flex flex-wrap gap-x-3 gap-y-0.5">
            {quotes.map((q, i) => (
              <span key={i} style={{ color: 'var(--text-primary)' }}>
                <span className="font-medium">{q.hotel}</span>
                <span className="ml-1 font-mono" style={{ color: 'var(--gold)' }}>€{q.pp}</span>
                {q.rating ? <span className="ml-1" style={{ color: ratingColor(q.rating) }}>★{q.rating}</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}
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
  const symbol = CURRENCY_SYMBOLS[row.currency] || '€'
  const unit = row.priceUnit === 'perPerson' ? '/人' : row.priceUnit === 'perGroup' ? '/团' : row.priceUnit === 'perDay' ? '/天' : ''
  return `${symbol}${row.price}${unit}${row.quantity > 0 ? `×${row.quantity}` : ''}`
}

// 备注列的元信息行：时间 · 收费/价格 · 预估 · 数量（与备注文字合并为一列展示）
// 酒店项：价格优先供应商报价库（€/间，以 hotel list.xlsx 为准），无则回退调研酒店库区间（€/晚）
function rowMeta(row, month) {
  const parts = []
  const t = [row.startTime, row.endTime].filter(Boolean).join('-')
  if (t) parts.push(`🕐${t}`)
  if (row.type === 'hotel') {
    const qRange = getQuoteRange(row.cityCode, month)
    const range = qRange || getHotelPriceRange(row.cityName || row.finalCityName, row.cityNameEn || row.finalCityNameEn, row.cityCode)
    parts.push(range || '收费')
  } else if (isFreeItem(row)) {
    parts.push('免费')
  } else if (row.price > 0) {
    const symbol = CURRENCY_SYMBOLS[row.currency] || '€'
    const unit = row.priceUnit === 'perPerson' ? '/人' : row.priceUnit === 'perGroup' ? '/团' : row.priceUnit === 'perDay' ? '/天' : ''
    parts.push(`${symbol}${row.price}${unit}`)
    if (row.quantity > 0) parts.push(`×${row.quantity}`)
  } else {
    parts.push('收费')
  }
  if (row.type !== 'hotel' && row.estimatedCost > 0) parts.push(`¥${row.estimatedCost}`)
  return parts.join(' · ')
}

function downloadCSV(rows, itineraryName, month) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['天', 'QUOS', '国', '城', '项目', '英文名', '时间', '单价', '预估¥', '数量', '备注']
  const lines = [header.join(',')]
  rows.forEach((r) => {
    const time = [r.startTime, r.endTime].filter(Boolean).join('-')
    const priceCell = r.type === 'hotel'
      ? (getQuoteRange(r.cityCode, month) || getHotelPriceRange(r.cityName || r.finalCityName, r.cityNameEn || r.finalCityNameEn, r.cityCode))
      : fmtPrice(r)
    const estimateCell = r.type === 'hotel' ? '' : (r.estimatedCost || 0)
    lines.push([
      `D${r.dayNumber}`, r.quosCode, r.countryCode || '', r.cityCode || '', r.name, r.nameEn || '',
      time, priceCell, estimateCell, r.quantity || 0, r.notes || '',
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
  // 行程出发月份（'9月'）——供应商 PP 报价按此过滤
  const month = getMonthFromDate(itinerary?.startDate)

  // 表格需要 ~560px 才能舒适展示 6 列；面板/容器宽度低于阈值时降级为卡片布局（复用手机端卡片）。
  // 依据「容器自身宽度」而非屏幕宽度：桌面侧栏拖窄到 360px 也会自动切卡片，杜绝表格溢出。
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(null)
  const useCards = isMobile || (containerWidth != null && containerWidth < 560)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [useCards])

  const handleItemCheck = (dayId, itemId, checked) => {
    updateItem(itinerary.id, dayId, itemId, { quosChecked: checked })
  }

  const handleDayCheck = (dayId, checked) => {
    setDayChecked(itinerary.id, dayId, checked)
  }

  const handleExportCSV = () => downloadCSV(visibleFlatItems, itinerary.name, month)

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
        cityNameEn: day.cityNameEn || '',
        finalCityName: day.finalCityName || day.cityName,
        finalCityNameEn: day.finalCityNameEn || day.cityNameEn || '',
        cityCode: item.cityCode || day.cityCode || cityInfo?.cityCode || '',
        countryCode: item.countryCode || day.countryCode || cityInfo?.countryCode || '',
        quosCode: autoQUOS.code,
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
  if (useCards) {
    const sortedDays = [...itinerary.days].sort((a, b) => a.dayNumber - b.dayNumber)

    return (
      <div ref={containerRef} className="flex flex-col h-full">
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
            const dayCountry = day.countryCode || cityInfo?.countryCode || ''
            return (
              <div key={day.id}>
                <div className="flex items-center gap-2 mt-3 mb-1.5">
                  <span className="px-2 py-0.5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--accent-strong)', color: '#fff' }}>
                    第{day.dayNumber}天
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{day.cityName}</span>
                  {dayCountry && (
                    <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {dayCountry}{dayCode ? `/${dayCode}` : ''}
                    </span>
                  )}
                  {!dayCountry && dayCode && (
                    <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>{dayCode}</span>
                  )}
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
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          {it.nameEn ? (
                            <>
                              <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', textDecoration: it.quosChecked ? 'line-through' : 'none' }}>
                                {it.nameEn}
                              </span>
                              <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{it.name}</span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', textDecoration: it.quosChecked ? 'line-through' : 'none' }}>
                              {it.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                          <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{it.quosCode}</span>
                          {it.countryCode && <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>{it.countryCode}</span>}
                          {it.cityCode && <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>{it.cityCode}</span>}
                          {it.type !== 'hotel' && it.estimatedCost > 0 && <span className="text-[10px]" style={{ color: 'var(--gold)' }}>¥{it.estimatedCost}</span>}
                          {it.startTime && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{it.startTime}{it.endTime ? `-${it.endTime}` : ''}</span>}
                        </div>
                        {it.notes && (
                          <div className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--text-tertiary)', overflowWrap: 'break-word' }}>
                            {it.notes}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {it.type === 'hotel' ? (
                          <div className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
                            {getQuoteRange(it.cityCode, month) || getHotelPriceRange(it.cityName || it.finalCityName, it.cityNameEn || it.finalCityNameEn, it.cityCode)}
                          </div>
                        ) : it.price > 0 ? (
                          <div className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>
                            {(() => {
                              const symbol = CURRENCY_SYMBOLS[it.currency] || '€'
                              return `${symbol}${it.price}${it.quantity > 0 ? `×${it.quantity}` : ''}`
                            })()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
                {/* 推荐入住酒店 */}
                <HotelRecommend day={day} month={month} />
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
      <td className="px-1.5 py-1 align-top" style={{ color: 'var(--text-primary)', overflowWrap: 'break-word' }}>
        {row.nameEn ? (
          <>
            <span className="font-medium">{row.nameEn}</span>
            <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{row.name}</span>
          </>
        ) : (
          <span className="font-medium">{row.name}</span>
        )}
      </td>
      <td className="px-1.5 py-1 align-top" style={{ color: 'var(--text-tertiary)', overflowWrap: 'break-word' }}>
        {(() => {
          const meta = rowMeta(row, month)
          return meta ? (
            <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>{meta}</div>
          ) : null
        })()}
        <div className="whitespace-normal break-words">{row.notes}</div>
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
          <td colSpan={5} className="px-2 py-1.5 text-xs font-bold whitespace-nowrap overflow-hidden" style={{ background: 'linear-gradient(90deg, var(--accent-strong), var(--accent-dim))', color: '#fff' }}>
            <span className="align-middle">
              第{day.dayNumber}天 — {day.cityName}
            </span>
            {dayCode && dayCountry && (
              <span className="ml-1.5 font-mono font-normal" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {dayCountry} / {dayCode}
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
            <td colSpan={6} className="px-3 py-1">
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
      // 推荐入住酒店（当天所在城市）
      const hasHotels = recommendHotels(
        day.cityName || day.finalCityName,
        day.cityNameEn || day.finalCityNameEn,
        1,
        day.cityCode,
      ).length > 0
      if (hasHotels || getHotelQuotes(day.cityCode || getCityCode(day.cityName, day.cityNameEn)?.cityCode || '', month).length > 0) {
        tableBody.push(
          <tr key={`hotels-${day.id}`}>
            <td colSpan={6} className="px-1.5 pb-1.5">
              <HotelRecommend day={day} aligned month={month} />
            </td>
          </tr>,
        )
      }
    })
    // 合计行
    if (visibleFlatItems.length > 0 && (sumEstimated > 0 || sumPrice > 0)) {
      tableBody.push(
        <tr key="totals">
          <td colSpan={6} className="px-2 py-2 text-xs font-semibold text-right" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
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
          <td colSpan={6} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
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
  // 前 4 列固定像素；项目/备注两列 auto（table-fixed 下平分剩余空间，绝不超出容器）
  const colWidths = [28, 52, 34, 34, 'auto', 'auto']

  return (
    <div ref={containerRef} className="flex flex-col h-full">
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
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full max-w-full border-collapse table-fixed">
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={w === 'auto' ? undefined : { width: w }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)' }}>
            <tr className="border-b text-xs" style={{ borderColor: 'var(--border-color)' }}>
              <th className="px-1 py-1.5 text-center font-semibold w-6" style={{ color: 'var(--text-secondary)' }}>✓</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>QUOS</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>国</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>城</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>项目</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>备注</th>
            </tr>
          </thead>
          <tbody>
            {flatItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {hideFree ? EMPTY_TEXT.allFree : EMPTY_TEXT.noItems}
                </td>
              </tr>
            ) : visibleFlatItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
