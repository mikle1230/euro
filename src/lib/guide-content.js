import {
  getQUOSType,
  getCityCode,
  getAttractionNameEn,
  DEFAULT_QUOS_ORDER,
  isFreeItem,
} from '@/lib/quos-mapping'

// ---- 西欧国家集合（LDC 大巴规则适用范围）----
// ⚠️ 精确边界按 KT 业务口径可调；此处取西欧主要国家
export const WESTERN_EUROPE_CODES = [
  'FR', 'IT', 'DE', 'CH', 'NL', 'BE', 'LU', 'AT', 'ES', 'PT',
]

// ---- LDC 长距离大巴费率速查（来自 KT-Knowledge-Base，LDC 费率体系 ✅）----
export const LDC_RULES = {
  rates: [
    'NGS 西欧：€650/天，上限 375 km/天，超出 €2/km',
    'Empty Run：0–350 km 免费 / 351–600 km €450 / 601–1000 km €800 / 1001–1400 km €1000 / 1401–1999 km €1500',
    '司机前/后夜：€120/晚',
    'VAT：西欧 NGS 已含（德国除外，+€85/天）',
    'Tips：最低 €50/天',
  ],
}

// 字段映射行：{ field, action, value, confidence, note }
function row(field, action, value, confidence, note = '') {
  return { field, action, value, confidence, note }
}

function fmtCity(cityName, cityNameEn) {
  const c = getCityCode(cityName, cityNameEn)
  if (!c) return null
  return { code: c.cityCode, country: c.countryCode }
}

function citiesSequence(itinerary) {
  const seen = []
  itinerary.days.forEach((d) => {
    if (d.cityName && !seen.includes(d.cityName)) seen.push(d.cityName)
  })
  return seen.join(' → ') || '—'
}

// ---- LDC 检测：是否是「西欧长距离大巴」----
// 命中条件：QUOS=MTC + transportMode=bus + 城际（from/to 有值）+ 涉及西欧国家
export function isWesternEuropeMtc(item, day, itinerary) {
  const quos = getQUOSType(item)
  if (quos.code !== 'MTC') return null
  if ((item.transportMode || 'bus') !== 'bus') return null
  // 市区游览用车（无 from/to）属本地巴士，非 LDC 长距离
  if (!item.from && !item.to) return null

  const dayCountry = (fmtCity(day.cityName, day.cityNameEn) || {}).country || null

  const countries = new Set()
  itinerary.days.forEach((d) => {
    const c = fmtCity(d.cityName, d.cityNameEn)
    if (c) countries.add(c.country)
  })
  const list = [...countries]

  const isWestern =
    (dayCountry && WESTERN_EUROPE_CODES.includes(dayCountry)) ||
    list.some((c) => WESTERN_EUROPE_CODES.includes(c))
  if (!isWestern) return null

  let supplierRule
  let scope = '西欧跨境'
  if (list.length === 1) {
    const c = list[0]
    scope = `${c} 单国`
    if (c === 'FR') supplierRule = '法国单国 → FR PAR · GLS'
    else if (c === 'IT') supplierRule = '意大利单国 → IT ROM · GLS'
    else supplierRule = `${c} 单国 → 按 LDC 区域选供应商（GLS）`
  } else {
    supplierRule = '西欧跨境（多国）→ IT ROM · Through Coach · NGS'
  }

  return { supplierRule, scope, ...LDC_RULES }
}

// ---- 单个收费 item 的字段映射表（按 QUOS 服务类型）----
function buildItemFields(item, day, itinerary, ldc) {
  const { code, label } = getQUOSType(item)
  const city = fmtCity(day.cityName, day.cityNameEn)
  const fields = []

  fields.push(row('Service Type', '选择', `${code} (${label})`, '✅'))

  fields.push(
    city
      ? row('Location / City Area', '选择', city.code, '✅', day.cityName)
      : row('Location / City Area', '选择', '（未匹配，手动选城市）', '⚠️', 'cityNameEn 为空，QUOS 城市代码可能匹配失败'),
  )

  switch (code) {
    case 'HTL': {
      fields.push(row('Hotel / 酒店', '选择', item.nameEn || item.name || '（选酒店）', item.nameEn ? '✅' : '⚠️'))
      fields.push(row('Room / Pension 房型', '手动录入', '从供应商/报价组选', '❓', '房型、餐食（B&B/HB/FB）按酒店报价组'))
      break
    }
    case 'MTC': {
      if (item.from || item.to) {
        fields.push(row('Route / From – To', '填入', `${item.from || '?'} → ${item.to || '?'}`, item.from && item.to ? '✅' : '⚠️'))
      }
      if (ldc) {
        fields.push(row('Supplier', '选择', ldc.supplierRule, '⚠️', '见上方 LDC 高亮规则'))
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
export function buildGuideSteps(itinerary) {
  if (!itinerary) return []

  const steps = buildNavPreSteps(itinerary)

  const paidItems = []
  itinerary.days.forEach((day) => {
    day.items.forEach((item) => {
      if (!isFreeItem(item)) paidItems.push({ item, day })
    })
  })

  paidItems.sort((a, b) => {
    const oa = DEFAULT_QUOS_ORDER.indexOf(getQUOSType(a.item).code)
    const ob = DEFAULT_QUOS_ORDER.indexOf(getQUOSType(b.item).code)
    if (oa !== ob) return oa - ob
    return a.day.dayNumber - b.day.dayNumber
  })

  paidItems.forEach(({ item, day }) => {
    const quos = getQUOSType(item)
    const ldc = isWesternEuropeMtc(item, day, itinerary)
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
