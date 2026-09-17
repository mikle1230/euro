// 路线规划纯函数测试（地图真实里程 · 刀1）
// 运行：npm test
// 不依赖真实网络：OSRM 调用一律注入 mock fetchImpl。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dedupeConsecutive,
  buildDayToLegIndex,
  legsFromOsrmRoute,
  simplifyPath,
  decimatePath,
  simplifyGeometry,
  routeSignature,
  formatLegLabel,
  buildRoutePlan,
  clearRoutePlanCache,
} from '../../src/lib/route-plan.js'
import { haversineKm } from '../../src/lib/geo.js'

// ---------- mock OSRM ----------

// 按给定点对生成一条「直线插值」的假 OSRM response（geojson，[lon,lat] 顺序）
function mockRouteData(pairs, { stepPoints = 5 } = {}) {
  const legs = pairs.map(([a, b]) => {
    const dist = haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000
    const coords = []
    for (let i = 0; i < stepPoints; i++) {
      const t = i / (stepPoints - 1)
      coords.push([a.lng + (b.lng - a.lng) * t, a.lat + (b.lat - a.lat) * t])
    }
    return {
      distance: dist,
      duration: (dist / 1000) * 60, // 60km/h → 每公里 1 分钟
      steps: [{ geometry: { coordinates: coords } }],
    }
  })
  return { code: 'Ok', routes: [{ legs }] }
}

function mockFetch(handler) {
  const calls = []
  const fn = async (url, init) => {
    calls.push(url)
    return handler(url, calls.length, init)
  }
  fn.calls = calls
  return fn
}

function okResponse(data) {
  return { ok: true, status: 200, json: async () => data }
}

const P = (lat, lng, key = `${lat},${lng}`) => ({ key, lat, lng })

// ---------- 连续重复点去除 ----------

test('dedupeConsecutive：连续重复坐标合并，并记录原始索引区间', () => {
  const points = [P(47.37, 8.54, 'zrh'), P(47.05, 8.31, 'luc'), P(47.05, 8.31, 'luc2'), P(46.68, 7.86, 'int')]
  const { points: stops, origToDedup } = dedupeConsecutive(points)
  assert.equal(stops.length, 3)
  assert.deepEqual(origToDedup, [0, 1, 1, 2])
  assert.deepEqual(stops.map((s) => s.key), ['zrh', 'luc', 'int'])
  // 连住两晚的房间城市：firstIdx/lastIdx 覆盖两天
  assert.equal(stops[1].firstIdx, 1)
  assert.equal(stops[1].lastIdx, 2)
})

test('dedupeConsecutive：无效坐标剔除且不参与去重链', () => {
  const { points: stops, origToDedup } = dedupeConsecutive([
    P(1, 1),
    { key: 'x', lat: null, lng: undefined },
    P(2, 2),
    P(2, 2),
  ])
  assert.equal(stops.length, 2)
  assert.deepEqual(origToDedup, [0, -1, 1, 1])
})

// ---------- 天 → leg 索引 ----------

test('buildDayToLegIndex：第 i 天走「离开第 i 天城市」的 leg，末点归最后一条', () => {
  const points = [P(1, 1), P(2, 2), P(2, 2), P(3, 3)]
  const { points: stops, origToDedup } = dedupeConsecutive(points)
  const idx = buildDayToLegIndex(origToDedup, stops.length - 1)
  assert.deepEqual(idx, [0, 1, 1, 1])
  assert.deepEqual(buildDayToLegIndex(origToDedup, 0), [-1, -1, -1, -1])
  assert.deepEqual(buildDayToLegIndex([-1, -1], 5), [-1, -1])
})

// ---------- 几何拼接与坐标换序 ----------

test('legsFromOsrmRoute：step 几何顺序拼接，[lon,lat] 换回 [lat,lng]', () => {
  const route = {
    legs: [
      {
        distance: 12345.6,
        duration: 1800, // 30min
        steps: [
          { geometry: { coordinates: [[8.0, 47.0], [8.5, 47.5]] } },
          { geometry: { coordinates: [[8.5, 47.5], [8.6, 47.6]] } }, // 首点与上一步尾点重复
        ],
      },
    ],
  }
  const [leg] = legsFromOsrmRoute(route)
  assert.equal(leg.km, 12)
  assert.equal(leg.minutes, 30)
  assert.deepEqual(leg.geometry, [[47, 8], [47.5, 8.5], [47.6, 8.6]])
})

test('legsFromOsrmRoute：没有 step 几何 → geometry 为 null（不抛错）', () => {
  const [leg] = legsFromOsrmRoute({ legs: [{ distance: 1000, duration: 60, steps: [] }] })
  assert.equal(leg.geometry, null)
  assert.equal(leg.km, 1)
  assert.equal(leg.minutes, 1)
  const [bare] = legsFromOsrmRoute({ legs: [{ steps: [{ geometry: { coordinates: [[1, 1]] } }] }] })
  assert.equal(bare.km, null)
  assert.equal(bare.geometry, null)
})

// ---------- 抽稀 ----------

test('simplifyPath：保端点、按容差删除近似共线点', () => {
  const line = []
  for (let i = 0; i <= 100; i++) line.push([47 + i * 0.001, 8]) // 正南北直线
  const out = simplifyPath(line, 0.35)
  assert.deepEqual(out, [line[0], line[line.length - 1]])
  // 带拐点时必须保留拐点
  const bent = [[47, 8], [47.5, 8], [47.5, 8.5], [48, 8.5]]
  assert.equal(simplifyPath(bent, 0.35).length, 4)
  assert.deepEqual(simplifyPath([[1, 1]], 0.35), [[1, 1]])
})

test('decimatePath：超上限时均匀抽稀且保留两端', () => {
  const line = Array.from({ length: 1000 }, (_, i) => [47 + i * 0.0001, 8])
  const out = decimatePath(line, 50)
  assert.equal(out.length, 50)
  assert.deepEqual(out[0], line[0])
  assert.deepEqual(out[out.length - 1], line[line.length - 1])
  assert.equal(decimatePath(line, 2000).length, 1000)
})

test('simplifyGeometry：端点保留 + 点数远小于原始', () => {
  const line = Array.from({ length: 5000 }, (_, i) => [47 + i * 0.00001, 8 + i * 0.00001])
  const out = simplifyGeometry(line)
  assert.ok(out.length >= 2 && out.length < 100, `应大幅抽稀，实际 ${out.length}`)
  assert.deepEqual(out[0], line[0])
  assert.deepEqual(out[out.length - 1], line[line.length - 1])
  assert.equal(simplifyGeometry([[1, 1]]), null)
})

// ---------- 签名 ----------

test('routeSignature：点集相同则签名相同，顺序/城市变化则不同', () => {
  const a = [P(47.37, 8.54), P(47.05, 8.31), P(47.05, 8.31)]
  const b = [P(47.37, 8.54), P(47.05, 8.31)] // 连续重复点不影响签名
  const c = [P(47.05, 8.31), P(47.37, 8.54)] // 顺序不同
  assert.equal(routeSignature(a), routeSignature(b))
  assert.notEqual(routeSignature(a), routeSignature(c))
})

// ---------- 段标签 ----------

test('formatLegLabel：真实值带时长，估算值带 ~ 且不显示时长', () => {
  assert.equal(formatLegLabel({ km: 446, minutes: 396 }, 'osrm'), '446 km · 6h36')
  assert.equal(formatLegLabel({ km: 52, minutes: 42 }, 'osrm'), '52 km · 0h42')
  assert.equal(formatLegLabel({ km: 446, minutes: null }, 'osrm'), '446 km')
  assert.equal(formatLegLabel({ km: 417, minutes: null }, 'estimate'), '~417 km')
  assert.equal(formatLegLabel({ km: null }, 'osrm'), '')
})

// ---------- buildRoutePlan：真实值 ----------

test('buildRoutePlan：一次请求拿到全部 leg（真实 km/时长/几何）', async () => {
  clearRoutePlanCache()
  const points = [P(47.37, 8.54), P(47.05, 8.31), P(46.68, 7.86)]
  const fetchImpl = mockFetch(() => okResponse(mockRouteData([
    [points[0], points[1]],
    [points[1], points[2]],
  ])))
  const plan = await buildRoutePlan(points, { fetchImpl })
  assert.equal(plan.source, 'osrm')
  assert.equal(fetchImpl.calls.length, 1)
  assert.equal(plan.legs.length, 2)
  assert.equal(plan.legs[0].fromIdx, 0)
  assert.equal(plan.legs[0].toIdx, 1)
  assert.ok(plan.legs[0].km > 0)
  assert.ok(plan.legs[0].minutes > 0)
  assert.ok(Array.isArray(plan.legs[0].geometry))
  assert.deepEqual(plan.legs[0].geometry[0], [47.37, 8.54])
  assert.equal(plan.totalKm, plan.legs[0].km + plan.legs[1].km)
  assert.equal(plan.totalMinutes, plan.legs[0].minutes + plan.legs[1].minutes)
  // URL 必须是 lon,lat 顺序 + geojson + steps
  assert.match(fetchImpl.calls[0], /^https:\/\/router\.project-osrm\.org\/route\/v1\/driving\/8\.54000,47\.37000;8\.31000,47\.05000/) // lon,lat 顺序
  assert.match(fetchImpl.calls[0], /geometries=geojson/)
  assert.match(fetchImpl.calls[0], /steps=true/)
})

test('buildRoutePlan：连续重复点不发零长度 leg，天→leg 映射对齐原始天', async () => {
  clearRoutePlanCache()
  const points = [P(47.37, 8.54), P(47.05, 8.31), P(47.05, 8.31), P(46.68, 7.86)]
  const fetchImpl = mockFetch(() => okResponse(mockRouteData([
    [points[0], points[1]],
    [points[1], points[3]],
  ])))
  const plan = await buildRoutePlan(points, { fetchImpl })
  assert.equal(plan.legs.length, 2)
  assert.equal(plan.legs[1].fromIdx, 2) // 第 3 天离开重复城市
  assert.deepEqual(plan.dayToLegIndex, [0, 1, 1, 1])
  // 请求 URL 只带 3 个去重后的点
  assert.equal(fetchImpl.calls[0].split(';').length, 3)
})

test('buildRoutePlan：超过 30 点自动分片（重叠 1 点），leg 数与点对一致', async () => {
  clearRoutePlanCache()
  const points = Array.from({ length: 41 }, (_, i) => P(40 + i * 0.1, 10 + i * 0.05))
  const fetchImpl = mockFetch((url) => {
    const coordCount = url.split('?')[0].split('/').pop().split(';').length
    const legs = Array.from({ length: coordCount - 1 }, () => ({
      distance: 10000,
      duration: 600,
      steps: [{ geometry: { coordinates: [[10, 40], [10.1, 40.1]] } }],
    }))
    return okResponse({ code: 'Ok', routes: [{ legs }] })
  })
  const plan = await buildRoutePlan(points, { fetchImpl })
  assert.equal(plan.source, 'osrm')
  assert.equal(plan.legs.length, 40)
  assert.equal(fetchImpl.calls.length, 2)
  assert.equal(plan.totalKm, 400)
})

// ---------- buildRoutePlan：失败兜底 ----------

test('buildRoutePlan：网络失败 → estimate 兜底（直线×1.35，无几何/时长）', async () => {
  clearRoutePlanCache()
  const points = [P(47.37, 8.54), P(47.05, 8.31), P(46.68, 7.86)]
  const fetchImpl = mockFetch(() => { throw new Error('offline') })
  const plan = await buildRoutePlan(points, { fetchImpl })
  assert.equal(plan.source, 'estimate')
  const expect0 = Math.round(haversineKm(47.37, 8.54, 47.05, 8.31) * 1.35)
  assert.equal(plan.legs[0].km, expect0)
  assert.equal(plan.legs[0].minutes, null)
  assert.equal(plan.legs[0].geometry, null)
  assert.equal(plan.totalKm, plan.legs[0].km + plan.legs[1].km)
  assert.equal(plan.totalMinutes, 0)
  assert.deepEqual(plan.dayToLegIndex, [0, 1, 1])
  assert.equal(formatLegLabel(plan.legs[0], plan.source), `~${expect0} km`)
})

test('buildRoutePlan：HTTP 非 200 / code != Ok → estimate 兜底', async () => {
  clearRoutePlanCache()
  const points = [P(47.37, 8.54), P(47.05, 8.31)]
  const bad = mockFetch(() => ({ ok: false, status: 429, json: async () => ({}) }))
  assert.equal((await buildRoutePlan(points, { fetchImpl: bad })).source, 'estimate')
  clearRoutePlanCache()
  const noRoute = mockFetch(() => okResponse({ code: 'NoRoute', message: 'no route' }))
  assert.equal((await buildRoutePlan(points, { fetchImpl: noRoute })).source, 'estimate')
  clearRoutePlanCache()
  const shortLegs = mockFetch(() => okResponse({ code: 'Ok', routes: [{ legs: [] }] }))
  const plan = await buildRoutePlan(points, { fetchImpl: shortLegs })
  assert.equal(plan.source, 'estimate')
  assert.equal(plan.legs.length, 1)
})

test('buildRoutePlan：少于 2 点不发请求；无 fetch 实现也不抛', async () => {
  clearRoutePlanCache()
  const fetchImpl = mockFetch(() => okResponse({ code: 'Ok', routes: [{ legs: [] }] }))
  const single = await buildRoutePlan([P(47.37, 8.54)], { fetchImpl })
  assert.equal(single.legs.length, 0)
  assert.equal(fetchImpl.calls.length, 0)
  const empty = await buildRoutePlan([P(1, 1), { key: 'x' }], { fetchImpl: null })
  assert.equal(empty.source, 'estimate')
  assert.equal(empty.legs.length, 0)
  assert.deepEqual(empty.dayToLegIndex, [-1, -1]) // 无有效 leg → 全 -1
})

// ---------- 缓存 ----------

test('buildRoutePlan：同一行程点集复用缓存，不重复请求；失败结果不缓存', async () => {
  clearRoutePlanCache()
  const points = [P(47.37, 8.54), P(47.05, 8.31)]
  let failing = false
  const fetchImpl = mockFetch(() => {
    if (failing) throw new Error('offline')
    return okResponse(mockRouteData([[points[0], points[1]]]))
  })
  const first = await buildRoutePlan(points, { fetchImpl })
  const second = await buildRoutePlan([...points], { fetchImpl })
  assert.equal(first, second) // 命中缓存返回同一对象
  assert.equal(fetchImpl.calls.length, 1)
  // useCache:false 强制重新请求
  await buildRoutePlan(points, { fetchImpl, useCache: false })
  assert.equal(fetchImpl.calls.length, 2)

  // 失败（estimate）结果不入缓存：下次仍会尝试
  clearRoutePlanCache()
  failing = true
  const failed = await buildRoutePlan(points, { fetchImpl })
  assert.equal(failed.source, 'estimate')
  failing = false
  const retried = await buildRoutePlan(points, { fetchImpl })
  assert.equal(retried.source, 'osrm')
})
