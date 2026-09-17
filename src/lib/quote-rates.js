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
  // LDC 路税/过路费（KT 国家映射表 2026-08-21）：行程经过下列国家**强制生成**路税项目（不可遗漏）。
  // ⚠️ 金额口径（2026-09-17）：**只填已定案或有 LDC 官方附表出处的**，其余留 `price: 0` 由操作员实填；
  //    无出处的参考价写进 `note` 供录入时参考，**不自动计入报价**。
  //    出处：`src/data/ancillary-fees.js`（LDC 2025 Onwards Refundable List Ancillary - quotable）。
  roadTax: {
    // 挪威：Michael 定案 2026-09-17 —— QUOS 条目即写 380 NOK/天
    NO: { name: 'LDC路税', price: 380, currency: 'NOK', note: 'LDC路税 380 NOK/天' },
    CH: { name: 'LDC路税', note: 'LDC路税（金额待实填；LDC 附表 SWISS ROAD TAX €25/天，限非瑞士供应商）' },
    DE: { name: 'LDC路税', note: 'LDC路税（金额待实填；德国另按天注入 GERMAN VAT）' },
    AT: { name: 'Austria ROAD TAX PAID BY DRIVER', note: 'Austria ROAD TAX（金额待实填；LDC 附表 ROAD TAX per day €45）' },
    HU: { name: 'Budapest - HUGO ROAD TOLL', note: 'Hungary ROAD TOLL（金额待实填；LDC 附表未见 HU 条目）' },
    CZ: { name: 'Prague - CZ ROAD TAX', note: 'Czech ROAD TAX（金额待实填；LDC 附表 ROAD TOLL €13/天）' },
    SI: { name: 'Ljubljana - ROAD TAX', note: 'Slovenia ROAD TAX（金额待实填；LDC 附表 ROAD TOLL €100，每单 1 次）' },
    SK: { name: 'Bratislava - ROAD TAX PER DAY', note: 'Slovakia ROAD TAX（金额待实填；LDC 附表 ROAD TAX PER DAY €12）' },
    CR: { name: 'Zagreb - Croatian Road Tax', note: 'Croatia Road Tax（金额待实填；LDC 附表为 Croatian VAT €30/天，与本条目名称不同，待核）' },
  },
}
