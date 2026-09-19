// 图片清单一致性测试：
// src/data/image-manifest.json 由 npm run images:manifest 扫描 public/images 生成，
// 页面按它决定「渲染真实 <img>」还是「直接走占位梯度」。清单一旦漂移，
// 要么漏显示新加的图，要么重新出现 404 请求，所以在这里双向校验。
// 运行：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')

const manifest = JSON.parse(readFileSync(join(ROOT, 'src/data/image-manifest.json'), 'utf8'))
const travel = JSON.parse(readFileSync(join(ROOT, 'src/data/europe-travel.json'), 'utf8'))

function diskIds(kind) {
  return readdirSync(join(ROOT, 'public/images', kind))
    .filter((f) => f.toLowerCase().endsWith('.jpg'))
    .map((f) => f.slice(0, -4))
    .sort()
}

const dataIds = { cities: new Set(), attractions: new Set() }
for (const c of travel.countries) {
  for (const city of c.cities || []) {
    dataIds.cities.add(city.id)
    for (const a of city.attractions || []) dataIds.attractions.add(a.id)
  }
}

for (const kind of ['cities', 'attractions']) {
  test(`图片清单与磁盘一致：${kind}`, () => {
    assert.deepEqual(
      manifest[kind],
      diskIds(kind),
      `image-manifest.json 的 ${kind} 与 public/images/${kind} 不一致，请重跑 npm run images:manifest`,
    )
  })

  test(`图片清单里的 id 都是数据中的合法 id：${kind}`, () => {
    const orphan = manifest[kind].filter((id) => !dataIds[kind].has(id) && !dataIds[kind].has(id.replace(/-\d$/, '')))
    assert.deepEqual(
      orphan,
      [],
      `以下文件名不对应任何数据 id（页面永远不会用到，通常是命名写错）：${orphan.join(', ')}`,
    )
  })
}
