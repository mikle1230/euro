import {
  getQUOSType,
  getCityCode,
  getAttractionNameEn,
  DEFAULT_QUOS_ORDER,
  isFreeItem,
  shouldHideItem,
} from '@/lib/quos-mapping'
import { getAllCitiesWithCoords } from '@/lib/data'
import { recommendHotels } from '@/lib/hotel-recommend'
import { resolveLdcSupplier, hasArcticCity } from '@/lib/ldc-mapping'
import { QUOTE_RATES, LDC_RATES } from '@/lib/quote-rates'
import { haversineKm } from '@/lib/geo'

// ---- LDC 长距离大巴费率速查（来自 KT-Knowledge-Base，LDC 费率体系 ✅）----
export const LDC_RULES = {
  rates: LDC_RATES,
}

// ---- Rome NGS（西欧 IT-ROM）THROUGH COACH 补充下拉：空驶费 Empty Run + 司机前后夜 ----
// 录入 THROUGH COACH (NGS) 时需从下拉选对应补充产品；其他供应商/区域待补充
export const NGS_SUPPLEMENT_OPTIONS = [
  { label: 'Rome - EMPTY RUN (1000-1400) - 1000 EUR', type: 'empty_run', distanceRule: '1000-1400 km', price: 1000, currency: 'EUR' },
  { label: 'Rome - EMPTY RUN (351-600km) - 450 EUR', type: 'empty_run', distanceRule: '351-600 km', price: 450, currency: 'EUR' },
  { label: 'Rome - EMPTY RUN (601-1000KMS) - 800 EUR', type: 'empty_run', distanceRule: '601-1000 km', price: 800, currency: 'EUR' },
  { label: 'Rome - EMPTY RUN AMSTERDAM PARIS or vv. (min. 3 live days)', type: 'empty_run_specific_route', route: 'AMS-PAR' },
  { label: 'Rome - EMPTY RUN FRANKFURT PARIS or vv. (min. 3 live days)', type: 'empty_run_specific_route', route: 'FRA-PAR' },
  { label: 'Rome - PRE/POST NIGHT ACCOMMODATION', type: 'driver_accommodation', price: 120, currency: 'EUR' },
]

// 字段映射行：{ field, action, value, confidence, note }
function row(field, action, value, confidence, note = '') {
  return { field, action, value, confidence, note }
}

function fmtCity(cityName, cityNameEn) {
  const c = getCityCode(cityName, cityNameEn)
  if (!c) return null
  return { code: c.cityCode, country: c.countryCode }
}

// 酒店推荐：按最终抵达/过夜城市，返回 30km 内城市（含自身，距离升序，不分大小）
function recommendHotelCities(finalCityName, finalCityNameEn) {
  if (!finalCityName && !finalCityNameEn) return []
  const cities = getAllCitiesWithCoords()
  const cn = (finalCityName || '').trim()
  const en = (finalCityNameEn || '').trim().toLowerCase()
  const match = cities.find((c) =>
    (cn && c.name === cn) || (en && c.nameEn && c.nameEn.toLowerCase() === en))
  if (!match || match.lat == null || match.lng == null) return []
  return cities
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({
      name: c.name,
      nameEn: c.nameEn,
      distanceKm: haversineKm(match.lat, match.lng, c.lat, c.lng),
    }))
    .filter((c) => c.distanceKm <= 30)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

function citiesSequence(itinerary) {
  const seen = []
  itinerary.days.forEach((d) => {
    if (d.cityName && !seen.includes(d.cityName)) seen.push(d.cityName)
  })
  return seen.join(' → ') || '—'
}

// ---- LDC 检测：收集行程涉及的国家代码集合 ----
// 排除 CN（北京/上海等中国出发城市不参与 LDC 区域判定）
function collectCountries(itinerary) {
  const countries = new Set()
  itinerary.days.forEach((d) => {
    const c = fmtCity(d.cityName, d.cityNameEn)
    if (c && c.country && c.country !== 'CN') countries.add(c.country)
  })
  return [...countries]
}

// 收集行程出现的城市名（中英文 + 过夜城市），用于北极极地判定
function collectCityNames(itinerary) {
  const names = new Set()
  itinerary.days.forEach((d) => {
    ;[d.cityName, d.cityNameEn, d.finalCityName, d.finalCityNameEn].forEach((n) => {
      if (n) names.add(n)
    })
  })
  return [...names]
}

// 是否是 LDC 长距离项（THROUGH COACH 或城际 MTC bus）
function isLdcItem(item) {
  if (item.quoteKind === 'through-coach') return true
  const quos = getQUOSType(item)
  return quos.code === 'MTC' && (item.transportMode || 'bus') === 'bus' && (item.from || item.to)
}

// ---- 单个收费 item 的字段映射表（按 QUOS 服务类型）----
function buildItemFields(item, day, itinerary, ldc) {
  const { code, label } = getQUOSType(item)
  const isInsurance = item.quoteKind === 'insurance'
  const isThroughCoach = item.quoteKind === 'through-coach'
  // THROUGH COACH 的 Location 按 LDC 供应商所在地（如 IT ROM），不是当天城市
  const city = isInsurance
    ? { code: 'BJS', country: 'CN' }
    : isThroughCoach && item.cityCode
      ? { code: item.cityCode, country: item.countryCode }
      : fmtCity(day.cityName, day.cityNameEn)
  const fields = []

  fields.push(row('Service Type', '选择', `${code} (${label})`, '✅'))

  fields.push(
    city
      ? row(
          'Location / City Area',
          '选择',
          city.code,
          '✅',
          isInsurance
            ? '国 CN，统一固定'
            : isThroughCoach && item.cityCode
              ? 'LDC 供应商所在地'
              : day.cityName,
        )
      : row('Location / City Area', '选择', '（未匹配，手动选城市）', '⚠️', 'cityNameEn 为空，QUOS 城市代码可能匹配失败'),
  )

  // 报价注入项（保险 / 接驳 / THROUGH COACH / 前后夜）走专属字段映射
  if (item.quoteKind === 'insurance') {
    const pax = itinerary.groupSize || 0
    const rate = QUOTE_RATES.insurance
    fields.push(row('Category / Supplier Type', '选择', 'OTH → MANUAL GROUP PRICE', '⚠️'))
    fields.push(row('Service Name', '填入', 'Travel Insurance', '✅'))
    fields.push(row('Price', '填入', pax > 0 ? `${rate.price} USD/人 × ${pax} 人 = $${(rate.price * pax).toFixed(2)}` : `${rate.price} USD/人 × 人数`, pax > 0 ? '✅' : '⚠️'))
    fields.push(row('Price Remarks / Internal Comments', '填入', '团险保单号等', '❓'))
    return fields
  }
  if (item.quoteKind === 'through-coach') {
    fields.push(row('Type', '选择', 'THROUGH COACH (LDC)', '✅'))
    if (ldc) {
      fields.push(row('Supplier', '选择', ldc.fullSelectionName, '✅'))
      fields.push(row('Daily Rate / 日费率', '参考', `${ldc.symbol}${ldc.dailyRate}/天（${ldc.vehicleType}）`, '✅', ldc.note))
    } else {
      fields.push(row('Supplier', '选择', '按 LDC 区域选供应商', '⚠️', '未匹配到 LDC 区域，需人工判定'))
    }
    fields.push(row('Start/End Location', '填入', `${item.from || '?'} → ${item.to || '?'}`, item.from && item.to ? '✅' : '⚠️'))
    fields.push(row('Pax Type', '选择', 'G (Group)', '✅'))
    const emptyRuns = NGS_SUPPLEMENT_OPTIONS.filter((o) => o.type !== 'driver_accommodation')
    fields.push(row(
      'Empty Run / 空驶费（下拉）',
      '选择',
      emptyRuns.map((o) => (o.distanceRule ? `${o.distanceRule} €${o.price}` : o.route)).join(' · '),
      '⚠️',
      `Rome NGS 空驶费下拉：${emptyRuns.map((o) => o.label).join('；')}；司机前后夜 €120 已单独录入；其他区域待补充`,
    ))
    fields.push(row('Price', '手动录入', '按 LDC 费率（€/天 × 天数，见高亮卡）', '⚠️'))
    return fields
  }
  if (item.quoteKind === 'pickup') {
    fields.push(row('Type', '选择', 'STD MTC (Local)', '✅'))
    fields.push(row('Start/End Location', '选择', item.locationCategory || 'APT/HTL', '✅'))
    fields.push(row('Price', '手动录入', '单次 Group rate', '⚠️'))
    return fields
  }
  if (item.quoteKind === 'prepost') {
    fields.push(row('Description', '参考', `司机前后夜住宿（${QUOTE_RATES.prepostNight.note}）`, '✅'))
    fields.push(row('Price', '手动录入', `${QUOTE_RATES.prepostNight.note} × 前后夜`, '⚠️'))
    return fields
  }

  switch (code) {
    case 'HTL': {
      fields.push(row('Hotel / 酒店', '选择', item.nameEn || item.name || '（选酒店）', item.nameEn ? '✅' : '⚠️'))
      fields.push(row('Room / Pension 房型', '手动录入', '从供应商/报价组选', '❓', '房型、餐食（B&B/HB/FB）按酒店报价组'))
      const finalCity = day.finalCityName || day.cityName
      const rec = recommendHotelCities(day.finalCityName, day.finalCityNameEn)
      if (rec.length > 1) {
        const near = rec.slice(1, 4).map((c) => `${c.name}(${Math.round(c.distanceKm)}km)`).join('、')
        fields.push(row('酒店城市推荐', '参考', `${finalCity} 或 30km 内：${near}`, '✅'))
      }
      const hotels = recommendHotels(day.finalCityName, day.finalCityNameEn, 2)
      if (hotels.length) {
        const list = hotels.map((h) => `${h.name}${h.rating ? `（${h.rating}分）` : ''}${h.priceEur ? ` €${h.priceEur}/晚` : ''}`).join('；')
        fields.push(row('推荐酒店（Booking ≥7分）', '参考', list, '✅', '评分/价格为静态参考，可上 booking.com 复核实时价'))
      } else {
        fields.push(row('推荐酒店（Booking ≥7分）', '参考', `${finalCity} 暂无推荐数据（待补充）`, '⚠️'))
      }
      break
    }
    case 'MTC': {
      if (item.quoteKind === 'empty-run') {
        fields.push(row('Empty Run 空驶', '填入', `${item.from || '?'} → ${item.to || '?'}，${item.quantity || 0} km`, item.quantity > 0 ? '✅' : '⚠️', '按首城→末城车程估算'))
      } else if (item.from || item.to) {
        fields.push(row('Route / From – To', '填入', `${item.from || '?'} → ${item.to || '?'}`, item.from && item.to ? '✅' : '⚠️'))
      }
      if (ldc) {
        fields.push(row('Supplier', '选择', ldc.fullSelectionName, '⚠️', '见上方 LDC 高亮规则'))
      } else {
        fields.push(row('Supplier', '选择', '选本地巴士供应商', '❓', '非 LDC 长距离，按当地供应商'))
      }
      break
    }
    case 'ENT': {
      const en = item.nameEn || getAttractionNameEn(item.name)
      fields.push(row('Attraction / 景点', '选择', en || item.name || '（选景点）', en ? '✅' : '⚠️'))
      fields.push(row('Pax 人数', '填入', itinerary.groupSize ? String(itinerary.groupSize) : '—', itinerary.groupSize ? '✅' : '⚠️'))
      fields.push(row('Pre-Booking', '勾选', '按需（需预购的景点勾选）', '⚠️'))
      break
    }
    case 'RST': {
      const mealMap = { breakfast: '早餐 Breakfast', lunch: '午餐 Lunch', dinner: '晚餐 Dinner' }
      fields.push(row('Restaurant / 餐厅', '选择', item.name || '（选餐厅）', item.name ? '✅' : '⚠️'))
      fields.push(row('Meal / 餐别', '选择', mealMap[item.type] || '—', item.type ? '✅' : '⚠️'))
      fields.push(row('Driver / Guide 餐费', '手动录入', '按需', '⚠️'))
      break
    }
    case 'GUI': {
      fields.push(row('Guide / 导游', '选择', item.name || '（选导游/导览公司）', item.name ? '✅' : '⚠️'))
      fields.push(row('Language / 语言', '选择', '（按团需求选）', '❓'))
      fields.push(row('Days / 服务天数', '填入', '（按实际服务天数）', '⚠️'))
      break
    }
    case 'FLT': {
      fields.push(row('Route / From – To', '填入', `${item.from || '?'} → ${item.to || '?'}`, item.from && item.to ? '✅' : '⚠️'))
      fields.push(row('Company / 航空公司', '选择', '（选航司）', '❓'))
      break
    }
    case 'DTR':
    case 'OTR': {
      fields.push(row('Route / From – To', '填入', `${item.from || '?'} → ${item.to || '?'}`, item.from && item.to ? '✅' : '⚠️'))
      fields.push(row('Company / 铁路公司', '选择', '（选铁路公司）', '❓'))
      break
    }
    case 'DFR':
    case 'OFR': {
      fields.push(row('Route / From – To', '填入', `${item.from || '?'} → ${item.to || '?'}`, item.from && item.to ? '✅' : '⚠️'))
      fields.push(row('含车 / Seating', '勾选', '按是否载车选择', '⚠️'))
      break
    }
    case 'LUG': {
      fields.push(row('Luggage / 行李', '选择', item.name || '（到达/出发行李）', item.name ? '✅' : '⚠️'))
      fields.push(row('Route / 起终点', '填入', `${item.from || '?'} → ${item.to || '?'}`, item.from && item.to ? '✅' : '⚠️'))
      break
    }
    default: {
      fields.push(row('Others / 其他', '选择', item.name || '（选类别 + 填内容）', item.name ? '✅' : '⚠️'))
      break
    }
  }

  const time = item.startTime || item.endTime
    ? [item.startTime, item.endTime].filter(Boolean).join(' – ')
    : ''
  fields.push(time
    ? row('Time', '填入', time, '✅')
    : row('Time', '填入', '—', '⚠️', 'AI 未识别时间，按行程填写'))

  fields.push(row(
    'Price (Pax Type / Price / Currency)',
    '手动录入',
    '实际报价（转欧元）',
    '⚠️',
    item.estimatedCost > 0 ? `AI 估算 ¥${item.estimatedCost}（人民币，仅参考）` : '需查询供应商费率',
  ))

  if (item.notes) fields.push(row('Notes / Internal', '填入', item.notes, '✅'))

  return fields
}

// ---- 导航步（Add Serv 之前 / 之后）----
function buildNavPreSteps(itinerary) {
  return [
    {
      id: 'nav-new-tour',
      kind: 'nav',
      title: 'Main Menu → New Tour',
      subtitle: '打开 QUOS Main Menu，点击 New Tour 创建新团',
      fields: [
        row('Tour Name / 团名', '填入', itinerary.name || '—', itinerary.name ? '✅' : '⚠️'),
        row('Tour Code / 团号', '填入', itinerary.tourCode || `#${itinerary.serialNumber}`, itinerary.tourCode ? '✅' : '⚠️'),
        row('Start Date / 开始日期', '填入', itinerary.startDate || '—', itinerary.startDate ? '✅' : '⚠️'),
        row('End Date / 结束日期', '填入', itinerary.endDate || '—', itinerary.endDate ? '✅' : '⚠️'),
        row('PAX / 人数', '填入', itinerary.groupSize ? String(itinerary.groupSize) : '—', itinerary.groupSize ? '✅' : '⚠️'),
        row('Request No', '参考', '系统自动生成（格式 BJSJ.H00001）', '✅'),
        row('Tour Status', '参考', 'RFQ（新建默认）', '✅'),
        row('Office', '选择', '（选 PEK / SHA / HKG 等）', '❓'),
      ],
    },
    {
      id: 'nav-config',
      kind: 'nav',
      title: 'Tour Configuration',
      subtitle: '填写路线、座位数、语言、区域等配置',
      fields: [
        row('Route / 路线', '填入', citiesSequence(itinerary), '✅'),
        row('Seats / 座位数', '填入', itinerary.groupSize ? `人数 ${itinerary.groupSize} + 司机/导游` : '人数 + 司机/导游', '⚠️'),
        row('Language / 语言', '选择', '（按团需求）', '❓'),
        row('Region / 区域', '选择', '（西欧等，见 LDC）', '⚠️'),
        row('Tour Type', '选择', '下拉多选（Sales Channel × Must Category 矩阵）', '⚠️'),
      ],
    },
    {
      id: 'nav-segments',
      kind: 'nav',
      title: 'Segments',
      subtitle: '按天分段，每段分配 Office 与 PIC',
      fields: [
        row('Segment Day Range', '填入', `第 1 – ${itinerary.days.length || 0} 天`, '✅'),
        row('Office', '选择', '对应 KT 办公室', '⚠️'),
        row('PIC', '选择', '负责人', '❓', '跨境切分规则 ⚠️ 待确认'),
      ],
    },
    {
      id: 'nav-tourmaker',
      kind: 'nav',
      title: 'TourMaker 进入',
      subtitle: '进入 TourMaker，复核基础信息',
      fields: [
        row('Request No', '参考', '系统生成', '✅'),
        row('PAX', '填入', itinerary.groupSize ? String(itinerary.groupSize) : '—', itinerary.groupSize ? '✅' : '⚠️'),
        row('Currency', '选择', '（EUR 等）', '⚠️'),
        row('Dates', '填入', `${itinerary.startDate || '?'} – ${itinerary.endDate || '?'}`, itinerary.startDate ? '✅' : '⚠️'),
      ],
    },
  ]
}

function buildNavPostSteps() {
  return [
    {
      id: 'nav-quote',
      kind: 'nav',
      title: 'Quote Sheet (Mark-up)',
      subtitle: '进入 Quote Sheet，设置 Mark-up 并核对报价',
      fields: [
        row('Mark-up', '手动录入', '（设百分比）', '⚠️'),
        row('底价公式', '参考', '底价 ÷ (1 − Mark-up%)', '✅'),
        row('6% Buffer', '参考', 'QUOS 价已含 6%（Rate ÷ 0.94）', '✅'),
        row('斜体 / 红星', '参考', '斜体 = Modified Price，红星 = 零价', '✅'),
      ],
    },
    {
      id: 'nav-sales',
      kind: 'nav',
      title: 'Sales Sheet',
      subtitle: '核对 Pax Bracket / Cost vs Sales Price',
      fields: [
        row('Pax Bracket', '选择', '（按人数档位）', '⚠️'),
        row('Cost vs Sales Price', '参考', '核对', '✅'),
        row('PP%', '手动录入', '（手动输入）', '⚠️'),
        row('红色数字', '参考', '= 零价格（Zero Price）', '✅'),
      ],
    },
    {
      id: 'nav-finalise',
      kind: 'nav',
      title: 'Finalise',
      subtitle: '每个 Segment 勾选 Finalised',
      fields: [
        row('Finalised', '勾选', '每个 Segment 逐一勾选', '✅'),
        row('FNL alert', '参考', '全 Segment Finalised → 自动发 FNL', '✅'),
        row('Tour Status', '参考', 'FNL', '✅'),
      ],
    },
    {
      id: 'nav-dos',
      kind: 'nav',
      title: 'Transfer to DOS（可选）',
      subtitle: '转入 DOS，创建 Booking Forms',
      fields: [
        row('Transfer', '操作', '由 Sales PIC/Assistant 触发', '⚠️'),
        row('Booking Forms', '参考', '自动创建，带入 Target Rates', '✅'),
      ],
    },
  ]
}

// ---- 生成完整步骤序列：导航步 + 逐条收费 item 步 + 收尾导航步 ----
export function buildGuideSteps(itinerary, opts = {}) {
  if (!itinerary) return []

  const { hideMeals = true, hideAttractions = true, hideInlandTransit = true } = opts

  const steps = buildNavPreSteps(itinerary)

  const paidItems = []
  itinerary.days.forEach((day) => {
    day.items.forEach((item) => {
      if (shouldHideItem(item, { hideFree: true, hideMeals, hideAttractions, hideInlandTransit })) return
      paidItems.push({ item, day })
    })
  })

  const sortKey = (entry) => {
    const item = entry.item
    if (item.quoteOrder != null) return item.quoteOrder
    return 100 + DEFAULT_QUOS_ORDER.indexOf(getQUOSType(item).code)
  }
  paidItems.sort((a, b) => {
    const oa = sortKey(a)
    const ob = sortKey(b)
    if (oa !== ob) return oa - ob
    return a.day.dayNumber - b.day.dayNumber
  })

  const ldcSupplier = resolveLdcSupplier(collectCountries(itinerary), {
    arctic: hasArcticCity(collectCityNames(itinerary)),
  })
  paidItems.forEach(({ item, day }) => {
    const quos = getQUOSType(item)
    const ldc = isLdcItem(item) && ldcSupplier
      ? { ...ldcSupplier, rates: LDC_RULES.rates }
      : null
    steps.push({
      id: `item-${item.id}`,
      kind: 'item',
      title: `Add Serv：录入「${item.name || quos.label}」`,
      subtitle: `Service Type = ${quos.code} ${quos.label} · 第 ${day.dayNumber} 天 · ${day.cityName}`,
      itemId: item.id,
      dayId: day.id,
      quosType: quos.code,
      quosLabel: quos.label,
      dayNumber: day.dayNumber,
      cityName: day.cityName,
      item,
      fields: buildItemFields(item, day, itinerary, ldc),
      ldc,
    })
  })

  return steps.concat(buildNavPostSteps())
}

// 统计：免费项目数（导游已忽略）
export function countFreeItems(itinerary) {
  if (!itinerary) return 0
  let n = 0
  itinerary.days.forEach((d) => d.items.forEach((i) => { if (isFreeItem(i)) n++ }))
  return n
}
