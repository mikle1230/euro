// 酒店库地图分层数据（纯函数）：国家首都点 + 城市酒店点。
// - 国家层（低 zoom）：有酒店的国家 → 首都坐标点（国旗 + 国家名 + 酒店数），hover 高亮国家轮廓；
// - 城市层（高 zoom，放大到城市）：该城市酒店具体点位。
// 数据源：报价库（hotel-prices.json，hotel list 来源）+ 推荐库（hotel-recommendations.js）+ 城市坐标（city-coords.js）。
import hotelPrices from '../data/hotel-prices.json' with { type: 'json' }
import hotelData from '../data/hotel-recommendations.js'
import { COUNTRIES } from '../data/countries.js'
import { getCityCoords } from './city-coords.js'

// 国家码 → 首都中文名（国家层点位用它定位）
const CAPITALS = {
  'GB': '伦敦', 'FR': '巴黎', 'DE': '柏林', 'IT': '罗马', 'ES': '马德里', 'PT': '里斯本',
  'NL': '阿姆斯特丹', 'BE': '布鲁塞尔', 'CH': '伯尔尼', 'AT': '维也纳', 'GR': '雅典',
  'SE': '斯德哥尔摩', 'NO': '奥斯陆', 'DK': '哥本哈根', 'IE': '都柏林', 'PL': '华沙',
  'CZ': '布拉格', 'HU': '布达佩斯', 'HR': '萨格勒布', 'TR': '安卡拉', 'FI': '赫尔辛基',
  'IS': '雷克雅未克', 'EE': '塔林', 'LT': '维尔纽斯', 'LV': '里加', 'SI': '卢布尔雅那',
  'SK': '布拉迪斯拉发', 'RO': '布加勒斯特', 'BG': '索菲亚', 'RS': '贝尔格莱德', 'BA': '萨拉热窝',
}

const countryInfo = (code) => {
  const c = COUNTRIES[code] || {}
  return { code, nameZh: c.name || '', flag: c.flag || '' }
}

// 城市中文名 → 坐标（city-coords 按名字命中）；未命中返回 null
const cityCoord = (cityName, cityNameEn) =>
  getCityCoords(cityName) || getCityCoords(cityNameEn)

// 汇总：返回 { capitals, cityHotels }
// capitals: [{ country, countryName, flag, lat, lng, hotelCount }] —— 有酒店的国家首都
// cityHotels: [{ country, cityCode, cityZh, cityNameEn, lat, lng, hotels: [{ hotel, bookingName, rating, star }] }]
export function getHotelMapData() {
  const byCity = new Map() // cityCode -> { country, cityZh, cityNameEn, hotels:[], lat, lng }

  // 报价库
  for (const [cityCode, c] of Object.entries(hotelPrices)) {
    let entry = byCity.get(cityCode)
    if (!entry) {
      entry = { country: c.countryCode, cityCode, cityZh: c.name, cityNameEn: c.nameEn || '', hotels: [], lat: null, lng: null }
      byCity.set(cityCode, entry)
    }
    for (const h of c.hotels) {
      if (!entry.hotels.some((x) => x.hotel === h.hotel)) {
        entry.hotels.push({ hotel: h.hotel, bookingName: h.bookingName || '', rating: h.rating || 0, star: h.star || 0, ppm: h.pp })
      }
    }
  }

  // 推荐库（hotel-recommendations.js）：补充推荐酒店的城市/酒店点
  for (const [slug, c] of Object.entries(hotelData)) {
    if (!c?.name) continue
    const cityCode = c.cityCode || slug
    let entry = byCity.get(cityCode)
    if (!entry) {
      entry = { country: c.country, cityCode, cityZh: c.name, cityNameEn: c.nameEn || '', hotels: [], lat: null, lng: null }
      byCity.set(cityCode, entry)
    }
    for (const h of c.hotels || []) {
      if (!h?.name || entry.hotels.some((x) => x.hotel === h.name)) continue
      entry.hotels.push({ hotel: h.name, bookingName: '', rating: h.rating || 0, star: h.star || 0, ppm: '' })
    }
  }

  // 城市坐标（按城市中文名/英文名）
  for (const e of byCity.values()) {
    const c = cityCoord(e.cityZh, e.cityNameEn)
    if (c) { e.lat = c[0]; e.lng = c[1] }
  }

  // 国家层：有酒店的国家 → 首都点
  const countrySet = new Set([...byCity.values()].map((e) => e.country).filter(Boolean))
  const countryCount = {}
  for (const e of byCity.values()) if (e.country) countryCount[e.country] = (countryCount[e.country] || 0) + e.hotels.length

  const capitals = []
  for (const cc of countrySet) {
    const capName = CAPITALS[cc]
    const capCoord = capName ? cityCoord(capName) : null
    if (!capCoord) continue
    const info = countryInfo(cc)
    capitals.push({ ...info, lat: capCoord[0], lng: capCoord[1], hotelCount: countryCount[cc] || 0 })
  }

  const cityHotels = [...byCity.values()]
    .filter((e) => e.lat != null)
    .map((e) => ({ country: e.country, cityCode: e.cityCode, cityZh: e.cityZh, cityNameEn: e.cityNameEn, lat: e.lat, lng: e.lng, hotels: e.hotels }))

  return { capitals, cityHotels }
}
