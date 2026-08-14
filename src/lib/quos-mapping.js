'use client'

import quosCities from '@/data/quos-cities.json'
import quosAttractions from '@/data/quos-attractions.json'

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
// 免费/收费判定（唯一实现，day-detail 与 quos-list 均 import 此处）
export function isFreeItem(item) {
  if (item.costCategory === 'free') return true
  if (item.costCategory === 'paid') return false
  // 旧数据没有 costCategory：通过价格推断
  return !item.price || item.price === 0
}

// ---- City Name Aliases ----
// Handle variations: different Chinese translations, English→native name, etc.
// quosCities keys are English + Chinese (from europe-travel.json cross-reference).
// AI may output names not in either dataset.
const CITY_ALIASES = {
  // Chinese name variants (both translations for same city)
  '琉森': '卢塞恩',
  // English → native (Cities.xlsx uses native names for some cities)
  'Milan': 'Milano',
  // Chinese → English (cities NOT in europe-travel.json but common in itineraries)
  '米兰': 'Milan',
  // Chinese departure cities (not in europe-travel.json)
  '北京': 'Beijing',
  '上海': 'Shanghai',
  '广州': 'Guangzhou',
  '深圳': 'Shenzhen',
  '成都': 'Chengdu',
  '西安': 'Xi An',
}

// ---- City Code Lookup ----
export function getCityCode(cityName, englishName) {
  // Try English name first — direct match against Cities.xlsx (8300+ entries)
  if (englishName) {
    const entry = quosCities[englishName]
    if (entry) return entry
  }
  if (!cityName) return null
  const entry = quosCities[cityName]
  if (entry) return entry
  const trimmed = cityName.trim()
  if (trimmed !== cityName) {
    const trimEntry = quosCities[trimmed]
    if (trimEntry) return trimEntry
  }
  // Try alias chain (follow aliases recursively, max 3 hops to avoid loops)
  let alias = CITY_ALIASES[cityName] || CITY_ALIASES[trimmed]
  for (let i = 0; i < 3 && alias; i++) {
    const aliasEntry = quosCities[alias]
    if (aliasEntry) return aliasEntry
    alias = CITY_ALIASES[alias]
  }
  return null
}

// ---- Attraction English Name (QUOS standard) ----
export function getAttractionNameEn(chineseName) {
  if (!chineseName) return ''
  // Priority 1: KT 巴黎景点.xlsx standard name
  if (quosAttractions[chineseName]) return quosAttractions[chineseName]
  // Priority 2: euro-travel.json entity store (handled by caller in DayDetail)
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
