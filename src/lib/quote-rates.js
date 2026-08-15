// 报价固定费率集中配置 —— 改价只动这里，不要散落在各业务模块里。
// 纯函数模块，无 'use client'，服务端/客户端均可 import。

export const QUOTE_RATES = {
  // 旅行保险：每团必录，2.66 USD/人
  insurance: {
    price: 2.66,
    currency: 'USD',
    priceUnit: 'perPerson',
    cityCode: 'BJS',
    countryCode: 'CN',
    note: '每团必录',
  },
  // 司机前后夜（PRE/POST NIGHT）
  prepostNight: {
    price: 120,
    currency: 'EUR',
    note: '€120/晚',
  },
}

// LDC 长途车费率速查（来自 KT-Knowledge-Base，LDC 费率体系 ✅）
export const LDC_RATES = [
  'NGS 西欧：€650/天，上限 375 km/天，超出 €2/km',
  'Empty Run：0–350 km 免费 / 351–600 km €450 / 601–1000 km €800 / 1001–1400 km €1000 / 1401–1999 km €1500',
  `司机前/后夜：${QUOTE_RATES.prepostNight.note}`,
  'VAT：西欧 NGS 已含（德国除外，+€85/天）',
  'Tips：最低 €50/天',
]
