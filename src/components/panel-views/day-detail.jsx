'use client'

import { useState } from 'react'
import {
  addDay,
  removeDay,
  updateDayCity,
  reorderDays,
} from '@/lib/itinerary-store'
import { getAllCitiesWithCoords } from '@/lib/data'
import { EMPTY_TEXT } from '@/lib/config'
import { isFreeItem, shouldHideItem } from '@/lib/quos-mapping'
import { recommendHotels } from '@/lib/hotel-recommend'
import ConfirmDialog from '@/components/confirm-dialog'
import { ItemRow, ItemForm } from './day-item'

// Booking 评分配色：≥9 深绿 / ≥8 品牌蓝 / ≥7 琥珀
const ratingColor = (r) => {
  if (r >= 9) return '#1e7d32'
  if (r >= 8) return 'var(--accent-strong)'
  return '#b8860b'
}

// ---- Day title helper ----
function formatDayTitle(startDate, dayNumber) {
  let label = `第${dayNumber}天`
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    if (!Number.isNaN(start.getTime())) {
      const d = new Date(start)
      d.setDate(start.getDate() + (dayNumber - 1))
      label += ` ${d.getMonth() + 1}月${d.getDate()}日`
    }
  }
  return label
}

// ---- Main DayDetail Component ----
export default function DayDetail({ itinerary, onDayHover }) {
  const [showAddDay, setShowAddDay] = useState(false)
  const [addDayCity, setAddDayCity] = useState('')
  const [addingItemTo, setAddingItemTo] = useState(null)
  const [editingCityFor, setEditingCityFor] = useState(null)
  const [hideFree, setHideFree] = useState(false)
  const [hideMeals, setHideMeals] = useState(true)
  const [hideAttractions, setHideAttractions] = useState(true)
  const [hideInlandTransit, setHideInlandTransit] = useState(true)
  const [collapsedDays, setCollapsedDays] = useState(() => new Set())
  const [deleteDayTarget, setDeleteDayTarget] = useState(null)

  const allCities = typeof window !== 'undefined' ? getAllCitiesWithCoords() : []

  const handleAddDay = () => {
    if (!addDayCity) return
    const city = allCities.find((c) => c.id === addDayCity)
    addDay(itinerary.id, addDayCity, city ? city.name : addDayCity)
    setAddDayCity('')
    setShowAddDay(false)
  }

  const handleRemoveDay = (dayId) => {
    removeDay(itinerary.id, dayId)
  }

  const handleMoveDayUp = (dayId) => {
    const idx = itinerary.days.findIndex((d) => d.id === dayId)
    if (idx <= 0) return
    const newIds = itinerary.days.map((d) => d.id)
    ;[newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]]
    reorderDays(itinerary.id, newIds)
  }

  const handleMoveDayDown = (dayId) => {
    const idx = itinerary.days.findIndex((d) => d.id === dayId)
    if (idx >= itinerary.days.length - 1) return
    const newIds = itinerary.days.map((d) => d.id)
    ;[newIds[idx + 1], newIds[idx]] = [newIds[idx], newIds[idx + 1]]
    reorderDays(itinerary.id, newIds)
  }

  const handleChangeCity = (dayId, newCityId) => {
    const city = allCities.find((c) => c.id === newCityId)
    if (city) {
      updateDayCity(itinerary.id, dayId, newCityId, city.name)
    }
    setEditingCityFor(null)
  }

  // Compute global stats for toolbar
  let totalPaid = 0
  let totalFree = 0
  itinerary.days.forEach((day) => {
    day.items.forEach((item) => {
      if (isFreeItem(item)) totalFree++
      else totalPaid++
    })
  })

  const allExpanded = collapsedDays.size === 0

  const deleteDayLabel = (() => {
    const d = itinerary.days.find((x) => x.id === deleteDayTarget)
    return d ? `第${d.dayNumber}天 ${d.cityName}` : ''
  })()

  return (
    <div className="p-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideFree(!hideFree)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              hideFree
                ? 'border'
                : ''
            }`}
            style={
              hideFree
                ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                : { background: 'var(--accent-strong)', color: '#fff' }
            }
            title={hideFree ? '点击显示免费项目' : '点击隐藏免费项目'}
          >
            <span>{hideFree ? '👁️' : '👁️‍🗨️'}</span>
            <span>{hideFree ? '只看收费' : '显示全部'}</span>
          </button>
          <button
            onClick={() => {
              if (allExpanded) {
                setCollapsedDays(new Set(itinerary.days.map((d) => d.id)))
              } else {
                setCollapsedDays(new Set())
              }
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all whitespace-nowrap"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <span>{allExpanded ? '⇱' : '⇲'}</span>
            <span>{allExpanded ? '全部收起' : '全部展开'}</span>
          </button>
          <button
            onClick={() => setHideMeals(!hideMeals)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all whitespace-nowrap"
            style={hideMeals
              ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
              : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
          >
            <span>🍽️</span>
            <span style={hideMeals ? { textDecoration: 'line-through' } : {}}>用餐</span>
          </button>
          <button
            onClick={() => setHideAttractions(!hideAttractions)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all whitespace-nowrap"
            style={hideAttractions
              ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
              : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
          >
            <span>🎫</span>
            <span style={hideAttractions ? { textDecoration: 'line-through' } : {}}>景点</span>
          </button>
          <button
            onClick={() => setHideInlandTransit(!hideInlandTransit)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all whitespace-nowrap"
            style={hideInlandTransit
              ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
              : { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }}
          >
            <span>🚄</span>
            <span style={hideInlandTransit ? { textDecoration: 'line-through' } : {}}>内陆交通</span>
          </button>
        </div>
        {hideFree && (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            收费 {totalPaid} 项 · 隐藏 {totalFree} 项免费
          </span>
        )}
      </div>

      <>
          {/* Day list */}
          <div className="flex flex-col gap-1.5">
        {itinerary.days.map((day, dayIdx) => (
          <div key={day.id}>
            {/* Day header */}
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all group cursor-pointer hover:bg-[var(--bg-surface)]"
              onClick={() => {
                setCollapsedDays((prev) => {
                  const next = new Set(prev)
                  if (next.has(day.id)) next.delete(day.id)
                  else next.add(day.id)
                  return next
                })
              }}
              onMouseEnter={() => onDayHover?.(day.id)}
              onMouseLeave={() => onDayHover?.(null)}
            >
              {/* Reorder arrows */}
              <div className="flex flex-col shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveDayUp(day.id) }}
                  disabled={dayIdx === 0}
                  className="w-6 h-6 flex items-center justify-center text-xs leading-none disabled:opacity-20 hover:text-[var(--accent)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ▲
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveDayDown(day.id) }}
                  disabled={dayIdx === itinerary.days.length - 1}
                  className="w-6 h-6 flex items-center justify-center text-xs leading-none disabled:opacity-20 hover:text-[var(--accent)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ▼
                </button>
              </div>

              {/* Day title: 第N天 几月几号 */}
              <span className="text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
                {formatDayTitle(itinerary.startDate, day.dayNumber)}
              </span>

              {/* City selector */}
              {editingCityFor === day.id ? (
                <select
                  value={day.cityId || ''}
                  onChange={(e) => {
                    if (e.target.value) handleChangeCity(day.id, e.target.value)
                  }}
                  onBlur={() => setEditingCityFor(null)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="flex-1 px-2 py-1 rounded text-xs border outline-none"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">选择城市...</option>
                  {allCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.country.name})
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingCityFor(day.id)
                    }}
                    className="min-w-0 text-left text-sm hover:underline truncate cursor-pointer"
                    style={{ color: 'var(--text-secondary)', maxWidth: '45%' }}
                    title="点击修改城市"
                  >
                    {day.cityName || '选择城市'}
                  </button>
                  <span className="flex-1" />
                </>
              )}

              <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {(() => {
                  const paidCount = day.items.filter((it) => !isFreeItem(it)).length
                  const freeCount = day.items.filter((it) => isFreeItem(it)).length
                  if (hideFree) {
                    return <>收费 {paidCount} · 免费 {freeCount}</>
                  }
                  return <>{day.items.length} 项</>
                })()}
              </span>

              <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {collapsedDays.has(day.id) ? '▸' : '▾'}
              </span>

              <button
                onClick={(e) => { e.stopPropagation(); setDeleteDayTarget(day.id) }}
                className="w-7 h-7 rounded flex items-center justify-center text-xs opacity-50 group-hover:opacity-100 transition-opacity hover:text-red-500"
                style={{ color: 'var(--text-tertiary)' }}
              >
                ×
              </button>
            </div>

            {/* Day items */}
            {!collapsedDays.has(day.id) && (() => {
                const visibleItems = day.items.filter((it) =>
                  !shouldHideItem(it, { hideFree, hideMeals, hideAttractions, hideInlandTransit }))
                const hiddenCount = day.items.length - visibleItems.length

                return (
              <div
                className="ml-3 mt-1 pl-2.5"
                style={{ borderLeft: '2px solid var(--border-color)' }}
              >
                {day.items.length === 0 && (
                  <p className="text-xs py-1.5 px-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    {EMPTY_TEXT.noItems}
                  </p>
                )}
                {day.items.length > 0 && visibleItems.length === 0 && (
                  <p className="text-xs py-1.5 px-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    {EMPTY_TEXT.allFree}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const fullIdx = day.items.findIndex((i) => i.id === item.id)
                  return (
                    <ItemRow
                      key={item.id}
                      item={item}
                      dayId={day.id}
                      itineraryId={itinerary.id}
                      items={day.items}
                      isFirst={fullIdx === 0}
                      isLast={fullIdx === day.items.length - 1}
                    />
                  )
                })}
                {hiddenCount > 0 && (
                  <p className="text-xs py-1.5 px-1.5" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                    已隐藏 {hiddenCount} 项
                  </p>
                )}

                {/* 推荐入住酒店：按当天「最后入住城市」查静态参考库（Booking 评分≥7，欧元参考价，显示前2家） */}
                {(() => {
                  const stayCity = day.finalCityName || day.cityName
                  const stayCityEn = day.finalCityNameEn || day.cityNameEn
                  const hotels = recommendHotels(stayCity, stayCityEn, 2, day.cityCode)
                  if (!hotels.length) return null
                  return (
                    <div className="mt-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                        🏨 推荐入住酒店
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
                              {h.priceEur && (
                                <span className="block" style={{ color: 'var(--text-secondary)' }}>
                                  €{h.priceEur}/晚
                                </span>
                              )}
                              {(h.area || h.near) && (
                                <span className="block truncate" style={{ color: 'var(--text-tertiary)' }}>
                                  {[h.area, h.near ? `近${h.near}` : ''].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {addingItemTo === day.id ? (
                  <div className="mt-1.5">
                    <ItemForm
                      dayId={day.id}
                      itineraryId={itinerary.id}
                      onDone={() => setAddingItemTo(null)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingItemTo(day.id)}
                    className="mt-1.5 px-2.5 py-1.5 w-full rounded-lg text-xs font-medium border border-dashed transition-all hover:bg-[var(--bg-surface)]"
                    style={{
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    + 添加项目
                  </button>
                )}
              </div>
            )})()}
          </div>
        ))}
      </div>

      {/* Add day */}
      {showAddDay ? (
        <div className="mt-3 flex gap-2">
          <select
            value={addDayCity}
            onChange={(e) => setAddDayCity(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">选择城市...</option>
            {allCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} ({city.country.name})
              </option>
            ))}
          </select>
          <button
            onClick={handleAddDay}
            disabled={!addDayCity}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
            style={{ background: 'var(--accent-strong)', color: '#fff' }}
          >
            添加
          </button>
          <button
            onClick={() => setShowAddDay(false)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            取消
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddDay(true)}
          className="mt-3 px-3 py-2 w-full rounded-lg text-sm font-medium border border-dashed transition-all hover:bg-[var(--bg-surface)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          + 添加天数
        </button>
      )}
      </>
      {deleteDayTarget && (
        <ConfirmDialog
          title="删除天数"
          message={`确定删除「${deleteDayLabel}」这一整天吗？`}
          onConfirm={() => {
            handleRemoveDay(deleteDayTarget)
            setDeleteDayTarget(null)
          }}
          onCancel={() => setDeleteDayTarget(null)}
        />
      )}
    </div>
  )
}
