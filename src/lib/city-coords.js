// 城市坐标查询 + 车程估算（纯函数，无 'use client'）
// 用于 coach-plan 计算 THROUGH COACH 的 MTC EMPTY RUN 空驶公里数。
// 距离为 haversine 直线距离 × 道路系数 1.3 的参考估算（非导航实测）。
import cityCoordsData from '../data/city-coords.js'
import { normalizeCityName as norm } from './normalize.js'

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
