// 报价规则注入：在 AI 解析结果上，去掉城际 bus 项并注入 QUOS 报价项目
// （旅行保险 / THROUGH COACH / EMPTY RUN 空驶 / 接机 MTC / PRE-POST NIGHT）。
// 纯函数、无副作用，可运行于服务端 route.js 与客户端。
// 费率常量集中在 ./quote-rates.js；EMPTY RUN 真实车程在 route.js 用 patchEmptyRunRoadKm 异步补全。
import { QUOTE_RATES } from './quote-rates.js'
import { getCityCode } from './quos-mapping.js'
import { resolveLdcSupplier, hasArcticCity, KNOWN_COUNTRY_CODES } from './ldc-mapping.js'
import { estimateRoadKmFallback, roadKmBetween } from './road-distance.js'
import { DAILY_FEES } from '../data/daily-fees.js'

const overnight = (d) => d.finalCityName || d.cityName || ''

// groupSize 可能是 "40+1"（客人+领队）或 "40"：保险按客人数计（+号前数字，领队不参保口径）
function parseGuestCount(groupSize) {
  const n = parseInt(String(groupSize ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function makeInsurance(groupSize) {
  const rate = QUOTE_RATES.insurance
  return {
    type: 'other',
    name: '旅行保险',
    nameEn: 'Travel Insurance',
    costCategory: 'paid',
    estimatedCost: 0,
    price: rate.price,
    priceUnit: rate.priceUnit,
    currency: rate.currency,
    quantity: parseGuestCount(groupSize),
    quoteKind: 'insurance',
    quoteOrder: 0,
    cityCode: rate.cityCode,
    countryCode: rate.countryCode,
    notes: rate.note,
  }
}

// 接机 STD MTC：国/城 = 当天城市（用户口径 2026-08-18，与 THROUGH COACH 相反），
// 名称格式 `{城市英文名} - APT/HTL`（如 Warsaw - APT/HTL）。价格城市特定（待价格表补充）。
function makePickup(locationCategory, day) {
  const info = getCityCode(day?.cityName, day?.cityNameEn) || {}
  const cityEn = day?.cityNameEn || ''
  return {
    type: 'transport',
    transportMode: 'bus',
    name: '接机',
    nameEn: cityEn ? `${cityEn} - ${locationCategory || 'APT/HTL'}` : `MTC - ${locationCategory || 'APT/HTL'}`,
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    priceUnit: 'perGroup',
    quoteKind: 'pickup',
    quoteOrder: 10,
    locationCategory,
    cityCode: day?.cityCode || info.cityCode || '',
    countryCode: day?.countryCode || info.countryCode || '',
    notes: 'STD MTC (Local)，单次 Group rate',
  }
}

// 送机 MTC：返程日与前段 LDC 断开（单城停留）时，酒店 → 机场需要单独用车。
// 国/城 = 当天城市；名称格式 `{城市英文名} - HTL/APT`（如 Budapest - HTL/APT）。
function makeDropoff(day) {
  const info = getCityCode(day?.cityName, day?.cityNameEn) || {}
  const cityEn = day?.cityNameEn || ''
  return {
    type: 'transport',
    transportMode: 'bus',
    name: '送机',
    nameEn: cityEn ? `${cityEn} - HTL/APT` : 'MTC - HTL/APT',
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    priceUnit: 'perGroup',
    quoteKind: 'dropoff',
    quoteOrder: 11,
    locationCategory: 'HTL/APT',
    cityCode: day?.cityCode || info.cityCode || '',
    countryCode: day?.countryCode || info.countryCode || '',
    notes: 'STD MTC (Local)，单次 Group rate',
  }
}

// THROUGH COACH：用户口径（2026-08-18）——
//   - 国/城 = **段起始城市**（调车地，如华沙 → WAW/PL），不再用 LDC 供应商所在地（供应商信息进 notes）；
//   - 名称 = `{起始城市英文名} - {N} DAYS`（如 Warsaw - 9 DAYS），nameEn 带车型（NGS/GLS）；
//   - 价格 = 段总价（城市特定，待价格表补充）。
// from/to 按「段首日白天出发城 → 段末日白天出发城」取（用户口径：非过夜城市）。
function makeThroughCoach(seg, ldc) {
  const info = getCityCode(seg.startCity) || {}
  const startCityEn = seg.startCityEn || ''
  const days = seg.endDay - seg.startDay + 1
  return {
    type: 'transport',
    transportMode: 'bus',
    name: startCityEn ? `${startCityEn} - ${days} DAYS` : 'THROUGH COACH',
    nameEn: `THROUGH COACH (${ldc?.vehicleType || 'NGS'})`,
    from: seg.fromCity,
    to: seg.toCity,
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0, // 段总价（如 Warsaw 5000 EUR），待城市价格表补充
    priceUnit: 'perGroup',
    quoteKind: 'through-coach',
    quoteOrder: 20,
    cityCode: info.cityCode || '',
    countryCode: info.countryCode || '',
    notes: `LDC第${seg.startDay}-${seg.endDay}天，共${days}天${ldc ? `，供应商 ${ldc.fullSelectionName}` : ''}`,
  }
}

// MTC EMPTY RUN 空驶：THROUGH COACH 服务开始当天空驶调车。
// 公里数先按「第一个城市 → 最后一个城市」的估算值注入（同步兜底），
// route.js 解析完成后调用 patchEmptyRunRoadKm 用 OSRM 真实车程覆盖。
function makeEmptyRun(firstCity, lastCity, ldc) {
  const km = estimateRoadKmFallback(firstCity, lastCity)
  const countryCode = ldc?.supplierCode?.split(' ')[0] || ''
  const cityCode = ldc?.supplierCode?.split(' ')[1] || ''
  return {
    type: 'transport',
    transportMode: 'bus',
    name: '空驶',
    nameEn: 'MTC EMPTY RUN',
    from: firstCity,
    to: lastCity,
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    quantity: km,
    quoteKind: 'empty-run',
    quoteOrder: 22,
    cityCode,
    countryCode,
    notes: km > 0
      ? `MTC EMPTY RUN 空驶：${firstCity} → ${lastCity}，约 ${km} km（车程估算）`
      : firstCity === lastCity
        ? `MTC EMPTY RUN 空驶：${firstCity} → ${lastCity}（同城）`
        : `MTC EMPTY RUN 空驶：${firstCity} → ${lastCity}（缺坐标，公里数待补）`,
  }
}

function makePrePostNight(ldc) {
  const countryCode = ldc?.supplierCode?.split(' ')[0] || ''
  const cityCode = ldc?.supplierCode?.split(' ')[1] || ''
  // 用户口径：金额不必出现（费率仍在 ldc.prepost 中备查）
  const notes = ldc?.region
    ? `PRE/POST NIGHT 司机前后夜（${ldc.region}）`
    : QUOTE_RATES.prepostNight.note
  return {
    type: 'transport',
    transportMode: 'bus',
    name: '司机前后夜',
    nameEn: 'PRE/POST NIGHT',
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    quoteKind: 'prepost',
    quoteOrder: 25,
    cityCode,
    countryCode,
    notes,
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

  // 1.5) 规范化酒店项名称：跟随「当天所在城市」cityName（而非 AI 有时用错的过夜城市 finalCityName），
  //       避免出现城市码=MRS（马赛）但酒店名却是「瓦朗索勒酒店」的错位。
  days.forEach((d) => {
    if (!d.cityName) return
    const cityEn = (d.cityNameEn || '').trim()
    d.items = (d.items || []).map((it) => {
      if (it.type !== 'hotel') return it
      return {
        ...it,
        name: `${d.cityName}酒店`,
        nameEn: cityEn ? `Hotel in ${cityEn}` : it.nameEn || '',
      }
    })
  })

  // 中国出发/返程日（如 day 0/day 16 上海）只做展示，不参与地面用车分段，
  // 否则返程日会被当成「地面段」产生虚的 THROUGH COACH / PRE-POST。
  const isCnDay = (d) => {
    const cc = getCityCode(d.cityName, d.cityNameEn)?.countryCode
    if (cc === 'CN') return true
    return getCityCode(overnight(d))?.countryCode === 'CN'
  }
  const realDays = days.filter((d) => (d.dayNumber ?? 0) >= 1 && !isCnDay(d))
  if (!realDays.length) return { ...parsed, days }

  // LDC 供应商定位：只看「第一次飞机落地后的城市」到「最后一天飞机离开的城市」之间
  // 的地面行程涉及的国家（如法意瑞 → 西欧 → IT ROM）。
  // 出发地/返回地（如上海，通常在出境/返程航班两端）仅显示、不参与判定：
  //   1) day 0 出发日已在 realDays 之外；
  //   2) 返程航班终点（返回地）按城市名排除（不限于中国，兼容其他出发枢纽）；
  //   3) CN 兜底（AI 城市名与航班起终点写法不一致时仍能排除上海/北京）；
  //   4) 防御：只保留 LDC 表覆盖的国家（同名城市错配如美国 Syracuse→US 不会搞挂判定）。
  const allFlights = days.flatMap((d) =>
    (d.items || []).filter((it) => it.type === 'transport' && it.transportMode === 'flight' && (it.from || it.to)))
  const returnCity = allFlights.length ? allFlights[allFlights.length - 1].to : null
  const ldcCountries = [...new Set(
    realDays
      .map((d) => ({ name: d.cityName, code: getCityCode(d.cityName, d.cityNameEn)?.countryCode }))
      .filter((x) => x.code && x.code !== 'CN' && KNOWN_COUNTRY_CODES.has(x.code))
      .filter((x) => !(returnCity && x.name && x.name === returnCity))
      .map((x) => x.code),
  )]
  // 挪威/芬兰：行程含北极极地城市（特罗姆瑟/罗瓦涅米等）→ 北（ALT/ROV），否则 → 南（OSL/HEL）
  const arcticCityNames = realDays.flatMap((d) => [d.cityName, d.cityNameEn])
  const ldc = resolveLdcSupplier(ldcCountries, { arctic: hasArcticCity(arcticCityNames) })

  // 2) 旅行保险：第 1 天、置顶、必录，2.66 USD/人 × 人数
  realDays[0].items = [makeInsurance(parsed.groupSize), ...(realDays[0].items || [])]

  const transitOf = (d) => (d.items || []).find((it) =>
    it.type === 'transport' && ['flight', 'train', 'boat'].includes(it.transportMode) && (it.from || it.to))
  // 「抵达」transit：只认「飞机」跨城抵达。火车/船（金色山口观光列车、游湖船、一日游火车）是地面交通，
  // 长途车可空驶跟随到下一站继续接团，不打断用车。
  const arrivalTransitOf = (d) => (d.items || []).find((it) =>
    it.type === 'transport' && it.transportMode === 'flight' &&
    it.to && (it.to === overnight(d) || it.to === d.cityName) &&
    it.from && getCityCode(it.from) != null)
  // 「返程」transit：终点是中国城市的飞机（返程航班罗马→上海）
  const returnTransitOf = (d) => (d.items || []).find((it) =>
    it.type === 'transport' && it.transportMode === 'flight' &&
    it.to && getCityCode(it.to)?.countryCode === 'CN')
  const categoryFor = (mode) =>
    mode === 'flight' ? 'APT/HTL' : mode === 'train' ? 'HTL-STA' : mode === 'boat' ? 'HTL-PIER' : null

  // 4) 切分段：只在「跨城交通」处断段。
  //    抵达 = transit 终点是过夜/当天城市 且 过夜城市相对前一天发生变化（排除同城一日游的返程腿，如少女峰→因特拉肯）；
  //    返程 = transit 终点是中国（如罗马→上海）。
  const isRealArrivalAt = (i) => {
    const d = realDays[i]
    if (!arrivalTransitOf(d)) return false
    const prev = i > 0 ? realDays[i - 1] : null
    return !prev || overnight(prev) !== overnight(d)
  }
  const isMoveDay = (d) => isRealArrivalAt(realDays.indexOf(d)) || !!returnTransitOf(d)

  const segments = []
  let cur = null
  for (let i = 0; i < realDays.length; i++) {
    const d = realDays[i]
    const returnTransit = returnTransitOf(d)
    if (isRealArrivalAt(i)) {
      // 跨城抵达：断段
      if (cur) { segments.push(cur); cur = null }
      const arrival = arrivalTransitOf(d)
      const next = realDays[i + 1]
      const nextOvernight = next ? overnight(next) : null
      const multiNight = !!nextOvernight && nextOvernight === overnight(d)
      if (multiNight || !next) {
        // 同城连住（或抵达日是最后一天）→ STD MTC 接机
        d.items.push(makePickup(categoryFor(arrival.transportMode), d))
      } else {
        // 单晚停留的抵达日 → 段从当天开始，fromCity 取抵达城市（如首日飞抵马赛 / 飞抵巴勒莫）
        cur = {
          startDay: d.dayNumber,
          startCity: overnight(d),
          startCityEn: d.cityNameEn || d.finalCityNameEn || '',
          fromCity: arrival.to || overnight(d),
        }
        cur.endDay = d.dayNumber
        cur.endCity = overnight(d)
      }
    } else if (returnTransit) {
      // 返程离境：断段，不新开段（送机后续处理）
      if (cur) { segments.push(cur); cur = null }
    } else {
      // 无跨城交通（含同城一日游的 train/boat）：继续当前段
      if (!cur) {
        cur = {
          startDay: d.dayNumber,
          startCity: overnight(d),
          startCityEn: d.cityNameEn || d.finalCityNameEn || '',
          fromCity: d.cityName,
        }
      }
      cur.endDay = d.dayNumber
      cur.endCity = overnight(d)
    }
  }
  if (cur) segments.push(cur)

  // 每段终点 = 下一个「跨城交通」日的出发城（车把团送到机场/车站/码头，如巴勒莫→卡塔尼亚）；
  // 无后续跨城交通时回退段末日 cityName。
  for (const seg of segments) {
    const nextDay = realDays.find((d) => d.dayNumber > seg.endDay && isMoveDay(d))
    let toCity = null
    if (nextDay) {
      const move = returnTransitOf(nextDay) || arrivalTransitOf(nextDay)
      if (move?.from) toCity = move.from
    }
    if (!toCity) {
      const lastD = realDays.find((d) => d.dayNumber === seg.endDay)
      toCity = lastD?.cityName || seg.endCity
    }
    seg.toCity = toCity
  }

  // 送机：最后一个返程离境日（终点是中国，如返程航班罗马→上海）。
  // 用户口径（2026-08-18）：返程离境日**总是**单独注入送机 MTC（`{城市英文名} - HTL/APT`），
  // THROUGH COACH 段不覆盖离境日（段 = 用车天数，如 Warsaw - 9 DAYS 止于离境日前一天）。
  const lastDeparture = [...days].reverse().find((d) => (d.dayNumber ?? 0) >= 1 && returnTransitOf(d))
  if (lastDeparture) {
    lastDeparture.items.push(makeDropoff(lastDeparture))
  }

  // 5) 每段注入 THROUGH COACH + EMPTY RUN + PRE/POST（用户口径：使用 THROUGH COACH 时三者都要有）。
  //    THROUGH COACH 覆盖区间内（同一辆车跑到底），单天市区游览用车不再单独录入
  for (const seg of segments) {
    const segStart = realDays.find((d) => d.dayNumber === seg.startDay)
    if (!segStart) continue

    // 移除覆盖区间内的单天市区游览用车（无 from/to 的本地 bus/car）
    for (let dn = seg.startDay; dn <= seg.endDay; dn++) {
      const dd = realDays.find((d) => d.dayNumber === dn)
      if (!dd) continue
      dd.items = dd.items.filter((it) =>
        !(it.type === 'transport' && ['bus', 'car'].includes(it.transportMode) && !(it.from || it.to)))
    }

    // 无 LDC 供应商（表外国家组合）→ 不注入 THROUGH COACH / EMPTY RUN / PRE-POST / 杂费
    if (!ldc) continue
    segStart.items.push(makeThroughCoach(seg, ldc))
    // EMPTY RUN 空驶：每段都有，公里数 = 段起点 → 段终点（下一段交通出发城）的车程
    const firstCity = seg.fromCity
    const lastCity = seg.toCity
    if (firstCity && lastCity) segStart.items.push(makeEmptyRun(firstCity, lastCity, ldc))
    segStart.items.push(makePrePostNight(ldc))

    // 每日用车杂费（部分城市有）：段内每天命中 DAILY_FEES 表则注入（停车费/许可费等）
    for (let dn = seg.startDay; dn <= seg.endDay; dn++) {
      const dd = realDays.find((d) => d.dayNumber === dn)
      if (!dd) continue
      const fee = dailyFeeFor(dd)
      if (!fee) continue
      const feeCountry = getCityCode(fee.city, fee.cityEn)?.countryCode || ''
      dd.items.push({
        type: 'transport',
        transportMode: 'bus',
        name: fee.cityEn ? `${fee.cityEn} - ${fee.note}` : fee.note,
        nameEn: 'THROUGH COACH (GLS)',
        costCategory: 'paid',
        estimatedCost: 0,
        price: fee.amount || 0,
        currency: fee.currency || 'EUR',
        priceUnit: 'perGroup',
        quoteKind: 'daily-fee',
        quoteOrder: 21,
        cityCode: fee.code,
        countryCode: feeCountry,
        notes: fee.note,
      })
    }
  }

  return { ...parsed, days }
}

// 命中当天城市的杂费条目（中文名 / 英文名 / 城市码任一匹配）
function dailyFeeFor(day) {
  if (!day) return null
  const names = [day.cityName, day.cityNameEn, day.cityCode, day.finalCityName, day.finalCityNameEn].filter(Boolean)
  return DAILY_FEES.find((f) =>
    names.some((n) => n && (n === f.city || n === f.cityEn || n === f.code))) || null
}

// 解析完成后异步补全 EMPTY RUN 的真实车程（OSRM 驾驶距离；失败时保持估算值）。
// 在 route.js 调用：const result = applyQuoteRules(parsed); await patchEmptyRunRoadKm(result)
// 并行执行所有段的车程查询（每段最多 5s 超时），避免 N 段串行把请求拖到平台超时（Vercel 504）。
export async function patchEmptyRunRoadKm(result) {
  const tasks = []
  for (const day of result?.days || []) {
    for (const it of day.items || []) {
      if (it.quoteKind === 'empty-run' && it.from && it.to) {
        tasks.push((async () => {
          const km = await roadKmBetween(it.from, it.to)
          if (km > 0) {
            it.quantity = km
            it.notes = `MTC EMPTY RUN 空驶：${it.from} → ${it.to}，约 ${km} km（车程）`
          }
        })())
      }
    }
  }
  await Promise.all(tasks)
  return result
}
