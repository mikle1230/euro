// 刀3「段抽屉 + 行程条」的天→段派生测试
// 运行：npm test —— 纯函数，不联网、不读 localStorage。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dayDate,
  formatDayRoute,
  legsByDay,
  totalRouteLabel,
  buildDayPlans,
} from '../../src/lib/day-route.js'

// 4 天 / 3 个去重点的行程：巴黎(d1,d2) → 尼斯(d3) → 罗马(d4)
const ROUTE_POINTS = [
  { key: 'paris', lat: 48.85, lng: 2.35, dayNumber: 1 },
  { key: 'paris', lat: 48.85, lng: 2.35, dayNumber: 2 },
  { key: 'nice', lat: 43.7, lng: 7.26, dayNumber: 3 },
  { key: 'rome', lat: 41.9, lng: 12.5, dayNumber: 4 },
]
const DAYS = [
  { id: 'd1', dayNumber: 1, cityName: '巴黎', cityNameEn: 'Paris' },
  { id: 'd2', dayNumber: 2, cityName: '巴黎', cityNameEn: 'Paris' },
  { id: 'd3', dayNumber: 3, cityName: '尼斯', cityNameEn: 'Nice' },
  { id: 'd4', dayNumber: 4, cityName: '罗马', cityNameEn: 'Rome' },
]

// 与 route-plan 去重结果对应的 legs：巴黎(lastIdx=1) → 尼斯(firstIdx=2) → 罗马(firstIdx=3)
const OSRM_PLAN = {
  signature: 'sig',
  source: 'osrm',
  legs: [
    { fromIdx: 1, toIdx: 2, km: 930, minutes: 560, geometry: null },
    { fromIdx: 2, toIdx: 3, km: 700, minutes: 420, geometry: null },
  ],
  totalKm: 1630,
  totalMinutes: 980,
}

const ESTIMATE_PLAN = {
  signature: 'sig',
  source: 'estimate',
  legs: [
    { fromIdx: 1, toIdx: 2, km: 700, minutes: null, geometry: null },
    { fromIdx: 2, toIdx: 3, km: 520, minutes: null, geometry: null },
  ],
  totalKm: 1220,
  totalMinutes: 0,
}

test('dayDate：第 1 天 = 出发日，按天号平移；缺日期返回空串', () => {
  assert.equal(dayDate('2026-09-17', 1), '9/17')
  assert.equal(dayDate('2026-09-17', 2), '9/18')
  assert.equal(dayDate('2026-09-17', 9), '9/25')
  assert.equal(dayDate('2026-12-30', 3), '1/1') // 跨年
  assert.equal(dayDate('2026-09-17', 0), '9/16') // day 0（CN 出发日）→ 前一天
  assert.equal(dayDate('', 2), '')
  assert.equal(dayDate('2026-09-17', NaN), '')
  assert.equal(dayDate('bad', 2), '')
})

test('formatDayRoute：多段依次列出；空值过滤', () => {
  assert.equal(formatDayRoute(['盖朗厄尔', '奥勒松']), '盖朗厄尔 → 奥勒松')
  assert.equal(formatDayRoute(['A', 'B', 'C']), 'A → B → C')
  assert.equal(formatDayRoute(['A', '', null]), 'A')
  assert.equal(formatDayRoute([]), '')
})

test('legsByDay：leg 归属 routePoints[fromIdx] 的天（去重后 = 该城停留的最后一天）', () => {
  const byDay = legsByDay(ROUTE_POINTS, OSRM_PLAN.legs)
  assert.deepEqual([...byDay.keys()].sort(), [2, 3])
  assert.equal(byDay.get(2).length, 1)
  assert.equal(byDay.get(3).length, 1)
  // 起点/终点天没有出发 leg
  assert.equal(byDay.get(1), undefined)
  assert.equal(byDay.get(4), undefined)
})

test('buildDayPlans（osrm）：当天各段 + 当日累计 + 全行程累计，真实值带时长', () => {
  const plans = buildDayPlans({
    startDate: '2026-09-17',
    days: DAYS,
    routePoints: ROUTE_POINTS,
    plan: OSRM_PLAN,
  })
  assert.equal(plans.length, 4)

  const d2 = plans.find((p) => p.dayNumber === 2)
  assert.equal(d2.date, '9/18')
  assert.equal(d2.routeText, '巴黎 → 尼斯')
  assert.equal(d2.legs.length, 1)
  assert.equal(d2.legs[0].label, '930 km · 9h20')
  assert.equal(d2.km, 930)
  assert.equal(d2.minutes, 560)
  assert.equal(d2.label, '930 km · 9h20')
  assert.equal(d2.hasEstimate, false)

  const d3 = plans.find((p) => p.dayNumber === 3)
  assert.equal(d3.routeText, '尼斯 → 罗马')
  assert.equal(d3.km, 700)

  // 无段的天：km/minutes 都为 null（不是 0），不显示数字
  const d1 = plans.find((p) => p.dayNumber === 1)
  assert.equal(d1.legs.length, 0)
  assert.equal(d1.km, null)
  assert.equal(d1.minutes, null)
  assert.equal(d1.label, '')
  assert.equal(d1.routeText, '巴黎')
  assert.equal(plans.find((p) => p.dayNumber === 4).label, '')

  // 全行程累计来自 plan 的 totalKm/totalMinutes
  assert.equal(totalRouteLabel(OSRM_PLAN), '1630 km · 16h20')
})

test('buildDayPlans（estimate）：公里数带 ~ 前缀且不显示时长（不许把估算值画成真实值）', () => {
  const plans = buildDayPlans({
    startDate: '2026-09-17',
    days: DAYS,
    routePoints: ROUTE_POINTS,
    plan: ESTIMATE_PLAN,
  })
  const d2 = plans.find((p) => p.dayNumber === 2)
  assert.equal(d2.hasEstimate, true)
  assert.equal(d2.km, 700)
  assert.equal(d2.label, '~700 km') // 无时长
  assert.equal(d2.legs[0].label, '~700 km')
  assert.equal(d2.minutes, null)
  assert.equal(totalRouteLabel(ESTIMATE_PLAN), '~1220 km')
})

test('buildDayPlans：计划未就绪（plan=null）时不出数字，hasPlan=false', () => {
  const plans = buildDayPlans({
    startDate: '',
    days: DAYS,
    routePoints: ROUTE_POINTS,
    plan: null,
  })
  assert.equal(plans.length, 4)
  plans.forEach((p) => {
    assert.equal(p.legs.length, 0)
    assert.equal(p.label, '')
    assert.equal(p.hasPlan, false)
    assert.equal(p.canPlan, true) // 点集够 2 点 → 属于「还在算」而不是「没有段」
    assert.equal(p.date, '')
  })
  assert.equal(totalRouteLabel(null), '')
})

test('buildDayPlans：行程为空 / 无城市坐标时不崩', () => {
  assert.deepEqual(buildDayPlans({ days: [], routePoints: [], plan: null }), [])
  const plans = buildDayPlans({
    days: [{ id: 'd1', dayNumber: 1, cityName: '无坐标城' }],
    routePoints: [],
    plan: OSRM_PLAN,
  })
  assert.equal(plans.length, 1)
  assert.equal(plans[0].km, null)
  assert.equal(plans[0].canPlan, false) // 单天/无坐标：本来就没有段（抽屉不显示「还在计算中」）
  assert.equal(plans[0].routeText, '无坐标城')
})
