// 生成图片清单：扫描 public/images/{cities,attractions} 下真实存在的 .jpg 文件名（不含扩展名），
// 写入 src/data/image-manifest.json。
//
// 为什么需要清单：城市图/景点图是按 id 动态拼路径的（`/images/cities/${id}.jpg`），
// 页面无法在渲染前知道文件是否存在。旧做法是渲染 <img> 后靠 onError 兜底占位，
// 代价是浏览器必然发一次 404 请求（线上实测 /knowledge/france 就有多处 404）。
// 改为「清单内才渲染 <img>，清单外直接走占位」后，缺图不再产生任何网络请求。
//
// 新增图片后必须重跑：npm run images:manifest
// scripts/tests/image-manifest.test.mjs 会校验清单与磁盘一致，防止漂移。
import { readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = join(ROOT, 'src/data/image-manifest.json')

// 与 docs/image-spec.md 一致：城市图/景点图统一 .jpg，文件名 = 数据里的 id
const DIRS = {
  cities: join(ROOT, 'public/images/cities'),
  attractions: join(ROOT, 'public/images/attractions'),
}

const manifest = { cities: scan('cities'), attractions: scan('attractions') }
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n')

function scan(kind) {
  const files = readdirSync(DIRS[kind])
  const ids = files
    .filter((f) => f.toLowerCase().endsWith('.jpg'))
    .map((f) => f.slice(0, -4))
    .sort()
  const skipped = files.filter((f) => !f.toLowerCase().endsWith('.jpg') && f !== '.gitkeep')
  if (skipped.length) console.warn(`[${kind}] 跳过的非 .jpg 文件：${skipped.join(', ')}`)
  return ids
}

console.log(
  `image-manifest: cities=${manifest.cities.length} attractions=${manifest.attractions.length} -> src/data/image-manifest.json`,
)
