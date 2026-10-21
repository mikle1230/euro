// 报价固定费率集中配置 —— 改价只动这里，不要散落在各业务模块里。
// 纯函数模块，无 'use client'，服务端/客户端均可 import。

export const QUOTE_RATES = {
  // 团务人头费：1010 HEADFEE，12 EUR/人（BJS/CN）
  // 2026-10-16 公司新规「每团必录」→ 2026-10-21 Tony sales meeting 改为「仅参与 override 的客户」收取。
  headfee: {
    price: 12,
    currency: 'EUR',
    priceUnit: 'perPerson',
    cityCode: 'BJS',
    countryCode: 'CN',
    note: '仅 override 客户（携程/华程/盛行/竹园/众信）',
  },
  // 需要收 HEADFEE 的客户名单（参与 override 的 5 家）；其余客户不加。
  headfeeOverrideClients: ['携程', '华程', '盛行', '竹园', '众信'],
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

// 是否收 HEADFEE：只有参与 override 的客户（名单见 QUOTE_RATES.headfeeOverrideClients）才收。
// 客户名允许带后缀（如「众信旅游」），用包含匹配；空客户名一律按不收处理。
export function needsHeadfee(client) {
  const name = String(client || '').trim()
  if (!name) return false
  return QUOTE_RATES.headfeeOverrideClients.some((c) => name.includes(c))
}
