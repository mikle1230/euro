// LDC 长途车供应商判定测试
// 运行：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveLdcSupplier, hasArcticCity, SUPPLIERS, KNOWN_COUNTRY_CODES, ER_RULES, matchFixedEr } from '../../src/lib/ldc-mapping.js'

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

test('含波兰（Michael 口径 2026-09-17）：同行含中欧国 → CZ PRG；其余一律 null（人工处理）', () => {
  assert.equal(resolveLdcSupplier(['PL', 'CZ']).supplierCode, 'CZ PRG')
  assert.equal(resolveLdcSupplier(['PL', 'HU']).supplierCode, 'CZ PRG')
  assert.equal(resolveLdcSupplier(['PL']), null, '波兰一地 → 判不出，人工处理')
  assert.equal(resolveLdcSupplier(['PL', 'EE', 'LT', 'LV']), null, '波兰+波罗的海 → 判不出')
  assert.equal(resolveLdcSupplier(['DE', 'PL']), null, '波兰+德国（无西欧主体）→ 判不出')
})

test('其余西欧多国统一 IT ROM', () => {
  assert.equal(resolveLdcSupplier(['FR', 'IT', 'DE', 'CH']).supplierCode, 'IT ROM')
})

test('德国三档（Michael 口径 2026-09-17）：德国一地 DE BER；带西欧 → IT ROM；无西欧 → 问 LDC(null)', () => {
  // ① 德国一地 → DE BER
  assert.equal(resolveLdcSupplier(['DE']).supplierCode, 'DE BER')
  // ② 主体西欧 + 带德国 → 西欧车 IT ROM
  assert.equal(resolveLdcSupplier(['FR', 'IT', 'DE', 'CH']).supplierCode, 'IT ROM')
  assert.equal(resolveLdcSupplier(['FR', 'DE']).supplierCode, 'IT ROM')
  assert.equal(resolveLdcSupplier(['DE', 'AT', 'CH']).supplierCode, 'IT ROM', 'DE+AT+CH：含西欧核心 CH → IT ROM')
  // ③ 完全没西欧 + 带德国 → 无法判定，返回 null（问 LDC）
  assert.equal(resolveLdcSupplier(['DE', 'AT']), null, '旧「DE+AT → DE BER」已作废，现归③问 LDC')
  assert.equal(resolveLdcSupplier(['DE', 'SE', 'DK']), null, '德国+北欧：无西欧主体 → 问 LDC')
  // 纯奥地利（无德国）→ 保持中欧 CZ PRG
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

// ── 固定金额型 ER（A-4 / A-5，2026-09-17）：金额与币种照抄 LDC 表，未命中返回 null ──
const pairHit = (key, from, to) => matchFixedEr(ER_RULES[key], { fromCode: from, toCode: to })
const hasBothWays = (key, a, b) => !!pairHit(key, a, b) && !!pairHit(key, b, a)

test('固定金额型 ER：瑞士 Mono 450 CHF（城市对双向都有，金额/币种照抄表）', () => {
  for (const [a, b] of [['ZRH', 'SMR'], ['GVA', 'TAC'], ['GVA', 'ZRH'], ['ZRH', 'TAC'], ['SMR', 'TAC'], ['GVA', 'LUZ']]) {
    assert.ok(hasBothWays('switzerlandMono', a, b), `${a}-${b} 应双向命中`)
  }
  const hit = pairHit('switzerlandMono', 'ZRH', 'SMR')
  assert.equal(hit.price, 450)
  assert.equal(hit.currency, 'CHF')
  assert.ok(hit.note.includes('ZRH-SMR'), 'note 应写出处（表内城市对）')
  assert.equal(pairHit('switzerlandMono', 'ZRH', 'SMR').price, pairHit('switzerlandMono', 'SMR', 'ZRH').price, 'A→B 与 B→A 金额一致')
  // 表内未列出的对 → 不命中（退回原行为）；GVA-GVA/ZRH-ZRH 表内明确无 ER
  assert.equal(pairHit('switzerlandMono', 'ZRH', 'LUZ'), null)
  assert.equal(pairHit('switzerlandMono', 'ZRH', 'ZRH'), null)
  assert.equal(pairHit('switzerlandMono', 'GVA', 'GVA'), null)
})

test('固定金额型 ER：Scandi 厄勒大桥特殊线路 770 EUR（CPH-OSL / CPH-STO / CPH-BGO 双向）', () => {
  for (const other of ['OSL', 'STO', 'BGO']) {
    assert.ok(hasBothWays('scandinavia', 'CPH', other), `CPH-${other} 应双向命中`)
  }
  assert.equal(pairHit('scandinavia', 'CPH', 'OSL').price, 770)
  assert.equal(pairHit('scandinavia', 'OSL', 'CPH').currency, 'EUR')
  assert.equal(pairHit('scandinavia', 'STO', 'CPH').price, 770, '反向也是 770')
  assert.equal(pairHit('scandinavia', 'CPH', 'BGO').price, 770)
  assert.equal(pairHit('scandinavia', 'STO', 'OSL'), null, '表内未列出的线路 → 不命中（走次数阶梯）')
  assert.equal(ER_RULES.scandinavia.type, 'count', '命中固定对之外仍保留次数阶梯（type 不变）')
})

test('固定金额型 ER：拉普兰 900 / 1000（双向；Kiruna 同城对）', () => {
  assert.equal(pairHit('finlandNorthMono', 'RVN', 'ALF').price, 900)
  assert.equal(pairHit('finlandNorthMono', 'ALF', 'RVN').price, 900, 'Rovaniemi-Alta 反向同为 900')
  assert.equal(pairHit('finlandNorthMono', 'RVN', 'TOS').price, 1000)
  assert.equal(pairHit('finlandNorthMono', 'TOS', 'RVN').price, 1000, 'Rovaniemi-Tromsø 反向同为 1000')
  assert.equal(pairHit('finlandNorthMono', 'KRN', 'KRN').price, 1000, 'Kiruna-Kiruna 同城固定 1000')
  assert.equal(pairHit('finlandNorthMono', 'RVN', 'ALF').currency, 'EUR')
  assert.equal(pairHit('finlandNorthMono', 'KRN', 'KRN').currency, 'EUR')
  assert.equal(pairHit('finlandNorthMono', 'RVN', 'IVL'), null)
})

test('固定金额型 ER：Benelux PAR-AMS 550 / PAR-BRU 450（双向）+ 例外 BCN-BCN 630 EUR / LON-LON 700 GBP', () => {
  assert.ok(hasBothWays('benelux', 'PAR', 'AMS'), 'PAR-AMS 应双向命中')
  assert.ok(hasBothWays('benelux', 'PAR', 'BRU'), 'PAR-BRU 应双向命中')
  assert.equal(pairHit('benelux', 'PAR', 'AMS').price, 550)
  assert.equal(pairHit('benelux', 'AMS', 'PAR').price, 550)
  assert.equal(pairHit('benelux', 'PAR', 'AMS').currency, 'EUR')
  assert.equal(pairHit('benelux', 'PAR', 'BRU').price, 450)
  assert.equal(pairHit('benelux', 'BRU', 'PAR').price, 450)
  assert.equal(pairHit('benelux', 'BRU', 'AMS'), null, '表内只给 PAR-AMS / PAR-BRU 两对')
  // 例外（Michael 2026-09-17）：巴塞罗那起止 630 EUR、伦敦起止 700 GBP
  assert.equal(pairHit('iberia', 'BCN', 'BCN').price, 630)
  assert.equal(pairHit('iberia', 'BCN', 'BCN').currency, 'EUR')
  assert.equal(pairHit('iberia', 'BCN', 'MAD'), null)
  assert.equal(pairHit('uk', 'LON', 'LON').price, 700)
  assert.equal(pairHit('uk', 'LON', 'LON').currency, 'GBP')
  assert.equal(pairHit('uk', 'LON', 'EDI'), null)
})

test('固定金额型 ER：西西里按 live days 命中（2 天 = 450 EUR；3 天及以上无空驶）', () => {
  assert.equal(ER_RULES.sicilyMono.type, 'fixed')
  const hit = matchFixedEr(ER_RULES.sicilyMono, { liveDays: 2 })
  assert.equal(hit.price, 450)
  assert.equal(hit.currency, 'EUR')
  assert.equal(matchFixedEr(ER_RULES.sicilyMono, { liveDays: 3 }), null, '≥3 live days 无空驶')
  assert.equal(matchFixedEr(ER_RULES.sicilyMono, {}), null, '拿不到 live days → 不命中（行为不变）')
})

test('固定金额型 ER：缺城市码/无 fixed 配置 → 返回 null（不改变原行为）', () => {
  assert.equal(matchFixedEr(ER_RULES.switzerlandMono, {}), null)
  assert.equal(matchFixedEr(ER_RULES.switzerlandMono, { fromCode: 'ZRH' }), null, '只给一端不命中')
  assert.equal(matchFixedEr(ER_RULES.portugalMono, { fromCode: 'LIS', toCode: 'LIS' }), null, '无 fixed 配置的区域返回 null')
  assert.equal(matchFixedEr(null, { fromCode: 'ZRH', toCode: 'SMR' }), null)
})
