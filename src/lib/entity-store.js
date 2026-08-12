'use client'

const STORAGE_KEY = 'euro-entities'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function readStore() {
  if (typeof window === 'undefined') return { entities: [], version: 1 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }

  // First load: seed from europe-travel.json attractions
  return { entities: seedFromData(), version: 1 }
}

function writeStore(data) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota exceeded */ }
}

function seedFromData() {
  // Dynamically import won't work here since we're in a 'use client' context.
  // Seed happens lazily via seedEntities() which the app calls on first load.
  return []
}

export function seedEntities() {
  const store = readStore()
  if (store.entities.length > 0) return // already seeded

  // We use a static import at call site. Here we receive the data.
  // The caller (page.js) passes the attractions array.
}

let _seeded = false
export function ensureSeeded(getAttractions) {
  if (_seeded) return
  const store = readStore()
  if (store.entities.length > 0) {
    _seeded = true
    return
  }

  const attractions = getAttractions()
  if (!attractions || attractions.length === 0) return

  store.entities = attractions.map((a) => ({
    id: a.id,
    name: a.name,
    nameEn: a.nameEn || '',
    type: a.type || 'attraction',
    subtype: a.type || 'landmark',  // landmark | museum | nature | restaurant | hotel
    cityId: a.city?.id || '',
    cityName: a.city?.name || '',
    countryId: a.country?.id || '',
    countryName: a.country?.name || '',
    address: '',
    phone: '',
    website: '',
    notes: a.description || '',
    tips: a.tips || '',
    imageSearchUrl: a.imageSearchUrl || '',
    // Type-specific
    ticketTypes: [],
    openingHours: '',
    duration: null,         // minutes
    roomTypes: [],
    starRating: 0,
    cuisine: '',
    priceRange: '',
    mode: '',
    capacity: 0,
    languages: [],
    contactInfo: '',
    // Metadata
    lat: a.lat ?? null,
    lng: a.lng ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
  writeStore(store)
  _seeded = true
}

// ---- CRUD ----

export function getAllEntities() {
  return readStore().entities
}

export function getEntitiesByType(type) {
  return readStore().entities.filter((e) => e.type === type)
}

export function getEntityById(id) {
  return readStore().entities.find((e) => e.id === id) || null
}

export function searchEntities(query, types) {
  const store = readStore()
  const q = query.toLowerCase()
  return store.entities.filter((e) => {
    if (types && types.length > 0 && !types.includes(e.type)) return false
    if (!q) return true
    return (
      e.name.toLowerCase().includes(q) ||
      e.cityName.toLowerCase().includes(q) ||
      e.countryName.toLowerCase().includes(q) ||
      e.notes.toLowerCase().includes(q)
    )
  })
}

export function createEntity(data) {
  const store = readStore()
  const entity = {
    id: uid(),
    name: data.name || '',
    type: data.type || 'attraction',
    subtype: data.subtype || '',
    cityId: data.cityId || '',
    cityName: data.cityName || '',
    countryId: data.countryId || '',
    countryName: data.countryName || '',
    address: data.address || '',
    phone: data.phone || '',
    website: data.website || '',
    notes: data.notes || '',
    tips: data.tips || '',
    imageSearchUrl: data.imageSearchUrl || '',
    ticketTypes: data.ticketTypes || [],
    openingHours: data.openingHours || '',
    duration: data.duration || null,
    roomTypes: data.roomTypes || [],
    starRating: data.starRating || 0,
    cuisine: data.cuisine || '',
    priceRange: data.priceRange || '',
    mode: data.mode || '',
    capacity: data.capacity || 0,
    languages: data.languages || [],
    contactInfo: data.contactInfo || '',
    lat: data.lat || null,
    lng: data.lng || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  store.entities.push(entity)
  writeStore(store)
  return entity
}

export function updateEntity(id, updates) {
  const store = readStore()
  const e = store.entities.find((e) => e.id === id)
  if (!e) return null
  Object.assign(e, updates)
  e.updatedAt = new Date().toISOString()
  writeStore(store)
  return e
}

export function deleteEntity(id) {
  const store = readStore()
  store.entities = store.entities.filter((e) => e.id !== id)
  writeStore(store)
}

export function getEntityStats() {
  const store = readStore()
  const counts = {}
  store.entities.forEach((e) => {
    counts[e.type] = (counts[e.type] || 0) + 1
  })
  return counts
}
