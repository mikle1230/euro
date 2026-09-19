// 供应商酒店报价查询（src/lib/hotel-prices.js）测试 —— 9 个导出的现状行为
// 数据源：hotel-prices.json（hotel list.xlsx 历史使用价，€/人/月）。
// 断言值均为实读源码/数据所得，未猜造。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getBookingInfo,
  getMonthFromDate,
  getHotelQuotes,
  getHotelQuotesOrAll,
  getQuoteRange,
  getQuoteRangeOrAll,
  findHotelQuote,
  searchHotelQuotes,
  getHotelQuoteCatalog,
} from '../../src/lib/hotel-prices.js'

test('9 个导出都存在且为函数', () => {
  const exports = [
    getBookingInfo, getMonthFromDate, getHotelQuotes, getHotelQuotesOrAll,
    getQuoteRange, getQuoteRangeOrAll, findHotelQuote, searchHotelQuotes,
    getHotelQuoteCatalog,
  ]
  assert.equal(exports.length, 9)
  for (const fn of exports) assert.equal(typeof fn, 'function')
})

test('getMonthFromDate：日期 → N月；空/非法 → null', () => {
  assert.equal(getMonthFromDate('2026-09-08'), '9月')
  assert.equal(getMonthFromDate('2026-01-15T12:00:00'), '1月')
  assert.equal(getMonthFromDate(''), null)
  assert.equal(getMonthFromDate(null), null)
  assert.equal(getMonthFromDate(undefined), null)
  assert.equal(getMonthFromDate('nope'), null)
})

test('getHotelQuotes：按城市码取价，非法/未知输入容错，无月=全量去重', () => {
  assert.deepEqual(getHotelQuotes(null), [])
  assert.deepEqual(getHotelQuotes(''), [])
  assert.deepEqual(getHotelQuotes('ZZZ'), [], '未知城市码返回空数组')
  assert.deepEqual(getHotelQuotes('PAR', '2月'), [], '巴黎只有 7/9 月有价')
  const sep = getHotelQuotes('PAR', '9月')
  assert.equal(sep.length, 2)
  assert.ok(sep.every((q) => q.month === '9月'))
  assert.equal(getHotelQuotes('PAR').length, 3, '无月份 → 全量按酒店去重')
})

test('getHotelQuotesOrAll：当月无价回退全量历史，有价不回退', () => {
  assert.equal(getHotelQuotesOrAll('PAR', '2月').length, 3)
  assert.equal(getHotelQuotesOrAll('PAR', '9月').length, 2)
  assert.deepEqual(getHotelQuotesOrAll('ZZZ'), [])
})

test('getQuoteRange：区间取 parseFloat 首档（双价格字符串只取第一档）', () => {
  assert.equal(getQuoteRange('PAR', '9月'), '€50–101.6/人')
  assert.equal(getQuoteRange('PAR', '2月'), '', '当月无价 → 空串（由 OrAll 负责回退）')
  assert.equal(getQuoteRange('ZZZ'), '')
})

test('getQuoteRangeOrAll：当月无价回退全量区间', () => {
  assert.equal(getQuoteRangeOrAll('PAR', '2月'), '€46.28–101.6/人')
  assert.equal(getQuoteRangeOrAll('PAR', '9月'), '€50–101.6/人')
})

test('findHotelQuote：归一化匹配（大小写/空格/连字符），未命中 → null', () => {
  const hit = findHotelQuote('PAR', 'Mercure  La-Defense', '9月')
  assert.ok(hit, '归一化后应命中 MERCURE LA DEFENSE')
  assert.equal(hit.hotel, 'MERCURE LA DEFENSE')
  assert.equal(hit.pp, '50/55.32')
  assert.equal(findHotelQuote('PAR', 'NOT A HOTEL', '9月'), null)
  assert.equal(findHotelQuote('', ''), null)
  assert.equal(findHotelQuote('PAR', 'MERCURE LA DEFENSE', '2月'), null, '当月无价 → null')
})

test('getBookingInfo：手动映射优先，xlsx bookingName/link 兜底，空参 → null', () => {
  assert.deepEqual(getBookingInfo('TLL', 'EUROPA'), {
    name: 'Hestia Hotel Europa',
    link: 'https://www.booking.com/hotel/ee/europe.html',
  })
  assert.deepEqual(getBookingInfo('PAR', 'MERCURE LA DEFENSE'), {
    name: 'Mercure Paris La Défense',
    link: 'https://www.booking.com/hotel/fr/mercure-la-defense5.html',
  })
  assert.equal(getBookingInfo('', ''), null)
  assert.equal(getBookingInfo('PAR', 'NOT A HOTEL'), null)
})

test('searchHotelQuotes：按酒店/Booking名/城市码搜，空查询 → []', () => {
  assert.deepEqual(searchHotelQuotes(''), [])
  assert.deepEqual(searchHotelQuotes('   '), [])

  const q = searchHotelQuotes('mercure la defense')
  assert.equal(q.length, 1)
  assert.equal(q[0].cityCode, 'PAR')
  assert.equal(q[0].city, '巴黎')
  assert.equal(q[0].country, 'FR')
  assert.equal(q[0].countryName, '法国')
  assert.equal(q[0].star, 4)
  assert.equal(q[0].rating, 7.5)
  assert.deepEqual(q[0].prices, [{ month: '9月', pp: '50/55.32' }])

  assert.equal(searchHotelQuotes('巴黎').length, 3, '城市名命中 → 该城全部报价酒店')
})

test('getHotelQuoteCatalog：按国家 → 城市分组（17 国 / 62 城），字段齐全', () => {
  const catalog = getHotelQuoteCatalog()
  assert.equal(catalog.length, 17)
  assert.equal(catalog.reduce((n, c) => n + c.cities.length, 0), 62)
  for (const c of catalog) {
    assert.ok(c.country && c.countryName, '国家码/名非空')
    for (const city of c.cities) {
      assert.ok(city.city && city.cityCode, '城市名/城市码非空')
      assert.ok(city.hotels.length >= 1)
      for (const h of city.hotels) {
        assert.ok(h.hotel, '酒店名非空')
        assert.ok('star' in h && 'rating' in h && 'area' in h, 'star/rating/area 字段存在')
        assert.ok(Array.isArray(h.prices) && h.prices.length >= 1)
        assert.ok(h.prices.every((p) => p.month && p.pp), '每条价格有月份与 pp')
      }
    }
  }
})
