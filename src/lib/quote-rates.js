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
  // 司机前后夜（PRE/POST NIGHT）—— 各区域费率见 ldc-mapping.js 的 prepost 字段
  prepostNight: {
    price: 120,
    currency: 'EUR',
    note: '€120/晚',
  },
  // 德国境内每日增值税附加费（KT 录入口径 2026-08-21：Base - GERMAN VAT，每天约 €90.43）
  germanVat: {
    price: 90.43,
    currency: 'EUR',
    priceUnit: 'perGroup',
    note: 'GERMAN VAT',
  },
  // LDC 路税/过路费（KT 国家映射表 2026-08-21）：行程经过下列国家**强制生成**路税项目（不可遗漏），
  // 金额/计费单位暂未确认 → price=0，由操作员在真实 KT 录入时按当地政策/实际费用手填（按天/按次/打包）。
  roadTax: {
    NO: { name: 'LDC路税', note: 'LDC路税（金额待操作员实填）' },
    CH: { name: 'LDC路税', note: 'LDC路税（金额待操作员实填）' },
    DE: { name: 'LDC路税', note: 'LDC路税（金额待操作员实填）' },
    AT: { name: 'Austria ROAD TAX PAID BY DRIVER', note: 'Austria ROAD TAX（金额待操作员实填）' },
    HU: { name: 'Budapest - HUGO ROAD TOLL', note: 'Hungary ROAD TOLL（金额待操作员实填）' },
    CZ: { name: 'Prague - CZ ROAD TAX', note: 'Czech ROAD TAX（金额待操作员实填）' },
    SI: { name: 'Ljubljana - ROAD TAX', note: 'Slovenia ROAD TAX（金额待操作员实填）' },
    SK: { name: 'Bratislava - ROAD TAX PER DAY', note: 'Slovakia ROAD TAX（金额待操作员实填）' },
    CR: { name: 'Zagreb - Croatian Road Tax', note: 'Croatia Road Tax（金额待操作员实填）' },
  },
}
