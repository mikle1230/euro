// QUOS 条目派生（lib/quos-rows.js）测试 —— 刀3 抽屉按天复用同一份派生
// 运行：npm test —— 纯函数，不联网、不读 localStorage。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildQuosRows,
  quosSortKey,
  sortQuosRows,
  rowsForDay,
  fmtPrice,
  formatQuosRowsText,
  QUOS_ROW_FILTER_DEFAULTS,
} from '../../src/lib/quos-rows.js'

// 夹具：2 天。D1 巴黎（含保险注入项 / 接机 / 免费景点 / 免费午餐 / 内陆航班），
// D2 巴黎→日内瓦火车、住日内瓦（酒店项按当晚城市）
const ITINERARY = {
  startDate: '2026-09-17',
  groupSize: '20+1',
  days: [
    {
      id: 'd1',
      dayNumber: 1,
      cityName: '巴黎',
      cityNameEn: 'Paris',
      cityCode: 'PAR',
      countryCode: 'FR',
      finalCityName: '',
      items: [
        {
          id: 'i1', type: 'other', name: '旅行保险', nameEn: 'Travel Insurance',
          costCategory: 'paid', price: 2.66, priceUnit: 'perPerson', currency: 'USD',
          quantity: 20, quoteKind: 'insurance', quoteOrder: 0,
          cityCode: 'BJS', countryCode: 'CN', notes: '2.66 USD/人',
        },
        {
          id: 'i2', type: 'transport', transportMode: 'bus', name: '接机',
          nameEn: 'Paris - APT/HTL', costCategory: 'paid', price: 0,
          quoteKind: 'pickup', quoteOrder: 10, notes: 'STD MTC (Local)',
        },
        { id: 'i3', type: 'attraction', name: '埃菲尔铁塔', nameEn: 'Eiffel Tower', costCategory: 'paid', price: 0, estimatedCost: 200 },
        { id: 'i4', type: 'lunch', name: '午餐', costCategory: 'free', price: 0 },
        { id: 'i5', type: 'transport', transportMode: 'flight', name: '巴黎→罗马', from: '巴黎', to: '罗马', costCategory: 'paid', price: 0 },
      ],
    },
    {
      id: 'd2',
      dayNumber: 2,
      cityName: '巴黎',
      cityNameEn: 'Paris',
      cityCode: 'PAR',
      countryCode: 'FR',
      finalCityName: '日内瓦',
      finalCityNameEn: 'Geneva',
      items: [
        { id: 'j1', type: 'transport', transportMode: 'train', name: 'TGV', nameEn: 'TGV Lyria', from: '巴黎', to: '日内瓦', costCategory: 'paid', price: 0, startTime: '09:00', endTime: '12:30' },
        { id: 'j2', type: 'hotel', name: '日内瓦酒店', costCategory: 'paid', price: 0, notes: '当晚过夜' },
      ],
    },
  ],
}

test('buildQuosRows：默认过滤（免费/用餐/收费景点/内陆交通）后的行与字段', () => {
  const rows = buildQuosRows(ITINERARY)
  // D1 保留：保险 + 接机（免费景点/免费午餐被过滤）；D2 保留：酒店
  // （跨境火车 = 内陆交通 DTR，默认也隐藏 —— 与面板「收费」视图同口径）
  assert.equal(rows.length, 3)
  assert.deepEqual(rows.map((r) => r.quosCode), ['OTH', 'MTC', 'HTL'])
  assert.deepEqual(rows.map((r) => r.dayNumber), [1, 1, 2])

  const insurance = rows[0]
  assert.equal(insurance.nameEn, 'Travel Insurance')
  assert.equal(insurance.countryCode, 'CN') // item 自带国/城优先
  assert.equal(insurance.cityCode, 'BJS')
  assert.equal(insurance.dayId, 'd1')

  const pickup = rows[1]
  assert.equal(pickup.nameEn, 'Paris - APT/HTL')
  assert.equal(pickup.countryCode, 'FR') // 回退当天城市
  assert.equal(pickup.cityCode, 'PAR')

  const hotel = rows[2]
  assert.equal(hotel.cityName, '日内瓦') // 酒店归「当晚过夜城市」
  assert.equal(hotel.cityCode, 'GVA')
  assert.equal(hotel.countryCode, 'CH')
})

test('buildQuosRows：过滤开关可关（显示全部）', () => {
  const rows = buildQuosRows(ITINERARY, {
    hideFree: false, hideMeals: false, hideAttractions: false, hideInlandTransit: false,
  })
  assert.equal(rows.length, ITINERARY.days[0].items.length + ITINERARY.days[1].items.length)
  const codes = rows.map((r) => r.quosCode)
  assert.ok(codes.includes('ENT'))
  assert.ok(codes.includes('RST'))
  assert.ok(codes.includes('FLT'))
})

test('QUOS_ROW_FILTER_DEFAULTS：与 quos-list 初始开关一致（隐藏免费/用餐/景点/内陆）', () => {
  assert.deepEqual(QUOS_ROW_FILTER_DEFAULTS, {
    hideFree: true, hideMeals: true, hideAttractions: true, hideInlandTransit: true,
  })
})

test('buildQuosRows：缺 days/items 不崩', () => {
  assert.deepEqual(buildQuosRows(null), [])
  assert.deepEqual(buildQuosRows({ days: [{ id: 'd1', dayNumber: 1, cityName: 'A' }] }), [])
})

test('排序：quoteOrder 优先（保险置顶），无 quoteOrder 按 QUOS 顺序', () => {
  const rows = buildQuosRows(ITINERARY, { hideInlandTransit: false })
  const order = ['HTL', 'MTC', 'ENT', 'RST', 'GUI', 'FLT', 'DTR', 'OTR', 'DFR', 'OFR', 'LUG', 'OTH']
  const sorted = sortQuosRows(rows, order)
  assert.equal(sorted[0].nameEn, 'Travel Insurance') // quoteOrder 0
  assert.equal(sorted[1].nameEn, 'Paris - APT/HTL')  // quoteOrder 10
  assert.equal(sorted[2].quosCode, 'HTL')            // 无 quoteOrder → 按 QUOS 顺序（HTL 最前）
  assert.equal(sorted[3].quosCode, 'FLT')
  assert.equal(sorted[4].nameEn, 'TGV Lyria')
  // 原数组不被改动
  assert.equal(rows[3].quosCode, 'DTR')
  assert.equal(quosSortKey(sorted[0], order), 0)
})

test('rowsForDay：按天取条目', () => {
  const rows = buildQuosRows(ITINERARY, { hideInlandTransit: false })
  assert.equal(rowsForDay(rows, 'd1').length, 3) // 保险 + 接机 + 内陆航班（本测试关掉了内陆过滤）
  assert.equal(rowsForDay(rows, 'd2').length, 2)
  assert.equal(rowsForDay(rows, 'nope').length, 0)
})

test('fmtPrice：单价显示（币种/单位/数量）', () => {
  assert.equal(fmtPrice({ price: 2.66, currency: 'USD', priceUnit: 'perPerson', quantity: 20 }), '$2.66/人×20')
  assert.equal(fmtPrice({ price: 120, currency: 'EUR', priceUnit: 'perGroup' }), '€120/团')
  assert.equal(fmtPrice({ price: 0 }), '')
  assert.equal(fmtPrice(null), '')
})

test('formatQuosRowsText：制表符分列、可粘进 QUOS；无条目时给出提示', () => {
  const rows = sortQuosRows(
    buildQuosRows(ITINERARY, { hideInlandTransit: false }),
    ['HTL', 'MTC', 'ENT', 'RST', 'GUI', 'FLT', 'DTR', 'OTR', 'DFR', 'OFR', 'LUG', 'OTH'],
  )
  const day1 = { id: 'd1', dayNumber: 1, cityName: '巴黎' }
  const text = formatQuosRowsText(day1, rowsForDay(rows, 'd1'))
  const lines = text.split('\n')
  assert.equal(lines[0], 'D1 · 巴黎')
  assert.equal(lines[1], 'OTH\tCN\tBJS\tTravel Insurance\t2.66 USD/人')
  assert.equal(lines[2], 'MTC\tFR\tPAR\tParis - APT/HTL\tSTD MTC (Local)')
  assert.equal(lines.length, 4)
  assert.equal(lines[3], 'FLT\tFR\tPAR\t巴黎→罗马')
  // 换行/制表符被清洗，不会把一行拆成两行
  assert.equal(formatQuosRowsText(day1, [{ quosCode: 'MTC', nameEn: 'A\nB\tC' }]).split('\n').length, 2)
  assert.equal(formatQuosRowsText(day1, []), 'D1 · 巴黎\n（无条目）')
})
