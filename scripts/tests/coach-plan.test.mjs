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

test('到达停留多晚时：第 1 天接机，第 2 天断开前城市当地车（R4，断开>400km）', () => {
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
  assert.ok(d2.items.some((i) => i.quoteKind === 'local-mtc'), 'Day2 断开前城市（次日飞尼斯>400km）→ 当地车（R4）')
  assert.ok(!d2.items.some((i) => i.quoteKind === 'through-coach'), '断开前城市不注入 THROUGH COACH')
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
  // D1 是首个地面日且行程含航班 → 按抵达日当地接机；THROUGH COACH 段从 D2 起
  const d1 = out.days.find((d) => d.dayNumber === 1)
  assert.ok(d1.items.some((i) => i.quoteKind === 'pickup'), '首个地面日（行程含航班）→ 当地接机')
  const d2 = out.days.find((d) => d.dayNumber === 2)
  const tc = d2.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, 'THROUGH COACH 从第 2 个地面日开始')
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

test('多段行程：连续地面段 THROUGH COACH；落地同城段当地车（R2）', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(1, '巴黎', [item({ type: 'transport', transportMode: 'flight', from: '北京', to: '巴黎' })], { cityNameEn: 'Paris' }),
      day(2, '尼斯'),
      day(3, '罗马', [item({ type: 'transport', transportMode: 'flight', from: '尼斯', to: '罗马' })], { cityNameEn: 'Rome' }),
      day(4, '罗马'),
    ],
  }
  const out = applyQuoteRules(parsed)
  // D1 抵达日（明确入境航班）→ 当地接机；连续地面段从 D2 起
  const d1 = out.days.find((d) => d.dayNumber === 1)
  assert.ok(d1.items.some((i) => i.quoteKind === 'pickup'), 'D1 抵达 → 当地接机')
  const runs = out.days.flatMap((d) => d.items).filter((i) => i.quoteKind === 'empty-run')
  assert.equal(runs.length, 1, '只有连续地面段有 EMPTY RUN（落地同城段是当地车）')
  const seg1 = out.days.find((d) => d.dayNumber === 2)
  const er1 = seg1.items.find((i) => i.quoteKind === 'empty-run')
  assert.equal(er1.from, '尼斯')
  assert.equal(er1.to, '尼斯', '首段终点 = 下一段交通（D3 飞罗马）出发城')
  const d4 = out.days.find((d) => d.dayNumber === 4)
  assert.ok(d4.items.some((i) => i.quoteKind === 'local-mtc'), 'Day4 落地同城段 → 当地车（R2，脱离 LDC）')
  assert.ok(!d4.items.some((i) => i.quoteKind === 'empty-run'), '当地段无 EMPTY RUN')
  assert.equal(d4.items.filter((i) => i.quoteKind === 'prepost').length, 0, '当地段无 PRE/POST')
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
      day(2, '尼斯'),
      day(3, '罗马', [item({ type: 'transport', transportMode: 'flight', from: '罗马', to: '上海' })]),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d3 = out.days.find((d) => d.dayNumber === 3)
  assert.ok(!d3.items.some((i) => i.quoteKind === 'pickup'), '离境日不应有接机')
  assert.ok(!d3.items.some((i) => i.quoteKind === 'through-coach'), 'transit 日不产生 THROUGH COACH 段')
  const d2 = out.days.find((d) => d.dayNumber === 2)
  assert.ok(d2.items.some((i) => i.quoteKind === 'through-coach'), '真实地面日仍有 THROUGH COACH')
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
  // D1 是首个地面日（行程含航班）→ 当地接机；THROUGH COACH 段从 D2 起
  const d1 = out.days.find((d) => d.dayNumber === 1)
  assert.ok(d1.items.some((i) => i.quoteKind === 'pickup'), 'D1 首日抵达 → 当地接机')
  const d2 = out.days.find((d) => d.dayNumber === 2)
  const tc = d2.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '应有 THROUGH COACH')
  assert.ok(tc.notes.includes('LDC第2-2天'), '长途车覆盖到罗马（最后地面日）')
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

test('首日飞抵白天城市（马赛）当夜住瓦朗索勒 → Day1 当地 STD MTC 接机，段从第 2 天起（2026-08-21 口径）', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(0, '上海'),
      day(1, '马赛', [item({ type: 'transport', transportMode: 'flight', from: '上海', to: '马赛' })], {
        finalCityName: '瓦朗索勒', cityNameEn: 'Marseille',
      }),
      day(2, '瓦朗索勒', [], { finalCityName: '圣特罗佩' }),
      day(3, '圣特罗佩', [], { finalCityName: '尼斯' }),
      day(4, '尼斯'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  const pickup = d1.items.find((i) => i.quoteKind === 'pickup')
  assert.ok(pickup, 'Day1 单独当地 STD MTC 接机')
  assert.equal(pickup.locationCategory, 'APT/HTL', '飞机抵达 → APT/HTL')
  assert.ok(!d1.items.some((i) => i.quoteKind === 'through-coach'), 'Day1 不开 THROUGH COACH 段')
  const d2 = out.days.find((d) => d.dayNumber === 2)
  const tc = d2.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, 'THROUGH COACH 段从第 2 天开始')
  assert.equal(tc.from, '瓦朗索勒')
  assert.ok(tc.notes.includes('LDC第2-4天'), '长途车从第 2 天开始')
  assert.ok(d2.items.some((i) => i.quoteKind === 'empty-run'), '第 2 天也有 EMPTY RUN')
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

test('酒店项名称跟随「当晚过夜城市」（finalCityName 优先，而非当天城市）', () => {
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
  assert.equal(h1.name, '瓦朗索勒酒店', '当天城市=马赛但当晚住瓦朗索勒 → 酒店名跟随过夜城市')
  assert.equal(h1.nameEn, 'Hotel in Valensole')
  const d2 = out.days.find((d) => d.dayNumber === 2)
  const h2 = d2.items.find((i) => i.type === 'hotel')
  assert.equal(h2.name, '圣特罗佩酒店')
  assert.equal(h2.nameEn, 'Hotel in Saint-Tropez')
})

test('transit 日过夜城市兜底：巴黎→日内瓦火车日无 finalCityName 时补终点城市，酒店跟随日内瓦', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(3, '巴黎', [
        item({ type: 'transport', transportMode: 'train', from: '巴黎', to: '日内瓦' }),
        item({ type: 'hotel', name: '某酒店', nameEn: 'Some Hotel' }),
      ], { cityNameEn: 'Paris' }),
      day(4, '日内瓦', [], { cityNameEn: 'Geneva' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d3 = out.days.find((d) => d.dayNumber === 3)
  assert.equal(d3.finalCityName, '日内瓦', '火车终点=日内瓦 → 自动补过夜城市')
  const h3 = d3.items.find((i) => i.type === 'hotel')
  assert.equal(h3.name, '日内瓦酒店', '第4天住日内瓦 → 酒店应为日内瓦而非巴黎')
  assert.equal(h3.nameEn, 'Some Hotel', '过夜城市缺英文名 → 保留 AI 原英文名')
})

test('transit 日终点=当天城市（同城住宿）不补过夜城市', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(3, '日内瓦', [
        item({ type: 'transport', transportMode: 'train', from: '巴黎', to: '日内瓦' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Geneva', finalCityName: '' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d3 = out.days.find((d) => d.dayNumber === 3)
  assert.equal(d3.finalCityName, '', 'to=当天城市 → 不补 finalCityName')
  const h3 = d3.items.find((i) => i.type === 'hotel')
  assert.equal(h3.name, '日内瓦酒店', '无过夜城市 → 酒店名跟随当天城市')
})

test('大巴换城日补过夜城市：日内瓦→伯尔尼大巴无 finalCityName 时补终点，酒店跟随伯尔尼', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(5, '日内瓦', [
        item({ type: 'transport', transportMode: 'bus', from: '日内瓦', to: '伯尔尼' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Geneva' }),
      day(6, '伯尔尼', [], { cityNameEn: 'Bern' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d5 = out.days.find((d) => d.dayNumber === 5)
  assert.equal(d5.finalCityName, '伯尔尼', '大巴终点=伯尔尼 → 自动补过夜城市')
  const h5 = d5.items.find((i) => i.type === 'hotel')
  assert.equal(h5.name, '伯尔尼酒店', '第5天住伯尔尼 → 酒店应为伯尔尼而非日内瓦')
  assert.ok(!d5.items.some((i) => i.type === 'transport' && i.transportMode === 'bus' && i.from && !i.quoteKind),
    '原始城际大巴被规则 1 删除（THROUGH COACH 替代）')
})

test('一日游往返大巴不补过夜城市（巴黎→凡尔赛→巴黎，当天往返）', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(2, '巴黎', [
        item({ type: 'transport', transportMode: 'bus', from: '巴黎', to: '凡尔赛' }),
        item({ type: 'transport', transportMode: 'bus', from: '凡尔赛', to: '巴黎' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d2 = out.days.find((d) => d.dayNumber === 2)
  assert.equal(d2.finalCityName, '巴黎', '当天往返凡尔赛 → 不补过夜城市，仍住巴黎')
  const h2 = d2.items.find((i) => i.type === 'hotel')
  assert.equal(h2.name, '巴黎酒店', '酒店仍跟随巴黎')
})

test('当天多段换城交通取最后一段：卢塞恩→苏黎世 + 苏黎世→米兰 → 过夜城市=米兰', () => {
  const parsed = {
    groupSize: 20,
    days: [
      day(8, '卢塞恩', [
        item({ type: 'transport', transportMode: 'train', from: '卢塞恩', to: '苏黎世' }),
        item({ type: 'transport', transportMode: 'flight', from: '苏黎世', to: '米兰' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Lucerne' }),
      day(9, '米兰', [], { cityNameEn: 'Milan' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d8 = out.days.find((d) => d.dayNumber === 8)
  assert.equal(d8.finalCityName, '米兰', '取最后一段交通终点 → 过夜城市=米兰')
  const h8 = d8.items.find((i) => i.type === 'hotel')
  assert.equal(h8.name, '米兰酒店', '第8天住米兰 → 酒店应为米兰')
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

test('R3a：断开≤400km（日内瓦→苏黎世 ~300km）默认策略 local-then-ldc → 落地后开始 THROUGH COACH', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '日内瓦', [], { cityNameEn: 'Geneva', finalCityName: '日内瓦' }),
      day(2, '苏黎世', [item({ type: 'transport', transportMode: 'flight', from: '日内瓦', to: '苏黎世' })], { cityNameEn: 'Zurich', finalCityName: '苏黎世' }),
      day(3, '卢塞恩', [], { cityNameEn: 'Lucerne', finalCityName: '卢塞恩' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d2 = out.days.find((d) => d.dayNumber === 2)
  const tc = d2.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '落地（苏黎世）后开始 THROUGH COACH（R3a）')
  assert.equal(tc.countryCode, 'CH', '瑞士供应商 CH ZRH')
  assert.equal(tc.cityCode, 'ZRH')
  assert.ok(tc.notes.includes('LDC第2-3天'), '段从落地日开始')
})

test('R3b：断开≤400km（日内瓦→苏黎世 ~300km）策略 ldc-continuous → THROUGH COACH 跨断开连续（不换车）', async () => {
  // 临时切换策略配置（直接改模块配置验证；正式场景由 coach-rules.js 控制）
  const rules = await import('../../src/data/coach-rules.js')
  const orig = rules.COACH_RULES.breakStrategy
  rules.COACH_RULES.breakStrategy = 'ldc-continuous'
  try {
    const parsed = {
      groupSize: 30,
      days: [
        day(1, '日内瓦', [], { cityNameEn: 'Geneva', finalCityName: '日内瓦' }),
        day(2, '苏黎世', [item({ type: 'transport', transportMode: 'flight', from: '日内瓦', to: '苏黎世' })], { cityNameEn: 'Zurich', finalCityName: '苏黎世' }),
        day(3, '卢塞恩', [], { cityNameEn: 'Lucerne', finalCityName: '卢塞恩' }),
      ],
    }
    const out = applyQuoteRules(parsed)
    const tcs = out.days.flatMap((d) => d.items).filter((i) => i.quoteKind === 'through-coach')
    assert.equal(tcs.length, 1, 'R3b 不断段 → 只有一个 THROUGH COACH（跨断开连续）')
    assert.ok(tcs[0].notes.includes('LDC第2-3天'), 'D1 首日接机 → THROUGH COACH 从 D2 起并跨断开连续覆盖')
  } finally {
    rules.COACH_RULES.breakStrategy = orig
  }
})

test('R4：断开>400km（巴黎→罗马 690km）→ 落地后开始 THROUGH COACH', () => {
  const parsed = {
    groupSize: 30,
    days: [
      day(1, '巴黎'),
      day(2, '罗马', [item({ type: 'transport', transportMode: 'flight', from: '巴黎', to: '罗马' })], { cityNameEn: 'Rome', finalCityName: '罗马' }),
      day(3, '佛罗伦萨', [], { cityNameEn: 'Florence', finalCityName: '佛罗伦萨' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d2 = out.days.find((d) => d.dayNumber === 2)
  const tc = d2.items.find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '落地（罗马）后开始 THROUGH COACH（R4）')
  assert.equal(tc.countryCode, 'IT')
  assert.equal(tc.cityCode, 'ROM')
})

test('抵达日无游览：删除 AI 误加的市区游览用车（只有接机 MTC）', () => {
  const parsed = {
    groupSize: 25,
    days: [
      day(1, '巴黎', [
        item({ type: 'transport', transportMode: 'flight', from: '北京', to: '巴黎' }),
        item({ type: 'transport', transportMode: 'bus', name: '巴黎市区游览用车', notes: '市区游览用车' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris' }),
      day(2, '巴黎', [
        item({ type: 'attraction', name: '卢浮宫' }),
        item({ type: 'transport', transportMode: 'bus', name: '巴黎市区游览用车', notes: '市区游览用车' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  assert.ok(!d1.items.some((i) => i.name === '巴黎市区游览用车'), '抵达日无游览 → 删除市区游览用车')
  assert.ok(d1.items.some((i) => i.quoteKind === 'pickup'), '抵达日保留接机 MTC')
  // LDC 段内的市区游览用车由「THROUGH COACH 覆盖」规则移除（同一辆车跑到底），1.7 只处理无游览的误加
  const d2 = out.days.find((d) => d.dayNumber === 2)
  assert.ok(!d2.items.some((i) => i.name === '巴黎市区游览用车'), 'LDC 段内市区用车被 THROUGH COACH 覆盖规则移除')
})

test('抵达日有游览 → 市区游览用车保留（1.7 不误删有游览的段外天）', () => {
  const parsed = {
    groupSize: 25,
    days: [
      // D1 抵达日（STD MTC 接机，不在 THROUGH COACH 段内）：下午有市区游览 → 保留市区用车
      day(1, '巴黎', [
        item({ type: 'transport', transportMode: 'flight', from: '北京', to: '巴黎' }),
        item({ type: 'attraction', name: '卢浮宫' }),
        item({ type: 'transport', transportMode: 'bus', name: '巴黎市区游览用车', notes: '市区游览用车' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris' }),
      day(2, '巴黎', [
        item({ type: 'attraction', name: '埃菲尔铁塔' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris' }),
    ],
  }
  const out = applyQuoteRules(parsed)
  const d1 = out.days.find((d) => d.dayNumber === 1)
  assert.ok(d1.items.some((i) => i.name === '巴黎市区游览用车'), '抵达日有游览（attraction）→ 1.7 保留市区用车')
})

test('返程日有行程内容 → THROUGH COACH 段覆盖到返程日（大巴多算 1 天），不单独注入送机', () => {
  const parsed = {
    groupSize: 25,
    days: [
      day(2, '巴黎', [
        item({ type: 'transport', transportMode: 'flight', from: '北京', to: '巴黎' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris' }),
      day(3, '巴黎', [
        item({ type: 'transport', transportMode: 'bus', from: '巴黎', to: '日内瓦' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris', finalCityName: '日内瓦' }),
      day(4, '日内瓦', [
        item({ type: 'attraction', name: '日内瓦湖' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Geneva' }),
      day(5, '日内瓦', [
        item({ type: 'transport', transportMode: 'flight', from: '日内瓦', to: '北京' }),
        item({ type: 'attraction', name: '日内瓦大喷泉' }), // 离境日上午仍有游览活动
      ], { cityNameEn: 'Geneva' }),
      day(6, '北京'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const tc = out.days.flatMap((d) => d.items).find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '应有 THROUGH COACH')
  assert.equal(tc.notes, 'LDC第3-5天，共3天，供应商 IT ROM Through Coach (NGS)', 'D2 首日接机 → 段 D3 起并覆盖到返程日（D5）')
  const d5 = out.days.find((d) => d.dayNumber === 5)
  assert.ok(!d5.items.some((i) => i.quoteKind === 'dropoff'), '返程日有活动 → 大巴覆盖，不再单独注入送机')
})

test('返程日纯送机（无活动）→ 段止于前一天，单独注入送机 MTC', () => {
  const parsed = {
    groupSize: 25,
    days: [
      day(2, '巴黎', [
        item({ type: 'transport', transportMode: 'flight', from: '北京', to: '巴黎' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris' }),
      day(3, '巴黎', [
        item({ type: 'transport', transportMode: 'bus', from: '巴黎', to: '日内瓦' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris', finalCityName: '日内瓦' }),
      day(4, '日内瓦', [
        item({ type: 'attraction', name: '日内瓦湖' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Geneva' }),
      day(5, '日内瓦', [
        item({ type: 'transport', transportMode: 'flight', from: '日内瓦', to: '北京' }), // 纯送机
      ], { cityNameEn: 'Geneva' }),
      day(6, '北京'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const tc = out.days.flatMap((d) => d.items).find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '应有 THROUGH COACH')
  assert.equal(tc.notes, 'LDC第3-4天，共2天，供应商 IT ROM Through Coach (NGS)', 'D2 首日接机 → 段 D3 起、止于返程日前一天')
  const d5 = out.days.find((d) => d.dayNumber === 5)
  const dropoff = d5.items.find((i) => i.quoteKind === 'dropoff')
  assert.ok(dropoff, '纯送机 → 单独注入送机 MTC')
  assert.equal(dropoff.nameEn, 'Geneva - HTL/APT')
})

test('离境日只有早餐+返程航班（无游览）→ 仍视为纯送机，单独注入送机 MTC', () => {
  const parsed = {
    groupSize: 25,
    days: [
      day(2, '巴黎', [
        item({ type: 'transport', transportMode: 'flight', from: '北京', to: '巴黎' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris' }),
      day(3, '巴黎', [
        item({ type: 'transport', transportMode: 'bus', from: '巴黎', to: '日内瓦' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Paris', finalCityName: '日内瓦' }),
      day(4, '日内瓦', [
        item({ type: 'attraction', name: '日内瓦湖' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Geneva' }),
      day(5, '日内瓦', [
        item({ type: 'breakfast', name: '酒店早餐' }), // 早餐不算行程内容
        item({ type: 'transport', transportMode: 'flight', from: '日内瓦', to: '北京' }),
      ], { cityNameEn: 'Geneva' }),
      day(6, '北京'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const tc = out.days.flatMap((d) => d.items).find((i) => i.quoteKind === 'through-coach')
  assert.equal(tc.notes, 'LDC第3-4天，共2天，供应商 IT ROM Through Coach (NGS)', '早餐不算活动 → 段仍止于前一天')
  const d5 = out.days.find((d) => d.dayNumber === 5)
  const dropoff = d5.items.find((i) => i.quoteKind === 'dropoff')
  assert.ok(dropoff, '只有早餐+航班 → 仍单独注入送机 MTC')
})

test('德奥行程：DE BER 供应商 + 德国境内每天 GERMAN VAT（KT 实操口径 2026-08-21）', () => {
  const parsed = {
    groupSize: 25,
    days: [
      day(1, '法兰克福', [
        item({ type: 'transport', transportMode: 'flight', from: '北京', to: '法兰克福' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Frankfurt' }),
      day(2, '法兰克福', [
        item({ type: 'attraction', name: '罗马贝格广场' }),
        item({ type: 'transport', transportMode: 'bus', from: '法兰克福', to: '海德堡' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Frankfurt', finalCityName: '海德堡' }),
      day(3, '海德堡', [
        item({ type: 'attraction', name: '海德堡城堡' }),
        item({ type: 'transport', transportMode: 'bus', from: '海德堡', to: '斯图加特' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Heidelberg', finalCityName: '斯图加特' }),
      day(4, '斯图加特', [
        item({ type: 'transport', transportMode: 'bus', from: '斯图加特', to: '慕尼黑' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Stuttgart', finalCityName: '慕尼黑' }),
      day(5, '慕尼黑', [
        item({ type: 'transport', transportMode: 'bus', from: '慕尼黑', to: '萨尔茨堡' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Munich', finalCityName: '萨尔茨堡' }),
      day(6, '萨尔茨堡', [
        item({ type: 'attraction', name: '萨尔茨堡城堡' }),
        item({ type: 'hotel' }),
      ], { cityNameEn: 'Salzburg' }),
      day(7, '萨尔茨堡', [
        item({ type: 'transport', transportMode: 'flight', from: '萨尔茨堡', to: '北京' }),
      ], { cityNameEn: 'Salzburg' }),
      day(8, '北京'),
    ],
  }
  const out = applyQuoteRules(parsed)
  const tc = out.days.flatMap((d) => d.items).find((i) => i.quoteKind === 'through-coach')
  assert.ok(tc, '应有 THROUGH COACH')
  assert.equal(tc.notes.split('供应商 ')[1], 'DE BER Through Coach (NGS)', '德奥 → DE BER 柏林车，非 IT ROM')
  // 按「过夜城市」判国家：D2-D4 德国过夜 → GERMAN VAT（D1 首日接机不在段内）；D5 慕尼黑→当晚萨尔茨堡 → 算奥地利
  const vatDays = out.days.filter((d) =>
    d.dayNumber >= 1 && d.dayNumber <= 7 &&
    (d.items || []).some((i) => i.notes === 'GERMAN VAT'))
  assert.equal(vatDays.length, 3, '德国过夜 3 天每天注入 GERMAN VAT（D1 接机日无、D5 起过夜萨尔茨堡）')
  const vat = out.days.flatMap((d) => d.items).find((i) => i.notes === 'GERMAN VAT')
  assert.ok(vat, 'GERMAN VAT 条目存在')
  assert.equal(vat.name, 'Base - GERMAN VAT')
  assert.equal(vat.price, 90.43)
  assert.equal(vat.countryCode, 'DE')
  // 奥地利过夜每天 Austria ROAD TAX（D5 当晚萨尔茨堡 + D6 萨尔茨堡）
  const taxDays = out.days.filter((d) =>
    d.dayNumber >= 1 && d.dayNumber <= 7 &&
    (d.items || []).some((i) => i.notes === 'Austria ROAD TAX PAID BY DRIVER'))
  assert.equal(taxDays.length, 2, '奥地利过夜 2 天注入 Austria ROAD TAX（D5 当晚萨尔茨堡、D6 萨尔茨堡）')
  const tax = out.days.flatMap((d) => d.items).find((i) => i.notes === 'Austria ROAD TAX PAID BY DRIVER')
  assert.ok(tax, 'ROAD TAX 条目存在')
  assert.equal(tax.name, 'Austria ROAD TAX PAID BY DRIVER')
  assert.equal(tax.price, 47.87)
  assert.equal(tax.countryCode, 'AT')
})
