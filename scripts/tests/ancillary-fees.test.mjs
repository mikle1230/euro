// ANCILLARY_FEES 数据完整性测试 —— 记录当前真实形态（P0 不修数据）
// 数据源：可退附加费价目参考表（LDC 2025 Onwards Refundable List Ancillary - quotable），
// 由 scripts/build-ancillary-fees.js 生成，src 内零 UI 引用（悬挂资产，P2 才挂只读展示）。
//
// ⚠️ 现状（2026-09-19 实读，非"每条字段都齐"的理想形态）：
//   · 154 条 / 15 个 region；
//   · 53 条 cityCode 为空（国家/区域粒度行，如 AUSTRIA / BRENNER）；
//   · 13 条 rate 为 null、12 条 currency 为空（CHECKLIST 清单行 + 1 条 MUST QUOTE 备注行）；
//   · cityCode+desc 全表 9 组重复，其中非空 cityCode 的仅 2 组（FURKA TUNNEL 两个方向各重复 1 次）。
// 本测试按现状断言并把异常量化；数据本身的问题属内容运营，不在 P0 范围（见本仓 product-spec 第 6 节）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ANCILLARY_FEES } from '../../src/data/ancillary-fees.js'

const REQUIRED_KEYS = ['region', 'city', 'cityCode', 'desc', 'rate', 'currency', 'remark']

test('共 154 条，每条都带 7 个字段（region/city/cityCode/desc/rate/currency/remark）', () => {
  assert.equal(ANCILLARY_FEES.length, 154)
  for (const e of ANCILLARY_FEES) {
    for (const k of REQUIRED_KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(e, k),
        `缺字段 ${k}: ${JSON.stringify(e).slice(0, 80)}`,
      )
    }
  }
})

test('region / city / desc 全为非空字符串；region 共 15 个', () => {
  for (const e of ANCILLARY_FEES) {
    for (const k of ['region', 'city', 'desc']) {
      assert.equal(typeof e[k], 'string', `${k} 应为字符串`)
      assert.ok(e[k].trim(), `${k} 不应为空: ${JSON.stringify(e).slice(0, 80)}`)
    }
  }
  assert.equal(new Set(ANCILLARY_FEES.map((e) => e.region)).size, 15)
})

test('rate 只有 number / null 两种类型（当前 141 number / 13 null）', () => {
  const nums = ANCILLARY_FEES.filter((e) => typeof e.rate === 'number')
  const nulls = ANCILLARY_FEES.filter((e) => e.rate === null)
  // 两者之和等于总数 ⇒ 不存在第三种类型（字符串/undefined 等）
  assert.equal(nums.length + nulls.length, ANCILLARY_FEES.length, 'rate 不应有第三种类型')
  assert.equal(nums.length, 141)
  assert.equal(nulls.length, 13)
  assert.ok(nums.every((e) => Number.isFinite(e.rate)), '数值 rate 均为有限数')
})

test('rate 为空的行全部落在 CHECKLIST / 备注行（region 分布固定）', () => {
  const nullRegions = [...new Set(ANCILLARY_FEES.filter((e) => e.rate === null).map((e) => e.region))]
  assert.deepEqual(nullRegions, ['CHECKLIST', 'MUST QUOTE PARKING- NOT BY TL'])
})

test('cityCode：字符串；53 条为空（国家/区域粒度），非空的一律 3 位码', () => {
  for (const e of ANCILLARY_FEES) assert.equal(typeof e.cityCode, 'string')
  const empty = ANCILLARY_FEES.filter((e) => e.cityCode === '')
  const nonEmpty = ANCILLARY_FEES.filter((e) => e.cityCode !== '')
  assert.equal(empty.length, 53)
  assert.equal(nonEmpty.length, 101)
  assert.ok(nonEmpty.every((e) => e.cityCode.length === 3), '非空 cityCode 应为 3 位码')
})

test('currency：字符串；12 条为空且全部属 CHECKLIST 清单行', () => {
  for (const e of ANCILLARY_FEES) assert.equal(typeof e.currency, 'string')
  const empty = ANCILLARY_FEES.filter((e) => e.currency === '')
  assert.equal(empty.length, 12)
  assert.ok(empty.every((e) => e.region === 'CHECKLIST'), '空币种应只出现在 CHECKLIST 清单行')
})

test('cityCode+desc 唯一性：全表 9 组重复；剔除空 cityCode 后仅 2 组', () => {
  const dupGroups = (list) => {
    const m = new Map()
    for (const e of list) {
      const k = `${e.cityCode}|${e.desc}`
      m.set(k, (m.get(k) || 0) + 1)
    }
    return [...m.entries()].filter(([, n]) => n > 1)
  }
  assert.equal(dupGroups(ANCILLARY_FEES).length, 9, '含空 cityCode 行的重复组数')
  const real = dupGroups(ANCILLARY_FEES.filter((e) => e.cityCode))
  assert.equal(real.length, 2, '真实（非空 cityCode）重复仅 FURKA TUNNEL 两方向')
  assert.deepEqual(
    real.map(([k]) => k).sort(),
    ['GYS|FURKA TUNNEL REALP-OBERWALD', 'GYT|FURKA TUNNEL OBERWALD-REALP'],
  )
})

test('数值 rate 均为正；代表性行 HALLSTATT DAY PARKING FEE = 105 EUR', () => {
  const nums = ANCILLARY_FEES.filter((e) => typeof e.rate === 'number')
  assert.ok(nums.every((e) => e.rate > 0), '已定金额应为正数')
  const hallstatt = ANCILLARY_FEES.find((e) => e.cityCode === 'HSA' && e.desc === 'DAY PARKING FEE')
  assert.ok(hallstatt, '应存在 HALLSTATT 的 DAY PARKING FEE 行')
  assert.deepEqual(
    { region: hallstatt.region, city: hallstatt.city, rate: hallstatt.rate, currency: hallstatt.currency },
    { region: 'AUSTRIA', city: 'HALLSTATT', rate: 105, currency: 'EUR' },
  )
})
