// 合并景点富内容到 src/data/attraction-details.js（含去重 + JSON 校验）
// 用法: node scripts/merge-attraction-details.mjs <新增数据.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const target = resolve(__dirname, '../src/data/attraction-details.js')

const [jsonPath] = process.argv.slice(2)
if (!jsonPath) {
  console.error('用法: node scripts/merge-attraction-details.mjs <新增数据.json>')
  process.exit(1)
}

const newData = JSON.parse(readFileSync(resolve(jsonPath), 'utf8'))
if (typeof newData !== 'object' || newData === null || Array.isArray(newData)) {
  console.error('新增数据必须是 JSON 对象（键 = 景点 id）')
  process.exit(1)
}

const src = readFileSync(target, 'utf8')
const m = src.match(/export const ATTRACTION_DETAILS = (\{[\s\S]*\})\s*$/)
if (!m) {
  console.error('无法在 attraction-details.js 中找到 ATTRACTION_DETAILS 对象')
  process.exit(1)
}

// 数据对象是我方写入的纯字面量，安全求值
// eslint-disable-next-line no-new-func
const existing = new Function(`return ${m[1]}`)()

let added = 0
let skipped = 0
for (const [id, detail] of Object.entries(newData)) {
  if (existing[id]) {
    skipped++
    continue
  }
  existing[id] = detail
  added++
}

const out =
  '// 景点详情页的富文本内容（按景点 id 为键）。\n' +
  '// 未收录的景点，详情页回退到 europe-travel.json 的 description/tips 与 attraction-info.json 的基础信息。\n' +
  `export const ATTRACTION_DETAILS = ${JSON.stringify(existing, null, 2)}\n`
writeFileSync(target, out)
console.log(`已合并: 新增 ${added} 个，跳过已存在 ${skipped} 个；当前共 ${Object.keys(existing).length} 个条目。`)
