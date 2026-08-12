'use client'

const STORAGE_KEY = 'euro-itineraries'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function readStore() {
  if (typeof window === 'undefined') return { itineraries: [], activeId: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw
      ? JSON.parse(raw)
      : { itineraries: [], activeId: null }
  } catch {
    return { itineraries: [], activeId: null }
  }
}

function writeStore(data) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota exceeded */ }
}

// ---- Itineraries ----

export function getAllItineraries() {
  return readStore().itineraries
}

export function getItinerary(id) {
  return readStore().itineraries.find((t) => t.id === id) || null
}

export function getActiveItinerary() {
  const store = readStore()
  if (store.activeId) {
    return store.itineraries.find((t) => t.id === store.activeId) || null
  }
  return store.itineraries[0] || null
}

export function createItinerary(name) {
  const store = readStore()
  const itinerary = {
    id: uid(),
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
  writeStore(store)
  return itinerary
}

export function deleteItinerary(id) {
  const store = readStore()
  store.itineraries = store.itineraries.filter((t) => t.id !== id)
  if (store.activeId === id) {
    store.activeId = store.itineraries[0]?.id || null
  }
  writeStore(store)
}

export function renameItinerary(id, name) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === id)
  if (t) {
    t.name = name
    t.updatedAt = new Date().toISOString()
  }
  writeStore(store)
  return t
}

export function updateItineraryMeta(id, updates) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === id)
  if (t) {
    Object.assign(t, updates)
    t.updatedAt = new Date().toISOString()
  }
  writeStore(store)
  return t
}

export function importItinerary(data) {
  const store = readStore()
  const itinerary = {
    id: uid(),
    name: data.name || '导入行程',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    groupSize: data.groupSize || 0,
    tourCode: data.tourCode || '',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: (data.days || []).map((d) => ({
      id: uid(),
      dayNumber: d.dayNumber,
      cityId: d.cityId || '',
      cityName: d.cityName || '',
      cityNameEn: d.cityNameEn || '',
      items: (d.items || []).map((item) => ({
        id: uid(),
        type: item.type || 'attraction',
        name: item.name || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        from: item.from || '',
        to: item.to || '',
        transportMode: item.transportMode || 'bus',
        transportSubtype: item.transportSubtype || '',
        distance: item.distance || null,
        duration: item.duration || null,
        entityId: item.entityId || null,
        entityType: item.entityType || null,
        costCategory: item.costCategory || 'paid',
        estimatedCost: item.estimatedCost || 0,
        price: item.price || 0,
        priceUnit: item.priceUnit || 'perPerson',
        quantity: item.quantity || 0,
        notes: item.notes || '',
      })),
    })),
  }
  store.itineraries.push(itinerary)
  store.activeId = itinerary.id
  writeStore(store)
  return itinerary
}

export function setActiveItinerary(id) {
  const store = readStore()
  store.activeId = id
  writeStore(store)
}

// ---- Days ----

export function addDay(itineraryId, cityId, cityName) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return null

  const day = {
    id: uid(),
    dayNumber: t.days.length + 1,
    cityId,
    cityName,
    items: [],
  }
  t.days.push(day)
  t.updatedAt = new Date().toISOString()
  writeStore(store)
  return day
}

export function removeDay(itineraryId, dayId) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  t.days = t.days.filter((d) => d.id !== dayId)
  // Renumber
  t.days.forEach((d, i) => { d.dayNumber = i + 1 })
  t.updatedAt = new Date().toISOString()
  writeStore(store)
}

export function reorderDays(itineraryId, dayIds) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const map = new Map(t.days.map((d) => [d.id, d]))
  t.days = dayIds.map((id, i) => {
    const d = map.get(id)
    d.dayNumber = i + 1
    return d
  })
  t.updatedAt = new Date().toISOString()
  writeStore(store)
}

export function updateDayCity(itineraryId, dayId, cityId, cityName) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (d) {
    d.cityId = cityId
    d.cityName = cityName
    t.updatedAt = new Date().toISOString()
  }
  writeStore(store)
}

// ---- Items within a day ----

export function addItem(itineraryId, dayId, item) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return null
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return null

  const newItem = {
    id: uid(),
    type: item.type || 'attraction',
    name: item.name || '',
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    // Transport specific
    from: item.from || '',
    to: item.to || '',
    transportMode: item.transportMode || 'bus',
    distance: item.distance || null,
    duration: item.duration || null,
    // Entity reference
    entityId: item.entityId || null,
    entityType: item.entityType || null,
    // Cost
    price: item.price || 0,
    priceUnit: item.priceUnit || 'perPerson',
    quantity: item.quantity || 0,
    // Notes
    notes: item.notes || '',
  }
  d.items.push(newItem)
  t.updatedAt = new Date().toISOString()
  writeStore(store)
  return newItem
}

export function removeItem(itineraryId, dayId, itemId) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return
  d.items = d.items.filter((i) => i.id !== itemId)
  t.updatedAt = new Date().toISOString()
  writeStore(store)
}

export function updateItem(itineraryId, dayId, itemId, updates) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return
  const item = d.items.find((i) => i.id === itemId)
  if (!item) return
  Object.assign(item, updates)
  t.updatedAt = new Date().toISOString()
  writeStore(store)
}

export function reorderItems(itineraryId, dayId, itemIds) {
  const store = readStore()
  const t = store.itineraries.find((t) => t.id === itineraryId)
  if (!t) return
  const d = t.days.find((d) => d.id === dayId)
  if (!d) return
  const map = new Map(d.items.map((i) => [i.id, i]))
  d.items = itemIds.map((id) => map.get(id)).filter(Boolean)
  t.updatedAt = new Date().toISOString()
  writeStore(store)
}

// ---- Templates ----

const TEMPLATE_KEY = 'euro-templates'

function readTemplates() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  // Seed with built-in templates
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
  const store = readStore()
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

  const store = readStore()
  const itinerary = {
    id: uid(),
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
  writeStore(store)
  return itinerary
}

export function deleteTemplate(id) {
  const templates = readTemplates()
  writeTemplates(templates.filter((t) => t.id !== id))
}

// ---- Itinerary utility ----

export function getItineraryRoute(itinerary) {
  if (!itinerary) return []
  return itinerary.days.map((d) => ({
    dayNumber: d.dayNumber,
    cityId: d.cityId,
    cityName: d.cityName,
    dayId: d.id,
  }))
}

export function getItineraryStats(itinerary) {
  if (!itinerary) return { dayCount: 0, cityCount: 0, countryIds: [] }
  const cities = new Set(itinerary.days.map((d) => d.cityId).filter(Boolean))
  return {
    dayCount: itinerary.days.length,
    cityCount: cities.size,
  }
}
