'use client'

import { useState } from 'react'
import {
  useItineraries,
  createItinerary,
  deleteItinerary,
  renameItinerary,
  setActiveItinerary,
  getAllTemplates,
  createFromTemplate,
  saveAsTemplate,
} from '@/lib/itinerary-store'
import ConfirmDialog from '@/components/confirm-dialog'

export default function ItineraryList({ activeItinerary, onNavigate }) {
  const { itineraries } = useItineraries()
  const [templates, setTemplates] = useState(() => getAllTemplates())
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const formatTime = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${min}`
  }

  const handleCreate = () => {
    const name = newName.trim() || '未命名行程'
    createItinerary(name)
    setNewName('')
    onNavigate()
  }

  const handleDelete = (id) => {
    deleteItinerary(id)
  }

  const handleSelect = (it) => {
    setActiveItinerary(it.id)
    onNavigate()
  }

  const handleRename = (id) => {
    if (editName.trim()) {
      renameItinerary(id, editName.trim())
      setEditingId(null)
    }
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
          📄 从模板创建 {showTemplates ? '▼' : '▶'}
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
                    if (it) onNavigate()
                  }}
                >
                  <span className="text-base shrink-0">📄</span>
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
          {itineraries.map((it) => {
            const isActive = activeItinerary?.id === it.id
            return (
            <div key={it.id}>
              <div
                className="group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all cursor-pointer hover:bg-[var(--bg-surface)]"
                style={{
                  background: isActive ? 'var(--accent-subtle, rgba(20,184,166,0.08))' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                }}
                onClick={() => handleSelect(it)}
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
                    <span className="text-base shrink-0">🗂️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {it.tourCode ? (
                          <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>{it.tourCode} </span>
                        ) : it.serialNumber ? (
                          <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>#{it.serialNumber} </span>
                        ) : null}
                        {it.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {it.days.length} 天
                        {it.startDate ? ` · ${it.startDate}` : ''}
                        {it.startDate && it.endDate ? ` → ${it.endDate}` : ''}
                        {it.groupSize > 0 ? ` · ${it.groupSize}人` : ''}
                        {it.createdAt ? ` · ${formatTime(it.createdAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          saveAsTemplate(it.id)
                          setTemplates(getAllTemplates())
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs hover:bg-[var(--bg-elevated)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="保存为模板"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(it.id)
                          setEditName(it.name)
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs hover:bg-[var(--bg-elevated)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="重命名"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(it)
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs hover:bg-[var(--bg-elevated)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
            )
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="删除行程"
          message={`确定删除「${deleteTarget.name}」？此操作不可恢复。`}
          onConfirm={() => {
            handleDelete(deleteTarget.id)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
