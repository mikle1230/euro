// LDC 长途车供应商判定测试
// 运行：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveLdcSupplier, hasArcticCity, SUPPLIERS, KNOWN_COUNTRY_CODES, ER_RULES } from '../../src/lib/ldc-mapping.js'

test('单国 → 对应 Mono/区域供应商', () => {
  assert.equal(resolveLdcSupplier(['FR']).supplierCode, 'FR PAR')
  assert.equal(resolveLdcSupplier(['IT']).supplierCode, 'IT ROM')
  assert.equal(resolveLdcSupplier(['CH']).supplierCode, 'CH ZRH')
  assert.equal(resolveLdcSupplier(['DE']).supplierCode, 'DE BER')
  assert.equal(resolveLdcSupplier(['PT']).supplierCode, 'PT LIS')
  assert.equal(resolveLdcSupplier(['GB']).supplierCode, 'GB LON')
})

test('伊比利亚：纯葡萄牙 → PT LIS；碰到西班牙 → ES MAD', () => {
  assert.equal(resolveLdcSupplier(['PT']).supplierCode, 'PT LIS')
  assert.equal(resolveLdcSupplier(['ES']).supplierCode, 'ES MAD')
  assert.equal(resolveLdcSupplier(['ES', 'PT']).supplierCode, 'ES MAD')
})

test('多国：荷比卢 / 中欧 / 斯堪的纳维亚 / 英国 优先', () => {
  assert.equal(resolveLdcSupplier(['NL', 'BE']).supplierCode, 'NL AMS')
  assert.equal(resolveLdcSupplier(['HU', 'CZ', 'SK', 'AT']).supplierCode, 'CZ PRG')
  assert.equal(resolveLdcSupplier(['NO', 'SE', 'DK']).supplierCode, 'SE STO')
  assert.equal(resolveLdcSupplier(['GB', 'IE']).supplierCode, 'GB LON')
  assert.equal(resolveLdcSupplier(['EE', 'LT', 'LV']).supplierCode, 'LT VNO')
})

test('其余西欧多国统一 IT ROM', () => {
  assert.equal(resolveLdcSupplier(['FR', 'IT', 'DE', 'CH']).supplierCode, 'IT ROM')
})

test('德奥组合 → DE BER（柏林车），绝不落入 IT ROM（KT 实操校准 2026-08-21）', () => {
  assert.equal(resolveLdcSupplier(['DE', 'AT']).supplierCode, 'DE BER')
  assert.equal(resolveLdcSupplier(['DE', 'AT']).fullSelectionName, 'DE BER Through Coach (NGS)')
  assert.equal(resolveLdcSupplier(['DE', 'AT', 'CH']).supplierCode, 'DE BER', '德奥含瑞士 → 仍 DE BER')
  // 纯奥地利（无德国）→ 保持中欧 CZ PRG；纯德国 → 已单国 DE BER
  assert.equal(resolveLdcSupplier(['AT']).supplierCode, 'CZ PRG')
})

test('挪威/芬兰：北极极地城市 → 北，常规 → 南', () => {
  assert.equal(resolveLdcSupplier(['NO'], { arctic: false }).supplierCode, 'NO OSL')
  assert.equal(resolveLdcSupplier(['NO'], { arctic: true }).supplierCode, 'NO ALT')
  assert.equal(resolveLdcSupplier(['FI'], { arctic: true }).supplierCode, 'FI ROV')
  assert.equal(resolveLdcSupplier(['FI'], { arctic: false }).supplierCode, 'FI HEL')
})

test('hasArcticCity 命中北极极地城市（中英文）', () => {
  assert.equal(hasArcticCity(['特罗姆瑟', '奥斯陆']), true)
  assert.equal(hasArcticCity(['Tromso']), true)
  assert.equal(hasArcticCity(['罗瓦涅米']), true)
  assert.equal(hasArcticCity(['赫尔辛基', '奥斯陆']), false)
  assert.equal(hasArcticCity([]), false)
})

test('空国家列表 → null', () => {
  assert.equal(resolveLdcSupplier([]), null)
  assert.equal(resolveLdcSupplier(['XX']), null)
})

test('PRE/POST 前后夜费率按官方 LDC 表逐区域配置', () => {
  assert.equal(resolveLdcSupplier(['FR', 'IT']).prepost, '€120') // 西欧
  assert.equal(resolveLdcSupplier(['NL', 'BE']).prepost, '€135') // 荷比卢
  assert.equal(resolveLdcSupplier(['NO', 'SE', 'DK']).prepost, '€148') // 斯堪的纳维亚
  assert.equal(resolveLdcSupplier(['GB']).prepost, '£110') // 英国
  assert.equal(resolveLdcSupplier(['CH']).prepost, 'CHF 130') // 瑞士
  assert.equal(resolveLdcSupplier(['DK']).prepost, 'DKK 1200') // 丹麦
  assert.equal(resolveLdcSupplier(['SE']).prepost, 'SEK 1340') // 瑞典
  assert.equal(resolveLdcSupplier(['NO'], { arctic: true }).prepost, 'NOK 1750') // 挪威北
  assert.equal(resolveLdcSupplier(['FI'], { arctic: true }).prepost, '€146') // 芬兰北
  assert.equal(resolveLdcSupplier(['FI']).prepost, '€151') // 芬兰南
})

test('芬兰北部 NGS：ON REQUEST 条目存在且费率齐备', () => {
  const ngs = SUPPLIERS.finlandNorthNgs
  assert.ok(ngs, 'finlandNorthNgs 条目应存在')
  assert.equal(ngs.supplierCode, 'FI ROV')
  assert.equal(ngs.vehicleType, 'NGS')
  assert.equal(ngs.dailyRate, null)
  assert.ok(ngs.note.includes('ON REQUEST'))
  assert.equal(ngs.prepost, '€146')
})

// A1（2026-09-09）：冰岛 LDC 支持 —— IS → TEITUR (LDC)，SBA 阿克雷里邮轮仅注释挂账（euro 无邮轮字段，不做自动分派）
test('冰岛单国 → TEITUR (LDC)（A1）', () => {
  assert.ok(KNOWN_COUNTRY_CODES.has('IS'), 'KNOWN_COUNTRY_CODES 应含 IS')
  const s = resolveLdcSupplier(['IS'])
  assert.equal(s.supplierCode, 'IS REK')
  assert.equal(s.fullSelectionName, 'TEITUR (LDC) - Reykjavik')
  assert.equal(s.vehicleType, 'LDC')
  assert.equal(s.symbol, 'ISK')
  assert.equal(s.dailyRate, null, 'TEITUR 打包价（3天54,222/4天72,297 ISK）作参考价入 note，不设固定日费率')
  assert.equal(s.prepost, null, '冰岛 PRE/POST 无官方数')
  assert.ok(s.note.includes('TEITUR'), 'note 应含 TEITUR 参考价')
  assert.ok(s.note.includes('SBA'), 'SBA 阿克雷里邮轮边界应写进 note（仅挂账，不自动分派）')
})

test('冰岛 ER：表外 none 型（ER/空驶待 A3 校准统一处理）', () => {
  assert.equal(ER_RULES.icelandMono.type, 'none')
  assert.ok(ER_RULES.icelandMono.note.length > 0)
})
