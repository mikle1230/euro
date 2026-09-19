// 报价固定费率（QUOTE_RATES）测试 —— 改价回归保护
// 现状口径（2026-09-17）：只有「已定案 / LDC 官方附表有出处」的金额才填 price，
// 其余留空由操作员实填，参考价写在 note 里，不自动计入报价。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QUOTE_RATES } from '../../src/lib/quote-rates.js'

test('insurance：每团必录，2.66 USD/人（BJS/CN）', () => {
  assert.deepEqual(QUOTE_RATES.insurance, {
    price: 2.66,
    currency: 'USD',
    priceUnit: 'perPerson',
    cityCode: 'BJS',
    countryCode: 'CN',
    note: '每团必录',
  })
})

test('prepostNight：司机前后夜 120 EUR', () => {
  assert.equal(QUOTE_RATES.prepostNight.price, 120)
  assert.equal(QUOTE_RATES.prepostNight.currency, 'EUR')
})

test('germanVat：德国每日增值税 90.43 EUR/团', () => {
  assert.equal(QUOTE_RATES.germanVat.price, 90.43)
  assert.equal(QUOTE_RATES.germanVat.currency, 'EUR')
  assert.equal(QUOTE_RATES.germanVat.priceUnit, 'perGroup')
})

test('roadTax：9 个强制路税国，键序固定 NO/CH/DE/AT/HU/CZ/SI/SK/CR', () => {
  assert.deepEqual(Object.keys(QUOTE_RATES.roadTax), [
    'NO', 'CH', 'DE', 'AT', 'HU', 'CZ', 'SI', 'SK', 'CR',
  ])
})

test('roadTax：只有 NO 有定案金额（380 NOK），其余无 price 待实填', () => {
  assert.equal(QUOTE_RATES.roadTax.NO.price, 380)
  assert.equal(QUOTE_RATES.roadTax.NO.currency, 'NOK')
  const withPrice = Object.entries(QUOTE_RATES.roadTax)
    .filter(([, v]) => v.price !== undefined)
    .map(([k]) => k)
  assert.deepEqual(withPrice, ['NO'], '2026-09-17 口径：只填已定案/LDC 出处的金额，其余留空')
})

test('roadTax：每条都有 name，note 带 LDC 出处说明', () => {
  for (const [k, v] of Object.entries(QUOTE_RATES.roadTax)) {
    assert.ok(v.name, `${k} 应有 name`)
    assert.ok(v.note && v.note.includes('LDC'), `${k} 的 note 应含 LDC 出处说明`)
  }
})
