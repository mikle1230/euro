// 图片资产一致性测试：
// 国家封面图必须同时满足「磁盘上有文件」+「在 country-images.js 注册」，
// 否则页面不会显示封面图（历史上 andorra/liechtenstein/moldova 就因此漏显示）。
// 另检查城市/景点图文件名是否为数据中的合法 id（小写）。
// 运行：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, basename, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')

const travel = JSON.parse(readFileSync(join(ROOT, 'src/data/europe-travel.json'), 'utf8'))

// country-images.js 是静态 import 表：解析出已注册的国家 id
function registeredCountryImages() {
  const src = readFileSync(join(ROOT, 'src/data/country-images.js'), 'utf8')
  // 取 COUNTRY_IMAGES 对象体，收集 key（含 'czech-republic': x 与 austria, 两种写法）
  const body = src.slice(src.indexOf('export const COUNTRY_IMAGES'))
  const keys = new Set()
  for (const m of body.matchAll(/^\s*'([a-z-]+)'\s*:/gm)) keys.add(m[1])
  for (const m of body.matchAll(/^\s*([a-z][a-z-]*)\s*,\s*$/gm)) keys.add(m[1])
  return keys
}

test('国家封面图：磁盘有图的国家必须在 country-images.js 注册', () => {
  const registered = registeredCountryImages()
  const dir = join(ROOT, 'public/images/countries')
  const missing = []
  for (const c of travel.countries) {
    const file = join(dir, `${c.id}.jpg`)
    if (!existsSync(file)) continue // 没图不算错（会走占位图）
    if (!registered.has(c.id)) missing.push(c.id)
  }
  assert.deepEqual(
    missing,
    [],
    `以下国家有封面图文件但未在 country-images.js 注册（页面不会显示）：${missing.join(', ')}`,
  )
})

test('国家封面图：已注册的 id 都能在数据里找到', () => {
  const registered = registeredCountryImages()
  const ids = new Set(travel.countries.map((c) => c.id))
  const orphans = [...registered].filter((id) => !ids.has(id))
  assert.deepEqual(orphans, [], `country-images.js 注册了数据里不存在的国家：${orphans.join(', ')}`)
})

test('城市图文件名必须是数据中的合法城市 id（全小写）', () => {
  const validIds = new Set()
  for (const c of travel.countries) for (const city of c.cities || []) validIds.add(city.id)
  const dir = join(ROOT, 'public/images/cities')
  if (!existsSync(dir)) return
  const bad = []
  for (const name of readdirSync(dir)) {
    const ext = extname(name)
    if (!/\.(jpe?g|png|webp|gif)$/i.test(ext)) continue
    const id = basename(name, ext)
    if (id.startsWith('.') || id.startsWith('__')) continue
    if (!validIds.has(id)) bad.push(name)
  }
  assert.deepEqual(bad, [], `以下城市图文件名不是合法城市 id：${bad.join(', ')}`)
})

test('景点图文件名必须是数据中的合法景点 id（全小写）', () => {
  const validIds = new Set()
  for (const c of travel.countries) {
    for (const city of c.cities || []) {
      for (const a of city.attractions || []) validIds.add(a.id)
    }
  }
  const dir = join(ROOT, 'public/images/attractions')
  if (!existsSync(dir)) return
  const bad = []
  for (const name of readdirSync(dir)) {
    const ext = extname(name)
    if (!/\.(jpe?g|png|webp|gif)$/i.test(ext)) continue
    const id = basename(name, ext)
    if (id.startsWith('.') || id.startsWith('__')) continue
    if (!validIds.has(id)) bad.push(name)
  }
  assert.deepEqual(bad, [], `以下景点图文件名不是合法景点 id：${bad.join(', ')}`)
})
