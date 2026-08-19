// 纯函数模块：类型映射 / 免费判定 / 城市代码查找 / QUOS 排序。
// 无 'use client' —— 服务端（route.js / coach-plan.js）与客户端均可 import，
// localStorage 访问全部带 typeof window 守卫。
import quosCities from '../data/quos-cities.json' with { type: 'json' }
import quosAttractions from '../data/quos-attractions.json' with { type: 'json' }
import { normalizeCityName as normCity } from './normalize.js'
import { CITY_CODE_ALIASES as CITY_ALIASES } from '../data/city-aliases.js'
import { MANUAL_CODES } from '../data/manual-codes.js'

// ---- QUOS Type Definitions ----
export const DEFAULT_QUOS_ORDER = [
  'HTL', 'MTC', 'ENT', 'RST', 'GUI',
  'FLT', 'DTR', 'OTR', 'DFR', 'OFR',
  'LUG', 'OTH',
]

export const QUOS_LABELS = {
  HTL: 'Hotel',
  MTC: 'Motor Coach',
  ENT: 'Entrance',
  RST: 'Restaurant',
  GUI: 'Guide',
  FLT: 'Flight',
  DTR: 'Day Train',
  OTR: 'Overnight Train',
  DFR: 'Day Ferry',
  OFR: 'Overnight Ferry',
  LUG: 'Luggage',
  OTH: 'Others',
}

const QUOS_ORDER_KEY = 'euro-quos-order'

// Map generic item type (+ transportMode/transportSubtype) to QUOS code
export function getQUOSType(item) {
  const type = item.type

  if (type === 'hotel') return { code: 'HTL', label: 'Hotel' }
  if (type === 'attraction') return { code: 'ENT', label: 'Entrance' }
  if (type === 'breakfast' || type === 'lunch' || type === 'dinner') return { code: 'RST', label: 'Restaurant' }

  if (type === 'transport') {
    const mode = item.transportMode || ''
    const subtype = item.transportSubtype || ''

    if (mode === 'flight') return { code: 'FLT', label: 'Flight' }
    if (mode === 'train') {
      if (subtype === 'overnight') return { code: 'OTR', label: 'Overnight Train' }
      return { code: 'DTR', label: 'Day Train' }
    }
    if (mode === 'boat') {
      if (subtype === 'overnight') return { code: 'OFR', label: 'Overnight Ferry' }
      return { code: 'DFR', label: 'Day Ferry' }
    }
    // bus, car, walk, metro → MTC (Motor Coach / ground transport)
    return { code: 'MTC', label: 'Motor Coach' }
  }

  if (type === 'guide') return { code: 'GUI', label: 'Guide' }
  if (type === 'luggage') return { code: 'LUG', label: 'Luggage' }

  return { code: 'OTH', label: 'Others' }
}

// ---- Free/Paid ----
// 免费/收费判定（唯一实现）
export function isFreeItem(item) {
  if (item.costCategory === 'free') return true
  if (item.costCategory === 'paid') return false
  // 旧数据没有 costCategory：通过价格推断
  return !item.price || item.price === 0
}

// ---- Visibility Filter ----
// 行程详情/录入Copilot/天数详情共用的「隐藏」判定（默认只显示酒店+用车+保险等报价项）
const INLAND_TRANSIT_CODES = ['FLT', 'DTR', 'OTR', 'DFR', 'OFR']

export function shouldHideItem(item, opts = {}) {
  const { hideFree = false, hideMeals = false, hideAttractions = false, hideInlandTransit = false } = opts
  const code = getQUOSType(item).code
  if (hideFree && isFreeItem(item)) return true
  if (hideMeals && code === 'RST') return true
  if (hideAttractions && code === 'ENT' && !isFreeItem(item)) return true
  if (hideInlandTransit && INLAND_TRANSIT_CODES.includes(code)) return true
  return false
}

// ---- 归一化索引（通用变体修复）----
// Cities.xlsx 里同一城市可能有多种写法（Saint Tropez / Saint-Tropez / St. Tropez），
// 精确匹配失败时按「去空格/连字符/撇号/点 + 小写」兜底，如 Saint-Tropez → JSZ。
let normIndex = null
function buildNormIndex() {
  if (normIndex) return normIndex
  normIndex = new Map()
  for (const key of Object.keys(quosCities)) {
    const n = normCity(key)
    if (!normIndex.has(n)) normIndex.set(n, quosCities[key])
  }
  return normIndex
}

// ---- 城市码反查索引 ----
// AI 可能直接输出城市码/机场码（WAW / ROM / CDG）作为 from/to —— 反查 cityCode → { cityCode, countryCode }，
// 使 getCityCode('WAW') 也能解析（同一码多城市名时取首个，码/国相同不影响使用）。
let codeIndex = null
function buildCodeIndex() {
  if (codeIndex) return codeIndex
  codeIndex = new Map()
  for (const [key, v] of Object.entries(quosCities)) {
    if (v?.cityCode && !codeIndex.has(v.cityCode)) codeIndex.set(v.cityCode, v)
  }
  return codeIndex
}

// ---- City Code Lookup ----
export function getCityCode(cityName, englishName) {
  if (!cityName) return null
  // 先精确匹配中文名：中文键来自 europe-travel.json / curated-cities.cjs（可靠数据）。
  // 英文名后查——同名城市可能错配（如西西里锡拉库扎 Syracuse vs 美国锡拉丘兹 Syracuse→US），
  // 中文名没有歧义，优先以中文为准。
  const exact = quosCities[cityName]
  if (exact) return exact
  const trimmed = cityName.trim()
  if (trimmed !== cityName) {
    const trimEntry = quosCities[trimmed]
    if (trimEntry) return trimEntry
  }
  // English name — direct match against Cities.xlsx (8300+ entries)
  if (englishName) {
    const entry = quosCities[englishName]
    if (entry) return entry
  }
  // Try alias chain (follow aliases recursively, max 3 hops to avoid loops)
  let alias = CITY_ALIASES[cityName] || CITY_ALIASES[trimmed]
  for (let i = 0; i < 3 && alias; i++) {
    const aliasEntry = quosCities[alias]
    if (aliasEntry) return aliasEntry
    alias = CITY_ALIASES[alias]
  }
  // 兜底：归一化匹配（去空格/连字符/撇号/点），覆盖写法变体（中英文都试）
  const normalized = normCity(trimmed) || (englishName ? normCity(englishName) : '')
  if (normalized) {
    const hit = buildNormIndex().get(normalized)
    if (hit) return hit
  }
  // 城市码输入（如 'WAW'/'ROM'）反查：AI 的 from/to 可能直接输出城市码/机场码
  const codeKey = trimmed.toUpperCase()
  const codeEntry = buildCodeIndex().get(codeKey)
  if (codeEntry) return codeEntry
  // 手动补码表（Cities.xlsx 表外城市，如以弗所）：用户给码后自动兜底
  const manual = MANUAL_CODES[cityName] || MANUAL_CODES[trimmed] || (englishName ? MANUAL_CODES[englishName] : null)
  if (manual) return manual
  return null
}

// ---- Attraction English Name (QUOS standard) ----
export function getAttractionNameEn(chineseName) {
  if (!chineseName) return ''
  // Priority 1: KT 巴黎景点.xlsx standard name
  if (quosAttractions[chineseName]) return quosAttractions[chineseName]
  // Priority 2: euro-travel.json entity store
  // Priority 3: blank
  return ''
}

// ---- Sort Order Persistence ----
export function getQUOSOrder() {
  if (typeof window === 'undefined') return DEFAULT_QUOS_ORDER
  try {
    const raw = localStorage.getItem(QUOS_ORDER_KEY)
    if (raw) {
      const order = JSON.parse(raw)
      // Validate: must be an array of 12 valid codes
      if (Array.isArray(order) && order.length === 12 &&
          order.every(c => DEFAULT_QUOS_ORDER.includes(c)) &&
          (new Set(order)).size === 12) {
        return order
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_QUOS_ORDER
}

export function saveQUOSOrder(order) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(QUOS_ORDER_KEY, JSON.stringify(order))
  } catch { /* ignore */ }
}
