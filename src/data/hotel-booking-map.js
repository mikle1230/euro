// QUOS 酒店名 ↔ Booking 实际名称/链接 映射表。
// 背景：QUOS 系统里的酒店名（hotel list，如 "EUROPA"）与 Booking 上实际酒店名
// （如 "Hestia Hotel Europa"）不是绝对文字对应，日常需要快速知道哪家 QUOS 对应 Booking 哪家。
// 数据流（lib/hotel-prices.js 的 getBookingInfo 聚合）：
//   - **Booking 名称**：主要来自 hotel list.xlsx 的「booking名称」列（用户不定期填，重跑
//     `node scripts/build-hotel-prices.js` 即写入 hotel-prices.json 的 bookingName 字段）；
//   - **Booking 链接**：本映射表补（用户更新 xlsx 后告知，找对应链接填入 link）。
//   - 两者聚合：手动映射的 name/link 优先，其次 xlsx 的 bookingName/link。
// 用法：key 用「城市码|QUOS名」最稳（避免跨城同名）。
//   { 'TLL|EUROPA': { link: 'https://www.booking.com/hotel/ee/hestia-europa.html' } }   // 只补链接
//   { 'MIL|HOLIDAY INN NORD ZARA': { name: 'Holiday Inn Milan Nord Zara', link: '...' } } // 名称纠正+链接
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
