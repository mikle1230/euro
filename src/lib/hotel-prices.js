// 供应商酒店报价查询：hotel list.xlsx → hotel-prices.json（城市码 → 酒店 → 按月标间价）。
// 注意：xlsx 的 PP 是「标间价格」= €/间（per room），不是人均价（用户口径 2026-08-18）。
// 与 hotel-recommendations.js（推荐库：评分/位置/参考价 €/晚）互补：这里是实际供应商报价（€/间）。
// 纯函数、无 'use client'，服务端/客户端通用。
// 数据由 scripts/build-hotel-prices.js 生成（npm run build:hotels）。
import hotelPrices from '../data/hotel-prices.json' with { type: 'json' }
import { COUNTRY_NAMES } from '../data/countries.js'

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

// PP 区间字符串：'€31.91–56.38/间'；同价 '€31.91/间'；无数据 ''
// pp 可能是 '50/55.32'（双价格）——按 parseFloat 取第一档参与区间
export function getQuoteRange(cityCode, month = null) {
  const quotes = getHotelQuotes(cityCode, month).filter((h) => h.pp && !isNaN(parseFloat(h.pp)))
  if (!quotes.length) return ''
  const nums = quotes.map((h) => parseFloat(h.pp))
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  return min === max ? `€${min}/间` : `€${min}–${max}/间`
}

// 按酒店名匹配该城报价（大小写/空格/连字符归一化，宽松 contains 兜底），用于推荐库酒店→报价库价格对照
export function findHotelQuote(cityCode, hotelName, month = null) {
  if (!cityCode || !hotelName) return null
  const quotes = getHotelQuotes(cityCode, month)
  if (!quotes.length) return null
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const target = norm(hotelName)
  if (!target) return null
  return (
    quotes.find((q) => norm(q.hotel) === target) ||
    quotes.find((q) => norm(q.hotel).includes(target) || target.includes(norm(q.hotel))) ||
    null
  )
}

// ---- 目录分组（/hotels 页用）----
// 按「国家 → 城市」输出供应商报价酒店；同酒店多月份合并（价格按月列出）
// 返回 [{ country, countryName, cities: [{ city, nameEn, cityCode, hotels: [{ hotel, star?, rating?, prices: [{ month, pp }] }] }] }]
export function getHotelQuoteCatalog() {
  const byCountry = {}
  for (const [cityCode, c] of Object.entries(hotelPrices)) {
    const cc = c.countryCode || 'ZZ'
    const cityEntry = {
      city: c.name,
      nameEn: c.nameEn || '',
      cityCode,
      hotels: [],
    }
    const hotelMap = new Map()
    for (const h of c.hotels || []) {
      if (!hotelMap.has(h.hotel)) {
        hotelMap.set(h.hotel, { hotel: h.hotel, star: h.star || 0, rating: h.rating || 0, prices: [] })
      }
      hotelMap.get(h.hotel).prices.push({ month: h.month, pp: h.pp })
    }
    cityEntry.hotels = [...hotelMap.values()]
    if (!byCountry[cc]) byCountry[cc] = []
    byCountry[cc].push(cityEntry)
  }
  return Object.entries(byCountry)
    .map(([cc, cities]) => ({
      country: cc,
      countryName: COUNTRY_NAMES[cc] || cc,
      cities: cities.sort((a, b) => String(a.city).localeCompare(String(b.city), 'zh')),
    }))
    .sort((a, b) => String(a.countryName).localeCompare(String(b.countryName), 'zh'))
}
