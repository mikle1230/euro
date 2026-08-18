// 从「hotel list.xlsx」生成 src/data/hotel-prices.json（QUOS 报价参考：城市码 → 酒店 → 按月 PP 价）。
// 运行：node scripts/build-hotel-prices.js [xlsx 路径]
//   - 不带参数时用默认路径（用户机器上的工作文件）；
//   - 用户更新 xlsx 后重跑本脚本即可同步，无需手工搬数据。
// 输出结构：
//   { "MIL": { countryCode, name, nameEn, hotels: [{ hotel, month, pp, star?, rating?, link? }] } }
//   - nameEn 从 quos-cities.json 按城市码反查；查不到则为空串。
//   - pp 保留字符串原样（如 "50/55.32" 是真实双价格数据，不强行转数字）。
//   - 星级/评分/链接列目前用户还在填，只有非空才写入。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const XLSX_PATH = process.argv[2] || 'C:/Users/821786/Downloads/Harn/hotel list.xlsx'
const SHEET = 'Hotel 酒店'
const OUT = path.join(root, 'src/data/hotel-prices.json')

// cityCode -> 英文名（取 quos-cities.json 第一个纯英文键，避免中文键/变体键）
const quos = JSON.parse(fs.readFileSync(path.join(root, 'src/data/quos-cities.json'), 'utf8'))
const codeToEn = new Map()
for (const [k, v] of Object.entries(quos)) {
  if (/^[A-Za-z .\-\u00C0-\u024F']+$/.test(k) && !codeToEn.has(v.cityCode)) codeToEn.set(v.cityCode, k)
}

if (!fs.existsSync(XLSX_PATH)) {
  console.error(`xlsx not found: ${XLSX_PATH}`)
  console.error('usage: node scripts/build-hotel-prices.js [path-to-hotel-list.xlsx]')
  process.exit(1)
}

const wb = XLSX.readFile(XLSX_PATH)
const ws = wb.Sheets[SHEET]
if (!ws) {
  console.error(`sheet not found: ${SHEET}`)
  process.exit(1)
}
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
// 列：0 国家中文 | 1 城市中文 | 2 country | 3 city | 4 hotel | 5 PP | 6 月份 | 7 星级 | 8 评分 | 9 链接
const data = rows.slice(1).filter((r) => r[0] && r[3] && r[4])

const out = {}
for (const r of data) {
  const [countryZh, cityZh, countryCode, cityCode, hotel, pp, month, star, rating, link] = r
  const entry = (out[cityCode] ||= {
    countryCode,
    name: cityZh,
    nameEn: codeToEn.get(cityCode) || '',
    hotels: [],
  })
  entry.countryCode = entry.countryCode || countryCode
  const hotelEntry = { hotel, month, pp: String(pp) }
  if (star) hotelEntry.star = star
  if (rating) hotelEntry.rating = rating
  if (link) hotelEntry.link = link
  entry.hotels.push(hotelEntry)
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`done: ${Object.keys(out).length} cities, ${data.length} rows -> ${OUT}`)
