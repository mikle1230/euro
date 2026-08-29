// MICE 特色活动目录查询（纯函数，服务端/客户端通用）
// 数据由 scripts/build-mice.js 从 Excel 生成（src/data/mice-activities.js）；
// 后续补充其他国家活动文件 → 重跑构建脚本即自动扩充，无需改代码结构。
import miceActivities from '../data/mice-activities.js'
import { MICE_ZH } from '../data/mice-zh.js'
import { COUNTRIES } from '../data/countries.js'

// ---- 国家智能解析：英文名（Excel 写法）→ { code, nameZh } ----
// 兼容带括号写法（如 "Ireland (Republic of Ireland)"）与常见变体
const COUNTRY_CODE_BY_EN = (() => {
  const map = new Map()
  for (const [code, c] of Object.entries(COUNTRIES)) {
    if (c.nameEn) map.set(c.nameEn.toLowerCase(), code)
  }
  const ALIASES = {
    'ireland (republic of ireland)': 'IE',
    'czech republic': 'CZ',
    'united kingdom': 'GB',
    'uk': 'GB',
    'usa': 'US',
    'united states': 'US',
    'new zealand': 'NZ',
    'south korea': 'KR',
    'korea': 'KR',
  }
  for (const [k, v] of Object.entries(ALIASES)) map.set(k.toLowerCase(), v)
  return map
})()

// 英文名 → 国家信息（未命中返回 null，原样保留英文名展示）
export function resolveCountry(enName) {
  const key = String(enName || '').trim().toLowerCase()
  if (!key) return null
  const code = COUNTRY_CODE_BY_EN.get(key)
  if (code) {
    const c = COUNTRIES[code]
    return { code, nameZh: c?.name || '', flag: c?.flag || '' }
  }
  // 兜底：去掉括号内容再试（"Ireland (Republic of Ireland)" → "Ireland"）
  const stripped = key.replace(/\s*\(.*\)\s*/, '').trim()
  const code2 = COUNTRY_CODE_BY_EN.get(stripped)
  if (code2) {
    const c = COUNTRIES[code2]
    return { code: code2, nameZh: c?.name || '', flag: c?.flag || '' }
  }
  return null
}

// 全部活动（不修改原数组）
export function getAllMiceActivities() {
  return miceActivities
}

export function getMiceActivityById(id) {
  return miceActivities.find((a) => a.id === id) || null
}

// 从数据自动生成国家列表（含中文名/码），后续新数据源自动扩充
export function getMiceCountries() {
  const map = new Map()
  for (const a of miceActivities) {
    if (!a.country) continue
    const info = resolveCountry(a.country)
    const key = info?.code || a.country
    if (!map.has(key)) {
      map.set(key, {
        nameEn: a.country,
        code: info?.code || '',
        nameZh: info?.nameZh || '',
        flag: info?.flag || '',
        count: 0,
      })
    }
    map.get(key).count++
  }
  return [...map.values()].sort((x, y) => (x.nameZh || x.nameEn).localeCompare(y.nameZh || y.nameEn, 'zh'))
}

// 全局标签列表（按频次降序，最多返回 limit 个）
export function getMiceTags(limit = 60) {
  const freq = new Map()
  for (const a of miceActivities) {
    for (const t of a.tags) freq.set(t, (freq.get(t) || 0) + 1)
  }
  return [...freq.entries()].sort((x, y) => y[1] - x[1]).map(([tag]) => tag).slice(0, limit)
}

// 团型列表（Target Tour Categories 去重，保持常见顺序）
const TOUR_CAT_ORDER = ['MICE', 'Premium', 'FIT', 'Standard (Leisure)']
export function getMiceTourCategories() {
  const set = new Set()
  for (const a of miceActivities) for (const t of a.targetTourCategories) set.add(t)
  return [...set].sort((a, b) => {
    const ia = TOUR_CAT_ORDER.indexOf(a)
    const ib = TOUR_CAT_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

// 价格区间预设（EUR）
export const PRICE_RANGES = [
  { key: '0-50', label: '≤ €50', min: 0, max: 50 },
  { key: '50-100', label: '€50–100', min: 50, max: 100 },
  { key: '100-300', label: '€100–300', min: 100, max: 300 },
  { key: '300-1000', label: '€300–1000', min: 300, max: 1000 },
  { key: '1000+', label: '€1000+', min: 1000, max: Infinity },
]

// 综合筛选：query（标题/国家/城市/标签/ID）、countries、categories、tourCategories、
// priceRange（key）、tags、hideClosed（排除 Temporarily/Permanently Closed）
export function filterMiceActivities(f = {}) {
  const { query = '', countries = [], categories = [], tourCategories = [], priceRange = '', tags = [], hideClosed = false } = f
  const q = String(query).trim().toLowerCase()
  const range = PRICE_RANGES.find((r) => r.key === priceRange)
  return miceActivities.filter((a) => {
    // 关闭状态排除
    if (hideClosed && a.productStatus && a.productStatus !== 'Available') return false
    // 国家：匹配 code 或英文名
    if (countries.length) {
      const info = resolveCountry(a.country)
      const code = info?.code || ''
      const hit = countries.some((c) => c === code || c === a.country || c === info?.nameZh)
      if (!hit) return false
    }
    if (categories.length && !categories.includes(a.category)) return false
    if (tourCategories.length && !a.targetTourCategories.some((t) => tourCategories.includes(t))) return false
    if (tags.length && !tags.some((t) => a.tags.includes(t))) return false
    if (range) {
      // 任一价格落在区间内即命中（min/max 取非零值；都为零视为未知价格，不匹配价格筛选）
      const lo = a.priceMin || 0
      const hi = a.priceMax || a.priceMin || 0
      const hits = hi > 0 && lo <= range.max && hi >= range.min
      if (!hits) return false
    }
    if (q) {
      const hay = [a.title, a.country, a.city, a.category, a.subCategoryForActivity, ...a.tags, ...a.targetTourCategories, a.id]
        .filter(Boolean).join(' ').toLowerCase()
      // 中文搜索：标题/城市/子类目中文映射一并纳入匹配
      const zh = [
        MICE_ZH.titles[a.id],
        MICE_ZH.cities[a.city],
        (a.subCategoryForActivity || '').split(';#').map((s) => MICE_ZH.subCategories[s.trim()]).filter(Boolean).join(' '),
      ].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q) && !zh.includes(q)) return false
    }
    return true
  })
}
