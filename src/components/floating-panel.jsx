'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ItineraryList from './panel-views/itinerary-list'
import DayDetail from './panel-views/day-detail'
import Database from './panel-views/database'
import Overview from './panel-views/overview'
import EntityManager from './panel-views/entity-manager'

const ICONS = [
  { key: 'itineraries', icon: '📋', label: '行程列表' },
  { key: 'days', icon: '📅', label: '天数详情' },
  { key: 'database', icon: '🔍', label: '数据库' },
  { key: 'overview', icon: '📊', label: '总览' },
  { key: 'entities', icon: '📦', label: '实体' },
]

const MIN_W = 340
const MIN_H = 360
const MAX_W = 700
const MAX_H_RATIO = 0.9

const DEFAULT_W = 420
const DEFAULT_H = 520

export default function FloatingPanel({
  cities,
  activeItinerary,
  onItineraryChange,
  onCityClick,
  onAddToItinerary,
  onDayHover,
  onSearchHighlight,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [view, setView] = useState('itineraries')
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    return { x: window.innerWidth - DEFAULT_W - 16, y: window.innerHeight - DEFAULT_H - 80 }
  })
  const [iconPos, setIconPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    return { x: window.innerWidth - 56, y: window.innerHeight / 2 - 80 }
  })

  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const panelRef = useRef(null)

  // Drag logic
  const startDrag = useCallback((e, target) => {
    e.preventDefault()
    const rect = panelRef.current?.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const origX = target === 'panel' ? pos.x : iconPos.x
    const origY = target === 'panel' ? pos.y : iconPos.y

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const newX = Math.max(0, Math.min(window.innerWidth - 48, origX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 48, origY + dy))
      if (target === 'panel') setPos({ x: newX, y: newY })
      else setIconPos({ x: newX, y: newY })
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [pos, iconPos])

  const startResize = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const origW = size.w
    const origH = size.h

    const onMove = (ev) => {
      const dw = ev.clientX - startX
      const dh = ev.clientY - startY
      setSize({
        w: Math.max(MIN_W, Math.min(MAX_W, origW + dw)),
        h: Math.max(MIN_H, Math.min(window.innerHeight * MAX_H_RATIO, origH + dh)),
      })
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [size])

  const openView = (key) => {
    setView(key)
    setCollapsed(false)
  }

  // When switching to days/overview without active itinerary, redirect to list
  useEffect(() => {
    if (!activeItinerary && (view === 'days' || view === 'overview')) {
      setView('itineraries')
    }
  }, [activeItinerary, view])

  // Ensure panel is on screen after resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: Math.min(p.x, window.innerWidth - 48),
        y: Math.min(p.y, window.innerHeight - 48),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const titleMap = {
    itineraries: '行程列表',
    days: activeItinerary ? activeItinerary.name : '天数详情',
    database: '数据库',
    overview: '行程总览',
    entities: '实体管理',
  }

  // ---- Collapsed state ----
  if (collapsed) {
    return (
      <div
        ref={panelRef}
        className="fixed z-[1000] flex flex-col gap-1 p-1.5 rounded-xl shadow-lg border backdrop-blur-sm"
        style={{
          left: iconPos.x,
          top: iconPos.y,
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onPointerDown={(e) => startDrag(e, 'icons')}
      >
        {ICONS.map((item) => (
          <button
            key={item.key}
            onClick={() => openView(item.key)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110"
            style={{ background: 'var(--bg-surface)' }}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
    )
  }

  // ---- Expanded state ----
  return (
    <div
      ref={panelRef}
      className="fixed z-[1000] rounded-xl shadow-2xl border flex flex-col overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
        style={{
          borderColor: 'var(--border-color)',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onPointerDown={(e) => startDrag(e, 'panel')}
      >
        <div className="flex items-center gap-2">
          {activeItinerary && view !== 'itineraries' && view !== 'database' && (
            <button
              onClick={(e) => { e.stopPropagation(); setView('itineraries') }}
              className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-[var(--bg-surface)]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ←
            </button>
          )}
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {titleMap[view]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* View tabs */}
          <div className="flex items-center gap-0.5 mr-1">
            {ICONS.map((item) => (
              <button
                key={item.key}
                onClick={(e) => { e.stopPropagation(); openView(item.key) }}
                className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all ${
                  view === item.key ? '' : 'opacity-40 hover:opacity-70'
                }`}
                style={view === item.key ? { background: 'var(--bg-surface)' } : {}}
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(true) }}
            className="w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-[var(--bg-surface)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            _
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'itineraries' && (
          <ItineraryList
            onItineraryChange={onItineraryChange}
            onNavigate={(itinerary) => {
              onItineraryChange(itinerary)
              setView('days')
            }}
          />
        )}
        {view === 'days' && activeItinerary && (
          <DayDetail
            itinerary={activeItinerary}
            cities={cities}
            onItineraryChange={onItineraryChange}
            onDayHover={onDayHover}
          />
        )}
        {view === 'database' && (
          <Database
            cities={cities}
            activeItinerary={activeItinerary}
            onAddToItinerary={onAddToItinerary}
            onSearchHighlight={onSearchHighlight}
          />
        )}
        {view === 'overview' && activeItinerary && (
          <Overview itinerary={activeItinerary} cities={cities} />
        )}
        {view === 'entities' && (
          <EntityManager />
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize"
        style={{ zIndex: 10 }}
        onPointerDown={startResize}
      >
        <svg
          width="12" height="12" viewBox="0 0 12 12"
          style={{ position: 'absolute', bottom: 4, right: 4, opacity: 0.3 }}
        >
          <line x1="0" y1="12" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" />
          <line x1="4" y1="12" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="12" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  )
}
