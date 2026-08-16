// 城市名归一化（单一实现）：去空格/连字符/撇号/点/间隔号 + 小写。
// QUOS 码查找 / 坐标 / 酒店库共用，避免各处正则不一致导致同一城市命中不同结果。
export function normalizeCityName(name) {
  return String(name || '').toLowerCase().replace(/[\s\-'.·]/g, '')
}
