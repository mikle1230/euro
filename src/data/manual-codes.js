// 手动补码表：Cities.xlsx（quos-cities.json）没有的城市/遗址，人工给 QUOS 码。
// 后续用户遇到表外城市 → 把码加到这里（如 以弗所: { cityCode: 'EFS', countryCode: 'TR' }），
// getCityCode 会自动兜底，城市库卡片即显示码。
// 注意：Cities.xlsx 里的城市不用加（quos-cities.json 已覆盖 8300+）。
export const MANUAL_CODES = {
  // '以弗所': { cityCode: 'EFS', countryCode: 'TR' },
}
