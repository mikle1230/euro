// 把额外景点数据合并进 europe-travel.json（占位卡片：id/name/nameEn/type）
// 用法：先准备 scripts/data/extra-attractions.json（{ cityId: [{n,e,t}, ...] }），再 node scripts/merge-attractions.js
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const travelPath = path.join(root, 'src/data/europe-travel.json')

const travel = JSON.parse(fs.readFileSync(travelPath, 'utf8'))
const extra = require('./data/extra-attractions.js')

const existingIds = new Set()
for (const c of travel.countries) {
  for (const city of c.cities) {
    for (const a of (city.attractions || [])) existingIds.add(a.id)
  }
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

let added = 0
const missing = []
for (const c of travel.countries) {
  for (const city of c.cities) {
    const items = extra[city.id]
    if (!items || !items.length) { missing.push(city.id); continue }
    city.attractions = city.attractions || []
    for (const it of items) {
      const base = slug(it.e || it.n)
      let id = `${city.id}-${base}`
      let k = 1
      while (existingIds.has(id)) { id = `${city.id}-${base}-${++k}` }
      existingIds.add(id)
      city.attractions.push({
        id,
        name: it.n,
        nameEn: it.e || '',
        type: ['landmark', 'museum', 'nature'].includes(it.t) ? it.t : 'landmark',
      })
      added++
    }
  }
}

fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2) + '\n')
console.log(`✅ 新增 ${added} 个景点`)
if (missing.length) console.log(`⚠️ 以下城市在 extra 数据里没有（未添加）：${missing.join(', ')}`)
