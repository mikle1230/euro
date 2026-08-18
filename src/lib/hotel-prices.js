// 供应商酒店报价查询：hotel list.xlsx → hotel-prices.json（城市码 → 酒店 → 按月 PP 欧元价）。
// 与 hotel-recommendations.js（推荐库：评分/位置/参考价）互补：这里是实际供应商报价（€/人）。
// 纯函数、无 'use client'，服务端/客户端通用。
// 数据由 scripts/build-hotel-prices.js 生成（npm run build:hotels）。
import hotelPrices from '../data/hotel-prices.json' with { type: 'json' }

// '2026-09-08' → '9月'；解析失败/空返回 null
export function getMonthFromDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return `${d.getMonth() + 1}月`
}

// 该城该月报价列表；month 为空 → 该城全部报价（同酒店多月份去重取首条）
// 返回 [{ hotel, month, pp, star?, rating? }]
export function getHotelQuotes(cityCode, month = null) {
  if (!cityCode) return []
  const entry = hotelPrices[cityCode]
  if (!entry) return []
  const list = entry.hotels || []
  if (!month) {
    const seen = new Map()
    for (const h of list) if (!seen.has(h.hotel)) seen.set(h.hotel, h)
    return [...seen.values()]
  }
  return list.filter((h) => h.month === month)
}

// PP 区间字符串：'€31.91–56.38/人'；同价 '€31.91/人'；无数据 ''
// pp 可能是 '50/55.32'（双价格）——按 parseFloat 取第一档参与区间
export function getQuoteRange(cityCode, month = null) {
  const quotes = getHotelQuotes(cityCode, month).filter((h) => h.pp && !isNaN(parseFloat(h.pp)))
  if (!quotes.length) return ''
  const nums = quotes.map((h) => parseFloat(h.pp))
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  return min === max ? `€${min}/人` : `€${min}–${max}/人`
}
