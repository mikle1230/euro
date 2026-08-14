'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// 共享模态框：portal 到 body、Esc 关闭、点击遮罩关闭、焦点圈闭、打开/关闭焦点还原。
// 项目内 ConfirmDialog / 排序设置 / 行程设置 统一走这里，避免各弹窗行为不一致。
export default function Modal({
  title,
  onClose,
  children,
  width = 'w-80',
  maxHeight = 'max-h-[70vh]',
}) {
  const panelRef = useRef(null)

  // Esc 关闭
  useEffect(() => {
    if (!onClose) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // 打开时聚焦内容区第一个可聚焦元素（跳过头部关闭按钮），关闭时还原焦点
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const prev = document.activeElement
    const focusables = [...panel.querySelectorAll(
      'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
    )]
    const initial = focusables.find(
      (el) => !(el.tagName === 'BUTTON' && el.getAttribute('aria-label') === '关闭'),
    ) || focusables[0]
    if (initial) initial.focus()
    return () => { if (prev && typeof prev.focus === 'function') prev.focus() }
  }, [])

  // Tab 焦点圈闭
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const focusables = [...panel.querySelectorAll(
      'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
    )]
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDown}
        className={`rounded-xl shadow-2xl p-4 ${width} ${maxHeight} max-w-[90vw] flex flex-col`}
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="text-sm"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
