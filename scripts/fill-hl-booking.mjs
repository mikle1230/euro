// 汇总 subagent 搜索的 hotel list Booking 名/链接，回填到 hotel list.xlsx
// F 列（索引5 ="hotel name on Booking.com"）、K 列（索引10 ="booking链接"）
// 运行：node scripts/fill-hl-booking.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const XLSX_PATH = 'C:/Users/821786/Downloads/Harn/download/hotel list.xlsx'
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// 1) 汇总各组结果（组文件与脚本同目录 scripts/）
const results = []
for (const f of ['hl-results-group1.json', 'hl-results-group2.json', 'hl-results-group3.json', 'hl-results-group4.json', 'hl-results-group5.json']) {
  const p = path.join(__dirname, f)
  if (fs.existsSync(p)) results.push(...JSON.parse(fs.readFileSync(p, 'utf8')))
}
const map = new Map() // key: cityCode|normHotel -> { name, link }
for (const r of results) {
  const key = String(r.cityCode || '').toUpperCase() + '|' + norm(r.hotel)
  if (!map.has(key)) map.set(key, { name: r.name || '', link: r.link || '', note: r.note || '' })
}
console.log('汇总条目:', map.size)

// 2) 打开 xlsx 回填
const wb = XLSX.readFile(XLSX_PATH)
const ws = wb.Sheets['Hotel 酒店']
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
let filled = 0, unmatched = 0
const unmatchedList = []
for (let i = 1; i < rows.length; i++) {
  const r = rows[i]
  if (!r[0] || !r[3] || !r[4]) continue
  const cc = String(r[3]).trim().toUpperCase()
  // 匹配：先按 QUOS 名（row[4]），再按 F 列 Booking 名（row[5]，组5 用的是 Booking 名）
  const hit = map.get(cc + '|' + norm(r[4])) || map.get(cc + '|' + norm(r[5]))
  if (hit) {
    if (hit.name && !String(r[5] || '').trim()) r[5] = hit.name // F 列：名称（已有不覆盖）
    if (hit.link && !String(r[10] || '').trim()) r[10] = hit.link // K 列：链接（已有不覆盖）
    filled++
  } else {
    unmatchedList.push(r[1] + '/' + r[4])
    unmatched++
  }
}
// 3) 写回（aoa_to_sheet 需要数组，writeFile 会丢失样式，但 F/K 列数据保留）
const newWs = XLSX.utils.aoa_to_sheet(rows)
wb.Sheets['Hotel 酒店'] = newWs
XLSX.writeFile(wb, XLSX_PATH)
console.log('回填成功:', filled, '| 未匹配:', unmatched)
if (unmatchedList.length) console.log('未匹配列表:', unmatchedList.slice(0, 20).join('; '))
