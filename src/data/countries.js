// 国家注册表（单一数据源）：按 ISO 2 字码为键。
// 名称 / 旗帜 / 货币（符号 + 三字码 + 中文名）从这里派生，
// 供 flags.js / config.js / hotel-recommend.js 复用，避免多处维护漂移数据。

export const COUNTRIES = {
  GB: { name: '英国', nameEn: 'United Kingdom', flag: '🇬🇧', currency: { code: 'GBP', symbol: '£', name: '英镑' } },
  FR: { name: '法国', nameEn: 'France', flag: '🇫🇷', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  DE: { name: '德国', nameEn: 'Germany', flag: '🇩🇪', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  IT: { name: '意大利', nameEn: 'Italy', flag: '🇮🇹', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  ES: { name: '西班牙', nameEn: 'Spain', flag: '🇪🇸', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  PT: { name: '葡萄牙', nameEn: 'Portugal', flag: '🇵🇹', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  NL: { name: '荷兰', nameEn: 'Netherlands', flag: '🇳🇱', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  BE: { name: '比利时', nameEn: 'Belgium', flag: '🇧🇪', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  CH: { name: '瑞士', nameEn: 'Switzerland', flag: '🇨🇭', currency: { code: 'CHF', symbol: 'Fr', name: '瑞士法郎' } },
  AT: { name: '奥地利', nameEn: 'Austria', flag: '🇦🇹', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  GR: { name: '希腊', nameEn: 'Greece', flag: '🇬🇷', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  SE: { name: '瑞典', nameEn: 'Sweden', flag: '🇸🇪', currency: { code: 'SEK', symbol: 'kr', name: '瑞典克朗' } },
  NO: { name: '挪威', nameEn: 'Norway', flag: '🇳🇴', currency: { code: 'NOK', symbol: 'kr', name: '挪威克朗' } },
  DK: { name: '丹麦', nameEn: 'Denmark', flag: '🇩🇰', currency: { code: 'DKK', symbol: 'kr', name: '丹麦克朗' } },
  IE: { name: '爱尔兰', nameEn: 'Ireland', flag: '🇮🇪', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  PL: { name: '波兰', nameEn: 'Poland', flag: '🇵🇱', currency: { code: 'PLN', symbol: 'zł', name: '兹罗提' } },
  CZ: { name: '捷克', nameEn: 'Czech Republic', flag: '🇨🇿', currency: { code: 'CZK', symbol: 'Kč', name: '捷克克朗' } },
  HU: { name: '匈牙利', nameEn: 'Hungary', flag: '🇭🇺', currency: { code: 'HUF', symbol: 'Ft', name: '福林' } },
  HR: { name: '克罗地亚', nameEn: 'Croatia', flag: '🇭🇷', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  TR: { name: '土耳其', nameEn: 'Turkey', flag: '🇹🇷', currency: { code: 'TRY', symbol: '₺', name: '土耳其里拉' } },
  FI: { name: '芬兰', nameEn: 'Finland', flag: '🇫🇮', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  IS: { name: '冰岛', nameEn: 'Iceland', flag: '🇮🇸', currency: { code: 'ISK', symbol: 'kr', name: '冰岛克朗' } },
  EE: { name: '爱沙尼亚', nameEn: 'Estonia', flag: '🇪🇪', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  ME: { name: '黑山', nameEn: 'Montenegro', flag: '🇲🇪', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  RU: { name: '俄罗斯', nameEn: 'Russia', flag: '🇷🇺', currency: { code: 'RUB', symbol: '₽', name: '俄罗斯卢布' } },
  BG: { name: '保加利亚', nameEn: 'Bulgaria', flag: '🇧🇬', currency: { code: 'BGN', symbol: 'лв', name: '保加利亚列弗' } },
  LU: { name: '卢森堡', nameEn: 'Luxembourg', flag: '🇱🇺', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  RS: { name: '塞尔维亚', nameEn: 'Serbia', flag: '🇷🇸', currency: { code: 'RSD', symbol: 'дин', name: '塞尔维亚第纳尔' } },
  CY: { name: '塞浦路斯', nameEn: 'Cyprus', flag: '🇨🇾', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  LV: { name: '拉脱维亚', nameEn: 'Latvia', flag: '🇱🇻', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  MC: { name: '摩纳哥', nameEn: 'Monaco', flag: '🇲🇨', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  SK: { name: '斯洛伐克', nameEn: 'Slovakia', flag: '🇸🇰', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  SI: { name: '斯洛文尼亚', nameEn: 'Slovenia', flag: '🇸🇮', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  LT: { name: '立陶宛', nameEn: 'Lithuania', flag: '🇱🇹', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
  RO: { name: '罗马尼亚', nameEn: 'Romania', flag: '🇷🇴', currency: { code: 'RON', symbol: 'lei', name: '罗马尼亚列伊' } },
  MT: { name: '马耳他', nameEn: 'Malta', flag: '🇲🇹', currency: { code: 'EUR', symbol: '€', name: '欧元' } },
}

// 中文名 → 旗帜（兼容旧 keying，供 knowledge/hotels 页面用）
export const COUNTRY_FLAGS = Object.fromEntries(
  Object.values(COUNTRIES).map((c) => [c.name, c.flag]),
)

// 国家码 → 中文名（酒店目录用）
export const COUNTRY_NAMES = Object.fromEntries(
  Object.entries(COUNTRIES).map(([code, c]) => [code, c.name]),
)

// 国家码 → 货币 { code, symbol, name }
export const COUNTRY_CURRENCIES = Object.fromEntries(
  Object.entries(COUNTRIES).map(([code, c]) => [code, c.currency]),
)

// 货币三字码 → 符号（含 USD：保险固定美元，非国家货币）
export const CURRENCY_SYMBOLS = {
  ...Object.fromEntries(Object.values(COUNTRIES).map((c) => [c.currency.code, c.currency.symbol])),
  USD: '$',
}
