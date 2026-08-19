import travelData from '@/data/europe-travel.json'
import { COUNTRY_IMAGES } from '@/data/country-images'

const { countries } = travelData

// ── 自定义城市补丁（localStorage）────────────────────────────
// 用户在「城市库」页通过「添加城市」表单自助补充的城市骨架（名称/英文名/坐标可选），
// 本机浏览器立即可见；需要全端生效时把补丁导出（复制 JSON）交给开发者合并进 europe-travel.json。
// key: euro-custom-cities
// 结构: [{ countryId, countryName, city: { id, name, nameEn, lat, lng, attractions: [] } }]
const CUSTOM_KEY = 'euro-custom-cities'

export function getCustomCities() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveCustomCities(list) {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

// 静态数据 + 自定义补丁的合并视图（缓存；新增补丁后请调用 invalidateDataCache 或刷新页面）
let mergedCountries = null
export function invalidateDataCache() {
  mergedCountries = null
  cityIndex = null
  attractionIndex = null
  allAttractionsFlat = null
  allCitiesWithCoords = null
}

function getMergedCountries() {
  if (mergedCountries) return mergedCountries
  const custom = getCustomCities()
  if (!custom.length) return countries
  mergedCountries = countries.map((c) => ({ ...c, cities: c.cities.map((x) => ({ ...x })) }))
  for (const item of custom) {
    const target = mergedCountries.find((c) => c.id === item.countryId || c.name === item.countryName)
    if (!target) continue
    if (target.cities.some((x) => x.id === item.city?.id)) continue
    target.cities.push({
      id: item.city?.id || '',
      name: item.city?.name || '',
      nameEn: item.city?.nameEn || '',
      lat: item.city?.lat ?? null,
      lng: item.city?.lng ?? null,
      attractions: item.city?.attractions || [],
    })
  }
  return mergedCountries
}

// 惰性索引：getCityById / getAttractionById 从 O(n) 嵌套扫描降为 O(1) 查找，
// 同时缓存两份扁平列表（数据为静态 JSON，多处反复调用时避免重复全量扫描）
let cityIndex = null
let attractionIndex = null
let allAttractionsFlat = null
let allCitiesWithCoords = null

function buildIndexes() {
  if (cityIndex) return
  cityIndex = new Map()
  attractionIndex = new Map()
  const attractions = []
  const cities = []
  for (const c of getMergedCountries()) {
    for (const city of c.cities) {
      cityIndex.set(city.id, { city, country: c })
      // 无坐标的自定义城市不参与地图/车程（坐标由开发者合并时补齐）
      if (city.lat != null && city.lng != null) {
        cities.push({
          id: city.id,
          name: city.name,
          nameEn: city.nameEn,
          lat: city.lat,
          lng: city.lng,
          country: { id: c.id, name: c.name, nameEn: c.nameEn },
          attractionCount: city.attractions.length,
        })
      }
      for (const attr of city.attractions) {
        attractionIndex.set(attr.id, { attr, city, country: c })
        attractions.push({
          ...attr,
          city: { id: city.id, name: city.name, nameEn: city.nameEn },
          country: { id: c.id, name: c.name, nameEn: c.nameEn },
        })
      }
    }
  }
  allAttractionsFlat = attractions
  allCitiesWithCoords = cities
}

export function getAllCountries() {
  return getMergedCountries()
}

export function getCountryById(id) {
  return getMergedCountries().find((c) => c.id === id) || null
}

export function getCityById(id) {
  buildIndexes()
  const entry = cityIndex.get(id)
  if (!entry) return null
  const { city, country } = entry
  return { ...city, country: { id: country.id, name: country.name, nameEn: country.nameEn } }
}

export function getAttractionById(id) {
  buildIndexes()
  const entry = attractionIndex.get(id)
  if (!entry) return null
  const { attr, city, country } = entry
  return {
    ...attr,
    city: { id: city.id, name: city.name, nameEn: city.nameEn },
    country: { id: country.id, name: country.name, nameEn: country.nameEn },
  }
}

export function getAllAttractionsFlat() {
  buildIndexes()
  return allAttractionsFlat
}

export function getStats() {
  let cityCount = 0
  let attractionCount = 0
  for (const c of getMergedCountries()) {
    cityCount += c.cities.length
    for (const city of c.cities) {
      attractionCount += city.attractions.length
    }
  }
  return {
    countryCount: getMergedCountries().length,
    cityCount,
    attractionCount,
  }
}

export function getCountryCoverImage(countryId) {
  // 返回静态导入图（StaticImageData），供 next/image 优化；无图国家返回 null → 组件显示占位渐变
  return COUNTRY_IMAGES[countryId] || null
}

export function getAllCitiesWithCoords() {
  buildIndexes()
  return allCitiesWithCoords
}
