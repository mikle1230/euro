// MTC 合并逻辑单测：连续无 transit 的天 = 一个段 = 只在段首注入一条 THROUGH COACH，
// 且 THROUGH COACH 覆盖区间内的单天市区游览用车（无 from/to 的本地 bus）被合并移除。
// 用法：node scripts/test-coach-plan.mjs
import assert from 'node:assert'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// coach-plan.js 是纯函数 ESM，但项目 package.json 无 "type":"module"，
// 直接 import .js 会被按 CommonJS 解析而报错；临时复制为 .mjs 再导入，读完即删。
const src = readFileSync(new URL('../src/lib/coach-plan.js', import.meta.url), 'utf8')
const tmp = new URL('./_coach-plan.tmp.mjs', import.meta.url)
writeFileSync(tmp, src)
const { applyQuoteRules } = await import(pathToFileURL(tmp.pathname).href)
rmSync(tmp)

function day(n, city, finalCity, items = []) {
  return { id: `d${n}`, dayNumber: n, cityName: city, finalCityName: finalCity, items }
}

// 单天市区游览用车：本地 bus（无 from/to），THROUGH COACH 覆盖期间应被合并移除
function localBus(n) {
  return { id: `bus${n}`, type: 'transport', transportMode: 'bus', name: `第${n}天市区游览用车` }
}

// 输入：第 1–6 天连续同车（每项带市区游览 bus）→ 第 7 天航班 → 第 8–10 天连续同车
const parsed = {
  id: 't1',
  name: 'Test',
  days: [
    day(1, '巴黎', 'Paris', [localBus(1)]),
    day(2, '第戎', 'Dijon', [localBus(2)]),
    day(3, '里昂', 'Lyon', [localBus(3)]),
    day(4, '尼斯', 'Nice', [localBus(4)]),
    day(5, '米兰', 'Milan', [localBus(5)]),
    day(6, '罗马', 'Rome', [localBus(6)]),
    day(7, '巴塞罗那', 'Barcelona', [
      { id: 'f1', type: 'transport', transportMode: 'flight', from: 'Rome', to: 'Barcelona' },
      localBus(7),
    ]),
    day(8, '马德里', 'Madrid', [localBus(8)]),
    day(9, '塞维利亚', 'Seville', [localBus(9)]),
    day(10, '里斯本', 'Lisbon', [localBus(10)]),
  ],
}

const out = applyQuoteRules(parsed)
const all = out.days.flatMap((d) => d.items)
const throughCoaches = all.filter((i) => i.quoteKind === 'through-coach')
const pickups = all.filter((i) => i.quoteKind === 'pickup')
const localBuses = all.filter((i) =>
  i.type === 'transport' && i.transportMode === 'bus' && !(i.from || i.to) && !i.quoteKind)

assert.strictEqual(throughCoaches.length, 2, `期望 2 条 THROUGH COACH，实际 ${throughCoaches.length}`)
assert.strictEqual(pickups.length, 1, `期望 1 条接机 MTC，实际 ${pickups.length}`)
assert.strictEqual(throughCoaches[0].from, 'Paris')
assert.strictEqual(throughCoaches[0].to, 'Rome')
assert.match(throughCoaches[0].notes, /第 1–6 天/)
assert.strictEqual(throughCoaches[1].from, 'Madrid')
assert.strictEqual(throughCoaches[1].to, 'Lisbon')
assert.match(throughCoaches[1].notes, /第 8–10 天/)
assert.strictEqual(localBuses.length, 1, `期望段内市区游览用车被合并、仅剩 transit 天 1 条，实际 ${localBuses.length}`)
assert.strictEqual(localBuses[0].name, '第7天市区游览用车')

console.log('✅ MTC 合并单测通过：2 条 THROUGH COACH + 1 条接机 MTC + 段内市区游览用车已合并（仅剩 transit 天 1 条）')
