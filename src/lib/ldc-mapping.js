// LDC 长途车供应商映射（规则以 KT「LDC Summer 2026 CN ACTIVE」为准）
// 纯函数：输入行程涉及的国家代码集合 → 输出 THROUGH COACH 供应商（国+城 / 车型 / 日费率）。
// 判定口径（用户已确认）：
//   1) 单国 → 该国 Mono/区域（未标 Mono 但唯一国家名的同样处理）
//   2) 德国默认 NGS，仅特殊团（High End/Adhoc/VIP）才 GLS
//   3) 伊比利亚：纯葡萄牙 → PT LIS；碰到西班牙 → ES MAD
//   4) 多国：明确规则优先（荷比卢/中欧/斯堪的纳维亚/英国），其余西欧多国统一 IT ROM
//   5) 西西里岛内 → IT PMO（Mono Sicily）；碰本土 → 意大利 Mono/西欧
//   6) 挪威/芬兰南北：行程含北极极地 → 北；常规城市 → 南（hasArcticCity 判定）

export const SUPPLIERS = {
  // ---- 多国 / 跨国区域 ----
  westernEurope: {
    region: 'Western Europe Planning', supplierCode: 'IT ROM',
    fullSelectionName: 'IT ROM Through Coach (NGS)', vehicleType: 'NGS',
    dailyRate: 650, symbol: '€', prepost: '€120', note: '西欧跨国游（法意瑞德西葡等）',
  },
  benelux: {
    region: 'Benelux', supplierCode: 'NL AMS',
    fullSelectionName: 'NL AMS Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 740, symbol: '€', prepost: '€135', note: '荷比卢区域',
  },
  germanyNgs: {
    region: 'Germany', supplierCode: 'DE BER',
    fullSelectionName: 'DE BER Through Coach (NGS)', vehicleType: 'NGS',
    dailyRate: 630, symbol: '€', prepost: '€120', note: '德国默认 NGS；特殊团(High End/Adhoc/VIP)可切 GLS €800',
  },
  germanyGls: {
    region: 'Germany', supplierCode: 'DE BER',
    fullSelectionName: 'DE BER Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 800, symbol: '€', prepost: '€120', note: 'High End/Adhoc/VIP 特殊团',
  },
  centralEurope: {
    region: 'Central Europe (HUN, CZE, SVK)', supplierCode: 'CZ PRG',
    fullSelectionName: 'CZ PRG Through Coach (NGS)', vehicleType: 'NGS',
    dailyRate: 550, symbol: '€', prepost: '€120', note: '中欧（匈/捷/斯洛伐克，可含奥地利）',
  },
  scandinavia: {
    region: 'Scandinavia (South Norway/Sweden/Denmark)', supplierCode: 'SE STO',
    fullSelectionName: 'SE STO Through Coach (NGS)', vehicleType: 'NGS',
    dailyRate: 670, symbol: '€', prepost: '€148', note: '斯堪的纳维亚跨国（挪/瑞/丹跨境）',
  },
  uk: {
    region: 'UK', supplierCode: 'GB LON',
    fullSelectionName: 'GB LON Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 720, symbol: '£', prepost: '£110', note: '英国；伦敦起止 700',
  },

  // ---- 单国 Mono ----
  franceMono: {
    region: 'France Mono', supplierCode: 'FR PAR',
    fullSelectionName: 'FR PAR Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 750, symbol: '€', prepost: '€120', note: '仅限法国单国',
  },
  italyMono: {
    region: 'Italy Mono', supplierCode: 'IT ROM',
    fullSelectionName: 'IT ROM Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 590, symbol: '€', prepost: '€120', note: '仅限意大利单国',
  },
  sicilyMono: {
    region: 'Mono Sicily', supplierCode: 'IT PMO',
    fullSelectionName: 'IT PMO Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 640, symbol: '€', prepost: '€120', note: '仅限西西里岛内游',
  },
  switzerlandMono: {
    region: 'Switzerland Mono', supplierCode: 'CH ZRH',
    fullSelectionName: 'CH ZRH Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 880, symbol: 'CHF', prepost: 'CHF 130', note: '仅限瑞士单国',
  },
  iberia: {
    region: 'Iberia', supplierCode: 'ES MAD',
    fullSelectionName: 'ES MAD Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 590, symbol: '€', prepost: '€110', note: '西班牙/葡萄牙区域；巴塞罗那起止 630',
  },
  portugalMono: {
    region: 'Portugal Mono', supplierCode: 'PT LIS',
    fullSelectionName: 'PT LIS Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 580, symbol: '€', prepost: '€100', note: '仅限葡萄牙单国',
  },
  balticMono: {
    region: 'Baltic Republics Mono', supplierCode: 'LT VNO',
    fullSelectionName: 'LT VNO Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 550, symbol: '€', prepost: '€90', note: '波罗的海三国（爱/立/拉）',
  },
  irelandMono: {
    region: 'Ireland Mono', supplierCode: 'IE DUB',
    fullSelectionName: 'IE DUB Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 700, symbol: '€', prepost: '€110', note: '爱尔兰单国',
  },
  denmarkMono: {
    region: 'Mono-Denmark', supplierCode: 'DK CPH',
    fullSelectionName: 'DK CPH Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 9200, symbol: 'DKK', prepost: 'DKK 1200', note: '丹麦单国',
  },
  swedenMono: {
    region: 'Mono-Sweden', supplierCode: 'SE STO',
    fullSelectionName: 'SE STO Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 13300, symbol: 'SEK', prepost: 'SEK 1340', note: '瑞典单国',
  },
  norwaySouthMono: {
    region: 'Mono-Norway South', supplierCode: 'NO OSL',
    fullSelectionName: 'NO OSL Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 12900, symbol: 'NOK', prepost: 'NOK 1750', note: '挪威南部单国',
  },
  norwayNorthMono: {
    region: 'Mono-Norway North', supplierCode: 'NO ALT',
    fullSelectionName: 'NO ALT Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 13100, symbol: 'NOK', prepost: 'NOK 1750', note: '挪威北部单国',
  },
  finlandSouthMono: {
    region: 'Mono-Finland South', supplierCode: 'FI HEL',
    fullSelectionName: 'FI HEL Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 784, symbol: '€', prepost: '€151', note: '芬兰南部单国',
  },
  finlandNorthMono: {
    region: 'Mono-Finland North (Lapland)', supplierCode: 'FI ROV',
    fullSelectionName: 'FI ROV Through Coach (GLS)', vehicleType: 'GLS',
    dailyRate: 822, symbol: '€', prepost: '€146', note: '芬兰北部/拉普兰单国',
  },
  finlandNorthNgs: {
    region: 'Mono-Finland North (Lapland)', supplierCode: 'FI ROV',
    fullSelectionName: 'FI ROV Through Coach (NGS)', vehicleType: 'NGS',
    dailyRate: null, symbol: '€', prepost: '€146', note: '芬兰北部 NGS：ON REQUEST（按询价）',
  },
}

const WESTERN_EUROPE_CODES = ['FR', 'IT', 'DE', 'CH', 'NL', 'BE', 'LU', 'AT', 'ES', 'PT']

// LDC 表覆盖的国家集合（单国 Mono + 多国区域 + 西欧）。
// 供 coach-plan 做防御性过滤：行程里出现表外国家（如美国的 Syracuse → US）时
// 直接忽略，不会让整个 LDC 区域判定失败。
export const KNOWN_COUNTRY_CODES = new Set([
  ...WESTERN_EUROPE_CODES,
  'GB', 'IE', 'CZ', 'HU', 'SK', 'SE', 'DK', 'NO', 'FI', 'EE', 'LT', 'LV',
])

// 北极极地城市（挪威/芬兰北部）——命中任一即判定为「北」
const ARCTIC_CITY_KEYS = [
  // 挪威北部
  'tromso', 'tromsø', 'alta', 'nordkapp', 'northcape', 'kirkenes', 'svolvaer', 'svolvær',
  'bodo', 'bodø', 'narvik', 'harstad', 'hammerfest', 'honningsvag', 'honningsvåg',
  'svalbard', 'longyearbyen', 'lofoten', 'leknes', 'tromsø',
  // 芬兰北部（拉普兰）
  'rovaniemi', 'ivalo', 'saariselka', 'saariselkä', 'kittila', 'kittilä', 'levi',
  'kemi', 'inari', 'luosto', 'pyha', 'pyhä', 'yllas', 'ylläs', 'lapland',
  // 中文
  '特罗姆瑟', '阿尔塔', '北角', '希尔克内斯', '博德', '纳尔维克', '罗弗敦', '斯瓦尔巴',
  '罗瓦涅米', '伊瓦洛', '萨利色尔卡', '基蒂莱', '列维', '凯米', '伊纳里', '拉普兰',
]

// 归一化：去空白/连字符/撇号，转小写，用于子串匹配
const normCity = (s) => String(s || '').toLowerCase().replace(/[\s\-'.]+/g, '')

// 城市名集合中是否命中北极极地城市
export function hasArcticCity(cityNames) {
  const joined = (cityNames || []).filter(Boolean).map(normCity).join(' ')
  return ARCTIC_CITY_KEYS.some((k) => joined.includes(normCity(k)))
}

// 单国 → supplier key
const MONO_MAP = {
  FR: 'franceMono',
  IT: 'italyMono',
  CH: 'switzerlandMono',
  ES: 'iberia',
  PT: 'portugalMono',
  DE: 'germanyNgs',
  GB: 'uk',
  IE: 'irelandMono',
  NL: 'benelux',
  BE: 'benelux',
  LU: 'benelux',
  CZ: 'centralEurope',
  HU: 'centralEurope',
  SK: 'centralEurope',
  AT: 'centralEurope',
  SE: 'swedenMono',
  DK: 'denmarkMono',
  // NO / FI 由 resolveLdcSupplier 按北极极地(arctic)在单国分支单独判定
  EE: 'balticMono',
  LT: 'balticMono',
  LV: 'balticMono',
}

export function resolveLdcSupplier(countries, opts = {}) {
  const { arctic = false } = opts
  const list = [...new Set(countries)].filter(Boolean).sort()
  if (list.length === 0) return null

  // 单国
  if (list.length === 1) {
    const c = list[0]
    if (c === 'NO') return arctic ? SUPPLIERS.norwayNorthMono : SUPPLIERS.norwaySouthMono
    if (c === 'FI') return arctic ? SUPPLIERS.finlandNorthMono : SUPPLIERS.finlandSouthMono
    const key = MONO_MAP[c]
    return key ? SUPPLIERS[key] : null
  }

  // 多国：明确规则优先，其余西欧多国统一 IT ROM
  if (list.every((c) => ['EE', 'LT', 'LV'].includes(c))) return SUPPLIERS.balticMono
  if (list.every((c) => ['NL', 'BE', 'LU'].includes(c))) return SUPPLIERS.benelux
  if (list.every((c) => ['HU', 'CZ', 'SK', 'AT'].includes(c))) return SUPPLIERS.centralEurope
  if (list.every((c) => ['NO', 'SE', 'DK'].includes(c))) return SUPPLIERS.scandinavia
  if (list.every((c) => ['GB', 'IE'].includes(c))) return SUPPLIERS.uk
  if (list.every((c) => ['ES', 'PT'].includes(c))) return SUPPLIERS.iberia
  if (list.every((c) => WESTERN_EUROPE_CODES.includes(c))) return SUPPLIERS.westernEurope
  return null
}
