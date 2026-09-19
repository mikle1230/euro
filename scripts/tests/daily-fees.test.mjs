// 每日用车杂费（DAILY_FEES）测试 —— 按天注入的停车/许可费，改价回归保护
// 用户口径（2026-08-18）：不是所有城市都有杂费，只有表内城市在相应日子注入。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DAILY_FEES } from '../../src/data/daily-fees.js'

test('DAILY_FEES：共 3 条，城市码唯一且为 CKV/HSA/SZG', () => {
  assert.equal(DAILY_FEES.length, 3)
  assert.deepEqual(DAILY_FEES.map((f) => f.code), ['CKV', 'HSA', 'SZG'])
  assert.equal(new Set(DAILY_FEES.map((f) => f.code)).size, 3)
})

test('DAILY_FEES：中/英城市名与金额为真实录入值（EUR）', () => {
  const byCode = Object.fromEntries(DAILY_FEES.map((f) => [f.code, f]))
  assert.equal(byCode.CKV.city, '克鲁姆洛夫')
  assert.equal(byCode.CKV.cityEn, 'Cesky Krumlov')
  assert.equal(byCode.CKV.amount, 98.49)
  assert.equal(byCode.HSA.city, '哈尔施塔特')
  assert.equal(byCode.HSA.cityEn, 'Hallstatt')
  assert.equal(byCode.HSA.amount, 117.29)
  assert.equal(byCode.SZG.city, '萨尔茨堡')
  assert.equal(byCode.SZG.cityEn, 'Salzburg')
  assert.equal(byCode.SZG.amount, 95.74)
})

test('DAILY_FEES：字段完整、金额为正数、币种均 EUR、备注非空', () => {
  for (const f of DAILY_FEES) {
    assert.ok(f.city && f.cityEn && f.code, `${f.code} 中/英名与城市码非空`)
    assert.equal(typeof f.amount, 'number', `${f.code} amount 应为数字`)
    assert.ok(f.amount > 0, `${f.code} amount 应为正数`)
    assert.equal(f.currency, 'EUR')
    assert.ok(f.note, `${f.code} 备注非空`)
  }
})
