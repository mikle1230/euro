// 酒店推荐：按当天过夜城市返回 Booking 评分≥7 的参考酒店（静态库，评分/价格非实时）
// 纯函数、无 'use client'，可运行于服务端与客户端。
import hotelData from '../data/hotel-recommendations.js'
import { normalizeCityName as norm } from './normalize.js'
import { HOTEL_ALIASES as ALIASES } from '../data/city-aliases.js'
import { COUNTRY_NAMES, COUNTRY_CURRENCIES } from '../data/countries.js'

// 一次性索引：中文名 / 英文名 / 城市码 / slug 均可命中
const INDEX = (() => {
  const map = new Map()
  const put = (k, entry) => {
    const n = norm(k)
    if (n && !map.has(n)) map.set(n, entry)
  }
  for (const [slug, c] of Object.entries(hotelData)) {
    put(slug, c)
    put(c.name, c)
    put(c.nameEn, c)
    put(c.cityCode, c)
    for (const [zh, en] of Object.entries(ALIASES)) {
      if (c.nameEn && norm(en) === norm(c.nameEn)) put(zh, c)
    }
  }
  return map
})()

// 命中城市的 entry（中文名 / 英文名 / 城市码 / 别名 均可），未命中返回 null
function findCity(cityName, cityNameEn, cityCode = '') {
  const cn = String(cityName || '').trim()
  const en = String(cityNameEn || '').trim()
  for (const c of [cn, en, cityCode, ALIASES[cn] || '', ALIASES[en] || '']) {
    if (!c) continue
    const entry = INDEX.get(norm(c))
    if (entry) return entry
  }
  return null
}

// recommendHotels(cityName, cityNameEn, limit=5, cityCode='')
// 命中城市 → 按评分降序返回酒店（不限制评分——hotel list 的报价酒店必须全部可见）
export function recommendHotels(cityName, cityNameEn, limit = 5, cityCode = '') {
  const entry = findCity(cityName, cityNameEn, cityCode)
  if (!entry) return []
  return (entry.hotels || [])
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit)
}

// 酒店价格区间：该城评分≥7 酒店的价格范围（如 "€100–120/晚"）；无数据返回 ''
export function getHotelPriceRange(cityName, cityNameEn, cityCode = '') {
  const entry = findCity(cityName, cityNameEn, cityCode)
  if (!entry) return ''
  const prices = (entry.hotels || [])
    .filter((h) => (h.rating || 0) >= 7 && h.priceEur > 0)
    .map((h) => h.priceEur)
  if (!prices.length) return ''
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? `€${min}/晚` : `€${min}–${max}/晚`
}

// 命中城市返回 1（含城市信息），未命中 0 —— 供 UI 判断「有参考数据」
export function hasHotelData(cityName, cityNameEn, cityCode = '') {
  return findCity(cityName, cityNameEn, cityCode) ? 1 : 0
}

// ---- 酒店目录（/hotels 页）----

// 国家码 → 中文名 / 货币，已收敛到 src/data/countries.js（国家注册表单一数据源）
export { COUNTRY_NAMES, COUNTRY_CURRENCIES }

// 全部酒店按「国家 → 城市 → 酒店」分组（不限制数量/评分）
export function getHotelCatalog() {
  const byCountry = {}
  for (const c of Object.values(hotelData)) {
    const cc = c.country || 'ZZ'
    if (!byCountry[cc]) byCountry[cc] = []
    byCountry[cc].push({
      city: c.name,
      nameEn: c.nameEn,
      cityCode: c.cityCode,
      note: c.note,
      hotels: (c.hotels || [])
        .sort((a, b) => (b.rating || 0) - (a.rating || 0)),
    })
  }
  return Object.entries(byCountry)
    .map(([cc, cities]) => ({
      country: cc,
      countryName: COUNTRY_NAMES[cc] || cc,
      cities: cities.sort((a, b) => String(a.city).localeCompare(String(b.city), 'zh')),
    }))
    .sort((a, b) => String(a.countryName).localeCompare(String(b.countryName), 'zh'))
}

// 搜索酒店：酒店名（中/英）模糊匹配 + 城市名（中/英/码）匹配
export function searchHotels(query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  const results = []
  for (const c of Object.values(hotelData)) {
    const cityHit = [c.name, c.nameEn, c.cityCode].some((s) => String(s || '').toLowerCase().includes(q))
    for (const h of (c.hotels || [])) {
      const nameHit = [h.name, h.nameZh].some((s) => String(s || '').toLowerCase().includes(q))
      if (cityHit || nameHit) {
        results.push({
          ...h,
          city: c.name,
          cityNameEn: c.nameEn,
          cityCode: c.cityCode,
          country: c.country,
          countryName: COUNTRY_NAMES[c.country] || c.country,
          cityNote: c.note,
        })
      }
    }
  }
  return results.sort((a, b) => (b.rating || 0) - (a.rating || 0))
}
