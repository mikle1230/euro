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
  // 奥地利境内每日道路通行费（KT 录入口径 2026-08-21：Austria ROAD TAX PAID BY DRIVER，€47.87/天）
  austriaRoadTax: {
    price: 47.87,
    currency: 'EUR',
    priceUnit: 'perGroup',
    note: 'Austria ROAD TAX PAID BY DRIVER',
  },
}
