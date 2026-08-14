// 报价规则注入：在 AI 解析结果上，去掉城际 bus 项并注入 QUOS 报价项目
// （旅行保险 / THROUGH COACH / 接驳 MTC / PRE-POST NIGHT）。
// 纯函数、无副作用，可运行于服务端 route.js 与客户端。
// 费率常量集中在 ./quote-rates.js，改价只动那一处。
import { QUOTE_RATES } from './quote-rates.js'
import { getCityCode } from './quos-mapping.js'
import { resolveLdcSupplier } from './ldc-mapping.js'

const overnight = (d) => d.finalCityName || d.cityName || ''

function makeInsurance(groupSize) {
  const rate = QUOTE_RATES.insurance
  return {
    type: 'other',
    name: '旅行保险 Travel Insurance',
    costCategory: 'paid',
    estimatedCost: 0,
    price: rate.price,
    priceUnit: rate.priceUnit,
    currency: rate.currency,
    quantity: groupSize || 0,
    quoteKind: 'insurance',
    quoteOrder: 0,
    cityCode: rate.cityCode,
    countryCode: rate.countryCode,
    notes: rate.note,
  }
}

function makePickup(locationCategory) {
  return {
    type: 'transport',
    transportMode: 'bus',
    name: '接机 MTC',
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    quoteKind: 'pickup',
    quoteOrder: 10,
    locationCategory,
    notes: 'STD MTC (Local)，单次 Group rate',
  }
}

// THROUGH COACH 的国/城按 LDC 表格取「供应商所在地」，而非当天城市：
// 例如法意瑞等西欧多国 → 供应商 IT ROM（ldc-mapping.js 的 westernEurope）。
function makeThroughCoach(seg, ldcLocation) {
  return {
    type: 'transport',
    transportMode: 'bus',
    name: 'THROUGH COACH',
    from: seg.startCity,
    to: seg.endCity,
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    quoteKind: 'through-coach',
    quoteOrder: 20,
    cityCode: ldcLocation?.cityCode || '',
    countryCode: ldcLocation?.countryCode || '',
    notes: `LDC 长距离，第 ${seg.startDay}–${seg.endDay} 天${ldcLocation ? `，供应商 ${ldcLocation.cityCode}` : ''}`,
  }
}

function makePrePostNight() {
  return {
    type: 'transport',
    transportMode: 'bus',
    name: 'PRE/POST NIGHT 司机前后夜',
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    quoteKind: 'prepost',
    quoteOrder: 25,
    notes: QUOTE_RATES.prepostNight.note,
  }
}

export function applyQuoteRules(parsed) {
  if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) return parsed

  // 浅拷贝 days 及每项 items，避免原地改动入参
  const days = (parsed.days || []).map((d) => ({ ...d, items: (d.items || []).slice() }))
  days.sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0))

  // 1) 去掉城际 bus/car 项（被 THROUGH COACH 合并替代）；flight/train/boat 保留
  days.forEach((d) => {
    d.items = (d.items || []).filter((it) =>
      !(it.type === 'transport' && ['bus', 'car'].includes(it.transportMode) && (it.from || it.to)))
  })

  const realDays = days.filter((d) => (d.dayNumber ?? 0) >= 1)
  if (!realDays.length) return { ...parsed, days }

  // LDC 供应商定位：按行程涉及的国家集合查表（ldc-mapping.js），
  // 例如法意瑞等西欧多国 → westernEurope → 供应商 IT ROM。
  // 只用 realDays（day 0 中国出发日不参与 LDC 区域判定）。
  const ldcCountries = [...new Set(
    realDays
      .map((d) => getCityCode(d.cityName, d.cityNameEn)?.countryCode)
      .filter(Boolean),
  )]
  const ldc = resolveLdcSupplier(ldcCountries)
  const ldcLocation = ldc
    ? {
        countryCode: ldc.supplierCode.split(' ')[0] || '',
        cityCode: ldc.supplierCode.split(' ')[1] || '',
      }
    : null

  // 2) 旅行保险：第 1 天、置顶、必录，2.66 USD/人 × 人数
  realDays[0].items = [makeInsurance(parsed.groupSize), ...(realDays[0].items || [])]

  const transitOf = (d) => (d.items || []).find((it) =>
    it.type === 'transport' && ['flight', 'train', 'boat'].includes(it.transportMode) && (it.from || it.to))
  const categoryFor = (mode) =>
    mode === 'flight' ? 'APT/HTL' : mode === 'train' ? 'HTL-STA' : mode === 'boat' ? 'HTL-PIER' : null

  // 3) 到达停留天数：从第 1 天起连续几晚睡同一城市
  const arrivalDay = realDays[0].dayNumber
  const arrivalCity = overnight(realDays[0])
  let arrivalStayDays = 0
  for (const d of realDays) {
    if (overnight(d) === arrivalCity) arrivalStayDays++
    else break
  }

  // 4) 切分段：连续无 transit 的 real days = 一个段；transit 当天加落地接驳
  const segments = []
  let cur = null
  for (const d of realDays) {
    const transit = transitOf(d)
    if (transit) {
      if (cur) { segments.push(cur); cur = null }
      d.items.push(makePickup(categoryFor(transit.transportMode)))
    } else {
      if (!cur) cur = { startDay: d.dayNumber, startCity: overnight(d) }
      cur.endDay = d.dayNumber
      cur.endCity = overnight(d)
    }
  }
  if (cur) segments.push(cur)

  // 5) 每段注入 THROUGH COACH + PRE/POST；到达段按停留天数决定接机 vs 直接 THROUGH COACH
  //    THROUGH COACH 覆盖区间内（同一辆车跑到底），单天市区游览用车不再单独录入
  for (const seg of segments) {
    if (seg.startDay === arrivalDay && arrivalStayDays > 1) {
      const d1 = realDays.find((d) => d.dayNumber === arrivalDay)
      if (d1) d1.items.push(makePickup('APT/HTL'))
      seg.startDay = arrivalDay + 1
      const d2 = realDays.find((d) => d.dayNumber === arrivalDay + 1)
      if (!d2) continue
      seg.startCity = overnight(d2)
    }
    const segStart = realDays.find((d) => d.dayNumber === seg.startDay)
    if (!segStart) continue

    // 移除覆盖区间内的单天市区游览用车（无 from/to 的本地 bus/car）
    for (let dn = seg.startDay; dn <= seg.endDay; dn++) {
      const dd = realDays.find((d) => d.dayNumber === dn)
      if (!dd) continue
      dd.items = dd.items.filter((it) =>
        !(it.type === 'transport' && ['bus', 'car'].includes(it.transportMode) && !(it.from || it.to)))
    }

    segStart.items.push(makeThroughCoach(seg, ldcLocation))
    segStart.items.push(makePrePostNight())
  }

  return { ...parsed, days }
}
