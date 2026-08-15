// 真实车程查询（EMPTY RUN 空驶公里数用）
// 优先调用免费 OSRM 公开路线服务（真实驾驶距离），失败/离线时回退 haversine×1.3 估算。
// 纯函数库（无 'use client'），route.js 解析完成后异步调用补全空驶公里数。
import { getCityCoords } from './city-coords.js'
import { haversineKm } from './geo.js'

const ROAD_FACTOR = 1.3
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

// 同步估算兜底：直线距离 × 道路系数，就近取整 5km
export function estimateRoadKmFallback(cityA, cityB) {
  const a = getCityCoords(cityA)
  const b = getCityCoords(cityB)
  if (!a || !b) return 0
  const km = haversineKm(a[0], a[1], b[0], b[1]) * ROAD_FACTOR
  return Math.max(0, Math.round(km / 5) * 5)
}

// OSRM 真实驾驶公里数；任一城市无坐标返回 0；网络失败回退估算。
// 返回 0 表示两城坐标都缺失（调用方按"待补"处理）。
export async function roadKmBetween(cityA, cityB) {
  const a = getCityCoords(cityA)
  const b = getCityCoords(cityB)
  if (!a || !b) return 0
  const fallback = estimateRoadKmFallback(cityA, cityB)
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    // OSRM 路径格式：/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
    const url = `${OSRM_URL}/${a[1]},${a[0]};${b[1]},${b[0]}?overview=false`
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } })
    clearTimeout(timer)
    if (!res.ok) return fallback
    const data = await res.json()
    const meters = data?.routes?.[0]?.distance
    if (typeof meters === 'number' && meters > 0) {
      return Math.max(1, Math.round((meters / 1000) / 5) * 5)
    }
    return fallback
  } catch {
    return fallback
  }
}
