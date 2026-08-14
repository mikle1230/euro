import hotelData from '@/data/hotel-recommendations.json'

// 酒店推荐：按最终抵达/过夜城市，返回 booking 4/5 星酒店（评分高的排前）
export function recommendHotels(finalCityName, finalCityNameEn, limit = 5) {
  if (!finalCityName && !finalCityNameEn) return []
  const en = (finalCityNameEn || '').trim().toLowerCase()
  const cn = (finalCityName || '').trim()
  const entry = Object.values(hotelData).find((c) =>
    (en && (c.nameEn || '').toLowerCase() === en) || (cn && c.name === cn))
  if (!entry) return []
  return (entry.hotels || [])
    .filter((h) => h.star >= 4)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit)
}
