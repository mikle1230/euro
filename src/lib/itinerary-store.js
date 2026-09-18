'use client'

// 行程 store（2026-09-18 瘦身：解析链路砍掉后，只保留查询平台仍需要的部分）
//
// 现存导出只服务两个调用方：
//   · src/app/settings/page.jsx                —— exportAllData / importAllData（数据备份）、
//                                                getQuotaWarning / subscribeQuotaWarning（写满告警）
//   · src/components/panel-views/quos-list.jsx —— updateItem / setDayChecked（QUOS 勾选状态）
// 已删除：解析导入、行程/天数/条目增删、重命名、模板 CRUD、useItineraries 等
// —— 这些只为旧「行程工作台」（upload-modal / itinerary-list / explore）存在。

import { uid } from './id'
import { getAllEntities, replaceAllEntities } from './entity-store'

const STORAGE_KEY = 'euro-itineraries'
const SERIAL_KEY = 'euro-itinerary-serial'
const TEMPLATE_KEY = 'euro-templates'

// ---- Reactive core (in-memory cache + localStorage + subscription) ----
// 数据流：组件调 mutation 函数 → 改内存 state → commit() 持久化并通知订阅者
let state = null
let version = 0
const listeners = new Set()

// ---- Storage quota warning ----
// localStorage 写满（约 5MB）时静默失败会导致数据丢失，这里把失败暴露出来，
// UI 订阅后提示用户立即导出备份。
let quotaWarning = false
const quotaListeners = new Set()

function setQuotaWarning(v) {
  if (quotaWarning === v) return
  quotaWarning = v
  quotaListeners.forEach((l) => l(v))
}

export function getQuotaWarning() {
  return quotaWarning
}

export function subscribeQuotaWarning(cb) {
  quotaListeners.add(cb)
  return () => quotaListeners.delete(cb)
}

// ---- Cross-tab sync ----
// 另一个标签页写入 localStorage 时刷新内存 state 并通知订阅者，
// 避免多标签同时编辑互相覆盖。
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return
    try {
      state = e.newValue ? JSON.parse(e.newValue) : { itineraries: [], activeId: null }
    } catch { return }
    version++
    listeners.forEach((l) => l())
  })
}

function loadState() {
  if (state !== null) return state
  state = { itineraries: [], activeId: null }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) state = JSON.parse(raw)
    } catch { /* ignore */ }
  }
  migrate(state)
  return state
}

function commit() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setQuotaWarning(false)
    } catch {
      setQuotaWarning(true)
    }
  }
  version++
  listeners.forEach((l) => l())
}

// ---- Serial number ----
function getNextSerial() {
  if (typeof window === 'undefined') return 0
  try {
    const current = parseInt(localStorage.getItem(SERIAL_KEY) || '0', 10)
    const next = current + 1
    localStorage.setItem(SERIAL_KEY, String(next))
    return next
  } catch {
    return 0
  }
}

// ---- One-time migration: backfill serialNumber ----
function migrate(store) {
  let changed = false
  store.itineraries.forEach((it) => {
    if (!it.serialNumber) {
      it.serialNumber = getNextSerial()
      changed = true
    }
  })
  if (changed && typeof window !== 'undefined') {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch { /* ignore */ }
  }
}

// ---- Item schema factory ----
// 统一 item 形状：导入备份与手动编辑都走这里，避免字段漂移
function makeItem(input = {}) {
  return {
    id: input.id || uid(),
    type: input.type || 'attraction',
    name: input.name || '',
    nameEn: input.nameEn || '',
    startTime: input.startTime || '',
    endTime: input.endTime || '',
    from: input.from || '',
    to: input.to || '',
    transportMode: input.transportMode || 'bus',
    transportSubtype: input.transportSubtype || '',
    distance: input.distance || null,
    duration: input.duration || null,
    entityId: input.entityId || null,
    entityType: input.entityType || null,
    costCategory: input.costCategory || (input.estimatedCost > 0 ? 'paid' : ''),
    estimatedCost: input.estimatedCost || 0,
    price: input.price || input.estimatedCost || 0,
    priceUnit: input.priceUnit || 'perPerson',
    quantity: input.quantity || 0,
    notes: input.notes || '',
    quosChecked: input.quosChecked || false,
    quoteKind: input.quoteKind || undefined,
    quoteOrder: input.quoteOrder ?? undefined,
    locationCategory: input.locationCategory || undefined,
    // 报价注入项自带的国/城（保险=CN/BJS、THROUGH COACH=LDC 供应商所在地），
    // 不落库就会回退显示当天城市（历史 bug）
    cityCode: input.cityCode || '',
    countryCode: input.countryCode || '',
  }
}

// ---- Items within a day ----

export function updateItem(itineraryId, dayId, itemId, updates) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return
  const item = d.items.find((i) => i.id === itemId)
  if (!item) return
  Object.assign(item, updates)
  t.updatedAt = new Date().toISOString()
  commit()
}

export function setDayChecked(itineraryId, dayId, checked) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return
  d.quosChecked = checked
  d.items.forEach((item) => { item.quosChecked = checked })
  t.updatedAt = new Date().toISOString()
  commit()
}

// ---- Templates ----

function readTemplates() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return getBuiltInTemplates()
}

function writeTemplates(data) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

function getBuiltInTemplates() {
  const now = new Date().toISOString()
  return [
    {
      id: 'tpl-classic-7',
      name: '经典法意瑞 10 天',
      description: '巴黎→尼斯→罗马→佛罗伦萨→威尼斯→卢塞恩→因特拉肯',
      createdAt: now,
      updatedAt: now,
      days: [
        { id: 'd1', dayNumber: 1, cityId: 'paris', cityName: '巴黎', items: [] },
        { id: 'd2', dayNumber: 2, cityId: 'paris', cityName: '巴黎', items: [] },
        { id: 'd3', dayNumber: 3, cityId: 'nice', cityName: '尼斯', items: [] },
        { id: 'd4', dayNumber: 4, cityId: 'rome', cityName: '罗马', items: [] },
        { id: 'd5', dayNumber: 5, cityId: 'rome', cityName: '罗马', items: [] },
        { id: 'd6', dayNumber: 6, cityId: 'florence', cityName: '佛罗伦萨', items: [] },
        { id: 'd7', dayNumber: 7, cityId: 'venice', cityName: '威尼斯', items: [] },
        { id: 'd8', dayNumber: 8, cityId: 'lucerne', cityName: '卢塞恩', items: [] },
        { id: 'd9', dayNumber: 9, cityId: 'interlaken', cityName: '因特拉肯', items: [] },
        { id: 'd10', dayNumber: 10, cityId: 'interlaken', cityName: '因特拉肯', items: [] },
      ],
    },
    {
      id: 'tpl-eastern-12',
      name: '东欧五国 12 天',
      description: '布拉格→维也纳→萨尔茨堡→布达佩斯→克拉科夫',
      createdAt: now,
      updatedAt: now,
      days: [
        { id: 'd1', dayNumber: 1, cityId: 'prague', cityName: '布拉格', items: [] },
        { id: 'd2', dayNumber: 2, cityId: 'prague', cityName: '布拉格', items: [] },
        { id: 'd3', dayNumber: 3, cityId: 'prague', cityName: '布拉格', items: [] },
        { id: 'd4', dayNumber: 4, cityId: 'vienna', cityName: '维也纳', items: [] },
        { id: 'd5', dayNumber: 5, cityId: 'vienna', cityName: '维也纳', items: [] },
        { id: 'd6', dayNumber: 6, cityId: 'salzburg', cityName: '萨尔茨堡', items: [] },
        { id: 'd7', dayNumber: 7, cityId: 'salzburg', cityName: '萨尔茨堡', items: [] },
        { id: 'd8', dayNumber: 8, cityId: 'budapest', cityName: '布达佩斯', items: [] },
        { id: 'd9', dayNumber: 9, cityId: 'budapest', cityName: '布达佩斯', items: [] },
        { id: 'd10', dayNumber: 10, cityId: 'krakow', cityName: '克拉科夫', items: [] },
        { id: 'd11', dayNumber: 11, cityId: 'krakow', cityName: '克拉科夫', items: [] },
        { id: 'd12', dayNumber: 12, cityId: 'krakow', cityName: '克拉科夫', items: [] },
      ],
    },
    {
      id: 'tpl-uk-5',
      name: '英伦双城 5 天',
      description: '伦敦→爱丁堡',
      createdAt: now,
      updatedAt: now,
      days: [
        { id: 'd1', dayNumber: 1, cityId: 'london', cityName: '伦敦', items: [] },
        { id: 'd2', dayNumber: 2, cityId: 'london', cityName: '伦敦', items: [] },
        { id: 'd3', dayNumber: 3, cityId: 'london', cityName: '伦敦', items: [] },
        { id: 'd4', dayNumber: 4, cityId: 'edinburgh', cityName: '爱丁堡', items: [] },
        { id: 'd5', dayNumber: 5, cityId: 'edinburgh', cityName: '爱丁堡', items: [] },
      ],
    },
  ]
}

export function getAllTemplates() {
  return readTemplates()
}

// ---- Backup: export / import ----
// 所有数据（行程 + 实体 + 模板）打包成一个 JSON 下载；导入时整体恢复。
// localStorage 有约 5MB 上限且无法跨设备，建议定期导出备份。

export function exportAllData() {
  const s = loadState()
  // 内置模板（代码里 fallback 的那 3 个）不导出，避免导入后与内置模板重复
  const BUILTIN_TEMPLATE_IDS = new Set(['tpl-classic-7', 'tpl-eastern-12', 'tpl-uk-5'])
  return {
    app: 'euro-atlas',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    activeId: s.activeId,
    itineraries: s.itineraries,
    entities: getAllEntities(),
    templates: getAllTemplates().filter((t) => !BUILTIN_TEMPLATE_IDS.has(t.id)),
  }
}

export function importAllData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('备份文件格式不正确')
  }
  if (!Array.isArray(data.itineraries)) {
    throw new Error('备份文件中缺少行程数据（itineraries）')
  }
  if (typeof window === 'undefined') return

  // 归一化：走过的字段统一过 makeItem，避免旧备份/手工编辑导致字段漂移
  const itineraries = data.itineraries.map((it) => ({
    ...it,
    days: (it.days || []).map((d) => ({
      ...d,
      id: d.id || uid(),
      items: (d.items || []).map((item) => makeItem(item)),
    })),
  }))
  const nextState = {
    itineraries,
    activeId: data.activeId || itineraries[0]?.id || null,
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
    if (Array.isArray(data.entities)) replaceAllEntities(data.entities)
    if (Array.isArray(data.templates)) writeTemplates(data.templates)
    setQuotaWarning(false)
  } catch {
    setQuotaWarning(true)
    throw new Error('存储空间不足，无法写入全部备份数据，请清理后重试')
  }

  state = nextState
  version++
  listeners.forEach((l) => l())
}
