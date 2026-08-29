'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// 极简 toast：import { toast } 后调用
//   toast('消息', 'success'|'error'|'info', 时长ms)
//   toast('消息', 'success', 5000, '撤销', () => {...})  // 带操作按钮
// ToastHost 挂在 layout.jsx，全局只渲染一次。
let push = null

export function toast(message, type = 'info', duration = 3000, actionLabel = null, onAction = null) {
  if (push) push({ id: Date.now() + Math.random(), message, type, duration, actionLabel, onAction })
}

const BG = {
  success: '#0f766e',
  error: '#dc2626',
  info: '#2c2416',
}

export default function ToastHost() {
  const [items, setItems] = useState([])

  useEffect(() => {
    push = (item) => {
      setItems((prev) => [...prev.slice(-3), item])
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== item.id))
      }, item.duration || 3000)
    }
    return () => { push = null }
  }, [])

  const dismiss = (id) => setItems((prev) => prev.filter((x) => x.id !== id))

  if (items.length === 0) return null

  return createPortal(
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[1400] flex flex-col gap-2 items-center pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium shadow-lg whitespace-nowrap pointer-events-auto"
          style={{ background: BG[t.type] || BG.info, color: 'var(--on-accent-strong)' }}
        >
          <span>{t.message}</span>
          {t.actionLabel && (
            <button
              onClick={() => {
                t.onAction?.()
                dismiss(t.id)
              }}
              className="px-2 py-0.5 rounded-md font-semibold transition-colors hover:bg-white/20 underline"
            >
              {t.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body,
  )
}
