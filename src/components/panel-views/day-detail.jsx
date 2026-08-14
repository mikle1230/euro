'use client'

import { useState, useRef } from 'react'
import {
  addDay,
  removeDay,
  addItem,
  removeItem,
  updateItem,
  reorderDays,
  reorderItems,
  updateDayCity,
} from '@/lib/itinerary-store'
import { getAllCitiesWithCoords } from '@/lib/data'
import { searchEntities as searchEntityStore, getAllEntities } from '@/lib/entity-store'
import { EMPTY_TEXT } from '@/lib/config'
import { isFreeItem } from '@/lib/quos-mapping'
import ConfirmDialog from '@/components/confirm-dialog'

const ITEM_TYPES = {
  attraction: { icon: '🏛️', label: '景点 Attraction (ENT)' },
  transport: { icon: '🚌', label: '交通 Transport (MTC)' },
  breakfast: { icon: '🥐', label: '早餐 Breakfast (RST)' },
  lunch: { icon: '🍽️', label: '午餐 Lunch (RST)' },
  dinner: { icon: '🍷', label: '晚餐 Dinner (RST)' },
  hotel: { icon: '🏨', label: '住宿 Hotel (HTL)' },
  other: { icon: '📌', label: '其他 Other (OTH)' },
}

const TRANSPORT_MODES = [
  { value: 'bus', label: '🚌 大巴' },
  { value: 'walk', label: '🚶 步行' },
  { value: 'metro', label: '🚇 地铁' },
  { value: 'train', label: '🚄 火车' },
  { value: 'boat', label: '🚢 游船' },
  { value: 'flight', label: '✈️ 飞机' },
  { value: 'car', label: '🚗 小车' },
]

// Look up English name for an attraction
function getAttractionNameEn(itemName) {
  if (typeof window === 'undefined') return ''
  const entities = getAllEntities()
  const match = entities.find((e) => e.type === 'attraction' && e.name === itemName)
  return match?.nameEn || ''
}

// ---- Item Row ----
function ItemRow({ item, dayId, itineraryId, items, isFirst, isLast }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const info = ITEM_TYPES[item.type] || ITEM_TYPES.other
  const isTransport = item.type === 'transport'

  if (editing) {
    return (
      <ItemForm
        item={item}
        dayId={dayId}
        itineraryId={itineraryId}
        onDone={() => setEditing(false)}
      />
    )
  }

  const handleMoveUp = () => {
    const idx = items.findIndex((i) => i.id === item.id)
    if (idx <= 0) return
    const newIds = items.map((i) => i.id)
    ;[newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]]
    reorderItems(itineraryId, dayId, newIds)
  }

  const handleMoveDown = () => {
    const idx = items.findIndex((i) => i.id === item.id)
    if (idx >= items.length - 1) return
    const newIds = items.map((i) => i.id)
    ;[newIds[idx + 1], newIds[idx]] = [newIds[idx], newIds[idx + 1]]
    reorderItems(itineraryId, dayId, newIds)
  }

  return (
    <>
    <div
      className="flex items-start gap-1.5 px-1.5 py-1.5 rounded group hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
      onClick={() => setEditing(true)}
      title="点击编辑"
    >
      {/* Reorder arrows */}
      <div className="flex flex-col shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ marginTop: 1 }}>
        <button
          onClick={(e) => { e.stopPropagation(); handleMoveUp() }}
          disabled={isFirst}
          className="w-6 h-6 flex items-center justify-center text-xs leading-none disabled:opacity-20 hover:text-[var(--accent)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          ▲
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleMoveDown() }}
          disabled={isLast}
          className="w-6 h-6 flex items-center justify-center text-xs leading-none disabled:opacity-20 hover:text-[var(--accent)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          ▼
        </button>
      </div>

      <span className="text-sm shrink-0 mt-0.5">{info.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {item.name}
            {(() => {
              const nameEn = getAttractionNameEn(item.name)
              if (item.type === 'attraction' && nameEn) {
                return (
                  <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>
                    {nameEn}
                  </span>
                )
              }
              return null
            })()}
          </span>
          {(item.startTime || item.endTime) && (
            <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              {item.startTime}{item.endTime ? `-${item.endTime}` : ''}
            </span>
          )}
        </div>
        {isTransport && (item.from || item.to) && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {item.from} → {item.to}
            {item.transportMode && item.transportMode !== 'bus' && (
              <span> · {TRANSPORT_MODES.find((m) => m.value === item.transportMode)?.label}</span>
            )}
          </p>
        )}
        {(item.price > 0 || item.notes || isFreeItem(item)) && (
          <p className="text-xs mt-0.5 truncate flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
            {item.price > 0 && (
              <span style={{ color: 'var(--gold)' }}>
                €{item.price}{item.priceUnit === 'perPerson' ? '/人' : item.priceUnit === 'perGroup' ? '/团' : item.priceUnit === 'perDay' ? '/天' : ''}
                {item.quantity > 0 ? ` ×${item.quantity}` : ''}
              </span>
            )}
            {isFreeItem(item) && item.price === 0 && (
              <span className="text-xs px-1 py-0.5 rounded" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-elevated)' }}>免费</span>
            )}
            {item.notes}
          </p>
        )}
      </div>
      <span className="self-center text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>›</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setConfirmDelete(true)
        }}
        className="w-7 h-7 rounded flex items-center justify-center text-xs opacity-50 group-hover:opacity-100 transition-opacity shrink-0 hover:text-red-500"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ×
      </button>
    </div>
    {confirmDelete && (
      <ConfirmDialog
        title="删除项目"
        message={`确定删除「${item.name}」？`}
        onConfirm={() => {
          removeItem(itineraryId, dayId, item.id)
          setConfirmDelete(false)
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
    </>
  )
}

// ---- Unified Item Form (add + edit) ----
function ItemForm({ item, dayId, itineraryId, onDone }) {
  const isEdit = !!item
  const [name, setName] = useState(item?.name || '')
  const [type, setType] = useState(item?.type || 'attraction')
  const [startTime, setStartTime] = useState(item?.startTime || '')
  const [endTime, setEndTime] = useState(item?.endTime || '')
  const [from, setFrom] = useState(item?.from || '')
  const [to, setTo] = useState(item?.to || '')
  const [mode, setMode] = useState(item?.transportMode || 'bus')
  const [notes, setNotes] = useState(item?.notes || '')
  const [showDetails, setShowDetails] = useState(
    isEdit ? !!(item.startTime || item.notes || item.from || item.price) : false,
  )
  const [entitySearch, setEntitySearch] = useState('')
  const [entityResults, setEntityResults] = useState([])
  const [showEntityPicker, setShowEntityPicker] = useState(false)
  const [price, setPrice] = useState(item?.price?.toString() || '')
  const [priceUnit, setPriceUnit] = useState(item?.priceUnit || 'perPerson')
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '')
  const inputRef = useRef(null)

  const doEntitySearch = (q) => {
    setEntitySearch(q)
    if (q.trim().length < 1) {
      setEntityResults([])
      return
    }
    const types = type === 'attraction'
      ? ['attraction']
      : type === 'hotel'
        ? ['hotel']
        : ['breakfast', 'lunch', 'dinner'].includes(type)
          ? ['restaurant']
          : []
    const results = searchEntityStore(q, types.length > 0 ? types : [])
    setEntityResults(results.slice(0, 6))
  }

  const selectEntity = (e) => {
    setName(e.name)
    setNotes(e.notes || '')
    setShowEntityPicker(false)
    setEntitySearch('')
    setEntityResults([])
    if (inputRef.current) inputRef.current.focus()
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    const payload = {
      type,
      name: name.trim(),
      startTime,
      endTime,
      from,
      to,
      transportMode: mode,
      notes,
      price: parseFloat(price) || 0,
      priceUnit,
      quantity: parseInt(quantity, 10) || 0,
    }
    if (isEdit) updateItem(itineraryId, dayId, item.id, payload)
    else addItem(itineraryId, dayId, payload)
    onDone()
  }

  return (
    <div
      className="p-2 rounded-lg border ml-2"
      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}
    >
      {/* Type + Name on one row */}
      <div className="flex gap-1.5 items-center">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-1 py-1.5 rounded text-sm border outline-none shrink-0"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          {Object.entries(ITEM_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon}</option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="名称"
          autoFocus
          className="flex-1 px-2 py-1.5 rounded text-sm border outline-none"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleSubmit}
          className="px-3 py-1.5 rounded text-sm font-medium shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {isEdit ? '保存' : '添加'}
        </button>
      </div>

      {/* Entity picker for attraction/hotel/meal */}
      {['attraction', 'hotel', 'breakfast', 'lunch', 'dinner'].includes(type) && (
        <div className="mt-1.5">
          {!showEntityPicker ? (
            <button
              onClick={() => setShowEntityPicker(true)}
              className="text-xs underline"
              style={{ color: 'var(--text-tertiary)' }}
            >
              📦 从实体库选择
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex gap-1.5 items-center">
                <input
                  type="text"
                  value={entitySearch}
                  onChange={(e) => doEntitySearch(e.target.value)}
                  placeholder={type === 'attraction' ? '搜索景点...' : type === 'hotel' ? '搜索酒店...' : '搜索餐厅...'}
                  autoFocus
                  className="flex-1 px-2 py-1 rounded text-xs border outline-none"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={() => { setShowEntityPicker(false); setEntitySearch(''); setEntityResults([]) }}
                  className="text-xs shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ✕
                </button>
              </div>
              {entityResults.length > 0 && (
                <div
                  className="flex flex-col gap-0.5 max-h-32 overflow-y-auto rounded border"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
                >
                  {entityResults.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => selectEntity(e)}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-surface)] transition-colors"
                    >
                      <span className="text-xs shrink-0">
                        {{ attraction: '🏛️', hotel: '🏨', restaurant: '🍽️' }[e.type] || '📌'}
                      </span>
                      <span className="flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                        {e.name}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {e.cityName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {entitySearch.trim() && entityResults.length === 0 && (
                <p className="text-xs py-1" style={{ color: 'var(--text-tertiary)' }}>
                  未找到匹配实体，可手动输入名称并在实体管理中创建
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toggle details */}
      <div className="flex gap-2 mt-1.5">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {showDetails ? '收起详情' : '+ 时间/交通/备注'}
        </button>
        <button
          onClick={onDone}
          className="text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          取消
        </button>
      </div>

      {showDetails && (
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex gap-1.5 items-center">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="flex-1 px-2 py-1 rounded text-xs border outline-none"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>至</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="flex-1 px-2 py-1 rounded text-xs border outline-none"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {type === 'transport' && (
            <>
              <div className="flex gap-1.5 items-center">
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="从"
                  className="flex-1 px-2 py-1 rounded text-xs border outline-none"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>→</span>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="到"
                  className="flex-1 px-2 py-1 rounded text-xs border outline-none"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="px-2 py-1 rounded text-xs border outline-none"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {TRANSPORT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </>
          )}

          <div className="flex gap-1.5 items-end">
            <div className="flex-1">
              <label className="text-xs block mb-0.5" style={{ color: 'var(--text-tertiary)' }}>单价</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-2 py-1 rounded text-xs border outline-none"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="shrink-0" style={{ width: 80 }}>
              <label className="text-xs block mb-0.5" style={{ color: 'var(--text-tertiary)' }}>单位</label>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                className="w-full px-1 py-1 rounded text-xs border outline-none"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="perPerson">/人</option>
                <option value="perGroup">/团</option>
                <option value="perDay">/天</option>
                <option value="included">含</option>
              </select>
            </div>
            <div className="shrink-0" style={{ width: 52 }}>
              <label className="text-xs block mb-0.5" style={{ color: 'var(--text-tertiary)' }}>数量</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                min="0"
                className="w-full px-2 py-1 rounded text-xs border outline-none"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="备注..."
            rows={2}
            className="px-2 py-1 rounded text-xs border outline-none resize-none"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}
    </div>
  )
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
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideFree(!hideFree)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              hideFree
                ? 'border'
                : ''
            }`}
            style={
              hideFree
                ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                : { background: 'var(--accent)', color: '#fff' }
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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all hover:bg-[var(--bg-surface)]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <span>{allExpanded ? '⇱' : '⇲'}</span>
            <span>{allExpanded ? '全部收起' : '全部展开'}</span>
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
                const visibleItems = hideFree
                  ? day.items.filter((it) => !isFreeItem(it))
                  : day.items
                const hiddenFreeCount = day.items.length - visibleItems.length

                return (
              <div
                className="ml-3 mt-1 pl-2.5"
                style={{ borderLeft: '2px solid var(--border-color)' }}
              >
                {day.items.length === 0 && (
                  <p className="text-xs py-3 px-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    {EMPTY_TEXT.noItems}
                  </p>
                )}
                {day.items.length > 0 && visibleItems.length === 0 && (
                  <p className="text-xs py-3 px-1.5" style={{ color: 'var(--text-tertiary)' }}>
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
                {hiddenFreeCount > 0 && hideFree && (
                  <p className="text-xs py-1.5 px-1.5" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                    已隐藏 {hiddenFreeCount} 个免费项目
                  </p>
                )}

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
            style={{ background: 'var(--accent)', color: '#fff' }}
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
