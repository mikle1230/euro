'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ItineraryList from './panel-views/itinerary-list'
import DayDetail from './panel-views/day-detail'
import QUOSList from './panel-views/quos-list'
import ItinerarySettings from './itinerary-settings'

const ICONS = [
  { key: 'itineraries', icon: '🗂️', label: '行程列表' },
  { key: 'quos', icon: '📋', label: '收费清单' },
  { key: 'edit', icon: '✏️', label: '编辑行程' },
]

const MIN_W = 360
const MAX_W = 700
const HEADER_H = 56

export default function FloatingPanel({
  isMobile,
  cities,
  activeItinerary,
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
  const [showSettings, setShowSettings] = useState(false)
  const panelRef = useRef(null)
  const prevItinIdRef = useRef(null)

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

  // 无当前行程时，收费清单/编辑视图重定向到列表
  useEffect(() => {
    if (!activeItinerary && (view === 'quos' || view === 'edit')) {
      setView('itineraries')
    }
  }, [activeItinerary, view])

  // 导入/切换行程后直接落到「收费清单」；首挂载不触发
  useEffect(() => {
    const currentId = activeItinerary?.id || null
    if (prevItinIdRef.current !== null && currentId && currentId !== prevItinIdRef.current) {
      setView('quos')
    }
    prevItinIdRef.current = currentId
  }, [activeItinerary])

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
    quos: '收费清单',
    edit: activeItinerary ? activeItinerary.name : '编辑行程',
  }

  // ---- Collapsed state: just an arrow on the right edge ----
  if (collapsed && !isMobile) {
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
      className={`fixed z-[1000] flex flex-col shadow-2xl ${isMobile ? '' : 'border-l'}`}
      style={isMobile ? {
        left: 0,
        right: 0,
        top: HEADER_H,
        bottom: 0,
        width: '100%',
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      } : {
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
      {!isMobile && (
        <div
          className="absolute top-0 bottom-0 w-3 cursor-col-resize z-10 flex items-center justify-center transition-colors hover:bg-[var(--accent)] hover:opacity-20"
          style={{ left: 0 }}
          onPointerDown={startResize}
        >
          <div className="w-[2px] h-12 rounded-full" style={{ background: 'var(--border-color)' }} />
        </div>
      )}

      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          {/* Collapse button */}
          {!isMobile && (
            <button
              onClick={() => onCollapsedChange(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors hover:bg-[var(--bg-surface)]"
              style={{ color: 'var(--text-tertiary)' }}
              title="收起面板"
            >
              ▶
            </button>
          )}
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
            {ICONS.filter((item) => !isMobile || item.key !== 'edit').map((item) => (
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
          {activeItinerary && (
            <button
              onClick={() => setShowSettings(true)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-colors hover:bg-[var(--bg-surface)]"
              style={{ color: 'var(--text-tertiary)' }}
              title="行程设置"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'itineraries' && (
          <ItineraryList
            activeItinerary={activeItinerary}
            onNavigate={() => setView('quos')}
          />
        )}
        {view === 'quos' && activeItinerary && (
          <QUOSList itinerary={activeItinerary} />
        )}
        {view === 'edit' && activeItinerary && (
          <DayDetail
            itinerary={activeItinerary}
            cities={cities}
            onDayHover={onDayHover}
          />
        )}
      </div>

      {showSettings && activeItinerary && (
        <ItinerarySettings
          itinerary={activeItinerary}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
