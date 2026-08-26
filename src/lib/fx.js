'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ⚠️ 安全说明：API Key 不写在前端（可被任何浏览器查看）。已改为服务端代理：
//   前端调 /api/fx → Next 服务端路由读 .env.local 的 EXCHANGE_RATE_API_KEY → 调 exchange-rate-api.com。
//   Key 在项目根 .env.local 配置（已被 gitignore，不会入库），换 Key 只需改 .env.local。移除前端 Key 常量。

// 常用货币（下拉用；加入更多货币时在 CURRENCIES 里追加）
export const CURRENCIES = [
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

// 汇率转换的共享逻辑（hook）。供浮层转换条与任何需要转换的 UI 复用。
// 返回：from/to/amount 状态、result/rate/loading/error/fromCache、convert()。
export function useFx() {
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
      // 调服务端代理（Key 在后端），不暴露前端
      const res = await fetch(`/api/fx?from=${from}&to=${to}&amount=${amt}`)
      // 429 / 配额超限
      if (res.status === 429) {
        setError('请求过多，请稍后再试')
        return
      }
      const data = await res.json()
      if (!data.rate) {
        setError(data.error || '汇率获取失败，请稍后再试')
        return
      }
      const r = data.rate
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

  // 初始/切换币种：先用缓存回填显示（避免刷新就请求）；无缓存则清空结果
  useEffect(() => {
    const cached = readCache(from, to)
    if (cached) { setRate(cached.rate); setFromCache(true) }
    else { setRate(null); setResult(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  return { from, setFrom, to, setTo, amount, setAmount, result, rate, loading, error, fromCache, convert }
}
