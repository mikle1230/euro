// QUOS 映射纯函数测试
// 运行：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getQUOSType,
  isFreeItem,
  shouldHideItem,
  getCityCode,
  DEFAULT_QUOS_ORDER,
  QUOS_LABELS,
} from '../../src/lib/quos-mapping.js'

test('getQUOSType：类型 → QUOS 码', () => {
  assert.equal(getQUOSType({ type: 'hotel' }).code, 'HTL')
  assert.equal(getQUOSType({ type: 'attraction' }).code, 'ENT')
  assert.equal(getQUOSType({ type: 'breakfast' }).code, 'RST')
  assert.equal(getQUOSType({ type: 'lunch' }).code, 'RST')
  assert.equal(getQUOSType({ type: 'dinner' }).code, 'RST')
  assert.equal(getQUOSType({ type: 'guide' }).code, 'GUI')
  assert.equal(getQUOSType({ type: 'luggage' }).code, 'LUG')
  assert.equal(getQUOSType({ type: 'weird' }).code, 'OTH')
})

test('getQUOSType：交通按 mode/subtype 细分', () => {
  assert.equal(getQUOSType({ type: 'transport', transportMode: 'flight' }).code, 'FLT')
  assert.equal(getQUOSType({ type: 'transport', transportMode: 'train' }).code, 'DTR')
  assert.equal(getQUOSType({ type: 'transport', transportMode: 'train', transportSubtype: 'overnight' }).code, 'OTR')
  assert.equal(getQUOSType({ type: 'transport', transportMode: 'boat' }).code, 'DFR')
  assert.equal(getQUOSType({ type: 'transport', transportMode: 'boat', transportSubtype: 'overnight' }).code, 'OFR')
  assert.equal(getQUOSType({ type: 'transport', transportMode: 'bus' }).code, 'MTC')
  assert.equal(getQUOSType({ type: 'transport', transportMode: 'walk' }).code, 'MTC')
})

test('isFreeItem：costCategory 优先，缺省按价格推断', () => {
  assert.equal(isFreeItem({ costCategory: 'free' }), true)
  assert.equal(isFreeItem({ costCategory: 'paid' }), false)
  assert.equal(isFreeItem({ price: 0 }), true)
  assert.equal(isFreeItem({ price: 12.5 }), false)
  assert.equal(isFreeItem({}), true)
})

test('shouldHideItem：隐藏开关组合', () => {
  const meal = { type: 'lunch', costCategory: 'paid' }
  const ent = { type: 'attraction', costCategory: 'paid' }
  const free = { type: 'attraction', costCategory: 'free' }
  assert.equal(shouldHideItem(meal, { hideMeals: true }), true)
  assert.equal(shouldHideItem(ent, { hideAttractions: true }), true)
  assert.equal(shouldHideItem(free, { hideFree: true }), true)
  assert.equal(shouldHideItem(ent, {}), false)
})

test('getCityCode：英文名 / 中文名 / 别名链', () => {
  assert.deepEqual(getCityCode('Paris'), { cityCode: 'PAR', countryCode: 'FR' })
  assert.deepEqual(getCityCode('巴黎'), { cityCode: 'PAR', countryCode: 'FR' })
  // 米兰 → Milan → Milano（Cities.xlsx 用本地名）
  const milan = getCityCode('米兰')
  assert.ok(milan && milan.countryCode === 'IT', '米兰应能解析到意大利城市')
  // 中文出发城市
  assert.deepEqual(getCityCode('北京'), { cityCode: 'BJS', countryCode: 'CN' })
  // 未知城市
  assert.equal(getCityCode('不存在的城市XYZ'), null)
})

test('getCityCode：写法变体归一化（Saint-Tropez ↔ Saint Tropez → JSZ）', () => {
  // 表里键是「Saint Tropez」（空格），AI 输出连字符写法
  assert.deepEqual(getCityCode('圣特罗佩', 'Saint-Tropez'), { cityCode: 'JSZ', countryCode: 'FR' })
  assert.deepEqual(getCityCode('Saint-Tropez'), { cityCode: 'JSZ', countryCode: 'FR' })
  // 中文别名路径
  assert.deepEqual(getCityCode('圣特罗佩', ''), { cityCode: 'JSZ', countryCode: 'FR' })
  // 未知城市仍返回 null
  assert.equal(getCityCode('不存在的城市XYZ', 'Some-Nonexistent-City'), null)
})

test('getCityCode：同名城市错配（锡拉库扎=意大利，英文 Syracuse 是美国）', () => {
  // 中文名优先：锡拉库扎 → 意大利 QIC，不会被美国 Syracuse 抢走
  assert.deepEqual(getCityCode('锡拉库扎', 'Syracuse'), { cityCode: 'QIC', countryCode: 'IT' })
  assert.deepEqual(getCityCode('锡拉库萨', 'Syracuse'), { cityCode: 'QIC', countryCode: 'IT' })
  // 热那亚：表里是 Genova，英文 Genoa 走别名
  assert.deepEqual(getCityCode('热那亚', 'Genoa'), { cityCode: 'GOA', countryCode: 'IT' })
  assert.deepEqual(getCityCode('Genoa'), { cityCode: 'GOA', countryCode: 'IT' })
})

test('DEFAULT_QUOS_ORDER 为 12 个码且与标签表一致', () => {
  assert.equal(DEFAULT_QUOS_ORDER.length, 12)
  for (const code of DEFAULT_QUOS_ORDER) {
    assert.ok(QUOS_LABELS[code], `缺少标签: ${code}`)
  }
})
