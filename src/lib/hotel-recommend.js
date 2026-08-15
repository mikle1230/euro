// 酒店推荐：按当天过夜城市返回 Booking 评分≥7 的参考酒店（静态库，评分/价格非实时）
// 纯函数、无 'use client'，可运行于服务端与客户端。
import hotelData from '../data/hotel-recommendations.js'

// 与 quos-mapping 一致的城市名归一化：去空格/连字符/撇号/点/间隔号
const norm = (s) => String(s || '').toLowerCase().replace(/[\s\-'.·]/g, '')

// 中文名 → 常用英文名（匹配键用）
const ALIASES = {
  瓦朗索勒: 'Valensole',
  圣特罗佩: 'Saint Tropez',
  奇维塔维基亚: 'Civitavecchia',
  那不勒斯: 'Naples',
  苏莲托: 'Sorrento',
  阿尔贝罗贝洛: 'Alberobello',
  波西塔诺: 'Positano',
  巴勒莫: 'Palermo',
  阿格里真托: 'Agrigento',
  锡拉库扎: 'Siracusa',
  锡拉库萨: 'Siracusa',
  陶尔米纳: 'Taormina',
  热那亚: 'Genoa',
  因特拉肯: 'Interlaken',
  马赛: 'Marseille',
  塞维利亚: 'Seville',
  波尔图: 'Porto',
}

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
// 命中城市 → 返回按评分降序、评分≥7 的酒店（含 rating / priceEur / area / near）
export function recommendHotels(cityName, cityNameEn, limit = 5, cityCode = '') {
  const entry = findCity(cityName, cityNameEn, cityCode)
  if (!entry) return []
  return (entry.hotels || [])
    .filter((h) => (h.rating || 0) >= 7)
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
