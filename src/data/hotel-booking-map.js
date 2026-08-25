// QUOS 酒店名 ↔ Booking 实际名称/链接 映射表。
// 背景：QUOS 系统里的酒店名（hotel list，如 "EUROPA"）与 Booking 上实际酒店名
// （如 "Hestia Hotel Europa"）不是绝对文字对应，日常需要快速知道哪家 QUOS 对应 Booking 哪家。
// 用法：录入时用「城市码|QUOS名」作 key 最稳（避免跨城同名），value 为 { name, link? }。
//   { 'TLL|EUROPA': { name: 'Hestia Hotel Europa', link: 'https://www.booking.com/hotel/ee/hestia-europa.html' } }
// 页面查询走 lib/hotel-prices.js 的 getBookingInfo(cityCode, hotelName)，无匹配返回 null。
export const HOTEL_BOOKING_MAP = {
  'TLL|EUROPA': {
    name: 'Hestia Hotel Europa',
    link: '',
  },
}

// 归一化 key（大小写/空白），供查询与匹配使用
export function hotelBookingKey(cityCode, hotelName) {
  return `${String(cityCode || '').toUpperCase()}|${String(hotelName || '').trim().toUpperCase()}`
}
