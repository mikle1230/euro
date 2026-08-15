'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ItineraryList from './panel-views/itinerary-list'
import QUOSList from './panel-views/quos-list'

const ICONS = [
  { key: 'itineraries', icon: '🗂️', label: '行程列表' },
  { key: 'quos', icon: '📋', label: '行程详情' },
]

const MIN_W = 360
const MAX_PCT = 85 // 面板最大宽度 = 视口宽度的 85%
const HEADER_H = 56

function maxPanelWidth() {
  if (typeof window === 'undefined') return MIN_W
  return Math.max(MIN_W, Math.floor((window.innerWidth * MAX_PCT) / 100))
}

export default function FloatingPanel({
  isMobile,
  activeItinerary,
  collapsed,
  onCollapsedChange,
  panelWidth,
  onWidthChange,
}) {
  const [view, setView] = useState('itineraries')
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef(null)
  const prevItinIdRef = useRef(null)

  // Left-edge resize logic
  const startResize = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
    const startX = e.clientX
    const origW = panelWidth

    const onMove = (ev) => {
      // Panel is on the right, so dragging left edge changes width inversely
      const dw = startX - ev.clientX
      onWidthChange(Math.max(MIN_W, Math.min(maxPanelWidth(), origW + dw)))
    }
    const onUp = () => {
      setDragging(false)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [panelWidth])

  // 无当前行程时，行程详情重定向到列表
  useEffect(() => {
    if (!activeItinerary && view === 'quos') {
      setView('itineraries')
    }
  }, [activeItinerary, view])

  // 导入/切换行程后直接落到「行程详情」；首挂载不触发
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
      onWidthChange((w) => Math.max(MIN_W, Math.min(maxPanelWidth(), w)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ---- Collapsed state: just an arrow on the right edge ----
  if (collapsed && !isMobile) {
    return (
      <div
        className="fixed z-[1000] flex items-center justify-center rounded-l-xl border shadow-lg cursor-pointer transition-colors hover:bg-[var(--bg-surface)]"
        style={{
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 30,
          height: 148,
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          borderRightWidth: 0,
        }}
        onClick={() => onCollapsedChange(false)}
        title="展开面板"
        aria-label="展开面板"
      >
        <span className="text-base" style={{ color: 'var(--text-secondary)' }}>◀</span>
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
        maxWidth: `${MAX_PCT}vw`,
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        // 拖拽中禁用过渡，避免每帧宽度动画卡顿；松手后才恢复动画
        transition: dragging ? 'none' : 'width 200ms ease',
      }}
    >
      {/* Left-edge resize handle + 收起按钮 */}
      {!isMobile && (
        <>
          <div
            className="absolute top-0 bottom-0 w-3 cursor-col-resize z-10 flex items-center justify-center transition-colors hover:bg-[var(--accent)] hover:opacity-20"
            style={{ left: 0 }}
            onPointerDown={startResize}
          >
            <div className="w-[2px] h-12 rounded-full" style={{ background: 'var(--border-color)' }} />
          </div>
          {/* 收起按钮：左侧边中部，形状/大小与收起态一致（细长拉条），
              贴在面板左缘外侧，不压边线与拖拽手柄 */}
          <button
            onClick={() => onCollapsedChange(true)}
            className="absolute z-20 flex items-center justify-center rounded-l-xl border shadow-lg cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
            style={{
              left: -30,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 30,
              height: 148,
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              borderRightWidth: 0,
            }}
            title="收起面板"
            aria-label="收起面板"
          >
            <span className="text-base" style={{ color: 'var(--text-secondary)' }}>▶</span>
          </button>
        </>
      )}

      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          {activeItinerary && view !== 'itineraries' && (
            <button
              onClick={() => setView('itineraries')}
              className="w-9 h-8 rounded-lg border flex items-center justify-center text-base shrink-0 transition-colors hover:bg-[var(--bg-elevated)]"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-surface)',
              }}
              title="返回行程列表"
              aria-label="返回行程列表"
            >
              ←
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* 导航状态指示（非按钮，图标+文字表示当前位置，悬停显示提示） */}
          <div className="flex items-center gap-1 select-none">
            {['itineraries', 'quos'].map((key) => {
              const cfg = ICONS.find((i) => i.key === key)
              const active = view === key
              return (
                <span
                  key={key}
                  title={cfg.label}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                    active ? '' : 'opacity-40'
                  }`}
                  style={active
                    ? { background: 'var(--accent-strong)', color: '#fff' }
                    : { color: 'var(--text-tertiary)' }}
                >
                  <span className="text-sm">{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content —— 桌面端左侧留出拖拽手柄宽度（12px），内容与手柄挨着但不被盖住 */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? '' : 'pl-3'}`}>
        {view === 'itineraries' && (
          <ItineraryList
            activeItinerary={activeItinerary}
            onNavigate={() => setView('quos')}
          />
        )}
        {view === 'quos' && activeItinerary && (
          <QUOSList itinerary={activeItinerary} />
        )}
      </div>
    </div>
  )
}
