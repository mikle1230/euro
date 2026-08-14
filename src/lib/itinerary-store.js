'use client'

import { useSyncExternalStore } from 'react'
import { uid } from './id'
import { getAllEntities, replaceAllEntities } from './entity-store'
import { getCityCode } from './quos-mapping'

const STORAGE_KEY = 'euro-itineraries'
const SERIAL_KEY = 'euro-itinerary-serial'
const TEMPLATE_KEY = 'euro-templates'

// ---- Reactive core (in-memory cache + localStorage + subscription) ----
// 数据流：组件调 mutation 函数 → 改内存 state → commit() 持久化并通知订阅者
// 组件用 useItineraries() 订阅，store 一变就自动重渲染，无需手动 refresh
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

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getVersion() {
  return version
}

export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion)
}

export function useItineraries() {
  useStoreVersion()
  return loadState()
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
// 统一 item 形状：AI 导入和手动添加都走这里，避免字段漂移
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
  }
}

// ---- Itineraries ----

export function createItinerary(name) {
  const store = loadState()
  const itinerary = {
    id: uid(),
    serialNumber: getNextSerial(),
    name: name || '未命名行程',
    startDate: '',
    endDate: '',
    groupSize: 0,
    tourCode: '',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [],
  }
  store.itineraries.push(itinerary)
  store.activeId = itinerary.id
  commit()
  return itinerary
}

export function deleteItinerary(id) {
  const store = loadState()
  store.itineraries = store.itineraries.filter((t) => t.id !== id)
  if (store.activeId === id) {
    store.activeId = store.itineraries[0]?.id || null
  }
  commit()
}

export function renameItinerary(id, name) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === id)
  if (t) {
    t.name = name
    t.updatedAt = new Date().toISOString()
  }
  commit()
  return t
}

export function updateItineraryMeta(id, updates) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === id)
  if (t) {
    Object.assign(t, updates)
    t.updatedAt = new Date().toISOString()
  }
  commit()
  return t
}

export function importItinerary(data) {
  const store = loadState()
  const itinerary = {
    id: uid(),
    serialNumber: getNextSerial(),
    name: data.name || '导入行程',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    groupSize: data.groupSize || 0,
    tourCode: data.tourCode || '',
    notes: data.notes || '',
    // 保留原文（AI 解析用文本），供「AI 反馈重解析」复用，无需重新上传
    sourceText: data.sourceText || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: (data.days || []).map((d) => ({
      id: uid(),
      dayNumber: d.dayNumber,
      cityId: d.cityId || '',
      cityName: d.cityName || '',
      cityNameEn: d.cityNameEn || '',
      cityCode: d.cityCode || '',
      countryCode: d.countryCode || '',
      finalCityName: d.finalCityName || '',
      finalCityNameEn: d.finalCityNameEn || '',
      items: (d.items || []).map((item) => makeItem(item)),
    })),
  }
  store.itineraries.push(itinerary)
  store.activeId = itinerary.id
  commit()
  return itinerary
}

// ---- AI 反馈重解析：原地替换行程内容（保留 id/serialNumber/原文）----
// days 需已做过城市匹配（cityId/cityName 等），由调用方（itinerary-list）准备。
export function replaceItineraryContent(id, { days = [], name, tourCode, startDate, endDate, groupSize }) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === id)
  if (!t) return null
  t.name = name || t.name
  t.tourCode = tourCode || t.tourCode
  t.startDate = startDate || t.startDate
  t.endDate = endDate || t.endDate
  t.groupSize = groupSize || t.groupSize
  t.days = days.map((d) => ({
    id: uid(),
    dayNumber: d.dayNumber,
    cityId: d.cityId || '',
    cityName: d.cityName || '',
    cityNameEn: d.cityNameEn || '',
    cityCode: d.cityCode || '',
    countryCode: d.countryCode || '',
    finalCityName: d.finalCityName || '',
    finalCityNameEn: d.finalCityNameEn || '',
    items: (d.items || []).map((item) => makeItem(item)),
  }))
  t.updatedAt = new Date().toISOString()
  commit()
  return t
}

export function setActiveItinerary(id) {
  const store = loadState()
  store.activeId = id
  commit()
}

// ---- Days ----

export function addDay(itineraryId, cityId, cityName) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return null

  const info = getCityCode(cityName, '')
  const day = {
    id: uid(),
    dayNumber: t.days.length + 1,
    cityId,
    cityName,
    cityCode: info?.cityCode || '',
    countryCode: info?.countryCode || '',
    finalCityName: '',
    finalCityNameEn: '',
    items: [],
  }
  t.days.push(day)
  t.updatedAt = new Date().toISOString()
  commit()
  return day
}

export function removeDay(itineraryId, dayId) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  t.days = t.days.filter((d) => d.id !== dayId)
  t.days.forEach((d, i) => { d.dayNumber = i + 1 })
  t.updatedAt = new Date().toISOString()
  commit()
}

export function reorderDays(itineraryId, dayIds) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const map = new Map(t.days.map((d) => [d.id, d]))
  t.days = dayIds.map((id, i) => {
    const d = map.get(id)
    d.dayNumber = i + 1
    return d
  })
  t.updatedAt = new Date().toISOString()
  commit()
}

export function updateDayCity(itineraryId, dayId, cityId, cityName) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (d) {
    const info = getCityCode(cityName, '')
    d.cityId = cityId
    d.cityName = cityName
    d.cityCode = info?.cityCode || ''
    d.countryCode = info?.countryCode || ''
    t.updatedAt = new Date().toISOString()
  }
  commit()
}

export function updateDay(itineraryId, dayId, updates) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (d) {
    Object.assign(d, updates)
    t.updatedAt = new Date().toISOString()
  }
  commit()
}

// ---- Items within a day ----

export function addItem(itineraryId, dayId, item) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return null
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return null

  const newItem = makeItem(item)
  d.items.push(newItem)
  t.updatedAt = new Date().toISOString()
  commit()
  return newItem
}

export function removeItem(itineraryId, dayId, itemId) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return
  d.items = d.items.filter((i) => i.id !== itemId)
  t.updatedAt = new Date().toISOString()
  commit()
}

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

export function reorderItems(itineraryId, dayId, itemIds) {
  const store = loadState()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return
  const map = new Map(d.items.map((i) => [i.id, i]))
  d.items = itemIds.map((id) => map.get(id)).filter(Boolean)
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

export function saveAsTemplate(itineraryId) {
  const store = loadState()
  const it = store.itineraries.find((t) => t.id === itineraryId)
  if (!it || it.days.length === 0) return null

  const templates = readTemplates()
  const template = {
    id: uid(),
    name: it.name + ' (模板)',
    description: it.days.map((d) => d.cityName).filter((n, i, a) => a.indexOf(n) === i).join('→'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: it.days.map((d) => ({
      id: uid(),
      dayNumber: d.dayNumber,
      cityId: d.cityId,
      cityName: d.cityName,
      items: d.items.map((item) => ({ ...item, id: uid() })),
    })),
  }
  templates.push(template)
  writeTemplates(templates)
  return template
}

export function createFromTemplate(templateId) {
  const templates = readTemplates()
  const tpl = templates.find((t) => t.id === templateId)
  if (!tpl) return null

  const store = loadState()
  const itinerary = {
    id: uid(),
    serialNumber: getNextSerial(),
    name: tpl.name.replace(' (模板)', ''),
    startDate: '',
    endDate: '',
    groupSize: 0,
    tourCode: '',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: tpl.days.map((d) => ({
      id: uid(),
      dayNumber: d.dayNumber,
      cityId: d.cityId,
      cityName: d.cityName,
      items: d.items.map((item) => ({
        ...item,
        id: uid(),
      })),
    })),
  }
  store.itineraries.push(itinerary)
  store.activeId = itinerary.id
  commit()
  return itinerary
}

export function deleteTemplate(id) {
  const templates = readTemplates()
  writeTemplates(templates.filter((t) => t.id !== id))
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

// ---- Itinerary utility ----

export function getItineraryStats(itinerary) {
  if (!itinerary) return { dayCount: 0, cityCount: 0, countryIds: [] }
  const cities = new Set(itinerary.days.map((d) => d.cityId).filter(Boolean))
  return {
    dayCount: itinerary.days.length,
    cityCount: cities.size,
  }
}
