'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// 共享「即时搜索下拉」组件：输入时实时显示匹配结果。
// 城市库的 GlobalSearch（header 全局搜索）独立使用 portal 方案（会被面板遮挡），
// 本组件用于页面内搜索框（hotels / mice），下拉用绝对定位即可，无需 portal。
//
// props:
//   value, onChange        — 受控输入值
//   placeholder            — 输入框占位
//   results                — 匹配结果数组（已过滤，建议 ≤10 条）
//   renderItem(item, idx)  — 渲染单条结果，返回 JSX
//   onSelect(item)         — 点击/回车选中
//   getKey(item)           — 结果唯一 key
//   clearable              — 显示清空按钮（默认 true）
//   accentVar              — 聚焦边框色 CSS 变量名（默认 var(--accent)）
export default function InstantSearchDropdown({
  value,
  onChange,
  placeholder = '搜索…',
  results = [],
  renderItem,
  onSelect,
  getKey,
  clearable = true,
  accentVar = 'var(--accent)',
}) {
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)

  const showDropdown = open && value.trim() && results.length > 0

  const handleSelect = useCallback((item) => {
    onSelect(item)
    setOpen(false)
    setSelectedIdx(0)
  }, [onSelect])

  // 外部点击关闭（下拉本身在容器内，无需额外检查）
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // 页面滚动时收起（避免下拉悬空错位）；但下拉框**内部**滚动不关闭
  useEffect(() => {
    if (!open) return
    const onScroll = (e) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open])

  // 结果变化时重置高亮
  useEffect(() => { setSelectedIdx(0) }, [results])

  const handleKeyDown = useCallback(
    (e) => {
      if (!open || results.length === 0) {
        if (e.key === 'Escape') { setOpen(false) }
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIdx]) handleSelect(results[selectedIdx])
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
    [open, results, selectedIdx, handleSelect],
  )

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          🔍
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => { if (value.trim()) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm border outline-none focus-ring transition-colors"
          style={{
            background: 'var(--bg-card)',
            borderColor: open ? accentVar : 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          aria-label={placeholder}
        />
        {clearable && value && (
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs focus-ring"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            aria-label="清空搜索"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-xl overflow-hidden z-50"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            boxShadow: 'var(--shadow-hover)',
          }}
        >
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((item, idx) => (
              <div
                key={getKey(item)}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item) }}
                onMouseEnter={() => setSelectedIdx(idx)}
                className="cursor-pointer transition-colors"
                style={{
                  background: idx === selectedIdx ? 'var(--bg-surface)' : 'transparent',
                }}
              >
                {renderItem(item, idx)}
              </div>
            ))}
          </div>
          <div
            className="px-3 py-1.5 border-t text-[10px]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
          >
            ↑↓ 导航 · ↵ 选择 · Esc 关闭
          </div>
        </div>
      )}
    </div>
  )
}
