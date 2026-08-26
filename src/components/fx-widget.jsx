'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useFx, CURRENCIES } from '@/lib/fx'

// 常驻底部角落的微型汇率转换条。
//   - fixed bottom-left，避开 /explore 右侧面板与地图控件（缩放左上、归属右下）。
//   - 默认展开可直接转换；可收起成小药丸（显示当前结果），避免遮挡内容。
//   - 金额/币种变化自动转换（金额防抖 400ms）；命中缓存立即显示，未命中走 /api/fx。
export default function FxWidget() {
  const {
    from, setFrom, to, setTo, amount, setAmount,
    result, rate, loading, error, fromCache, convert,
  } = useFx()

  const [open, setOpen] = useState(true)
  const amountTimer = useRef(null)

  // 金额防抖：输入停止 400ms 后自动转换
  useEffect(() => {
    if (!open) return
    if (amountTimer.current) clearTimeout(amountTimer.current)
    amountTimer.current = setTimeout(() => { convert() }, 400)
    return () => { if (amountTimer.current) clearTimeout(amountTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, from, to, open])

  const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 }))

  const pill = (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-3 left-3 z-[1100] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-lg text-xs font-medium transition-all hover:bg-[var(--bg-surface)] whitespace-nowrap"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
      title="展开汇率转换"
      aria-label="展开汇率转换"
    >
      <span>💱</span>
      <span>{amount || 0} {from}</span>
      <span style={{ color: 'var(--text-tertiary)' }}>≈</span>
      <span style={{ color: 'var(--accent)' }}>{fmt(result)} {to}</span>
      {fromCache && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(缓存)</span>}
    </button>
  )

  const expanded = (
    <div
      className="fixed bottom-3 left-3 z-[1100] rounded-xl border shadow-2xl overflow-hidden"
      style={{
        width: '300px',
        maxWidth: 'calc(100vw - 24px)',
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* 标题栏：收起 */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>💱 汇率转换</span>
        <button
          onClick={() => setOpen(false)}
          className="w-6 h-6 rounded flex items-center justify-center text-xs transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-tertiary)' }}
          title="收起"
          aria-label="收起汇率转换"
        >▾</button>
      </div>

      <div className="p-3">
        {/* 输入行：金额 + 源币种 + 目标币种（紧凑适配 300px） */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="金额"
            className="w-[64px] px-2 py-1 rounded-lg text-xs border outline-none"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs border outline-none"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            aria-label="源货币"
          >
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <span className="text-xs font-bold shrink-0" style={{ color: 'var(--text-tertiary)' }}>⇄</span>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs border outline-none"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            aria-label="目标货币"
          >
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>

        {/* 状态/结果 */}
        {error && (
          <p className="text-[11px] mt-2" style={{ color: '#ef4444' }}>⚠️ {error}</p>
        )}
        {!error && loading && (
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>转换中…</p>
        )}
        {!error && !loading && result != null && rate != null && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
            <div className="text-xs" style={{ color: 'var(--text-primary)' }}>
              <b>{parseFloat(amount) || 0}</b> {from} ≈ <b style={{ color: 'var(--accent)' }}>{fmt(result)}</b> {to}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              汇率 1 {from} = {rate.toFixed(4)} {to}{fromCache && ' ·（缓存）'}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return open ? expanded : pill
}
