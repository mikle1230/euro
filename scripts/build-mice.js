// MICE 活动数据构建：解析 Excel（Activities list / technical visits list）→ src/data/mice-activities.js
// 运行：node scripts/build-mice.js
// 数据源目录：../MICE（用户后续补充其他国家活动文件时，同名列表文件放进该目录重新运行即可增量更新）
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const SRC_DIR = path.resolve(process.cwd(), '..', 'MICE')
const OUT_FILE = path.resolve(process.cwd(), 'src', 'data', 'mice-activities.js')

// 列表字段分隔符（SharePoint 多值列）
const SPLIT = ';#'

// Preview image 是 SharePoint JSON 字符串：{ serverUrl, serverRelativeUrl, fileName }
function parsePreviewImage(raw) {
  if (!raw) return ''
  try {
    const j = JSON.parse(raw)
    if (j && typeof j === 'object' && j.serverUrl && j.serverRelativeUrl) {
      return String(j.serverUrl).replace(/\/+$/, '') + j.serverRelativeUrl
    }
  } catch { /* ignore */ }
  return ''
}

function toList(raw) {
  return String(raw || '')
    .split(SPLIT)
    .map((s) => s.trim())
    .filter(Boolean)
}

function toNum(raw) {
  const n = parseFloat(String(raw || '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

const FILES = [
  { file: 'Activities list-Austra.xlsx', defaultCategory: 'Activity' },
  { file: 'technical visits list.xlsx', defaultCategory: 'Technical Visit' },
]

const all = []
const seen = new Set()

for (const { file, defaultCategory } of FILES) {
  const p = path.join(SRC_DIR, file)
  if (!fs.existsSync(p)) {
    console.error(`跳过：${file} 不存在`)
    continue
  }
  const wb = XLSX.readFile(p)
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' })
    for (const r of rows) {
      const title = String(r.Title || '').trim()
      if (!title) continue
      const id = 'mice-' + Buffer.from(title.toLowerCase().slice(0, 60)).toString('base64url').replace(/[^a-z0-9]/gi, '').slice(0, 24)
      let n = 2
      let key = id
      while (seen.has(key)) key = `${id}-${n++}`
      seen.add(key)

      const previewImageUrl = parsePreviewImage(r['Preview image'])
      all.push({
        id: key,
        title,
        category: String(r.Category || defaultCategory).trim() || defaultCategory,
        targetTourCategories: toList(r['Target Tour Categories']),
        tags: toList(r['Tag (s)']),
        description: String(r.Description || '').trim(),
        tourProgramExample: String(r['Tour program example'] || '').trim(),
        officialWebsite: String(r['Official website'] || '').trim(),
        capacityMin: toNum(r['Capacity (min)']),
        capacityMax: toNum(r['Max Capacity (pax)']),
        capacityDetails: String(r['Capacity details'] || '').trim(),
        priceMin: toNum(r['Minimum price (EUR)']),
        priceMax: toNum(r['Maximum price (EUR)']),
        priceUnit: String(r['Price unit'] || '').trim(),
        country: String(r['Country (Lookup)'] || '').trim(),
        city: String(r.City || '').trim(),
        streetAddress: String(r['Street address'] || '').trim(),
        openingHours: String(r['Opening hours'] || '').trim(),
        googleMapLink: String(r['Google map link'] || '').trim(),
        bestTimeToVisit: toList(r['Best time to visit']),
        productStatus: String(r['Product status'] || '').trim() || 'Available',
        officeInCharge: String(r['Office in charge (auto-fill)'] || '').trim(),
        subCategoryForActivity: String(r['Sub-category for Activity'] || '').trim(),
        activityDuration: String(r['Activity/Tour duration'] || '').trim(),
        salesNotes: String(r['Any other information for Sales'] || '').trim(),
        previewImageUrl,
      })
    }
  }
}

// 输出
const output = `// MICE 特色活动目录（由 scripts/build-mice.js 从 Excel 生成，勿手改）
// 数据源：MICE/Activities list-Austra.xlsx + MICE/technical visits list.xlsx
// 追加数据：把新国家活动文件放入 MICE/ 目录，重跑 node scripts/build-mice.js 即可扩充
export default ${JSON.stringify(all, null, 2)}
`
fs.writeFileSync(OUT_FILE, output, 'utf8')
const sizeKB = Math.round(fs.statSync(OUT_FILE).size / 1024)
console.log(`✅ 已生成 ${all.length} 条活动 → ${path.relative(process.cwd(), OUT_FILE)}（${sizeKB} KB）`)
const byCat = {}
for (const a of all) byCat[a.category] = (byCat[a.category] || 0) + 1
console.log('分类统计:', JSON.stringify(byCat))
