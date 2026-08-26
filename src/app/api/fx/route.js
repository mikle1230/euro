// 汇率转换服务端代理：前端不再直接暴露 API Key，走此路由调用 exchange-rate-api.com。
// Key 从环境变量读取（.env.local 的 EXCHANGE_RATE_API_KEY，已被 gitignore 不入库）。
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const from = (searchParams.get('from') || 'USD').toUpperCase()
  const to = (searchParams.get('to') || 'CNY').toUpperCase()
  const amount = parseFloat(searchParams.get('amount') || '')

  const apiKey = process.env.EXCHANGE_RATE_API_KEY
  if (!apiKey) {
    // 本地开发 vs 线上部署：给出正确的配置位置（.env.local 只在本地存在，且被 gitignore，不会随仓库上线）
    const hint = process.env.NODE_ENV === 'production'
      ? '线上未配置 EXCHANGE_RATE_API_KEY：请在托管平台（如 Vercel）的环境变量里添加该 Key'
      : '缺少 EXCHANGE_RATE_API_KEY：请在 .env.local 配置该 Key'
    return NextResponse.json({ error: hint }, { status: 500 })
  }
  if (!from || !to) {
    return NextResponse.json({ error: '缺少币种参数' }, { status: 400 })
  }
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: '金额无效' }, { status: 400 })
  }

  try {
    // Pair Conversion（免费版）：https://v6.exchangerate-api.com/v6/{API_KEY}/pair/{from}/{to}
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`)
    if (res.status === 429) {
      return NextResponse.json({ error: '请求过多，请稍后再试' }, { status: 429 })
    }
    const data = await res.json()
    if (data.result !== 'success' || !data.conversion_rate) {
      return NextResponse.json({ error: '汇率获取失败，请稍后再试' }, { status: 502 })
    }
    const rate = data.conversion_rate
    return NextResponse.json({ rate, result: amount * rate, from, to })
  } catch (e) {
    return NextResponse.json({ error: '网络错误，请稍后再试' }, { status: 500 })
  }
}
