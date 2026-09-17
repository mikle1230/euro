// 行程路线规划（地图「真实里程 + 真实道路几何」，刀1）
//
// 给 /explore 地图提供 OSRM 真实驾驶距离与道路几何，替代原来的「直线 × 1.35」估算。
// 纯函数 + 一个 fetch 封装（fetchImpl 可注入），无 'use client'，Node 可直接测试。
//
// ⚠️ 与 road-distance.js 的口径区别（勿混用）：
//   road-distance.js = EMPTY RUN 空驶计价（直线 × 1.3 + 吸附 5km 倍数，被 coach-plan / parse-itinerary 使用）
//   本模块 = 地图显示（OSRM 真实 distance/duration，**不套系数、不吸附**），失败才回退 直线 × 1.35
//
// OSRM 实测事实（2026-09-17，公共演示服务器 router.project-osrm.org）：
//   · URL 里坐标顺序是 lon,lat；本项目数据是 [lat,lng] —— 必须换序。
//   · 一次请求可带 ≥60 个点（URL 1143 字符）仍返回 code=Ok；本模块保守上限 30，超出按 29 点重叠分片。
//   · legs[i] 自身没有 geometry，逐段几何在 legs[i].steps[j].geometry.coordinates（拼接而得）。
//   · overview=full 时整条 route.geometry = 57524 点（12 点路线，2898KB）；
//     overview=simplified 时 = 62 点（1721KB），而 **step 几何两种口径点数完全相同（58032 点）**。
//     → 取 simplified：白拿 1.2MB 体积，逐段几何仍由 step 拼接；渲染点数另做本模块抽稀（见下）。
//   · 抽稀实测（同一条 12 点 / 3962km 路线）：step 拼接后 58032 点 → DP(0.35km) 后 **949 点**（61×），
//     单 leg 最多 328 点（未触及 400 点硬上限）；DP 保证丢掉的点离线不超过 0.35km（≈ zoom 10 下 2px），
//     而 zoom 4.5 一像素 ≈ 4km —— 视觉无损。
import { haversineKm } from './geo.js'

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'
const OSRM_TIMEOUT_MS = 15000
const OSRM_MAX_POINTS = 30 // 单请求坐标上限，超出按 OSRM_MAX_POINTS-1 重叠分片
const ESTIMATE_FACTOR = 1.35 // 仅 OSRM 失败兜底，绝不进真实值分支
const SIMPLIFY_TOLERANCE_KM = 0.35 // Douglas-Peucker 容差（约 350m）
const MAX_LEG_POINTS = 400 // 单 leg 渲染点数硬上限（抽稀兜底）
const CACHE_LIMIT = 12

// 已成功（source='osrm'）的计划缓存：签名 → plan。行程点集不变则不再发请求。
const planCache = new Map()
// 同一签名并发调用去重（避免同时触发多次请求）
const inflightPlans = new Map()

// ---------- 纯函数 ----------

// 连续重复点去除 + 无效点剔除。
// 同一城市连住多晚会产生连续重复坐标，OSRM 里是零长度 leg，先去掉。
// 返回：
//   points: [{ key, lat, lng, firstIdx, lastIdx }] —— firstIdx/lastIdx 是该去重点覆盖的原始点区间
//   origToDedup: number[] —— 第 i 个原始点落到去重后的索引；无效点（缺/非数字坐标）为 -1
export function dedupeConsecutive(points = []) {
  const out = []
  const origToDedup = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const lat = Number(p?.lat)
    const lng = Number(p?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      origToDedup.push(-1)
      continue
    }
    const prev = out[out.length - 1]
    if (prev && prev.lat === lat && prev.lng === lng) {
      prev.lastIdx = i
    } else {
      out.push({ key: p.key, lat, lng, firstIdx: i, lastIdx: i })
    }
    origToDedup.push(out.length - 1)
  }
  return { points: out, origToDedup }
}

// 原始点索引 → leg 索引（供按天着色：第 i 天走的是「离开第 i 天城市」的那条 leg）。
// 末点没有出发 leg，归到最后一条 leg；无效点为 -1；没有任何 leg 时全为 -1。
export function buildDayToLegIndex(origToDedup = [], legCount = 0) {
  return origToDedup.map((k) => {
    if (k < 0 || legCount <= 0) return -1
    return Math.min(k, legCount - 1)
  })
}

// OSRM route 对象 → legs（含真实几何、真实公里/分钟）。
// geometry 由 legs[i].steps[j].geometry.coordinates 顺序拼接，并把 [lon,lat] 换回 [lat,lng]。
export function legsFromOsrmRoute(route) {
  const legs = []
  for (const leg of route?.legs || []) {
    const path = []
    for (const step of leg?.steps || []) {
      const coords = step?.geometry?.coordinates
      if (!Array.isArray(coords)) continue
      for (const c of coords) {
        if (!Array.isArray(c) || c.length < 2) continue
        const lat = Number(c[1])
        const lng = Number(c[0])
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        const last = path[path.length - 1]
        if (last && last[0] === lat && last[1] === lng) continue
        path.push([lat, lng])
      }
    }
    legs.push({
      km: Number.isFinite(leg?.distance) ? Math.round(leg.distance / 1000) : null,
      minutes: Number.isFinite(leg?.duration) ? Math.round(leg.duration / 60) : null,
      geometry: path.length >= 2 ? path : null,
    })
  }
  return legs
}

// 点到线段的垂距（km，小范围内平面近似；经度按纬度折算）
function pointToSegmentKm(p, a, b) {
  const midLat = ((a[0] + b[0]) / 2) * (Math.PI / 180)
  const kx = 111.32 * Math.cos(midLat)
  const ky = 110.57
  const px = (p[1] - a[1]) * kx
  const py = (p[0] - a[0]) * ky
  const bx = (b[1] - a[1]) * kx
  const by = (b[0] - a[0]) * ky
  const len2 = bx * bx + by * by
  if (len2 === 0) return Math.hypot(px, py)
  let t = (px * bx + py * by) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - t * bx, py - t * by)
}

// Douglas-Peucker 抽稀（保端点，容差单位 km）
export function simplifyPath(path, toleranceKm = SIMPLIFY_TOLERANCE_KM) {
  if (!Array.isArray(path)) return []
  if (path.length <= 2) return path.slice()
  const keep = new Uint8Array(path.length)
  keep[0] = 1
  keep[path.length - 1] = 1
  const stack = [[0, path.length - 1]]
  while (stack.length) {
    const [start, end] = stack.pop()
    let maxDist = 0
    let idx = -1
    for (let i = start + 1; i < end; i++) {
      const d = pointToSegmentKm(path[i], path[start], path[end])
      if (d > maxDist) {
        maxDist = d
        idx = i
      }
    }
    if (idx !== -1 && maxDist > toleranceKm) {
      keep[idx] = 1
      stack.push([start, idx], [idx, end])
    }
  }
  return path.filter((_, i) => keep[i])
}

// 均匀抽稀兜底：把点数压到 maxPoints（保两端的步长采样）
export function decimatePath(path, maxPoints = MAX_LEG_POINTS) {
  if (!Array.isArray(path)) return []
  if (path.length <= maxPoints || maxPoints < 2) return path.slice()
  const step = (path.length - 1) / (maxPoints - 1)
  const out = []
  for (let i = 0; i < maxPoints - 1; i++) out.push(path[Math.round(i * step)])
  out.push(path[path.length - 1])
  return out
}

// 逐段几何抽稀：先按容差 DP，再按点数硬上限均匀抽稀
export function simplifyGeometry(path) {
  if (!Array.isArray(path) || path.length < 2) return null
  return decimatePath(simplifyPath(path, SIMPLIFY_TOLERANCE_KM), MAX_LEG_POINTS)
}

// 点集签名（去重后坐标的 FNV-1a 哈希）：行程点集不变则不重复请求 OSRM
export function routeSignature(points = []) {
  return routePlanSignature(dedupeConsecutive(points).points)
}

// 点集签名（输入已是去重点）
export function routePlanSignature(stops = []) {
  const s = stops.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `${(h >>> 0).toString(36)}:${stops.length}`
}

// 段标签：真实值 `446 km · 6h36`；OSRM 失败（estimate）加 ~ 前缀且不显示时长，估算值无法冒充真实值
export function formatLegLabel(leg, source) {
  if (!leg || !Number.isFinite(leg.km)) return ''
  if (source !== 'osrm') return `~${Math.round(leg.km)} km`
  let label = `${Math.round(leg.km)} km`
  if (Number.isFinite(leg.minutes) && leg.minutes > 0) {
    const h = Math.floor(leg.minutes / 60)
    const m = leg.minutes % 60
    label += ` · ${h}h${String(m).padStart(2, '0')}`
  }
  return label
}

// ---------- fetch 封装 ----------

async function requestChunk(chunk, fetchImpl, signal) {
  const coord = chunk.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
  const url = `${OSRM_URL}/${coord}?overview=simplified&geometries=geojson&steps=true`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), OSRM_TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, {
      signal: signal || ctrl.signal,
      headers: { accept: 'application/json' },
    })
    if (!res || !res.ok) throw new Error(`OSRM HTTP ${res?.status}`)
    const data = await res.json()
    if (data?.code !== 'Ok' || !data?.routes?.[0]) throw new Error(`OSRM code ${data?.code || 'none'}`)
    return legsFromOsrmRoute(data.routes[0])
  } finally {
    clearTimeout(timer)
  }
}

function estimatePlan(base, stops) {
  const legs = stops.slice(0, -1).map((p, j) => {
    const q = stops[j + 1]
    return {
      fromIdx: p.lastIdx,
      toIdx: q.firstIdx,
      km: Math.round(haversineKm(p.lat, p.lng, q.lat, q.lng) * ESTIMATE_FACTOR),
      minutes: null,
      geometry: null,
    }
  })
  return {
    ...base,
    legs,
    totalKm: legs.reduce((a, l) => a + l.km, 0),
    totalMinutes: 0,
    source: 'estimate',
  }
}

// 行程点集 → 路线计划
//   points = [{ key, lat, lng }, ...]（有序；允许连续重复点）
//   返回 { signature, stops, legs, dayToLegIndex, totalKm, totalMinutes, source }
//     legs[i] = { fromIdx, toIdx, km, minutes, geometry }（fromIdx/toIdx 是**原始点索引**）
//     source = 'osrm'（真实值）| 'estimate'（兜底：直线 × 1.35，无几何/时长）
export async function buildRoutePlan(points = [], opts = {}) {
  const { fetchImpl = globalThis.fetch, signal, useCache = true } = opts
  const { points: stops, origToDedup } = dedupeConsecutive(points)
  const legCount = Math.max(0, stops.length - 1)
  const base = {
    signature: routePlanSignature(stops),
    stops,
    legCount,
    dayToLegIndex: buildDayToLegIndex(origToDedup, legCount),
    legs: [],
    totalKm: 0,
    totalMinutes: 0,
    source: 'estimate',
  }
  if (legCount === 0 || typeof fetchImpl !== 'function') return estimatePlan(base, stops)

  if (useCache) {
    const cached = planCache.get(base.signature)
    if (cached) return cached
    const inflight = inflightPlans.get(base.signature)
    if (inflight) return inflight
  }

  const run = (async () => {
    try {
      const osrmLegs = []
      for (let i = 0; i < stops.length - 1; i += OSRM_MAX_POINTS - 1) {
        const chunk = stops.slice(i, i + OSRM_MAX_POINTS)
        if (chunk.length < 2) break
        osrmLegs.push(...(await requestChunk(chunk, fetchImpl, signal)))
      }
      if (osrmLegs.length !== legCount) throw new Error('OSRM legs 数量不匹配')
      const legs = osrmLegs.map((l, j) => ({
        fromIdx: stops[j].lastIdx,
        toIdx: stops[j + 1].firstIdx,
        km: l.km,
        minutes: l.minutes,
        geometry: simplifyGeometry(l.geometry),
      }))
      if (!legs.every((l) => Number.isFinite(l.km) && l.km >= 0)) throw new Error('OSRM km 缺失')
      return {
        ...base,
        legs,
        totalKm: legs.reduce((a, l) => a + l.km, 0),
        totalMinutes: legs.reduce((a, l) => a + (l.minutes || 0), 0),
        source: 'osrm',
      }
    } catch {
      return estimatePlan(base, stops)
    }
  })()

  if (!useCache) return run
  inflightPlans.set(base.signature, run)
  const plan = await run
  inflightPlans.delete(base.signature)
  if (plan.source === 'osrm') {
    planCache.set(base.signature, plan)
    while (planCache.size > CACHE_LIMIT) planCache.delete(planCache.keys().next().value)
  }
  return plan
}

// 测试/调试用：清空计划缓存
export function clearRoutePlanCache() {
  planCache.clear()
  inflightPlans.clear()
}
