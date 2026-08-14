// applyQuoteRules 报价规则注入测试
// 运行：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyQuoteRules } from '../../src/lib/coach-plan.js'

function day(n, city, items = [], extra = {}) {
  return { dayNumber: n, cityName: city, cityNameEn: '', finalCityName: city, items, ...extra }
}

function item(partial = {}) {
  return { type: 'attraction', name: 'x', costCategory: 'paid', ...partial }
}

test('第一天注入旅行保险（数量=团人数）', () => {
  const parsed = {
    groupSize: 30,
    days: [day(1, '巴黎'), day(2, '巴黎')],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const ins = d1.items.find((i) => i.quoteKind === 'insurance')
  assert.ok(ins, '应该有保险项')
  assert.equal(ins.price, 2.66)
  assert.equal(ins.quantity, 30)
  assert.equal(ins.cityCode, 'BJS')
  assert.equal(ins.countryCode, 'CN')
})

test('城际 bus/car 项被移除（被 THROUGH COACH 合并替代）', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '巴黎', [item({ type: 'transport', transportMode: 'bus', from: '巴黎', to: '尼斯' })]),
      day(2, '尼斯'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const allItems = out.days.flatMap((d) => d.items)
  // 排除报价注入项（THROUGH COACH 也是 bus + from/to），只查原始城际 bus
  const intercityBus = allItems.filter((i) => !i.quoteKind && i.transportMode === 'bus' && (i.from || i.to))
  assert.equal(intercityBus.length, 0, '城际 bus 应被移除')
  // 且注入的 THROUGH COACH 覆盖该段
  assert.ok(allItems.some((i) => i.quoteKind === 'through-coach' && i.from === '巴黎' && i.to === '尼斯'))
})

test('内陆 flight/train/boat 保留且 transit 当天注入接驳 MTC', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '巴黎'),
      day(2, '尼斯', [item({ type: 'transport', transportMode: 'flight', from: '巴黎', to: '尼斯' })]),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d2 = out.days.find((d) => d.dayNumber === 2)
  assert.ok(d2.items.some((i) => i.transportMode === 'flight'), 'flight 应保留')
  const pickup = d2.items.find((i) => i.quoteKind === 'pickup')
  assert.ok(pickup, 'transit 当天应注入接驳')
  assert.equal(pickup.locationCategory, 'APT/HTL')
})

test('连续无 transit 段注入 THROUGH COACH + PRE/POST（段首天）', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '巴黎'),
      day(2, '尼斯'),
      day(3, '罗马', [item({ type: 'transport', transportMode: 'train', from: '尼斯', to: '罗马' })]),
      day(4, '罗马'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const tc = d1.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '段首天应注入 THROUGH COACH')
  assert.equal(tc.from, '巴黎')
  assert.equal(tc.to, '尼斯')
  assert.ok(d1.items.some((i) => i.quoteKind === 'prepost'), '应注入 PRE/POST')
})

test('到达停留多晚时：第 1 天接机，THROUGH COACH 从第 2 天开始', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '巴黎'),
      day(2, '巴黎'),
      day(3, '尼斯', [item({ type: 'transport', transportMode: 'flight', from: '巴黎', to: '尼斯' })]),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const pickup = d1.items.find((i) => i.quoteKind === 'pickup')
  assert.ok(pickup, '到达停留>1晚时第 1 天应为接机')
  assert.equal(pickup.locationCategory, 'APT/HTL')
  const d2 = out.days.find((d) => d.dayNumber === 2)
  assert.ok(d2.items.some((i) => i.quoteKind === 'through-coach'), 'THROUGH COACH 从第 2 天起')
})

test('空输入/无 days 原样返回', () => {
  assert.equal(applyQuoteRules(null), null)
  assert.deepEqual(applyQuoteRules({ groupSize: 10 }), { groupSize: 10 })
})

test('THROUGH COACH 国/城按 LDC 表取供应商所在地：西欧多国 → IT ROM', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '巴黎'),
      day(2, '尼斯'),
      day(3, '罗马'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const tc = d1.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '应该有 THROUGH COACH')
  assert.equal(tc.countryCode, 'IT', '西欧多国 → 国家 IT')
  assert.equal(tc.cityCode, 'ROM', '西欧多国 → 城市 ROM')
  assert.ok(tc.notes.includes('IT ROM') || tc.notes.includes('ROM'), '备注带供应商')
})

test('单国法国 → THROUGH COACH 供应商 FR PAR', () => {
  const parsed = {
    groupSize: 30,
    days: [day(1, '巴黎'), day(2, '尼斯')],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const tc = d1.items.find((i) => i.quoteKind === 'through-coach')
  assert.equal(tc.countryCode, 'FR')
  assert.equal(tc.cityCode, 'PAR')
})

test('含中国出发日（day 0 上海）不参与 LDC 判定，仍 IT ROM', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(0, '上海'),
      day(1, '巴黎'),
      day(2, '尼斯'),
      day(3, '罗马'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const tc = d1.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, 'day 0 不影响分段与 THROUGH COACH')
  assert.equal(tc.countryCode, 'IT')
  assert.equal(tc.cityCode, 'ROM')
})

test('不污染入参（浅拷贝 days 与 items）', () => {
  const parsed = {
    groupSize: 30,
    days: [day(1, '巴黎', [item()])],
  }
  const snapshot = JSON.stringify(parsed)
  applyQuoteRules(parsed)
  assert.equal(JSON.stringify(parsed), snapshot, '入参不应被修改')
})
