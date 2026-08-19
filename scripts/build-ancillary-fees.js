// 从「2025 Onwards Refundable List Ancillary Internal use - quotable.xlsx」提取全部杂费价目
// → src/data/ancillary-fees.js（**参考表**：可退停车/许可费等，供人工查询/核对；
// 实际注入 daily-fees.js 的金额以行程确认为准——用户口径 2026-08-18）。
// 运行：node scripts/build-ancillary-fees.js [xlsx 路径]
// 结构：[{ region, city, cityCode, desc, rate, currency, remark }]（按 region/city 排序）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const XLSX_PATH = process.argv[2] || 'C:/Users/821786/Downloads/Harn/2025 Onwards Refundable List Ancillary Internal use - quotable.xlsx'
const OUT = path.join(root, 'src/data/ancillary-fees.js')

// 城市码反查（复用 quos-cities；机场码/别名不做，仅英文/中文名精确+归一化）
import quosCities from '../src/data/quos-cities.json' with { type: 'json' }
const norm = (s) => String(s || '').toLowerCase().replace(/[\s\-'.]+/g, '')
const normIndex = new Map()
for (const [k, v] of Object.entries(quosCities)) {
  const n = norm(k)
  if (!normIndex.has(n)) normIndex.set(n, v)
}
const codeOf = (name) => {
  if (!name) return ''
  const exact = quosCities[name]
  if (exact) return exact.cityCode || ''
  return normIndex.get(norm(name))?.cityCode || ''
}

if (!fs.existsSync(XLSX_PATH)) {
  console.error(`xlsx not found: ${XLSX_PATH}`)
  process.exit(1)
}

const wb = XLSX.readFile(XLSX_PATH)
const out = []
for (const sheetName of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
  // 定位表头行（CITY | DESCRIPTION | RATE | CURR）
  let headerIdx = -1
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = rows[i]
    if (/^(CITY|City)/.test(String(r[0] || '').trim()) && /RATE/i.test(String(r[2] || ''))) { headerIdx = i; break }
  }
  const start = headerIdx >= 0 ? headerIdx + 1 : 5
  for (let i = start; i < rows.length; i++) {
    const r = rows[i]
    const city = String(r[0] || '').trim()
    const desc = String(r[1] || '').trim().replace(/\r?\n/g, ' ')
    const rateRaw = String(r[2] ?? '').trim()
    const currency = String(r[3] || '').trim().toUpperCase()
    const remark = String(r[4] || '').trim().replace(/\r?\n/g, ' ')
    if (!city || /^(CITY|City)$/i.test(city)) continue
    if (!desc && !rateRaw) continue
    const rate = parseFloat(rateRaw)
    out.push({
      region: sheetName,
      city,
      cityCode: codeOf(city),
      desc: desc || '',
      rate: isNaN(rate) ? null : rate,
      currency: currency || '',
      remark: remark || '',
    })
  }
}

out.sort((a, b) => a.region.localeCompare(b.region) || a.city.localeCompare(b.city))

const lines = []
lines.push('// 自动生成：scripts/build-ancillary-fees.js —— 勿手改')
lines.push('// 可退附加费价目参考表（2025 Onwards Refundable List Ancillary - quotable）：停车/许可/路税等，')
lines.push('// 按区域/城市索引。**参考用**：实际行程注入的杂费金额以 daily-fees.js（行程确认口径）为准。')
lines.push('export const ANCILLARY_FEES = [')
for (const f of out) {
  lines.push(`  ${JSON.stringify(f)},`)
}
lines.push(']')
fs.writeFileSync(OUT, lines.join('\n') + '\n')
console.log(`done: ${out.length} fee entries (${wb.SheetNames.length} regions) -> ${OUT}`)
