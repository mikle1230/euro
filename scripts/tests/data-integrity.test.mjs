// 数据完整性守卫：城市 / 景点 id 必须全局唯一。
//
// 为什么需要：src/lib/data.js 的 buildIndexes() 用
//   cityIndex.set(city.id, ...) / attractionIndex.set(attr.id, ...)
// 建索引，重复 id 会被后一条静默覆盖——先出现的那条永远取不到，
// 按 URL 访问还会张冠李戴（例：france/toulouse 的景点曾渲染 italy/florence 的内容）。
// 2026-09-19 修复过一批重复 id，这里拦住复发。
// 运行：npm test —— 纯读 JSON，不联网。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const travel = JSON.parse(readFileSync(join(ROOT, 'src/data/europe-travel.json'), 'utf8'))

const cityOwners = new Map() // city id -> ["country/city name", ...]
const attrOwners = new Map() // attraction id -> ["country/city", ...]

for (const country of travel.countries) {
  for (const city of country.cities || []) {
    cityOwners.set(city.id, [...(cityOwners.get(city.id) || []), `${country.id}/${city.name}`])
    for (const a of city.attractions || []) {
      attrOwners.set(a.id, [...(attrOwners.get(a.id) || []), `${country.id}/${city.id}`])
    }
  }
}

function duplicates(map) {
  return [...map.entries()].filter(([, where]) => where.length > 1)
}

test('europe-travel.json：城市 id 全局唯一', () => {
  assert.deepEqual(
    duplicates(cityOwners),
    [],
    '城市 id 重复会让后一条静默覆盖前一条（buildIndexes 的 Map.set）',
  )
})

test('europe-travel.json：景点 id 全局唯一', () => {
  assert.deepEqual(
    duplicates(attrOwners),
    [],
    '景点 id 重复会让后一条静默覆盖前一条，且按 URL 访问会渲染另一座城的内容',
  )
})
