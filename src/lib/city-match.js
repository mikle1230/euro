// 城市匹配：AI 解析出的城市中文名 → 本地 europe-travel 数据里的 cityId/countryId。
// upload-modal 与「AI 反馈重解析」共用，避免重复实现。
import { getAllCitiesWithCoords } from './data'

export function matchCity(cityName) {
  if (!cityName) return null
  const cities = getAllCitiesWithCoords()
  const cleaned = cityName.trim()
  // Exact match
  let match = cities.find((c) => c.name === cleaned)
  // Contains match
  if (!match) match = cities.find((c) => cleaned.includes(c.name) || c.name.includes(cleaned))
  // English name match
  if (!match) match = cities.find((c) => c.nameEn?.toLowerCase() === cleaned.toLowerCase())
  return match
    ? { id: match.id, name: match.name, countryId: match.country.id, countryName: match.country.name }
    : null
}
