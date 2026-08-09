'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  getAllEntities,
  searchEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  getEntityStats,
} from '@/lib/entity-store'

const ENTITY_TYPES = [
  { key: 'attraction', icon: '🏛️', label: '景点' },
  { key: 'hotel', icon: '🏨', label: '酒店' },
  { key: 'restaurant', icon: '🍽️', label: '餐厅' },
  { key: 'transport', icon: '🚌', label: '交通' },
  { key: 'guide', icon: '🧑‍💼', label: '导游' },
]

const SUBTYPE_OPTIONS = {
  attraction: [
    { key: 'landmark', label: '地标' },
    { key: 'museum', label: '博物馆' },
    { key: 'nature', label: '自然' },
  ],
  hotel: [
    { key: 'luxury', label: '豪华' },
    { key: 'business', label: '商务' },
    { key: 'boutique', label: '精品' },
    { key: 'budget', label: '经济' },
  ],
  restaurant: [
    { key: 'chinese', label: '中餐' },
    { key: 'western', label: '西餐' },
    { key: 'local', label: '本地' },
    { key: 'fast', label: '快餐' },
  ],
}

const EMPTY_FORM = {
  name: '',
  type: 'attraction',
  subtype: '',
  cityId: '',
  cityName: '',
  countryId: '',
  countryName: '',
  address: '',
  phone: '',
  website: '',
  notes: '',
  tips: '',
  openingHours: '',
  duration: '',
  starRating: '',
  cuisine: '',
  priceRange: '',
  mode: '',
  capacity: '',
  languages: '',
  contactInfo: '',
  lat: '',
  lng: '',
}

export default function EntityManager() {
  const [entities, setEntities] = useState(() => getAllEntities())
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)

  const refresh = () => setEntities(getAllEntities())

  const stats = useMemo(() => getEntityStats(), [entities])

  const filtered = useMemo(() => {
    const types = filterType === 'all' ? [] : [filterType]
    if (!search && types.length === 0) return entities
    return searchEntities(search, types)
  }, [entities, search, filterType])

  // Update editing form when entities change
  useEffect(() => {
    if (editingId) {
      const updated = entities.find((e) => e.id === editingId)
      if (updated) setForm(entityToForm(updated))
    }
  }, [entities, editingId])

  function entityToForm(e) {
    return {
      name: e.name || '',
      type: e.type || 'attraction',
      subtype: e.subtype || '',
      cityId: e.cityId || '',
      cityName: e.cityName || '',
      countryId: e.countryId || '',
      countryName: e.countryName || '',
      address: e.address || '',
      phone: e.phone || '',
      website: e.website || '',
      notes: e.notes || '',
      tips: e.tips || '',
      openingHours: e.openingHours || '',
      duration: e.duration?.toString() || '',
      starRating: e.starRating?.toString() || '',
      cuisine: e.cuisine || '',
      priceRange: e.priceRange || '',
      mode: e.mode || '',
      capacity: e.capacity?.toString() || '',
      languages: Array.isArray(e.languages) ? e.languages.join(', ') : (e.languages || ''),
      contactInfo: e.contactInfo || '',
      lat: e.lat?.toString() || '',
      lng: e.lng?.toString() || '',
    }
  }

  function handleCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function handleEdit(e) {
    setEditingId(e.id)
    setForm(entityToForm(e))
    setShowForm(true)
  }

  function handleDelete(id) {
    if (!confirm('确定删除这个实体？')) return
    deleteEntity(id)
    if (editingId === id) {
      setEditingId(null)
      setShowForm(false)
    }
    refresh()
  }

  function handleSave() {
    if (!form.name.trim()) return

    const data = {
      ...form,
      name: form.name.trim(),
      duration: form.duration ? parseInt(form.duration, 10) : null,
      starRating: form.starRating ? parseInt(form.starRating, 10) : 0,
      capacity: form.capacity ? parseInt(form.capacity, 10) : 0,
      languages: form.languages ? form.languages.split(',').map((s) => s.trim()).filter(Boolean) : [],
      ticketTypes: [],
      roomTypes: [],
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
    }

    if (editingId) {
      updateEntity(editingId, data)
    } else {
      createEntity(data)
    }
    setShowForm(false)
    setEditingId(null)
    refresh()
  }

  function updateField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Reset subtype when type changes
      if (field === 'type') {
        next.subtype = ''
      }
      return next
    })
  }

  const subtypes = SUBTYPE_OPTIONS[form.type] || []

  const inputStyle = {
    background: 'var(--bg-card)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="p-3">
      {/* Search + Add */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索实体..."
          className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
          style={inputStyle}
        />
        <button
          onClick={handleCreate}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + 新增
        </button>
      </div>

      {/* Type filter + stats */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {[{ key: 'all', icon: '📋', label: '全部' }, ...ENTITY_TYPES].map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setFilterType(key)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all"
            style={{
              background: filterType === key ? 'var(--accent)' : 'var(--bg-surface)',
              color: filterType === key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {icon} {label}
            {stats[key] > 0 && <span style={{ opacity: 0.6 }}>{stats[key]}</span>}
          </button>
        ))}
      </div>

      {/* Entity list */}
      <div className="flex flex-col gap-1">
        {filtered.map((e) => {
          const typeCfg = ENTITY_TYPES.find((t) => t.key === e.type) || { icon: '📌', label: e.type }
          return (
            <div
              key={e.id}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer group"
              onClick={() => handleEdit(e)}
            >
              <span className="text-lg shrink-0">{typeCfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {e.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {typeCfg.label}
                  {e.subtype ? ` · ${e.subtype}` : ''}
                  {e.cityName ? ` · ${e.cityName}` : ''}
                  {e.countryName ? `, ${e.countryName}` : ''}
                </p>
              </div>
              <button
                onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}
                className="w-6 h-6 rounded flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
              >
                🗑️
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-tertiary)' }}>
            还没有实体，点击"+ 新增"创建
          </p>
        )}
      </div>

      {/* Edit / Create form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-[2000] flex items-start justify-center pt-12"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => { setShowForm(false); setEditingId(null) }}
        >
          <div
            className="rounded-xl shadow-2xl border w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Form header */}
            <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10" style={{
              borderColor: 'var(--border-color)',
              background: 'var(--bg-card)',
            }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? '编辑实体' : '新建实体'}
              </span>
              <button
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-[var(--bg-surface)]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Name */}
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>名称 *</label>
                <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
              </div>

              {/* Type + Subtype */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>类型</label>
                  <select value={form.type} onChange={(e) => updateField('type', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle}>
                    {ENTITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>子类型</label>
                  {subtypes.length > 0 ? (
                    <select value={form.subtype} onChange={(e) => updateField('subtype', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle}>
                      <option value="">—</option>
                      {subtypes.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={form.subtype} onChange={(e) => updateField('subtype', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                  )}
                </div>
              </div>

              {/* City + Country */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>城市</label>
                  <input type="text" value={form.cityName} onChange={(e) => updateField('cityName', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>国家</label>
                  <input type="text" value={form.countryName} onChange={(e) => updateField('countryName', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>地址</label>
                  <input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>电话</label>
                  <input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>网址</label>
                <input type="text" value={form.website} onChange={(e) => updateField('website', e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
              </div>

              {/* Type-specific fields */}
              {form.type === 'attraction' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>开放时间</label>
                    <input type="text" value={form.openingHours} onChange={(e) => updateField('openingHours', e.target.value)}
                      placeholder="09:00-17:00" className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>游览时长(分钟)</label>
                    <input type="number" value={form.duration} onChange={(e) => updateField('duration', e.target.value)}
                      placeholder="90" className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                  </div>
                </div>
              )}

              {form.type === 'hotel' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>星级</label>
                    <input type="number" value={form.starRating} onChange={(e) => updateField('starRating', e.target.value)}
                      min="1" max="5" placeholder="4" className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                  </div>
                </div>
              )}

              {form.type === 'restaurant' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>菜系</label>
                    <input type="text" value={form.cuisine} onChange={(e) => updateField('cuisine', e.target.value)}
                      placeholder="法餐、中餐..." className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>价格区间</label>
                    <select value={form.priceRange} onChange={(e) => updateField('priceRange', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle}>
                      <option value="">—</option>
                      <option value="$">$ 经济</option>
                      <option value="$$">$$ 中等</option>
                      <option value="$$$">$$$ 高档</option>
                    </select>
                  </div>
                </div>
              )}

              {form.type === 'transport' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>交通方式</label>
                    <select value={form.mode} onChange={(e) => updateField('mode', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle}>
                      <option value="">—</option>
                      <option value="bus">大巴</option>
                      <option value="train">火车</option>
                      <option value="flight">飞机</option>
                      <option value="ferry">渡轮</option>
                      <option value="private">包车</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>载客量</label>
                    <input type="number" value={form.capacity} onChange={(e) => updateField('capacity', e.target.value)}
                      placeholder="50" className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                  </div>
                </div>
              )}

              {form.type === 'guide' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>语言（逗号分隔）</label>
                    <input type="text" value={form.languages} onChange={(e) => updateField('languages', e.target.value)}
                      placeholder="中文, 英文, 法语" className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>联系方式</label>
                    <input type="text" value={form.contactInfo} onChange={(e) => updateField('contactInfo', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                  </div>
                </div>
              )}

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>纬度</label>
                  <input type="number" step="any" value={form.lat} onChange={(e) => updateField('lat', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>经度</label>
                  <input type="number" step="any" value={form.lng} onChange={(e) => updateField('lng', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
                </div>
              </div>

              {/* Notes + Tips */}
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>描述</label>
                <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)}
                  rows={2} className="w-full px-2 py-2 rounded-lg text-sm border outline-none resize-none" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>贴士</label>
                <textarea value={form.tips} onChange={(e) => updateField('tips', e.target.value)}
                  rows={1} className="w-full px-2 py-2 rounded-lg text-sm border outline-none resize-none" style={inputStyle} />
              </div>

              {/* Save */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowForm(false); setEditingId(null) }}
                  className="flex-1 px-3 py-2 rounded-lg text-sm border transition-all"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {editingId ? '保存' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
