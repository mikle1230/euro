// 城市坐标查询 + 车程估算（纯函数，无 'use client'）
// 用于 coach-plan 计算 THROUGH COACH 的 MTC EMPTY RUN 空驶公里数。
// 距离为 haversine 直线距离 × 道路系数 1.3 的参考估算（非导航实测）。
import cityCoordsData from '../data/city-coords.js'
import { haversineKm } from './geo.js'

const norm = (s) => String(s || '').toLowerCase().replace(/[\s\-'.·]/g, '')

// 一次性索引：中文/英文/写法变体均可命中
const INDEX = (() => {
  const map = new Map()
  for (const [k, [lat, lng]] of Object.entries(cityCoordsData)) {
    const n = norm(k)
    if (!map.has(n)) map.set(n, [lat, lng])
  }
  return map
})()

// 城市名 → [lat, lng]，未命中返回 null
export function getCityCoords(name) {
  if (!name) return null
  return INDEX.get(norm(name)) || null
}

const ROAD_FACTOR = 1.3 // 道路/直线 距离系数（欧洲中长距离参考值）

// 两城市间车程估算（km），未命中任一城市返回 0
export function estimateRoadKm(cityA, cityB) {
  const a = getCityCoords(cityA)
  const b = getCityCoords(cityB)
  if (!a || !b) return 0
  const km = haversineKm(a[0], a[1], b[0], b[1]) * ROAD_FACTOR
  return Math.max(0, Math.round(km / 5) * 5) // 就近取整到 5km
}
