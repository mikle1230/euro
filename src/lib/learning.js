'use client'

import { getAllAttractionsFlat } from './data'

const STORAGE_KEY = 'euro-learning-state'
const CURATED_COUNT = 61

/**
 * Deterministic daily index based on date string.
 * Same date → same attraction for all visitors.
 */
function getDailyIndex(dateStr) {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 */
export function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Get the ordered list of all attraction IDs for the learning sequence.
 * Curated (first 61) are shuffled with a fixed seed for deterministic order.
 * The remaining 76 auto-generated ones follow in their original order.
 */
function getLearningOrder() {
  const all = getAllAttractionsFlat()
  const curated = all.slice(0, CURATED_COUNT)
  const auto = all.slice(CURATED_COUNT)

  // Fisher-Yates shuffle with fixed seed for curated
  const seed = 42
  let s = seed
  function seededRandom() {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  for (let i = curated.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1))
    ;[curated[i], curated[j]] = [curated[j], curated[i]]
  }

  return [...curated, ...auto].map((a) => a.id)
}

/**
 * Get today's destination.
 * Returns the full attraction object with city and country context.
 */
export function getTodayDestination() {
  const order = getLearningOrder()
  const idx = getDailyIndex(getTodayStr()) % order.length
  return { attractionId: order[idx], total: order.length }
}

/**
 * Read learning state from localStorage.
 */
export function getLearningState() {
  if (typeof window === 'undefined') {
    return { learned: [], streak: 0, lastVisitDate: null, savedList: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { learned: [], streak: 0, lastVisitDate: null, savedList: [] }
}

/**
 * Save learning state to localStorage.
 */
function saveState(state) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

/**
 * Mark an attraction as learned today.
 * Updates streak and last visit date.
 */
export function markAsLearned(attractionId) {
  const state = getLearningState()
  const today = getTodayStr()

  if (state.learned.includes(attractionId)) return state

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  let streak = state.streak
  if (state.lastVisitDate === yesterdayStr) {
    streak += 1
  } else if (state.lastVisitDate === today) {
    // Already visited today, don't change streak
  } else {
    streak = 1
  }

  const newState = {
    learned: [...new Set([...state.learned, attractionId])],
    streak,
    lastVisitDate: today,
    savedList: state.savedList || [],
  }
  saveState(newState)
  return newState
}

/**
 * Check if today's destination has already been learned.
 */
export function isLearnedToday() {
  const state = getLearningState()
  if (state.lastVisitDate !== getTodayStr()) return false
  const { attractionId } = getTodayDestination()
  return state.learned.includes(attractionId)
}

/**
 * Toggle an attraction in the saved/wishlist.
 */
export function toggleSaved(attractionId) {
  const state = getLearningState()
  const list = state.savedList || []
  const idx = list.indexOf(attractionId)
  if (idx === -1) list.push(attractionId)
  else list.splice(idx, 1)
  saveState({ ...state, savedList: list })
  return list
}

/**
 * Get learning statistics.
 */
export function getStats() {
  const state = getLearningState()
  const all = getAllAttractionsFlat()
  const { attractionId } = getTodayDestination()

  const todayDest = all.find((a) => a.id === attractionId)

  const allCountries = getAllAttractionsFlat()
    .filter((a) => state.learned.includes(a.id))
    .map((a) => a.country.id)

  return {
    learned: state.learned.length,
    total: all.length,
    streak: state.streak,
    saved: (state.savedList || []).length,
    todayAttraction: todayDest || null,
    todayLearned: state.learned.includes(attractionId),
    countriesCovered: new Set(allCountries).size,
  }
}

/**
 * Get review queue: the 3 earliest learned attractions (by order in learned array).
 */
export function getReviewQueue() {
  const state = getLearningState()
  if (state.learned.length === 0) return []

  const all = getAllAttractionsFlat()
  // Return the first 3 learned items (earliest learned first)
  return state.learned
    .slice(0, 3)
    .map((id) => all.find((a) => a.id === id))
    .filter(Boolean)
}

/**
 * Get saved attractions with full data.
 */
export function getSavedAttractions() {
  const state = getLearningState()
  const all = getAllAttractionsFlat()
  return (state.savedList || [])
    .map((id) => all.find((a) => a.id === id))
    .filter(Boolean)
}
