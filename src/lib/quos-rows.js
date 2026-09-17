// QUOS 条目派生（单一实现）
//
// 行程 → 扁平 QUOS 行（带天号 / 天 id / 城市码 / QUOS 类型 / 英文名）。
// 这段推导原先内联在 panel-views/quos-list.jsx；刀3 的「段抽屉」要按天展示同一批条目，
// 故抽成本模块（纯函数、无 localStorage 依赖），quos-list 与 segment-drawer **共用同一份** ——
// 不新写第二套条目推导。
//
// 口径（与改动前的 quos-list 完全一致，勿改）：
//   · 酒店项归「当晚过夜城市」（finalCityName 优先）：第4天巴黎→日内瓦火车、住日内瓦 → 酒店按日内瓦报价；
//   · cityCode/countryCode 优先级：item 自带 → （酒店）过夜城市 → 当天城市 → 城市码表；
//   · nameEn 走 item-name.js（AI nameEn → QUOS 标准名 → 实体库）；
//   · 过滤走 quos-mapping.shouldHideItem（免费/用餐/景点/内陆交通）。
import { getQUOSType, getCityCode, shouldHideItem } from './quos-mapping.js'
import { getItemNameEn } from './item-name.js'
import { CURRENCY_SYMBOLS } from './config.js'

// 面板默认过滤口径（quos-list 初值）：隐藏免费项 / 用餐 / 收费景点 / 内陆交通。
// 抽屉复用同一组默认值 → 「这段的报价条目」与右侧面板「收费」视图同口径。
export const QUOS_ROW_FILTER_DEFAULTS = {
  hideFree: true,
  hideMeals: true,
  hideAttractions: true,
  hideInlandTransit: true,
}

// 行程 → 扁平 QUOS 行。过滤项之外的字段原样带出（price/notes/quoteOrder/时间等）。
export function buildQuosRows(itinerary, filters = QUOS_ROW_FILTER_DEFAULTS) {
  const rows = []
  const opts = { ...QUOS_ROW_FILTER_DEFAULTS, ...filters }
  for (const day of itinerary?.days || []) {
    const cityInfo = getCityCode(day.cityName, day.cityNameEn)
    // 酒店项归属「当晚过夜城市」（finalCityName 优先）
    const nightName = day.finalCityName || day.cityName
    const nightNameEn = day.finalCityNameEn || day.cityNameEn || ''
    const nightInfo = getCityCode(nightName, nightNameEn)
    for (const item of day.items || []) {
      if (shouldHideItem(item, opts)) continue
      const isHotel = item.type === 'hotel'
      rows.push({
        ...item,
        dayNumber: day.dayNumber,
        dayId: day.id,
        cityName: isHotel ? nightName : day.cityName,
        cityNameEn: isHotel ? nightNameEn : (day.cityNameEn || ''),
        finalCityName: day.finalCityName || day.cityName,
        finalCityNameEn: day.finalCityNameEn || day.cityNameEn || '',
        cityCode: item.cityCode || (isHotel ? nightInfo?.cityCode : day.cityCode) || cityInfo?.cityCode || '',
        countryCode: item.countryCode || (isHotel ? nightInfo?.countryCode : day.countryCode) || cityInfo?.countryCode || '',
        quosCode: getQUOSType(item).code,
        nameEn: getItemNameEn(item),
      })
    }
  }
  return rows
}

// 报价注入项（保险/用车）优先排序：quoteOrder 越小越靠前；无 quoteOrder 按 QUOS 顺序回退
export function quosSortKey(row, order = []) {
  return row.quoteOrder ?? (100 + order.indexOf(row.quosCode))
}

export function sortQuosRows(rows, order = []) {
  return [...rows].sort((a, b) => quosSortKey(a, order) - quosSortKey(b, order))
}

// 该天的条目（抽屉用）
export function rowsForDay(rows, dayId) {
  return rows.filter((r) => r.dayId === dayId)
}

// 单价显示（CSV 导出与抽屉共用一份实现）
export function fmtPrice(row) {
  if (!row || !(row.price > 0)) return ''
  const symbol = CURRENCY_SYMBOLS[row.currency] || '€'
  const unit = row.priceUnit === 'perPerson' ? '/人' : row.priceUnit === 'perGroup' ? '/团' : row.priceUnit === 'perDay' ? '/天' : ''
  return `${symbol}${row.price}${unit}${row.quantity > 0 ? `×${row.quantity}` : ''}`
}

// 该天条目 → 纯文本（「复制全部条目」）：制表符分列，方便直接粘进 QUOS / 表格。
// 列：QUOS 类型 / 国 / 城 / 项目英文名（无则中文名）/ 备注
export function formatQuosRowsText(day, rows) {
  const num = day?.dayNumber
  const header = `D${num}${day?.cityName ? ` · ${day.cityName}` : ''}`
  if (!rows || rows.length === 0) return `${header}\n（无条目）`
  const lines = rows.map((r) =>
    [r.quosCode, r.countryCode || '', r.cityCode || '', r.nameEn || r.name || '', r.notes || '']
      .map((v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim())
      .join('\t')
      .replace(/\t+$/, ''),
  )
  return [header, ...lines].join('\n')
}
