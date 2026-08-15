// 酒店推荐查询测试
// 运行：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recommendHotels, hasHotelData } from '../../src/lib/hotel-recommend.js'

test('中文城市名命中 → 返回评分≥7 的参考酒店（评分降序）', () => {
  const hotels = recommendHotels('巴勒莫', '', 3, '')
  assert.ok(hotels.length >= 2, '巴勒莫应有至少 2 家推荐')
  for (const h of hotels) {
    assert.ok(h.rating >= 7, `评分应 ≥7（实际 ${h.rating}）`)
    assert.ok(h.name, '酒店名非空')
    assert.ok(h.priceEur > 0, `欧元参考价 > 0（实际 ${h.priceEur}）`)
  }
  const ratings = hotels.map((h) => h.rating)
  assert.deepEqual(ratings, [...ratings].sort((a, b) => b - a), '按评分降序')
})

test('英文城市名命中', () => {
  const hotels = recommendHotels('', 'Nice', 3, '')
  assert.ok(hotels.length >= 2)
  assert.ok(hotels.every((h) => h.rating >= 7))
})

test('别名命中：锡拉库扎（中文）→ Siracusa', () => {
  const hotels = recommendHotels('锡拉库扎', '', 3, '')
  assert.ok(hotels.length >= 2)
  assert.ok(
    hotels.some((h) => /奥提伽|Ortigia/i.test(`${h.area || ''} ${h.name || ''}`)),
    '备注/名称应带奥提伽岛（Ortigia）位置',
  )
})

test('城市码命中：ROM → 罗马', () => {
  const hotels = recommendHotels('', '', 2, 'ROM')
  assert.ok(hotels.length >= 1)
})

test('写法变体归一化：Saint-Tropez 连字符命中圣特罗佩', () => {
  const hotels = recommendHotels('Saint-Tropez', '', 2, '')
  assert.ok(hotels.length >= 1)
})

test('limit 生效：请求 2 家只返回 ≤2 家', () => {
  const hotels = recommendHotels('罗马', 'Rome', 2, 'ROM')
  assert.ok(hotels.length <= 2)
  assert.ok(hotels.length >= 1)
})

test('未知城市 → 空数组', () => {
  assert.deepEqual(recommendHotels('瓦胡岛', '', 3, ''), [])
  assert.deepEqual(recommendHotels('', 'Narnia', 3, ''), [])
})

test('hasHotelData 区分已知/未知城市', () => {
  assert.equal(hasHotelData('巴黎', 'Paris', 'PAR'), 1)
  assert.equal(hasHotelData('尼斯', '', 'NCE'), 1)
  assert.equal(hasHotelData('锡拉库萨', '', ''), 1, '别名锡拉库萨也应命中')
  assert.equal(hasHotelData('瓦胡岛', '', ''), 0)
})

test('数据完整性：行程 13 个过夜城市全部有推荐数据', () => {
  const overnightCities = [
    '瓦朗索勒', '圣特罗佩', '尼斯', '热那亚', '奇维塔维基亚',
    '那不勒斯', '阿尔贝罗贝洛', '波西塔诺', '巴勒莫', '阿格里真托',
    '锡拉库扎', '陶尔米纳', '罗马', '苏莲托',
  ]
  for (const c of overnightCities) {
    const hotels = recommendHotels(c, '', 2, '')
    assert.ok(hotels.length >= 1, `${c} 应有推荐酒店（实际 ${hotels.length}）`)
    assert.ok(hotels.length <= 2, `${c} 展示不超过 2 家`)
  }
})
