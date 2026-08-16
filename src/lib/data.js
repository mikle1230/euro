import travelData from '@/data/europe-travel.json'
import { COUNTRY_IMAGES } from '@/data/country-images'

const { countries } = travelData

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
  for (const c of countries) {
    for (const city of c.cities) {
      cityIndex.set(city.id, { city, country: c })
      cities.push({
        id: city.id,
        name: city.name,
        nameEn: city.nameEn,
        lat: city.lat,
        lng: city.lng,
        country: { id: c.id, name: c.name, nameEn: c.nameEn },
        attractionCount: city.attractions.length,
      })
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
  return countries
}

export function getCountryById(id) {
  return countries.find((c) => c.id === id) || null
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
  for (const c of countries) {
    cityCount += c.cities.length
    for (const city of c.cities) {
      attractionCount += city.attractions.length
    }
  }
  return {
    countryCount: countries.length,
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
