// MICE 缺图清单：列出没有本地图片且没有 SharePoint 预览图的活动（按国家分组），
// 供批量找图后按 id 重命名放入 public/mice-images/。
// 运行：node scripts/mice-missing-images.js
import fs from 'node:fs'
import path from 'node:path'
import { getAllMiceActivities, resolveCountry } from '../src/lib/mice.js'

const IMG_DIR = path.resolve(process.cwd(), 'public', 'mice-images')
const hasLocal = (id) => ['.jpg', '.png', '.webp'].some((ext) => fs.existsSync(path.join(IMG_DIR, id + ext)))

const all = getAllMiceActivities()
const byCountry = new Map()
let missing = 0
for (const a of all) {
  if (hasLocal(a.id) || a.previewImageUrl) continue
  missing++
  const info = resolveCountry(a.country)
  const key = `${info?.flag || ''} ${info?.nameZh || a.country}`
  if (!byCountry.has(key)) byCountry.set(key, [])
  byCountry.get(key).push(a)
}

console.log(`共 ${all.length} 条活动，缺图 ${missing} 条（已排除有本地图/SharePoint 图的）：\n`)
for (const [country, list] of [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`【${country}】${list.length} 条`)
  for (const a of list.slice(0, 12)) {
    console.log(`  ${a.id}  |  ${a.title.slice(0, 60)}  |  ${a.city}`)
  }
  if (list.length > 12) console.log(`  ... 等共 ${list.length} 条`)
  console.log('')
}
