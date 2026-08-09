'use client'

import { useState } from 'react'
import {
  getAllItineraries,
  createItinerary,
  deleteItinerary,
  renameItinerary,
  setActiveItinerary,
  updateItineraryMeta,
  getAllTemplates,
  createFromTemplate,
  saveAsTemplate,
} from '@/lib/itinerary-store'

export default function ItineraryList({ onItineraryChange, onNavigate }) {
  const [itineraries, setItineraries] = useState(() => getAllItineraries())
  const [templates, setTemplates] = useState(() => getAllTemplates())
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const refresh = () => {
    setItineraries(getAllItineraries())
    setTemplates(getAllTemplates())
  }

  const handleCreate = () => {
    const name = newName.trim() || '未命名行程'
    const it = createItinerary(name)
    setNewName('')
    refresh()
    onItineraryChange(it)
    onNavigate(it)
  }

  const handleDelete = (id) => {
    deleteItinerary(id)
    refresh()
    onItineraryChange(getAllItineraries()[0] || null)
  }

  const handleSelect = (it) => {
    setActiveItinerary(it.id)
    onItineraryChange(it)
    onNavigate(it)
  }

  const handleRename = (id) => {
    if (editName.trim()) {
      renameItinerary(id, editName.trim())
      setEditingId(null)
      refresh()
      const it = getAllItineraries().find((t) => t.id === id)
      if (it) onItineraryChange(it)
    }
  }

  const handleMetaChange = (id, field, value) => {
    updateItineraryMeta(id, { [field]: value })
    refresh()
    const it = getAllItineraries().find((t) => t.id === id)
    if (it) onItineraryChange(it)
  }

  return (
    <div className="p-3">
      {/* New itinerary input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="新建行程名称..."
          className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleCreate}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + 新建
        </button>
      </div>

      {/* Templates section */}
      <div className="mb-3">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex items-center gap-1 text-xs font-medium w-full px-2 py-1 rounded transition-colors hover:bg-[var(--bg-surface)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          📋 从模板创建 {showTemplates ? '▼' : '▶'}
        </button>
        {showTemplates && (
          <div className="mt-1.5 flex flex-col gap-1">
            {templates.length === 0 ? (
              <p className="text-xs py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>
                还没有模板，在行程列表中点击"保存为模板"创建
              </p>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer group"
                  onClick={() => {
                    const it = createFromTemplate(tpl.id)
                    if (it) {
                      refresh()
                      onItineraryChange(it)
                      onNavigate(it)
                    }
                  }}
                >
                  <span className="text-base shrink-0">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {tpl.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {tpl.days.length} 天 · {tpl.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Itinerary list */}
      {itineraries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">🗺️</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            还没有行程，创建一个开始规划吧
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {itineraries.map((it) => (
            <div key={it.id}>
              <div
                className="group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all cursor-pointer hover:bg-[var(--bg-surface)]"
                style={{
                  background: expandedId === it.id ? 'var(--bg-surface)' : 'transparent',
                }}
                onClick={() => {
                  if (expandedId === it.id) {
                    handleSelect(it)
                  } else {
                    setExpandedId(it.id)
                  }
                }}
              >
                {editingId === it.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(it.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => handleRename(it.id)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded text-sm border outline-none"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                ) : (
                  <>
                    <span className="text-base shrink-0">📋</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {it.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {it.days.length} 天
                        {it.startDate ? ` · ${it.startDate}` : ''}
                        {it.startDate && it.endDate ? ` → ${it.endDate}` : ''}
                        {it.groupSize > 0 ? ` · ${it.groupSize}人` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          saveAsTemplate(it.id)
                          refresh()
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-[var(--bg-elevated)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="保存为模板"
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(it.id)
                          setEditName(it.name)
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-[var(--bg-elevated)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="重命名"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('确定删除这个行程？')) handleDelete(it.id)
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-red-50"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Expanded metadata form */}
              {expandedId === it.id && (
                <div
                  className="mx-3 mb-1 p-3 rounded-lg border"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                        开始日期
                      </label>
                      <input
                        type="date"
                        value={it.startDate || ''}
                        onChange={(e) => handleMetaChange(it.id, 'startDate', e.target.value)}
                        className="w-full px-2 py-1 rounded text-xs border outline-none"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                        结束日期
                      </label>
                      <input
                        type="date"
                        value={it.endDate || ''}
                        onChange={(e) => handleMetaChange(it.id, 'endDate', e.target.value)}
                        className="w-full px-2 py-1 rounded text-xs border outline-none"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                        团号
                      </label>
                      <input
                        type="text"
                        value={it.tourCode || ''}
                        onChange={(e) => handleMetaChange(it.id, 'tourCode', e.target.value)}
                        placeholder="如 TL2024-001"
                        className="w-full px-2 py-1 rounded text-xs border outline-none"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                        团人数
                      </label>
                      <input
                        type="number"
                        value={it.groupSize || ''}
                        onChange={(e) => handleMetaChange(it.id, 'groupSize', parseInt(e.target.value) || 0)}
                        placeholder="30"
                        min="0"
                        className="w-full px-2 py-1 rounded text-xs border outline-none"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs mb-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                      备注
                    </label>
                    <textarea
                      value={it.notes || ''}
                      onChange={(e) => handleMetaChange(it.id, 'notes', e.target.value)}
                      placeholder="内部备注..."
                      rows={2}
                      className="w-full px-2 py-1 rounded text-xs border outline-none resize-none"
                      style={{
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleSelect(it)}
                    className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    进入行程编辑
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
