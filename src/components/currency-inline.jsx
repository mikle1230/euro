'use client'

import { useEffect, useRef } from 'react'
import { useFx, CURRENCIES } from '@/lib/fx'

// 内联版汇率转换（用于顶部搜索工具栏「搜索框前面」）。
//   - 始终展开、无收起药丸、无 fixed 定位；金额/币种变化自动转换（防抖 400ms）。
//   - 复用 useFx：状态、5 分钟缓存、/api/fx 代理，逻辑与旧的悬浮 FxWidget 一致。
//   - select 按「最宽 option 文字宽度」自适应，避免长币种名（如“波兰兹罗提 PLN”）被截断。
// 量宽度用一次性的隐藏 span；结果直接写到两个 select 的 DOM style 上（不 setState），
// 避免 effect 内 setState 引发的级联渲染；最终 DOM 与原来的「state 驱动 width」完全一致。
function measureSelectWidth() {
  const span = document.createElement('span')
  const s = span.style
  s.position = 'absolute'
  s.visibility = 'hidden'
  s.whiteSpace = 'nowrap'
  s.font = '12px system-ui, -apple-system, "Segoe UI", sans-serif'
  document.body.appendChild(span)
  let max = 0
  for (const c of CURRENCIES) {
    span.textContent = c.label
    max = Math.max(max, span.getBoundingClientRect().width)
  }
  document.body.removeChild(span)
  return `${Math.ceil(max) + 40}px`
}

export default function CurrencyInline() {
  const {
    from, setFrom, to, setTo, amount, setAmount,
    result, rate, loading, error, fromCache, convert,
  } = useFx()
  const amountTimer = useRef(null)
  const fromSelectRef = useRef(null)
  const toSelectRef = useRef(null)

  // 挂载后量一次宽度，直接写 DOM（默认仍为内联的 108px，与改动前“未量到之前”一致）
  useEffect(() => {
    const width = measureSelectWidth()
    if (fromSelectRef.current) fromSelectRef.current.style.width = width
    if (toSelectRef.current) toSelectRef.current.style.width = width
  }, [])

  // 金额防抖：输入停止 400ms 后自动转换
  useEffect(() => {
    if (amountTimer.current) clearTimeout(amountTimer.current)
    amountTimer.current = setTimeout(() => { convert() }, 400)
    return () => { if (amountTimer.current) clearTimeout(amountTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, from, to])

  const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 }))
  const selectStyle = { background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

  return (
    <div
      className="fx-inline inline-flex items-center gap-1.5 rounded-xl border px-2 py-1"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      title="汇率转换"
    >
      <span className="text-sm shrink-0 fx-emoji" aria-hidden>💱</span>
      {/* 金额输入宽度：容得下 5 位金额（12345）不被裁切。
          实测 12px 等宽 5 位 ≈36px + 左右内边距 16px + 原生数字步进按钮 ≈15px；
          88px 还留出约 12px 余量，6 位也放得下。 */}
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="金额"
        className="w-[88px] h-8 px-2 rounded-lg text-xs border outline-none shrink-0"
        style={selectStyle}
        aria-label="汇率转换金额"
      />
      <select
        ref={fromSelectRef}
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="h-8 px-1.5 rounded-lg text-xs border outline-none shrink-0"
        style={{ width: '108px', ...selectStyle }}
        aria-label="源货币"
      >
        {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <span className="text-xs font-bold shrink-0" style={{ color: 'var(--text-tertiary)' }}>⇄</span>
      <select
        ref={toSelectRef}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="h-8 px-1.5 rounded-lg text-xs border outline-none shrink-0"
        style={{ width: '108px', ...selectStyle }}
        aria-label="目标货币"
      >
        {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      {error ? (
        <span className="text-[11px] px-1" style={{ color: '#ef4444' }} title={error}>⚠️</span>
      ) : (
        <span className="text-xs px-1 py-0.5 rounded-md whitespace-nowrap" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          {loading ? '…' : (result != null && rate != null ? (
            <>
              <b style={{ color: 'var(--accent)' }}>{fmt(result)}</b> {to}
            </>
          ) : '—')}
        </span>
      )}
    </div>
  )
}
