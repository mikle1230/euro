// 从 europe-travel.json 提炼「城市坐标表」→ src/data/city-coords.js
// 用途：coach-plan 计算 THROUGH COACH 的 EMPTY RUN 空驶公里数（首城 → 末城车程估算）。
// 运行：node scripts/build-city-coords.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const travelData = JSON.parse(fs.readFileSync(path.join(root, 'src/data/europe-travel.json'), 'utf8'))

// europe-travel.json 未覆盖的行程常用城市 → 手动补充坐标（lat, lng）
const MANUAL = {
  瓦朗索勒: [43.84, 5.983],
  圣特罗佩: [43.27, 6.639],
  奇维塔维基亚: [42.0922, 11.7924],
  阿尔贝罗贝洛: [40.7861, 17.237],
  波西塔诺: [40.628, 14.485],
  阿格里真托: [37.3111, 13.5765],
  锡拉库扎: [37.0755, 15.2866],
  陶尔米纳: [37.852, 15.288],
  苏莲托: [40.6263, 14.3757],
  卡塔尼亚: [37.5022, 15.0873],
  卡普里岛: [40.5532, 14.2222],
  切法卢: [38.0396, 14.0229],
  诺托: [36.8927, 15.0706],
  五渔村: [44.1069, 9.7287],
  上海: [31.2304, 121.4737],
}

// 同城别名 → 中文/英文主名（查询键用）
const ALIASES = {
  圣特罗佩: 'Saint-Tropez',
  锡拉库扎: 'Siracusa',
  锡拉库萨: 'Siracusa',
  苏莲托: 'Sorrento',
  瓦朗索勒: 'Valensole',
}

const map = {}
const put = (key, lat, lng) => {
  if (!key) return
  if (!(key in map)) map[key] = [lat, lng]
}

for (const cc of travelData.countries) {
  for (const c of cc.cities) {
    if (c.lat == null || c.lng == null) continue
    put(c.name, c.lat, c.lng)
    put(c.nameEn, c.lat, c.lng)
  }
}
for (const [zh, en] of Object.entries(ALIASES)) {
  if (map[en]) put(zh, map[en][0], map[en][1])
}
for (const [k, [lat, lng]] of Object.entries(MANUAL)) put(k, lat, lng)

const lines = []
lines.push('// 自动生成：scripts/build-city-coords.js —— 勿手改')
lines.push('// 城市坐标表（europe-travel.json + 手动补充），coach-plan 算 EMPTY RUN 空驶公里数用')
lines.push('export default {')
for (const k of Object.keys(map).sort()) {
  lines.push(`  ${JSON.stringify(k)}: [${map[k][0]}, ${map[k][1]}],`)
}
lines.push('}')
fs.writeFileSync(path.join(root, 'src/data/city-coords.js'), lines.join('\n') + '\n')
console.log('done:', Object.keys(map).length, 'keys')
