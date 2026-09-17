// 刀3「段抽屉 + 行程条」的天 → 段派生（纯函数）
//
// 把 route-plan.js 的计划（OSRM 真实值 / estimate 兜底）按**天**分组，供抽屉与行程条使用：
//   当天各段（leg）里程/时长 → 当日累计 → 全行程累计。
//
// ⚠️ 数字口径：一切来自 route-plan.js 的 legs，**不估算、不硬编码**。
//    source === 'estimate'（OSRM 失败/兜底）时公里数带 ~ 前缀、不显示时长 —— 复用
//    route-plan.js 的 formatLegLabel（与地图段标签同一实现），估算值绝不冒充真实值。
//
// 段的「天」归属沿用刀2 地图配色口径（route-plan.js buildDayToLegIndex 注释）：
//   第 i 天走的是「离开第 i 天城市」的那条 leg → leg 归属 routePoints[leg.fromIdx].dayNumber。
import { formatLegLabel } from './route-plan.js'

// 行程出发日期（YYYY-MM-DD）视为第 1 天；dayNumber 0/负数 → 出发前一天/前 N 天。
// 返回 'M/D'（startDate 缺失/非法 → ''，绝不猜日期）。
export function dayDate(startDate, dayNumber) {
  if (!startDate || !Number.isFinite(dayNumber)) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(startDate))
  if (!m) return ''
  const base = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (Number.isNaN(base.getTime())) return ''
  base.setUTCDate(base.getUTCDate() + (dayNumber - 1))
  return `${base.getUTCMonth() + 1}/${base.getUTCDate()}`
}

// 一线路径串：'盖朗厄尔 → 奥勒松'（多段依次列出：'A → B → C'）
export function formatDayRoute(cityNames = []) {
  const names = cityNames.filter(Boolean)
  return names.join(' → ')
}

// leg 按天分组（Map: dayNumber → legs）
export function legsByDay(routePoints = [], legs = []) {
  const byDay = new Map()
  for (const leg of legs) {
    if (!leg || !Number.isFinite(leg.fromIdx)) continue
    const dayNumber = routePoints[leg.fromIdx]?.dayNumber ?? leg.fromIdx + 1
    if (!byDay.has(dayNumber)) byDay.set(dayNumber, [])
    byDay.get(dayNumber).push(leg)
  }
  return byDay
}

// 计划整体标签（全行程累计）：estimate 时只有 '~km'，无时长
export function totalRouteLabel(plan) {
  if (!plan || !Number.isFinite(plan.totalKm)) return ''
  return formatLegLabel({ km: plan.totalKm, minutes: plan.totalMinutes }, plan.source)
}

// 天 → 段计划
//   startDate: 行程出发日期（第 1 天）
//   days: itinerary.days（用 dayNumber / cityName / cityNameEn）
//   routePoints: [{ lat, lng, dayNumber }]（地图点集，索引与 legs 的 fromIdx/toIdx 对应）
//   plan: route-plan.buildRoutePlan 的返回（null = 还没算好）
// 返回 [{ dayNumber, cityName, cityNameEn, date, legs, km, minutes, label, hasPlan, canPlan, hasEstimate, routeText }]
//   canPlan=false 表示点集本身不足 2 点（单天/无坐标）—— 不是「还在算」，是本来就没有段
export function buildDayPlans({ startDate = '', days = [], routePoints = [], plan = null } = {}) {
  const source = plan?.source || 'estimate'
  const canPlan = (routePoints?.length || 0) >= 2
  const byDay = legsByDay(routePoints, plan?.legs || [])
  const dayInfo = new Map()
  for (const d of days) dayInfo.set(d.dayNumber, d)
  const cityOf = (idx) => dayInfo.get(routePoints[idx]?.dayNumber)?.cityName || ''

  return days.map((d) => {
    const legs = (byDay.get(d.dayNumber) || []).map((leg) => ({
      ...leg,
      fromCityName: cityOf(leg.fromIdx) || d.cityName || '',
      toCityName: cityOf(leg.toIdx),
      label: formatLegLabel(leg, source),
    }))
    // 无段的天：km = null（不是 0 —— 「没说有距离」和「距离为 0」不是一回事）
    const km = legs.length ? legs.reduce((a, l) => a + (Number.isFinite(l.km) ? l.km : 0), 0) : null
    const minutes = legs.length && legs.every((l) => Number.isFinite(l.minutes))
      ? legs.reduce((a, l) => a + l.minutes, 0)
      : null
    const cityNames = legs.length
      ? [legs[0].fromCityName, ...legs.map((l) => l.toCityName)]
      : [d.cityName]
    return {
      dayNumber: d.dayNumber,
      cityName: d.cityName || '',
      cityNameEn: d.cityNameEn || '',
      date: dayDate(startDate, d.dayNumber),
      legs,
      km,
      minutes,
      label: km == null ? '' : formatLegLabel({ km, minutes }, source),
      hasPlan: !!plan,
      canPlan,
      hasEstimate: source !== 'osrm',
      routeText: formatDayRoute(cityNames),
    }
  })
}
