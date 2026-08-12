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
import QUOSList from './quos-list'

const ITEM_TYPES = {
  attraction: { icon: '🏛️', label: '景点 Attraction (ENT)' },
  transport: { icon: '🚌', label: '交通 Transport (MTC)' },
  breakfast: { icon: '🥐', label: '早餐 Breakfast' },
  lunch: { icon: '🍽️', label: '午餐 Lunch' },
  dinner: { icon: '🍷', label: '晚餐 Dinner' },
  hotel: { icon: '🏨', label: '住宿 Hotel (HTL)' },
  other: { icon: '📌', label: '其他 Other (OTH)' },
}

const TRANSPORT_MODES = [
  { value: 'bus', label: '🚌 大巴 Coach' },
  { value: 'walk', label: '🚶 步行 Walk' },
  { value: 'metro', label: '🚇 地铁 Metro' },
  { value: 'train', label: '🚄 火车 Train' },
  { value: 'boat', label: '🚢 游船 Boat' },
  { value: 'flight', label: '✈️ 飞机 Flight' },
  { value: 'car', label: '🚗 小车 Car' },
]

// ---- Inline Item Editor ----
function ItemEdit({ item, dayId, itineraryId, onDone }) {
  const [name, setName] = useState(item.name)
  const [type, setType] = useState(item.type)
  const [startTime, setStartTime] = useState(item.startTime || '')
  const [endTime, setEndTime] = useState(item.endTime || '')
  const [from, setFrom] = useState(item.from || '')
  const [to, setTo] = useState(item.to || '')
  const [mode, setMode] = useState(item.transportMode || 'bus')
  const [notes, setNotes] = useState(item.notes || '')
  const [price, setPrice] = useState(item.price?.toString() || '')
  const [priceUnit, setPriceUnit] = useState(item.priceUnit || 'perPerson')
  const [quantity, setQuantity] = useState(item.quantity?.toString() || '')
  const [showDetails, setShowDetails] = useState(
    !!(item.startTime || item.notes || item.from || item.price),
  )

  const handleSave = () => {
    if (!name.trim()) return
    updateItem(itineraryId, dayId, item.id, {
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
    })
    onDone()
  }

  return (
    <div
      className="p-2.5 rounded-lg border ml-2"
      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}
    >
      {/* Type + Name row */}
      <div className="flex gap-1.5 items-center mb-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-1.5 py-1 rounded text-xs border outline-none shrink-0"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          {Object.entries(ITEM_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="名称"
          autoFocus
          className="flex-1 px-2 py-1 rounded text-sm border outline-none"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Expand/collapse details */}
      {!showDetails && (
        <button
          onClick={() => setShowDetails(true)}
          className="text-xs underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          + 时间/备注/交通信息
        </button>
      )}

      {showDetails && (
        <div className="flex flex-col gap-1.5">
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

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSave}
          className="flex-1 px-2 py-1 rounded text-xs font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          保存
        </button>
        <button
          onClick={onDone}
          className="px-2 py-1 rounded text-xs"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          取消
        </button>
      </div>
    </div>
  )
}

// Look up English name for an attraction
function getAttractionNameEn(itemName) {
  if (typeof window === 'undefined') return ''
  const entities = getAllEntities()
  const match = entities.find((e) => e.type === 'attraction' && e.name === itemName)
  return match?.nameEn || ''
}

// ---- Item Row ----
function ItemRow({ item, dayId, itineraryId, items, onRefresh, isFirst, isLast }) {
  const [editing, setEditing] = useState(false)
  const info = ITEM_TYPES[item.type] || ITEM_TYPES.other
  const isTransport = item.type === 'transport'

  if (editing) {
    return (
      <ItemEdit
        item={item}
        dayId={dayId}
        itineraryId={itineraryId}
        onDone={() => { setEditing(false); onRefresh() }}
      />
    )
  }

  const handleMoveUp = () => {
    const idx = items.findIndex((i) => i.id === item.id)
    if (idx <= 0) return
    const newIds = items.map((i) => i.id)
    ;[newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]]
    reorderItems(itineraryId, dayId, newIds)
    onRefresh()
  }

  const handleMoveDown = () => {
    const idx = items.findIndex((i) => i.id === item.id)
    if (idx >= items.length - 1) return
    const newIds = items.map((i) => i.id)
    ;[newIds[idx + 1], newIds[idx]] = [newIds[idx], newIds[idx + 1]]
    reorderItems(itineraryId, dayId, newIds)
    onRefresh()
  }

  return (
    <div
      className="flex items-start gap-1.5 px-1.5 py-1.5 rounded group hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
      onClick={() => setEditing(true)}
      title="点击编辑"
    >
      {/* Reorder arrows */}
      <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ marginTop: 1 }}>
        <button
          onClick={(e) => { e.stopPropagation(); handleMoveUp() }}
          disabled={isFirst}
          className="w-4 h-3 flex items-center justify-center text-xs leading-none disabled:opacity-20 hover:text-[var(--accent)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          ▲
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleMoveDown() }}
          disabled={isLast}
          className="w-4 h-3 flex items-center justify-center text-xs leading-none disabled:opacity-20 hover:text-[var(--accent)]"
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
      <button
        onClick={(e) => {
          e.stopPropagation()
          removeItem(itineraryId, dayId, item.id)
          onRefresh()
        }}
        className="w-4 h-4 rounded flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-red-500"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ×
      </button>
    </div>
  )
}

// ---- Compact Add Item Form ----
function CompactAddForm({ dayId, itineraryId, onDone }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('attraction')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [mode, setMode] = useState('bus')
  const [notes, setNotes] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [entitySearch, setEntitySearch] = useState('')
  const [entityResults, setEntityResults] = useState([])
  const [showEntityPicker, setShowEntityPicker] = useState(false)
  const [price, setPrice] = useState('')
  const [priceUnit, setPriceUnit] = useState('perPerson')
  const [quantity, setQuantity] = useState('')
  const inputRef = useRef(null)

  const doEntitySearch = (q) => {
    setEntitySearch(q)
    if (q.trim().length < 1) {
      setEntityResults([])
      return
    }
    const types = type === 'attraction' ? ['attraction'] : type === 'hotel' ? ['hotel'] : type === 'meal' ? ['restaurant'] : []
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
    addItem(itineraryId, dayId, {
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
    })
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
          placeholder={`添加${ITEM_TYPES[type].label}...`}
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
          添加
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

// ---- Free/Paid helpers ----
function isFreeItem(item) {
  if (item.costCategory === 'free') return true
  if (item.costCategory === 'paid') return false
  // 旧数据没有 costCategory：通过价格推断
  return !item.price || item.price === 0
}

// ---- Main DayDetail Component ----
export default function DayDetail({ itinerary, cities: _cities, onItineraryChange, onDayHover }) {
  const [activeDayId, setActiveDayId] = useState(null)
  const [showAddDay, setShowAddDay] = useState(false)
  const [addDayCity, setAddDayCity] = useState('')
  const [addingItemTo, setAddingItemTo] = useState(null)
  const [editingCityFor, setEditingCityFor] = useState(null)
  const [hideFree, setHideFree] = useState(true)
  const [expandAll, setExpandAll] = useState(false)
  const [tableView, setTableView] = useState(false)

  const allCities = typeof window !== 'undefined' ? getAllCitiesWithCoords() : []

  const refresh = () => {
    const raw = localStorage.getItem('euro-itineraries')
    if (raw) {
      const data = JSON.parse(raw)
      const fresh = data.itineraries?.find((t) => t.id === itinerary.id)
      if (fresh) onItineraryChange(fresh)
    }
  }

  const handleAddDay = () => {
    if (!addDayCity) return
    const city = allCities.find((c) => c.id === addDayCity)
    addDay(itinerary.id, addDayCity, city ? city.name : addDayCity)
    setAddDayCity('')
    setShowAddDay(false)
    refresh()
  }

  const handleRemoveDay = (dayId) => {
    removeDay(itinerary.id, dayId)
    if (activeDayId === dayId) setActiveDayId(null)
    refresh()
  }

  const handleMoveDayUp = (dayId) => {
    const idx = itinerary.days.findIndex((d) => d.id === dayId)
    if (idx <= 0) return
    const newIds = itinerary.days.map((d) => d.id)
    ;[newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]]
    reorderDays(itinerary.id, newIds)
    refresh()
  }

  const handleMoveDayDown = (dayId) => {
    const idx = itinerary.days.findIndex((d) => d.id === dayId)
    if (idx >= itinerary.days.length - 1) return
    const newIds = itinerary.days.map((d) => d.id)
    ;[newIds[idx + 1], newIds[idx]] = [newIds[idx], newIds[idx + 1]]
    reorderDays(itinerary.id, newIds)
    refresh()
  }

  const handleChangeCity = (dayId, newCityId) => {
    const city = allCities.find((c) => c.id === newCityId)
    if (city) {
      updateDayCity(itinerary.id, dayId, newCityId, city.name)
      refresh()
    }
    setEditingCityFor(null)
    setCitySearch('')
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

  return (
    <div className="p-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setTableView(false)}
              className="px-2 py-0.5 text-xs font-medium transition-all"
              style={{
                background: !tableView ? 'var(--accent)' : 'transparent',
                color: !tableView ? '#fff' : 'var(--text-secondary)',
              }}
            >
              📋 卡片
            </button>
            <button
              onClick={() => setTableView(true)}
              className="px-2 py-0.5 text-xs font-medium transition-all"
              style={{
                background: tableView ? 'var(--accent)' : 'transparent',
                color: tableView ? '#fff' : 'var(--text-secondary)',
              }}
            >
              📊 清单
            </button>
          </div>
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
            <span>{hideFree ? '仅显示收费' : '显示全部'}</span>
          </button>
          {!tableView && (
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all hover:bg-[var(--bg-surface)]"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <span>{expandAll ? '⇱' : '⇲'}</span>
              <span>{expandAll ? '全部收起' : '全部展开'}</span>
            </button>
          )}
        </div>
        {hideFree && (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            收费 {totalPaid} 项 · 隐藏 {totalFree} 项免费
          </span>
        )}
      </div>

      {tableView ? (
        <QUOSList itinerary={itinerary} onItineraryChange={onItineraryChange} />
      ) : (
        <>
          {/* Day list */}
          <div className="flex flex-col gap-1.5">
        {itinerary.days.map((day, dayIdx) => (
          <div key={day.id}>
            {/* Day header */}
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all group"
              style={{
                background: activeDayId === day.id ? 'var(--accent-subtle)' : 'transparent',
              }}
              onMouseEnter={() => onDayHover?.(day.id)}
              onMouseLeave={() => onDayHover?.(null)}
            >
              {/* Reorder arrows */}
              <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveDayUp(day.id) }}
                  disabled={dayIdx === 0}
                  className="w-4 h-3 flex items-center justify-center text-xs leading-none disabled:opacity-20 hover:text-[var(--accent)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ▲
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveDayDown(day.id) }}
                  disabled={dayIdx === itinerary.days.length - 1}
                  className="w-4 h-3 flex items-center justify-center text-xs leading-none disabled:opacity-20 hover:text-[var(--accent)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ▼
                </button>
              </div>

              {/* Day number */}
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {day.dayNumber}
              </span>

              {/* City selector */}
              {editingCityFor === day.id ? (
                <select
                  value={day.cityId || ''}
                  onChange={(e) => {
                    if (e.target.value) handleChangeCity(day.id, e.target.value)
                  }}
                  onBlur={() => setEditingCityFor(null)}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingCityFor(day.id)
                  }}
                  className="flex-1 text-left text-sm font-semibold hover:underline truncate cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                  title="点击修改城市"
                >
                  {day.cityName || '选择城市'}
                </button>
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

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandAll(false)
                  setActiveDayId(activeDayId === day.id ? null : day.id)
                }}
                className="text-xs px-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {(expandAll || activeDayId === day.id) ? '收起' : '展开'}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveDay(day.id) }}
                className="w-4 h-4 rounded flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                style={{ color: 'var(--text-tertiary)' }}
              >
                ×
              </button>
            </div>

            {/* Day items */}
            {(expandAll || activeDayId === day.id) && (() => {
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
                    还没有项目，在下方添加
                  </p>
                )}
                {day.items.length > 0 && visibleItems.length === 0 && (
                  <p className="text-xs py-3 px-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    本日仅有免费项目（交通接送、导游陪同等）
                  </p>
                )}
                {visibleItems.map((item, itemIdx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    dayId={day.id}
                    itineraryId={itinerary.id}
                    items={day.items}
                    onRefresh={refresh}
                    isFirst={itemIdx === 0}
                    isLast={itemIdx === day.items.length - 1}
                  />
                ))}
                {hiddenFreeCount > 0 && hideFree && (
                  <p className="text-xs py-1.5 px-1.5" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                    已隐藏 {hiddenFreeCount} 个免费项目
                  </p>
                )}

                {addingItemTo === day.id ? (
                  <div className="mt-1.5">
                    <CompactAddForm
                      dayId={day.id}
                      itineraryId={itinerary.id}
                      onDone={() => { setAddingItemTo(null); refresh() }}
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
      )}
    </div>
  )
}
