// 从「hotel list.xlsx」生成 src/data/hotel-prices.json（QUOS 报价参考：城市码 → 酒店 → 按月 PP 价）。
// 运行：node scripts/build-hotel-prices.js [xlsx 路径]
//   - 不带参数时用默认路径（用户机器上的工作文件）；
//   - 用户更新 xlsx 后重跑本脚本即可同步，无需手工搬数据。
// 列名自动识别（按表头行匹配，不依赖固定索引，新增列（如「booking名称」）自动读入）：
//   国家中文 | 城市中文 | country | city | hotel(QUOS名) | PP | 月份 | 星级 | booking评分 | booking链接 | [booking名称]
// 输出结构：
//   { cityCode: { countryCode, name, nameEn, hotels: [{ hotel, month, pp, star?, rating?, link?, bookingName? }] } }
//   - nameEn 从 quos-cities.json 按城市码反查；查不到则为空串。
//   - pp 保留字符串原样（如 "50/55.32" 是真实双价格数据，不强行转数字）。
//   - 星级/评分/链接/booking名称 列用户还在填，只有非空才写入。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const XLSX_PATH = process.argv[2] || 'C:/Users/821786/Downloads/Harn/download/hotel list.xlsx'
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

// 列名 → 索引（表头行匹配，忽略空列名/重复列名）
const header = rows[0] || []
const colIdx = {}
header.forEach((h, i) => {
  const name = String(h || '').trim()
  if (name && !(name in colIdx)) colIdx[name] = i
})
// 别名：booking名称 列可能有多种叫法
const resolveCol = (...names) => {
  for (const n of names) if (n in colIdx) return colIdx[n]
  return -1
}
const iCountry = colIdx['country']
const iCityCode = colIdx['city']
const iHotel = colIdx['hotel']
const iPp = colIdx['PP']
const iMonth = colIdx['月份']
const iStar = colIdx['星级']
const iRating = resolveCol('booking评分', '评分', 'Booking评分')
const iLink = resolveCol('booking链接', '链接', 'Booking链接')
const iBookingName = resolveCol('booking名称', 'Booking名称', 'BookingName', 'booking name')

const data = rows.slice(1).filter((r) => r[0] && r[iCityCode] && r[iHotel])

const out = {}
for (const r of data) {
  const countryCode = r[iCountry]
  const cityCode = String(r[iCityCode]).trim().toUpperCase()
  const cityZh = r[1]
  const hotelName = String(r[iHotel]).trim() // xlsx 偶有尾随空格，trim 后与补充表 key 对齐
  const entry = (out[cityCode] ||= {
    countryCode,
    name: cityZh,
    nameEn: codeToEn.get(cityCode) || '',
    hotels: [],
  })
  entry.countryCode = entry.countryCode || countryCode
  const hotelEntry = { hotel: hotelName, month: r[iMonth], pp: String(r[iPp]) }
  if (iStar >= 0 && r[iStar]) hotelEntry.star = r[iStar]
  if (iRating >= 0 && r[iRating]) hotelEntry.rating = r[iRating]
  if (iLink >= 0 && r[iLink]) hotelEntry.link = r[iLink]
  if (iBookingName >= 0 && r[iBookingName]) hotelEntry.bookingName = String(r[iBookingName]).trim()
  entry.hotels.push(hotelEntry)
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`done: ${Object.keys(out).length} cities, ${data.length} rows -> ${OUT}`)
