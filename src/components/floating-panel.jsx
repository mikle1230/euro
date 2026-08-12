'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ItineraryList from './panel-views/itinerary-list'
import DayDetail from './panel-views/day-detail'

const ICONS = [
  { key: 'itineraries', icon: '📋', label: '行程列表' },
  { key: 'days', icon: '📅', label: '当前行程详情' },
]

const MIN_W = 360
const MAX_W = 700
const HEADER_H = 56

export default function FloatingPanel({
  cities,
  activeItinerary,
  onItineraryChange,
  onCityClick,
  onAddToItinerary,
  onDayHover,
  onSearchHighlight,
  collapsed,
  onCollapsedChange,
  panelWidth,
  onWidthChange,
}) {
  const [view, setView] = useState('itineraries')
  const panelRef = useRef(null)

  // Left-edge resize logic
  const startResize = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const origW = panelWidth

    const onMove = (ev) => {
      // Panel is on the right, so dragging left edge changes width inversely
      const dw = startX - ev.clientX
      onWidthChange(Math.max(MIN_W, Math.min(MAX_W, origW + dw)))
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [panelWidth])

  const openView = (key) => {
    setView(key)
    onCollapsedChange(false)
  }

  // When switching to days without active itinerary, redirect to list
  useEffect(() => {
    if (!activeItinerary && view === 'days') {
      setView('itineraries')
    }
  }, [activeItinerary, view])

  // Update panelWidth on window resize to stay within bounds
  useEffect(() => {
    const onResize = () => {
      onWidthChange((w) => Math.max(MIN_W, Math.min(MAX_W, w)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const titleMap = {
    itineraries: '行程列表',
    days: activeItinerary ? activeItinerary.name : '天数详情',
  }

  // ---- Collapsed state: just an arrow on the right edge ----
  if (collapsed) {
    return (
      <div
        className="fixed z-[1000] flex flex-col items-center justify-center gap-2 py-3 rounded-l-xl border shadow-lg cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
        style={{
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 36,
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
        onClick={() => onCollapsedChange(false)}
        title="展开面板"
      >
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>◀</span>
      </div>
    )
  }

  // ---- Expanded state: right-docked side panel ----
  return (
    <div
      ref={panelRef}
      className="fixed z-[1000] flex flex-col border-l shadow-2xl"
      style={{
        right: 0,
        top: HEADER_H,
        bottom: 0,
        width: panelWidth,
        minWidth: MIN_W,
        maxWidth: MAX_W,
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        transition: 'width 200ms ease',
      }}
    >
      {/* Left-edge resize handle */}
      <div
        className="absolute top-0 bottom-0 w-[6px] cursor-col-resize z-10 hover:bg-[var(--accent)] hover:opacity-20"
        style={{ left: 0 }}
        onPointerDown={startResize}
      />

      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          {/* Collapse button */}
          <button
            onClick={() => onCollapsedChange(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors hover:bg-[var(--bg-surface)]"
            style={{ color: 'var(--text-tertiary)' }}
            title="收起面板"
          >
            ▶
          </button>
          {activeItinerary && view !== 'itineraries' && (
            <button
              onClick={() => setView('itineraries')}
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
          <div className="flex items-center gap-1">
            {ICONS.map((item) => (
              <button
                key={item.key}
                onClick={() => openView(item.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  view === item.key ? '' : 'opacity-40 hover:opacity-70'
                }`}
                style={view === item.key ? { background: 'var(--bg-surface)' } : {}}
              >
                <span className="text-sm">{item.icon}</span>
                <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
              </button>
            ))}
          </div>
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
      </div>
    </div>
  )
}
