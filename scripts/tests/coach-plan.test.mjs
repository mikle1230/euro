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

test('连续无飞机段注入 THROUGH COACH + PRE/POST（火车是地面交通，不打断）', () => {
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
  assert.equal(tc.to, '罗马', '火车不打断长途车 → 段覆盖到罗马')
  assert.ok(d1.items.some((i) => i.quoteKind === 'prepost'), '应注入 PRE/POST')
})

test('到达停留多晚时：第 1 天接机，THROUGH COACH 从第 2 天开始', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '巴黎', [item({ type: 'transport', transportMode: 'flight', from: '北京', to: '巴黎' })]),
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

test('THROUGH COACH 国/城=LDC 供应商所在地（西欧多国 → IT ROM）', () => {
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
  assert.equal(tc.countryCode, 'IT', '西欧多国 → 国家 IT（LDC 供应商）')
  assert.equal(tc.cityCode, 'ROM', '西欧多国 → 城市 ROM（LDC 供应商）')
  assert.ok(tc.notes.includes('IT ROM'), '备注带供应商')
  const pp = d1.items.find((i) => i.quoteKind === 'prepost')
  assert.ok(pp, '应注入 PRE/POST')
  assert.ok(!pp.notes.includes('€120'), '前后夜金额不显示（用户口径）')
  assert.ok(pp.notes.includes('Western Europe'), '备注带 LDC 区域名')
  assert.equal(pp.countryCode, 'IT')
  assert.equal(pp.cityCode, 'ROM')
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

test('挪威北极极地城市（特罗姆瑟）→ THROUGH COACH 供应商 NO ALT（北）', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '特罗姆瑟', [], { cityNameEn: 'Tromso' }),
      day(2, '特罗姆瑟', [], { cityNameEn: 'Tromso' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const tc = out.days[0].items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '应有 THROUGH COACH')
  assert.equal(tc.countryCode, 'NO')
  assert.equal(tc.cityCode, 'ALT', '北极极地 → NO ALT（供应商），而非 TOS')
})

test('挪威常规城市（奥斯陆）→ THROUGH COACH 供应商 NO OSL（南）', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '奥斯陆', [], { cityNameEn: 'Oslo' }),
      day(2, '奥斯陆', [], { cityNameEn: 'Oslo' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const tc = out.days[0].items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '应有 THROUGH COACH')
  assert.equal(tc.countryCode, 'NO')
  assert.equal(tc.cityCode, 'OSL', '常规 → NO OSL，而非 NO ALT')
})

test('含中国出发日（day 0 上海）不参与 LDC 判定，THROUGH COACH 仍 IT ROM', () => {
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
  assert.ok(tc.notes.includes('IT ROM'), '供应商 IT ROM 进备注')
})

test('返程日（罗马→上海飞回）也是中国城市，不参与 LDC 判定；THROUGH COACH 仍 IT ROM NGS', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(0, '上海'),
      day(1, '巴黎'),
      day(2, '尼斯'),
      day(3, '罗马'),
      day(4, '上海', [item({ type: 'transport', transportMode: 'flight', from: '罗马', to: '上海' })]),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const tc = d1.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '返程日不应影响 THROUGH COACH')
  assert.equal(tc.countryCode, 'IT', '返程上海混入 → 应排除 CN')
  assert.equal(tc.cityCode, 'ROM')
  assert.ok(tc.notes.includes('IT ROM Through Coach (NGS)'), '备注应带完整供应商名（NGS 型）')
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

test('使用 THROUGH COACH 时首段首天注入 MTC EMPTY RUN 空驶（首城→末城车程 km）', () => {
  const parsed = {
    groupSize: 30,
    days: [day(1, '巴黎'), day(2, '尼斯'), day(3, '罗马')],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const er = d1.items.find((i) => i.quoteKind === 'empty-run')
  assert.ok(er, '首段首天应注入 EMPTY RUN')
  assert.equal(er.type, 'transport')
  assert.equal(er.transportMode, 'bus')
  assert.equal(er.from, '巴黎')
  assert.equal(er.to, '罗马')
  assert.ok(er.quantity > 0, `公里数应 > 0（实际 ${er.quantity}）`)
  assert.ok(er.notes.includes('EMPTY RUN') && er.notes.includes('巴黎') && er.notes.includes('罗马'), '备注带 EMPTY RUN 与首尾城市')
  assert.equal(er.countryCode, 'IT', '空驶与 THROUGH COACH 同供应商国')
  assert.equal(er.cityCode, 'ROM')
  // 排序：THROUGH COACH(20) < EMPTY RUN(22) < PRE/POST(25)
  const orders = d1.items
    .filter((i) => ['through-coach', 'empty-run', 'prepost'].includes(i.quoteKind))
    .map((i) => i.quoteOrder)
  assert.deepEqual(orders, [20, 22, 25])
})

test('多段行程：每段都有 THROUGH COACH + EMPTY RUN + PRE/POST（按各自段起终点）', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎'),
      day(2, '尼斯'),
      day(3, '罗马', [item({ type: 'transport', transportMode: 'flight', from: '尼斯', to: '罗马' })]),
      day(4, '罗马'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const runs = out.days.flatMap((d) => d.items).filter((i) => i.quoteKind === 'empty-run')
  assert.equal(runs.length, 2, '每段都应有一个 EMPTY RUN')
  const seg1 = out.days.find((d) => d.dayNumber === 1)
  const er1 = seg1.items.find((i) => i.quoteKind === 'empty-run')
  assert.equal(er1.from, '巴黎')
  assert.equal(er1.to, '尼斯', '首段终点 = 下一段交通出发城（尼斯）')
  const d4 = out.days.find((d) => d.dayNumber === 4)
  const er2 = d4.items.find((i) => i.quoteKind === 'empty-run')
  assert.ok(er2, '第二段也有 EMPTY RUN')
  assert.equal(d4.items.filter((i) => i.quoteKind === 'prepost').length, 1, '第二段也有 PRE/POST')
  // D3 为同城连住到达（罗马住 2 晚）→ 接机
  const d3 = out.days.find((d) => d.dayNumber === 3)
  assert.ok(d3.items.some((i) => i.quoteKind === 'pickup'), '多晚同城到达 → 接机')
})

test('无 LDC 供应商（表外国家组合）→ 不注入 THROUGH COACH / EMPTY RUN / PRE-POST', () => {
  const parsed = {
    groupSize: 20,
    days: [day(1, '纽约'), day(2, '波士顿')],
  }
  const out = applyQuoteRules(parsed)
  const all = out.days.flatMap((d) => d.items)
  assert.ok(!all.some((i) => i.quoteKind === 'empty-run'), '无 LDC 时不应有空驶')
  assert.ok(!all.some((i) => i.quoteKind === 'through-coach'), '无 LDC 时不应有 THROUGH COACH')
  assert.ok(!all.some((i) => i.quoteKind === 'prepost'), '无 LDC 时不应有 PRE/POST')
})

test('中国返程日（上海）不参与分段 → 无虚段 THROUGH COACH/PRE-POST', () => {
  const parsed = {
    groupSize: 20,
    days: [day(1, '巴黎'), day(2, '尼斯'), day(3, '上海')],
  }
  const out = applyQuoteRules(parsed)
  const all = out.days.flatMap((d) => d.items)
  assert.ok(!all.some((i) => i.quoteKind === 'through-coach' && i.from === '上海'), '上海不应产生 THROUGH COACH')
  assert.equal(all.filter((i) => i.quoteKind === 'prepost').length, 1, 'PRE/POST 只出现在真实段首天')
  const er = all.find((i) => i.quoteKind === 'empty-run')
  assert.ok(er, '仍有 EMPTY RUN')
  assert.equal(er.from, '巴黎')
  assert.equal(er.to, '尼斯')
})

test('离境日（返程航班终点≠过夜城市）不注入接机 MTC', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎'),
      day(2, '罗马', [item({ type: 'transport', transportMode: 'flight', from: '罗马', to: '上海' })]),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d2 = out.days.find((d) => d.dayNumber === 2)
  assert.ok(!d2.items.some((i) => i.quoteKind === 'pickup'), '离境日不应有接机')
  assert.ok(!d2.items.some((i) => i.quoteKind === 'through-coach'), 'transit 日不产生 THROUGH COACH 段')
  const d1 = out.days.find((d) => d.dayNumber === 1)
  assert.ok(d1.items.some((i) => i.quoteKind === 'through-coach'), '真实地面日仍有 THROUGH COACH')
})

test('抵达日接机类型取「抵达过夜城市的交通工具」（同日有船有飞机 → APT/HTL）', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎'),
      day(2, '那不勒斯', [
        item({ type: 'transport', transportMode: 'boat', from: '苏莲托', to: '卡普里岛' }),
        item({ type: 'transport', transportMode: 'flight', from: '那不勒斯', to: '罗马' }),
      ], { finalCityName: '罗马', finalCityNameEn: 'Rome', cityNameEn: 'Naples' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d2 = out.days.find((d) => d.dayNumber === 2)
  const pickup = d2.items.find((i) => i.quoteKind === 'pickup')
  assert.ok(pickup, '抵达日应有接机')
  assert.equal(pickup.locationCategory, 'APT/HTL', '按抵达过夜城市的航班类型取 APT/HTL')
})

test('断开单城停留的返程日 → 加送机 MTC（HTL/APT，无接机）', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎'),
      day(2, '罗马', [item({ type: 'transport', transportMode: 'flight', from: '罗马', to: '上海' })]),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d2 = out.days.find((d) => d.dayNumber === 2)
  assert.ok(!d2.items.some((i) => i.quoteKind === 'pickup'), '离境日不应有接机')
  const dropoff = d2.items.find((i) => i.quoteKind === 'dropoff')
  assert.ok(dropoff, '与前段断开 → 应加送机')
  assert.equal(dropoff.locationCategory, 'HTL/APT')
})

test('返程日（同城衔接或断开）→ 总是单独注入送机 MTC（用户口径 2026-08-18）', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎', [item({ type: 'transport', transportMode: 'flight', from: '北京', to: '巴黎' })]),
      day(2, '巴黎'),
      day(3, '巴黎', [item({ type: 'transport', transportMode: 'flight', from: '巴黎', to: '上海' })]),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d3 = out.days.find((d) => d.dayNumber === 3)
  assert.ok(!d3.items.some((i) => i.quoteKind === 'pickup'), '离境日不应有接机')
  const dropoff = d3.items.find((i) => i.quoteKind === 'dropoff')
  assert.ok(dropoff, '返程离境日总是加单独送机（THROUGH COACH 段不覆盖离境日）')
  assert.equal(dropoff.locationCategory, 'HTL/APT')
  assert.equal(dropoff.cityCode, 'PAR', '送机国/城 = 当天城市')
  assert.equal(dropoff.countryCode, 'FR')
  const d1 = out.days.find((d) => d.dayNumber === 1)
  assert.ok(d1.items.some((i) => i.quoteKind === 'pickup'), '同城连住第 1 天仍为 STD MTC 接机')
})

test('长途车一路开到离境城（罗马）→ 返程日仍单独送机（B线法意瑞场景，用户口径更新）', () => {
  // B 线：长途车从巴黎一路开到罗马过夜，次日罗马飞返北京。旧口径认为顺路送机不加，
  // 用户 2026-08-18 确认：返程离境日总是单独送机 MTC（THROUGH COACH 段不覆盖离境日）。
  const parsed = {
    groupSize: 25,
    days: [
      day(1, '巴黎'),
      day(2, '罗马', [], { cityNameEn: 'Rome' }),
      day(3, '罗马', [item({ type: 'transport', transportMode: 'flight', from: '罗马', to: '北京' })], { cityNameEn: 'Rome', finalCityName: '北京', finalCityNameEn: 'Beijing' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d3 = out.days.find((d) => d.dayNumber === 3)
  const dropoff = d3.items.find((i) => i.quoteKind === 'dropoff')
  assert.ok(dropoff, '返程离境日总是加单独送机')
  assert.equal(dropoff.cityCode, 'ROM', '送机国/城 = 当天城市（罗马）')
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const tc = d1.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '应有 THROUGH COACH')
  assert.ok(tc.notes.includes('LDC第1-2天'), '长途车覆盖到罗马（最后地面日）')
})

test('单晚停留的抵达日（如飞抵巴勒莫）→ THROUGH COACH 从抵达日开始，不加接机', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎'),
      day(2, '那不勒斯', [item({ type: 'transport', transportMode: 'flight', from: '那不勒斯', to: '巴勒莫' })], {
        finalCityName: '巴勒莫', finalCityNameEn: 'Palermo', cityNameEn: 'Naples',
      }),
      day(3, '巴勒莫', [], { finalCityName: '阿格里真托' }),
      day(4, '陶尔米纳'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d2 = out.days.find((d) => d.dayNumber === 2)
  assert.ok(!d2.items.some((i) => i.quoteKind === 'pickup'), '单晚抵达换城市 → 无 STD MTC 接机')
  const tc = d2.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, 'THROUGH COACH 从抵达日（巴勒莫）开始')
  assert.equal(tc.from, '巴勒莫')
  assert.equal(tc.notes, 'LDC第2-4天，共3天，供应商 IT ROM Through Coach (NGS)')
  const er = d2.items.find((i) => i.quoteKind === 'empty-run')
  assert.ok(er, '该段也有 EMPTY RUN')
  assert.equal(er.from, '巴勒莫')
  assert.equal(er.to, '陶尔米纳', '段终点 = 段末日 cityName（无后续 transit）')
  assert.ok(d2.items.some((i) => i.quoteKind === 'prepost'), '该段也有 PRE/POST')
})

test('首日飞抵白天城市（马赛）当夜住瓦朗索勒 → THROUGH COACH 从第 1 天开始（from=马赛）', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(0, '上海'),
      day(1, '马赛', [item({ type: 'transport', transportMode: 'flight', from: '上海', to: '马赛' })], {
        finalCityName: '瓦朗索勒', cityNameEn: 'Marseille',
      }),
      day(2, '瓦朗索勒', [], { finalCityName: '圣特罗佩' }),
      day(3, '圣特罗佩'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const tc = d1.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '第 1 天应有 THROUGH COACH')
  assert.equal(tc.from, '马赛', 'from 取抵达的白天城市（马赛）')
  assert.ok(tc.notes.includes('LDC第1-'), '长途车从第 1 天开始')
  assert.ok(d1.items.some((i) => i.quoteKind === 'empty-run'), '第 1 天也有 EMPTY RUN')
  assert.ok(!d1.items.some((i) => i.quoteKind === 'pickup'), '首日单晚换城 → 无 STD MTC 接机')
})

test('观光列车跨城（金色山口 因特拉肯→琉森）不打断长途车段', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎'),
      day(2, '因特拉肯', [], { cityNameEn: 'Interlaken' }),
      day(3, '因特拉肯', [item({ type: 'transport', transportMode: 'train', from: '因特拉肯', to: '琉森' })], {
        cityNameEn: 'Interlaken', finalCityName: '琉森',
      }),
      day(4, '琉森', [], { cityNameEn: 'Lucerne' }),
      day(5, '罗马', [], { cityNameEn: 'Rome' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const tcs = out.days.flatMap((d) => d.items).filter((i) => i.quoteKind === 'through-coach')
  assert.equal(tcs.length, 1, '观光列车不打断长途车 → 只应有一个 THROUGH COACH 段')
  assert.ok(tcs[0].notes.includes('LDC第1-5天'), '长途车应连续覆盖 1-5 天')
})

test('酒店项名称规范化为当天城市（而非 AI 用错的过夜城市）', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '马赛', [item({ type: 'hotel', name: '瓦朗索勒酒店', nameEn: 'Hotel in Valensole' })], {
        cityNameEn: 'Marseille', finalCityName: '瓦朗索勒',
      }),
      day(2, '瓦朗索勒', [item({ type: 'hotel', name: '圣特罗佩酒店', nameEn: 'Hotel in Saint-Tropez' })], {
        cityNameEn: 'Valensole', finalCityName: '圣特罗佩',
      }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const h1 = d1.items.find((i) => i.type === 'hotel')
  assert.equal(h1.name, '马赛酒店', '酒店名跟随当天城市（马赛）')
  assert.equal(h1.nameEn, 'Hotel in Marseille')
  const d2 = out.days.find((d) => d.dayNumber === 2)
  const h2 = d2.items.find((i) => i.type === 'hotel')
  assert.equal(h2.name, '瓦朗索勒酒店')
  assert.equal(h2.nameEn, 'Hotel in Valensole')
})

test('同城一日游的火车/船不打断长途车段（含返程腿，如少女峰小火车往返）', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎'),
      day(2, '因特拉肯', [
        item({ type: 'transport', transportMode: 'train', from: '因特拉肯', to: '少女峰' }),
        item({ type: 'transport', transportMode: 'train', from: '少女峰', to: '因特拉肯' }),
      ], { cityNameEn: 'Interlaken' }),
      day(3, '因特拉肯', [], { cityNameEn: 'Interlaken' }),
      day(4, '卢塞恩', [], { cityNameEn: 'Lucerne' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const tcs = out.days.flatMap((d) => d.items).filter((i) => i.quoteKind === 'through-coach')
  assert.equal(tcs.length, 1, '一日游火车（含返程腿）不应断段 → 只应有一个 THROUGH COACH 段')
  assert.ok(tcs[0].notes.includes('LDC第1-4天'), '长途车应连续覆盖 1-4 天')
})
