// 一次性脚本：把 hotel list.xlsx 里缺失的 12 城补进 europe-travel.json（城市骨架，attractions 留空）。
// 运行：node scripts/add-missing-cities.mjs
// 之后重跑 node scripts/build-city-coords.js 同步坐标表。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const file = path.join(root, 'src/data/europe-travel.json')

const travel = JSON.parse(fs.readFileSync(file, 'utf8'))

// id 规则：全小写英文连字符；name 中文；nameEn 英文；lat/lng 坐标；attractions 空数组待后续补
const CITIES = {
  'united-kingdom': [
    { id: 'leeds', name: '利兹', nameEn: 'Leeds', lat: 53.8008, lng: -1.5491, attractions: [] },
    { id: 'stoke-on-trent', name: '特伦特河畔斯托克', nameEn: 'Stoke-on-Trent', lat: 53.0027, lng: -2.1794, attractions: [] },
    { id: 'swindon', name: '斯温顿', nameEn: 'Swindon', lat: 51.5558, lng: -1.7797, attractions: [] },
  ],
  france: [
    { id: 'belfort', name: '贝尔福', nameEn: 'Belfort', lat: 47.6396, lng: 6.8638, attractions: [] },
  ],
  italy: [
    { id: 'parma', name: '帕尔马', nameEn: 'Parma', lat: 44.8015, lng: 10.3279, attractions: [] },
  ],
  germany: [
    { id: 'augsburg', name: '奥格斯堡', nameEn: 'Augsburg', lat: 48.3705, lng: 10.8978, attractions: [] },
  ],
  sweden: [
    { id: 'karlstad', name: '卡尔斯塔德', nameEn: 'Karlstad', lat: 59.4022, lng: 13.5115, attractions: [] },
  ],
  norway: [
    { id: 'voss', name: '沃斯', nameEn: 'Voss', lat: 60.6288, lng: 6.4184, attractions: [] },
    { id: 'kirkenes', name: '希尔克内斯', nameEn: 'Kirkenes', lat: 69.7271, lng: 30.0447, attractions: [] },
  ],
  finland: [
    { id: 'saariselka', name: '萨利色尔卡', nameEn: 'Saariselka', lat: 68.4212, lng: 27.4167, attractions: [] },
    { id: 'levi', name: '列维', nameEn: 'Levi', lat: 67.8038, lng: 24.8037, attractions: [] },
    { id: 'kemi', name: '凯米', nameEn: 'Kemi', lat: 65.7365, lng: 24.5637, attractions: [] },
  ],
}

let added = 0
for (const country of travel.countries) {
  const list = CITIES[country.id]
  if (!list) continue
  const existing = new Set(country.cities.map((c) => c.id))
  for (const city of list) {
    if (existing.has(city.id)) {
      console.log(`skip (already exists): ${city.id}`)
      continue
    }
    country.cities.push(city)
    added++
    console.log(`added: ${country.id}/${city.id} (${city.name})`)
  }
}

fs.writeFileSync(file, JSON.stringify(travel, null, 2) + '\n')
console.log(`\ndone: ${added} cities added -> ${file}`)
