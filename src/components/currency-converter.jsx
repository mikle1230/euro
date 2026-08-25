'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/toast'

// ⚠️ 安全提醒：API Key 请勿直接写死在前端（会被浏览器可见，易泄露/被盗刷）。
// 建议：生产环境放到后端 / 环境变量（如 .env.local 的 EXCHANGE_RATE_API_KEY），
// 通过服务端代理请求；或用 Next.js 的 server route。此处为便于本地使用，先把 Key 定义成变量，
// 上线前务必抽离到后端。你的 Key 改这里即可。
const EXCHANGE_RATE_API_KEY = '你的API_KEY'

// 常用货币（下拉用；加入更多货币时在 CURRENCIES 里追加）
const CURRENCIES = [
  { code: 'USD', label: '美元 USD' },
  { code: 'CNY', label: '人民币 CNY' },
  { code: 'EUR', label: '欧元 EUR' },
  { code: 'GBP', label: '英镑 GBP' },
  { code: 'JPY', label: '日元 JPY' },
  { code: 'CHF', label: '瑞士法郎 CHF' },
  { code: 'HKD', label: '港币 HKD' },
  { code: 'SGD', label: '新加坡元 SGD' },
  { code: 'AUD', label: '澳元 AUD' },
  { code: 'CAD', label: '加元 CAD' },
  { code: 'SEK', label: '瑞典克朗 SEK' },
  { code: 'NOK', label: '挪威克朗 NOK' },
  { code: 'DKK', label: '丹麦克朗 DKK' },
  { code: 'PLN', label: '波兰兹罗提 PLN' },
  { code: 'CZK', label: '捷克克朗 CZK' },
  { code: 'HUF', label: '匈牙利福林 HUF' },
  { code: 'THB', label: '泰铢 THB' },
  { code: 'KRW', label: '韩元 KRW' },
]

// 5 分钟缓存：避免刷新就请求一次浪费额度。
// 缓存 key：fx_{from}_{to}；value：{ rate, ts }。
const CACHE_KEY = (f, t) => `euro_fx_${f}_${t}`
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

function readCache(from, to) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY(from, to))
    if (!raw) return null
    const j = JSON.parse(raw)
    if (j && j.rate && Date.now() - j.ts < CACHE_TTL) return j
  } catch { /* ignore */ }
  return null
}
function writeCache(from, to, rate) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(CACHE_KEY(from, to), JSON.stringify({ rate, ts: Date.now() })) } catch { /* ignore */ }
}

export default function CurrencyConverter() {
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('CNY')
  const [amount, setAmount] = useState('100')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [rate, setRate] = useState(null)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)

  const convert = useCallback(async () => {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('请输入有效金额'); return }
    setError('')

    // 优先缓存
    const cached = readCache(from, to)
    if (cached) {
      setRate(cached.rate)
      setResult(amt * cached.rate)
      setFromCache(true)
      return
    }

    setLoading(true)
    try {
      // Pair Conversion（免费版）：https://v6.exchangerate-api.com/v6/{API_KEY}/pair/{from}/{to}
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`)
      // 429 / 配额超限
      if (res.status === 429) {
        setError('请求过多，请稍后再试')
        return
      }
      const data = await res.json()
      if (data.result !== 'success' || !data.conversion_rate) {
        setError('汇率获取失败，请稍后再试')
        return
      }
      const r = data.conversion_rate
      setRate(r)
      setResult(amt * r)
      setFromCache(false)
      writeCache(from, to, r)
    } catch (e) {
      setError('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }, [from, to, amount])

  // 初始：尝试加载缓存显示（避免刷新就请求）
  useEffect(() => {
    const cached = readCache(from, to)
    if (cached) { setRate(cached.rate); setFromCache(true) }
    else { setRate(null); setResult(null) }
  }, [from, to])

  const inputCls = 'px-3 py-2 rounded-xl text-sm border outline-none'
  const inputStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

  return (
    <div className="rounded-xl border p-4 mt-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>💱 汇率转换</h2>
      <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
        实时汇率（Pair Conversion · exchange-rate-api.com），结果本地缓存 5 分钟
      </p>
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>金额</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className={inputCls} style={inputStyle}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>源货币</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} style={inputStyle}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div className="text-xs font-bold pt-5" style={{ color: 'var(--text-tertiary)' }}>⇄</div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>目标货币</label>
          <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} style={inputStyle}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <button
          onClick={convert}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: 'var(--accent-strong)', color: '#fff' }}
        >
          {loading ? '转换中…' : '转换'}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-2" style={{ color: '#ef4444' }}>⚠️ {error}</p>
      )}
      {result != null && rate != null && (
        <div className="mt-3 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-surface)' }}>
          <div style={{ color: 'var(--text-primary)' }}>
            <b>{parseFloat(amount) || ''}</b> {from} ≈ <b className="text-[var(--accent)]">{result.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</b> {to}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            汇率 1 {from} = {rate.toFixed(4)} {to}
            {fromCache && ' ·（缓存）'}
          </div>
        </div>
      )}
    </div>
  )
}
