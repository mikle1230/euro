'use client'

import { useState, useRef } from 'react'
import {
  addItem,
  removeItem,
  updateItem,
  reorderItems,
} from '@/lib/itinerary-store'
import { searchEntities as searchEntityStore } from '@/lib/entity-store'
import { isFreeItem } from '@/lib/quos-mapping'
import { getItemNameEn } from '@/lib/item-name'
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

// ---- Item Row ----
export function ItemRow({ item, dayId, itineraryId, items, isFirst, isLast }) {
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
              const nameEn = getItemNameEn(item)
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
export function ItemForm({ item, dayId, itineraryId, onDone }) {
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
          style={{ background: 'var(--accent-strong)', color: '#fff' }}
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
                      className="flex items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface)] transition-colors"
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
