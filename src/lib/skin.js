import { getAllCountries } from './data'
import { COUNTRIES } from '../data/countries'

// E｜磁贴墙 皮肤 —— 国家色条。
// 逐值取自已批准的静态视觉稿 media/mock/E6-knowledge.html，数组顺序与视觉稿一致
// （＝ /knowledge 国家墙的渲染顺序）。颜色只作国家编码（卡片左侧 6px 色条），
// 不做装饰性用色；刻意避开紫。
export const CARD_ACCENTS = [
  '#2F5D8C', '#9C3A3A', '#B4432B', '#A85A2B', '#4B6B3A',
  '#5B6E4A', '#2E7C8A', '#6E7A3A', '#3F6E63', '#C9A227',
  '#A8574F', '#8C6E5A', '#5E7A6E', '#4A5D3A', '#4E8C5A',
  '#4E5E8C', '#8C4A5D', '#7A6E4A', '#3A6E8C', '#8C3A5D',
]

// 同一个国家在各级页面必须同色：按国家在列表中的序号取色，
// 与 /knowledge 国家墙的 idx 取法完全一致（同表、同序）。
export function getCountryAccent(countryId) {
  const idx = getAllCountries().findIndex((c) => c.id === countryId)
  return CARD_ACCENTS[(idx < 0 ? 0 : idx) % CARD_ACCENTS.length]
}

// MICE / 酒店库的数据用的是 ISO 二字码（IT、FR…），城市库用的是 country id（italy、france…）。
// 这里用「同一份国家表 countries.js 的中英文名」把 ISO 码映射回城市库 id，
// 再走上面同一张色表取色 —— 保证同一个国家在 /knowledge 与 /mice、/hotels 颜色一致。
// 查不到时沿用 getCountryAccent 的兜底（第 1 个色），不新增第二套配色。
export function getCountryAccentByIso(isoCode) {
  const key = String(isoCode || '').toUpperCase()
  if (key) {
    const info = COUNTRIES[key]
    if (info) {
      const hit = getAllCountries().find(
        (c) => c.nameEn === info.nameEn || c.name === info.name,
      )
      if (hit) return getCountryAccent(hit.id)
    }
  }
  return getCountryAccent('')
}
