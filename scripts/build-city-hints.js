// 从 quos-cities.json 提炼「常用城市 QUOS 码表」→ src/data/city-hints.js
// 用途：SYSTEM_PROMPT 附带该表，让 AI 直接输出 day.cityCode/countryCode，
// 避免仅靠中/英文名匹配（小城市、异名翻译）失败。
// 运行：node scripts/build-city-hints.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import curatedCities from './curated-cities.cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const quosCities = JSON.parse(fs.readFileSync(path.join(root, 'src/data/quos-cities.json'), 'utf8'))

// 别名链（与 src/lib/quos-mapping.js 的 CITY_ALIASES 保持一致的思路）
const ALIASES = {
  'Milan': 'Milano', 'Munich': 'Munchen', 'Cologne': 'Koln', 'Copenhagen': 'Kobenhavn',
  'Rome': 'Roma', 'Venice': 'Venezia', 'Florence': 'Firenze', 'Naples': 'Napoli',
  'Turin': 'Torino', 'Geneva': 'Genf', 'Lucerne': 'Luzern',
  'Vienna': 'Wien', 'Prague': 'Praha', 'Warsaw': 'Warszawa',
  'The Hague': 'Den Haag', 'Antwerp': 'Antwerpen', 'Ghent': 'Gent',
  'Brussels': 'Bruxelles', 'Bruges': 'Brugge',
  'Seville': 'Sevilla', 'Cordoba': 'Cordoba', 'Malaga': 'Malaga', 'Malmö': 'Malmo',
  'Gothenburg': 'Goteborg',
  'Pompeii': 'Pompei', 'Genoa': 'Genova', 'Dusseldorf': 'Dusseldorf',
  'Nuremberg': 'Nurnberg', 'Tromso': 'Tromsoe', 'Alesund': 'Aalesund',
  'Frankfurt': 'Frankfurt am Main', 'Mont Saint Michel': 'Mont-St-Michel',
  'Monaco': 'Monaco', 'Cinque Terre': 'Cinque Terre',
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

function lookup(name) {
  if (!name) return null
  const direct = quosCities[name]
  if (direct) return direct
  const alias = ALIASES[name]
  if (alias && quosCities[alias]) return quosCities[alias]
  // 模糊匹配（去符号转小写）
  const target = norm(name)
  if (target) {
    const hit = Object.keys(quosCities).find((k) => norm(k) === target)
    if (hit) return quosCities[hit]
  }
  return null
}


const hints = []
const missing = []
for (const [cn, en] of curatedCities) {
  const hit = lookup(en) || lookup(cn)
  if (hit) {
    hints.push({ cn, en, cityCode: hit.cityCode, countryCode: hit.countryCode })
  } else {
    missing.push(`${cn}/${en}`)
  }
}

hints.sort((a, b) => a.countryCode.localeCompare(b.countryCode) || a.en.localeCompare(b.en))

const out = `// 自动生成：scripts/build-city-hints.js —— 勿手改
// 常用欧洲城市 QUOS 码表（来自 src/data/quos-cities.json）
// 用途：SYSTEM_PROMPT 附此表，AI 解析时直接输出 day.cityCode/countryCode
export const CITY_HINTS = ${JSON.stringify(hints, null, 2)}
`

fs.writeFileSync(path.join(root, 'src/data/city-hints.js'), out)
console.log(`✅ 生成 src/data/city-hints.js：${hints.length} 个城市`)
if (missing.length) {
  console.log(`⚠️ 未匹配 ${missing.length} 个（已跳过）：\n  ${missing.join('\n  ')}`)
}
