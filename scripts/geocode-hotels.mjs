// MICE/酒店库：批量地理编码酒店坐标 → src/data/hotel-coords.js
// 本地用法：node scripts/geocode-hotels.mjs   （在你的机器上跑，网络需能访问 nominatim.openstreetmap.org）
// 说明：
//   - 自动收集报价库（hotel-prices.json，用 Booking 名）+ 推荐库（hotel-recommendations.js，用推荐名）的全部酒店；
//   - 逐条查 Nominatim（免费，1 请求/秒礼貌限速），取第一个结果坐标；
//   - 最终写入 src/data/hotel-coords.js（key = `城市码|酒店名`），hotel-map 地图即按此标注每家酒店精确点；
//   - 跑完刷新 /hotels 地图放大到城市即显示酒店点位。未命中(miss)的酒店会列出，可按城市坐标兜底。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const prices = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'hotel-prices.json'), 'utf8'))
const recommend = (await import('../src/data/hotel-recommendations.js')).default

// 收集酒店：报价库用 Booking 名/QUOS 名，推荐库用推荐名
const items = []
const seen = new Set()
for (const [cc, c] of Object.entries(prices)) {
  const city = c.nameEn || c.name
  for (const h of c.hotels) {
    const name = h.bookingName || h.hotel
    const key = `${cc}|${name}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ key, name, city })
  }
}
for (const [slug, c] of Object.entries(recommend)) {
  if (!c?.name) continue
  const cc = c.cityCode || slug
  const city = c.nameEn || c.name
  for (const h of c.hotels || []) {
    if (!h?.name) continue
    const key = `${cc}|${h.name}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ key, name: h.name, city })
  }
}

const UA = 'EuroAtlasHotelMap/1.0 (dev)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const coords = {}
const miss = []

for (let i = 0; i < items.length; i++) {
  const it = items[i]
  const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(`${it.name}, ${it.city}`) + '&format=json&limit=1'
  let got = false
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 429) {
      await sleep(3000)
      const r2 = await fetch(url, { headers: { 'User-Agent': UA } })
      const d2 = await r2.json()
      if (d2[0]?.lat) { coords[it.key] = [+d2[0].lat, +d2[0].lon]; got = true }
    } else {
      const d = await res.json()
      if (d[0]?.lat) { coords[it.key] = [+d[0].lat, +d[0].lon]; got = true }
    }
  } catch (e) { /* 网络/超时，计入 miss */ }
  if (!got) miss.push(it.key)
  if ((i + 1) % 20 === 0) console.log(`  ...${i + 1}/${items.length}`)
  await sleep(1100) // Nominatim 1 req/s
}

const out = `// 酒店坐标表（scripts/geocode-hotels.mjs 从 Nominatim 生成，勿手改）
// key = \`城市码|酒店名\`（报价库用 Booking 名，推荐库用推荐名）
export const HOTEL_COORDS = ${JSON.stringify(coords, null, 2)}
`
fs.writeFileSync(path.join(root, 'src', 'data', 'hotel-coords.js'), out, 'utf8')
console.log(`\n完成：${Object.keys(coords).length}/${items.length} 匹配，miss ${miss.length} 条`)
if (miss.length) console.log('未命中（可人工补/按城市兜底）:', miss.slice(0, 40).join(', '))
