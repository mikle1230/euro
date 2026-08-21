// 报价规则注入：在 AI 解析结果上，去掉城际 bus 项并注入 QUOS 报价项目
// （旅行保险 / THROUGH COACH / EMPTY RUN 空驶 / 接机 MTC / PRE-POST NIGHT）。
// 纯函数、无副作用，可运行于服务端 route.js 与客户端。
// 费率常量集中在 ./quote-rates.js；EMPTY RUN 真实车程在 route.js 用 patchEmptyRunRoadKm 异步补全。
import { QUOTE_RATES } from './quote-rates.js'
import { getCityCode } from './quos-mapping.js'
import { resolveLdcSupplier, hasArcticCity, KNOWN_COUNTRY_CODES, ER_RULES } from './ldc-mapping.js'
import { estimateRoadKmFallback, roadKmBetween } from './road-distance.js'
import { DAILY_FEES } from '../data/daily-fees.js'
import { STD_MTC_OPTIONS, DEPARTURE_ACTIVITY_MTC } from '../data/std-mtc-options.js'
import { COACH_RULES } from '../data/coach-rules.js'

const overnight = (d) => d.finalCityName || d.cityName || ''

// 离境日「有行程内容」判定：游览/活动项（attraction/other 等）才算；
// 餐饮（早/午/晚餐）、交通、住宿不算 —— 第 12 天只有早餐+送机 → 视为纯送机，单独注入送机 MTC。
const hasDayActivity = (d) => (d.items || []).some((it) =>
  it.type !== 'transport' && it.type !== 'hotel' &&
  !['breakfast', 'lunch', 'dinner'].includes(it.type) &&
  String(it.name || '').trim() !== '')

// 同城判断（最稳口径）：字符串相同 或 两者都能解析出相同城市码（中文/英文/机场码/城市码均可）。
// AI 的 from/to/城市名可能是 '华沙' / 'Warsaw' / 'WAW' 任意写法，统一按码比对。
const isSameCity = (a, b) => {
  if (!a || !b) return false
  if (a === b) return true
  const ca = getCityCode(a)?.cityCode
  const cb = getCityCode(b)?.cityCode
  return !!ca && !!cb && ca === cb
}

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

// 当地用车（R2/R3a/R4，脱离 LDC）：`{城} - X HOURS`（当地车）或 `{城} - APT - X HOURS`（半天+送机），
// 从城市 KT STD MTC 选项表精确匹配，兜底拼写。X 凭经验（COACH_RULES.localMtcHours，默认多留 buffer 05 HOURS）。
function makeLocalMtc(day, suffix = '') {
  const info = getCityCode(day?.cityName, day?.cityNameEn) || {}
  const cityEn = day?.cityNameEn || ''
  const cityCode = day?.cityCode || info.cityCode || ''
  const base = `${cityEn} - ${suffix ? `${suffix} - ` : ''}${COACH_RULES.localMtcHours}`
  const options = STD_MTC_OPTIONS[cityCode] || []
  const nameEn = options.includes(base) ? base : (cityEn ? base : `MTC - ${COACH_RULES.localMtcHours}`)
  return {
    type: 'transport',
    transportMode: 'bus',
    name: '当地用车',
    nameEn,
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    priceUnit: 'perGroup',
    quoteKind: 'local-mtc',
    quoteOrder: 12, // pickup(10) / dropoff(11) 之后，THROUGH COACH(20) 之前
    cityCode,
    countryCode: day?.countryCode || info.countryCode || '',
    notes: suffix === 'APT' ? 'STD MTC (Local) 当地用车 + 送机' : 'STD MTC (Local) 当地用车',
  }
}

// 送机 MTC：返程日与前段 LDC 断开（单城停留）时，酒店 → 机场需要单独用车。
// 国/城 = 当天城市。当地独立用车规则（用户口径 2026-08-19）：
//   - 离境日**有半天行程**（白天活动 + 送机）→ 从该城 KT STD MTC 选项选 `{城市} - APT - X HOURS`
//     （如 Rome - APT - 05 HOURS = 5 小时用车后送机；X 凭经验选择，默认多留 buffer 取 05，选项表优先）；
//   - **纯送机**（无白天活动）→ `{城市} - HTL/APT`。
function makeDropoff(day, hasActivity = false) {
  const info = getCityCode(day?.cityName, day?.cityNameEn) || {}
  const cityEn = day?.cityNameEn || ''
  const cityCode = day?.cityCode || info.cityCode || ''
  const options = STD_MTC_OPTIONS[cityCode] || []
  let nameEn
  if (hasActivity) {
    const candidate = `${cityEn} - ${DEPARTURE_ACTIVITY_MTC}`
    nameEn = options.includes(candidate) ? candidate : (cityEn ? `${cityEn} - APT - 05 HOURS` : 'MTC - APT 05 HOURS')
  } else {
    nameEn = cityEn ? `${cityEn} - HTL/APT` : 'MTC - HTL/APT'
  }
  return {
    type: 'transport',
    transportMode: 'bus',
    name: '送机',
    nameEn,
    costCategory: 'paid',
    estimatedCost: 0,
    price: 0,
    priceUnit: 'perGroup',
    quoteKind: 'dropoff',
    quoteOrder: 11,
    locationCategory: 'HTL/APT',
    cityCode,
    countryCode: day?.countryCode || info.countryCode || '',
    notes: hasActivity
      ? 'STD MTC (Local) 半天用车 + 送机，单次 Group rate'
      : 'STD MTC (Local)，单次 Group rate',
  }
}

// THROUGH COACH：用户口径（2026-08-19 修正）——
//   - 国/城 = **LDC 供应商所在地**（遵从 LDC Summer 2026 表：西欧多国→IT ROM、中欧→CZ PRG、
//     波兰→PL WAW（从华沙调车）。2026-08-18 曾误改为段起始城市，已改回——当时看到的 WAW/PL
//     正是 polandMono 的供应商码，不是起始城市）；
//   - 名称 = `{起始城市英文名} - {N} DAYS`（如 Warsaw - 9 DAYS，名称用起始城市，国/城用供应商）；
//   - nameEn 带车型（NGS/GLS）；价格 = 段总价（待价格表补充）。
// from/to 按「段首日白天出发城 → 段末日白天出发城」取（用户口径：非过夜城市）。
function makeThroughCoach(seg, ldc) {
  const countryCode = ldc?.supplierCode?.split(' ')[0] || ''
  const cityCode = ldc?.supplierCode?.split(' ')[1] || ''
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
    cityCode,
    countryCode,
    notes: `LDC第${seg.startDay}-${seg.endDay}天，共${days}天${ldc ? `，供应商 ${ldc.fullSelectionName}` : ''}`,
  }
}

// EMPTY RUN 按 LDC 表计价（ER_RULES）：金额阶梯 / 次数×单价 / 按公里；返回 { price, label }
// 次数型（1ER/2ER）单次价 unit 表内未给 → price=0 只显示次数，待用户补充 unit 后自动计价
function erPrice(ldc, km) {
  const er = ldc?.key ? ER_RULES[ldc.key] : null
  if (!er || !km) return { price: 0, label: '' }
  const sym = ldc?.symbol || '€'
  if (er.type === 'tiers') {
    for (const [lo, hi, amt] of er.tiers) {
      if (km >= lo && km <= hi) return { price: amt || 0, label: amt > 0 ? `，ER ${sym}${amt}` : '' }
    }
    return { price: 0, label: '' }
  }
  if (er.type === 'count') {
    for (const [lo, hi, cnt] of er.tiers) {
      if (km >= lo && km <= hi) {
        if (er.unit) return { price: Math.round(cnt * er.unit * 100) / 100, label: `，ER ×${cnt}（${sym}${er.unit}/次）` }
        return { price: 0, label: `，ER ×${cnt}` }
      }
    }
    return { price: 0, label: '' }
  }
  if (er.type === 'perKm') {
    const billable = km > er.fromKm ? km - er.fromKm : 0
    const price = Math.round(billable * er.perKm * 100) / 100
    return { price, label: price > 0 ? `，ER ${sym}${price}` : '' }
  }
  return { price: 0, label: '' }
}

// MTC EMPTY RUN 空驶：THROUGH COACH 服务开始当天空驶调车。
// 公里数先按「第一个城市 → 最后一个城市」的估算值注入（同步兜底），
// route.js 解析完成后调用 patchEmptyRunRoadKm 用 OSRM 真实车程覆盖（价格按新公里数重算）。
function makeEmptyRun(firstCity, lastCity, ldc) {
  const km = estimateRoadKmFallback(firstCity, lastCity)
  const er = erPrice(ldc, km)
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
    price: er.price || 0,
    currency: er.price > 0 ? (ldc?.symbol || 'EUR') : '',
    priceUnit: 'perGroup',
    quantity: km,
    quoteKind: 'empty-run',
    quoteOrder: 22,
    cityCode,
    countryCode,
    erKey: ldc?.key || '', // OSRM 补全公里数后按 ER_RULES 重算价格用
    erSymbol: ldc?.symbol || '€',
    notes: km > 0
      ? `MTC EMPTY RUN 空驶：${firstCity} → ${lastCity}，约 ${km} km（车程估算）${er.label}`
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

  // 1.6) transit 日过夜城市兜底：当天有换城城际交通且 AI 未输出 finalCityName 时，
  //      当晚过夜城市 = 交通终点城市（如「巴黎→日内瓦」火车、「日内瓦→伯尔尼」大巴、「苏黎世→米兰」航班）。
  //      识别不依赖 transportMode 白名单：type=transport 且有 from/to 且两端解析出**不同城市码**即为换城
  //      （walk/metro/市区游览用车的 from/to 多为景点名，解析不到城市码自动排除）；
  //      当天多段交通取**最后一段**（终点 = 最终到达城市，如 卢塞恩→苏黎世 + 苏黎世→米兰 → 米兰）。
  //      finalCityName 为空或与 cityName 相同（AI 冗余输出）都视为未指定；
  //      to 解析不到城市码 / 终点=当天城市（同城住宿）/ 中国出发或返程日（to 或当天城市为 CN）
  //      / 最后一段回到当天出发城市（一日游往返，如 巴黎→凡尔赛→巴黎）不补。
  //      必须放在规则 1（删城际 bus/car）之前执行，否则大巴换城项已被删除无法识别。
  days.forEach((d) => {
    if (d.finalCityName && d.finalCityName !== d.cityName) return
    const dayCountry = getCityCode(d.cityName, d.cityNameEn)?.countryCode
    if (dayCountry === 'CN') return
    const transits = (d.items || []).filter((it) =>
      it.type === 'transport' &&
      it.from && it.to &&
      String(it.from).trim() !== String(it.to).trim())
    if (!transits.length) return
    const transit = transits[transits.length - 1] // 取最后一段：终点 = 最终到达城市
    const toName = String(transit.to).trim()
    const toInfo = getCityCode(toName)
    if (!toInfo?.cityCode || toInfo.countryCode === 'CN') return
    const dayCode = getCityCode(d.cityName, d.cityNameEn)?.cityCode
    if (dayCode && toInfo.cityCode === dayCode) return
    // 一日游往返：最后一段回到当天第一段出发城市（巴黎→凡尔赛→巴黎），按城市码比较
    const first = transits[0]
    const fromCode = getCityCode(String(first.from || '').trim())?.cityCode
    if (fromCode && toInfo.cityCode === fromCode) return
    d.finalCityName = toName
    if (/^[A-Za-z]/.test(toName)) d.finalCityNameEn = toName
  })

  // 1) 去掉城际 bus/car 项（被 THROUGH COACH 合并替代）；flight/train/boat 保留
  days.forEach((d) => {
    d.items = (d.items || []).filter((it) =>
      !(it.type === 'transport' && ['bus', 'car'].includes(it.transportMode) && (it.from || it.to)))
  })

  // 1.5) 规范化酒店项名称：跟随「当晚过夜城市」（finalCityName 优先，与 overnight() 口径一致）。
  //      如第4天巴黎→日内瓦火车、晚上住日内瓦 → 酒店应为「日内瓦酒店」而非「巴黎酒店」。
  //      过夜城市缺英文名时不编造（码表无英文名），保留 AI 原 nameEn。
  days.forEach((d) => {
    const nightName = d.finalCityName || d.cityName
    const nightEn = (d.finalCityNameEn || '').trim()
    if (!nightName) return
    d.items = (d.items || []).map((it) => {
      if (it.type !== 'hotel') return it
      return {
        ...it,
        name: `${nightName}酒店`,
        nameEn: nightEn ? `Hotel in ${nightEn}` : it.nameEn || '',
      }
    })
  })

  // 1.7) 无游览日删除市区游览用车：市区用车（无 from/to 的本地 bus，name 含「用车/游览」）只在当天
  //      实际有景点游览（attraction 项）时保留。抵达日/自由活动日 AI 常误加（如落地巴黎没有游览
  //      却出现「巴黎市区游览用车」），当天只有接机 MTC 就够，这里统一移除。
  days.forEach((d) => {
    const hasAttraction = (d.items || []).some((it) => it.type === 'attraction')
    if (hasAttraction) return
    d.items = (d.items || []).filter((it) =>
      !(it.type === 'transport' && ['bus', 'car'].includes(it.transportMode) && !(it.from || it.to) &&
        /用车|游览/.test(it.name || '')))
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
  // 返程终点：只认「终点是中国城市」的航班（罗马→上海）；入境航班（北京→华沙）的 to 不是返程，
  // 不能拿来过滤 LDC 国家（否则会把华沙从国家集合里剔除，误判区域）。
  const returnFlights = allFlights.filter((it) => getCityCode(it.to)?.countryCode === 'CN')
  const returnCity = returnFlights.length ? returnFlights[returnFlights.length - 1].to : null
  const ldcCountries = [...new Set(
    realDays
      .map((d) => ({ name: d.cityName, code: getCityCode(d.cityName, d.cityNameEn)?.countryCode }))
      .filter((x) => x.code && x.code !== 'CN' && KNOWN_COUNTRY_CODES.has(x.code))
      .filter((x) => !(returnCity && isSameCity(x.name, returnCity)))
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
    it.to && (isSameCity(it.to, overnight(d)) || isSameCity(it.to, d.cityName)) &&
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
    if (arrivalTransitOf(d)) {
      const prev = i > 0 ? realDays[i - 1] : null
      return !prev || !isSameCity(overnight(prev), overnight(d))
    }
    // 兜底：行程第一个真实日（realDays[0]）在**行程里有航班**时，即使 Day1 漏了入境航班
    // （简单行程 PDF 可能没写航班细节），也视为抵达日 —— 中国出发的团第一个欧洲日必为飞机抵达，
    // 否则段会从第 1 天误开 THROUGH COACH。完全无航班的纯本地行程不兜底（无法判断抵达）。
    if (i === 0 && allFlights.length > 0) return true
    return false
  }
  const isMoveDay = (d) => isRealArrivalAt(realDays.indexOf(d)) || !!returnTransitOf(d)

  const segments = []
  let cur = null
  for (let i = 0; i < realDays.length; i++) {
    const d = realDays[i]
    const returnTransit = returnTransitOf(d)
    if (isRealArrivalAt(i)) {
      // 跨城抵达：计算断开距离，按 R3/R4 决定是否断段
      const arrival = arrivalTransitOf(d)
      const breakKm = arrival ? estimateRoadKmFallback(arrival.from, arrival.to) : 0
      // R3b：断开 ≤ 阈值 且 策略 ldc-continuous（高端团不换车）→ 不断段，THROUGH COACH 跨断开连续覆盖
      const ldcContinuous = COACH_RULES.breakStrategy === 'ldc-continuous' &&
        breakKm > 0 && breakKm <= COACH_RULES.breakThresholdKm
      if (!ldcContinuous) {
        if (cur) { segments.push(cur); cur = null }
        // R3a / R4：断开前「起始城市」当地车（断开当天白天还在起始城市 → 当地车 + 送机到机场）
        // 例：Day3 巴黎→飞机→罗马，Day3 cityName=巴黎 → 注入 Paris - APT - X HOURS
        if (arrival && arrival.from && isSameCity(d.cityName, arrival.from) && getCityCode(arrival.from)) {
          d.items.push(makeLocalMtc(d, 'APT'))
        }
      }
      const next = realDays[i + 1]
      const nextOvernight = next ? overnight(next) : null
      const multiNight = !!nextOvernight && isSameCity(nextOvernight, overnight(d))
      if (ldcContinuous) {
        // R3b：段继续（不换车），覆盖到落地城市
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
      } else if (multiNight || !next) {
        // 同城连住（或抵达日是最后一天）→ STD MTC 接机（arrival 可能为空：i=0 兜底路径，中国出发默认 APT/HTL）
        d.items.push(makePickup(categoryFor(arrival?.transportMode) || 'APT/HTL', d))
      } else if (i === 0) {
        // 首个地面日抵达（单晚换城，如德奥 Day1 法兰克福、次日海德堡）→ 当地 STD MTC 接机（APT/HTL），
        // 段从第 2 天起（用户口径 2026-08-21，KT 实操校准：Day1 只接机，大巴从 Day2 开始）
        d.items.push(makePickup(categoryFor(arrival?.transportMode) || 'APT/HTL', d))
      } else {
        // 中途单晚停留的抵达日（R3/R4 断开落地等）→ 段从当天开始，fromCity 取抵达城市（如飞抵巴勒莫）
        cur = {
          startDay: d.dayNumber,
          startCity: overnight(d),
          startCityEn: d.cityNameEn || d.finalCityNameEn || '',
          fromCity: arrival?.to || overnight(d),
        }
        cur.endDay = d.dayNumber
        cur.endCity = overnight(d)
      }
    } else if (returnTransit) {
      // 返程离境日（用户口径 2026-08-21）：
      //   当天**有行程内容**（白天游览/活动）→ THROUGH COACH 段覆盖到返程日当天（大巴白天仍用、
      //     送机场也由大巴完成），不断段 —— 如 B线法意瑞 D11 罗马→北京：上午游览斗兽场/许愿池，
      //     晚上航班，大巴应算 10 天（覆盖 D11）而非 9 天；
      //   **纯送机**（无白天活动）→ 断段，送机 MTC 单独安排（HTL/APT）。
      const hasActivity = hasDayActivity(d)
      if (hasActivity) {
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
      } else {
        // 纯送机：断段，不新开段（送机后续处理）
        if (cur) { segments.push(cur); cur = null }
      }
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
  // 用户口径（2026-08-21 更新）：
  //   - 离境日**有行程内容**（白天游览/活动）→ THROUGH COACH 段已覆盖到当天（大巴送机场），不再单独注入送机 MTC；
  //   - 离境日**纯送机**（无白天活动）→ 单独注入送机 MTC（`{城市英文名} - HTL/APT`）。
  const lastDeparture = [...days].reverse().find((d) => (d.dayNumber ?? 0) >= 1 && returnTransitOf(d))
  if (lastDeparture) {
    const hasActivity = hasDayActivity(lastDeparture)
    if (!hasActivity) {
      lastDeparture.items.push(makeDropoff(lastDeparture, false))
    }
  }

  // 5) 每段注入用车项。
  //    非 LDC 段（R2 同城段：断开后同城停留、无地面跨城移动）→ 当地车（每天一条，脱离 LDC）；
  //    LDC 段 → THROUGH COACH + EMPTY RUN + PRE/POST（用户口径：使用 THROUGH COACH 时三者都要有）。
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

    // R2：落地同城段（被飞机/火车断开后、同城停留多天、无地面跨城移动）→ 当地车，脱离 LDC。
    // 判定：段首日前一天是「抵达日」（跨城抵达落地）且**段内每天过夜城市都与抵达日同城**
    //   （落地后原地停留，无地面跨城移动）→ 落地同城段。
    // 注意：不能只比 seg.startCity==seg.endCity —— 首日抵达后第 2 天起的新段若当天换城
    //   （如 D1 巴黎落地、D2 尼斯），段首尾可能同城但实际已跨城，误判为 R2 会吞掉 THROUGH COACH。
    // 纯本地行程（无断开，如特罗姆瑟 2 天）不适用 —— 段首日前无抵达 → 保持正常 LDC 段。
    const prevDay = realDays.find((d) => d.dayNumber === seg.startDay - 1)
    const isArrivalLanding = prevDay ? isRealArrivalAt(realDays.indexOf(prevDay)) : false
    const isLocalSegment = isArrivalLanding && !!prevDay &&
      realDays
        .filter((d) => d.dayNumber >= seg.startDay && d.dayNumber <= seg.endDay)
        .every((d) => isSameCity(overnight(d), overnight(prevDay)))
    if (isLocalSegment) {
      for (let dn = seg.startDay; dn <= seg.endDay; dn++) {
        const dd = realDays.find((d) => d.dayNumber === dn)
        if (!dd) continue
        dd.items.push(makeLocalMtc(dd))
      }
      continue // 不注入 THROUGH COACH / EMPTY RUN / PRE-POST / 杂费
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
      if (fee) {
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
      // 德国境内每天增值税附加费（KT 录入口径 2026-08-21：Base - GERMAN VAT，€90.43/天）
      const dayCountry = getCityCode(dd.cityName, dd.cityNameEn)?.countryCode
      if (dayCountry === 'DE') {
        const vat = QUOTE_RATES.germanVat
        const dayCode = dd.cityCode || getCityCode(dd.cityName, dd.cityNameEn)?.cityCode || ''
        dd.items.push({
          type: 'transport',
          transportMode: 'bus',
          name: 'Base - GERMAN VAT',
          nameEn: 'THROUGH COACH (GLS)',
          costCategory: 'paid',
          estimatedCost: 0,
          price: vat.price,
          currency: vat.currency,
          priceUnit: vat.priceUnit,
          quoteKind: 'daily-fee',
          quoteOrder: 21,
          cityCode: dayCode,
          countryCode: 'DE',
          notes: vat.note,
        })
      }
      // 奥地利境内每天道路通行费（KT 录入口径 2026-08-21：Austria ROAD TAX PAID BY DRIVER，€47.87/天）
      if (dayCountry === 'AT') {
        const tax = QUOTE_RATES.austriaRoadTax
        const dayCode = dd.cityCode || getCityCode(dd.cityName, dd.cityNameEn)?.cityCode || ''
        dd.items.push({
          type: 'transport',
          transportMode: 'bus',
          name: 'Austria ROAD TAX PAID BY DRIVER',
          nameEn: 'THROUGH COACH (GLS)',
          costCategory: 'paid',
          estimatedCost: 0,
          price: tax.price,
          currency: tax.currency,
          priceUnit: tax.priceUnit,
          quoteKind: 'daily-fee',
          quoteOrder: 21,
          cityCode: dayCode,
          countryCode: 'AT',
          notes: tax.note,
        })
      }
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
            // 真实公里数出来后按 ER 规则重算价格
            const er = erPrice({ key: it.erKey, symbol: it.erSymbol }, km)
            it.price = er.price || 0
            it.currency = er.price > 0 ? (it.erSymbol || 'EUR') : ''
            it.notes = `MTC EMPTY RUN 空驶：${it.from} → ${it.to}，约 ${km} km（车程）${er.label}`
          }
        })())
      }
    }
  }
  await Promise.all(tasks)
  return result
}
