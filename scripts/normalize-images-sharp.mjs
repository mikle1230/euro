// 图片规范化脚本（Windows/sharp 版）：检查/修复 public/images 下的国家封面图、城市图、景点图。
// 规范见 docs/image-spec.md。用 sharp（仓库已有依赖），兼容 Windows（原 scripts/normalize-images.mjs 用 macOS sips）。
//
// 用法：
//   node scripts/normalize-images-sharp.mjs --check   只检查 + 报告，不改文件
//   node scripts/normalize-images-sharp.mjs --fix     检查并自动处理（裁剪/缩放/压缩）
//   node scripts/normalize-images-sharp.mjs --watch   后台监听 public/images，新增图片自动处理（Ctrl+C 退出）
import { existsSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, watch as fsWatch } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_FILE = join(ROOT, 'src/data/europe-travel.json')

const SPEC = {
  countries: { dir: 'public/images/countries', maxDim: 1200, quality: 75, ratio: [4, 3] },
  cities: { dir: 'public/images/cities', maxDim: 1600, quality: 80, ratio: [3, 2] },
  attractions: { dir: 'public/images/attractions', maxDim: 1600, quality: 80, ratio: [3, 2] },
}
const EXT_RE = /\.(jpe?g|png|webp|gif|heic|tif|tiff)$/i

// 从 europe-travel.json 收集合法 id（全小写）
function collectValidIds() {
  const d = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  const out = { countries: new Set(), cities: new Set(), attractions: new Set() }
  for (const c of d.countries) {
    out.countries.add(c.id)
    for (const ci of c.cities || []) {
      out.cities.add(ci.id)
      for (const a of ci.attractions || []) out.attractions.add(a.id)
    }
  }
  return out
}

async function getDims(file) {
  const m = await sharp(file).metadata()
  return { w: m.width, h: m.height }
}

function bytes(file) {
  return statSync(file).size
}

async function analyze(file, spec, validIds) {
  const ext = extname(file)
  const curBase = basename(file, ext)
  const id = curBase.toLowerCase()
  const issues = []
  const actions = []

  if (!validIds.has(id)) issues.push(`孤儿文件：${id} 不在数据里`)
  else if (curBase !== id) issues.push(`大小写错误：${curBase} 应改为 ${id}`)

  let dims = null
  let sizeKB = 0
  try {
    dims = await getDims(file)
    sizeKB = Math.round(bytes(file) / 1024)
  } catch {
    issues.push('无法读取尺寸（可能损坏）')
    return { id, curBase, issues, dims, actions, sizeKB, needProcess: false }
  }

  const { w, h } = dims
  const [rw, rh] = spec.ratio
  const isPortrait = h > w

  if (isPortrait) {
    const cropH = Math.round((w * rh) / rw)
    actions.push({ kind: 'crop', desc: `竖图裁剪 ${w}x${h} → ${w}x${cropH}（${rw}:${rh}）`, cropH, cropW: w })
  }
  if (Math.max(w, h) > spec.maxDim) {
    actions.push({ kind: 'resize', desc: `缩放长边 ${Math.max(w, h)} → ≤${spec.maxDim}` })
  }
  if (!/\.jpe?g$/i.test(ext)) {
    actions.push({ kind: 'reencode', desc: `格式 ${ext.slice(1)} → jpeg` })
  }

  const needProcess = actions.length > 0
  return { id, curBase, issues, dims, actions, sizeKB, needProcess }
}

async function processImage(file, spec, actions) {
  const tmp = file + '.normout.jpg'
  const dest = file.replace(/\.(jpe?g|png|webp|gif|heic|tif|tiff)$/i, '.jpg')
  try {
    let src = file
    const crop = actions.find((a) => a.kind === 'crop')
    if (crop) {
      // 竖图中心裁剪成横图（保留原宽，cropH = 宽 × rh/rw）
      src = file + '.crop.jpg'
      await sharp(file).extract({ width: crop.cropW, height: crop.cropH, left: 0, top: 0 }).toFile(src)
    }
    await sharp(src)
      .resize({ width: spec.maxDim, height: spec.maxDim, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: spec.quality })
      .toFile(tmp)
    // 若源是 png/webp 等非 jpg，需要改后缀为 .jpg，并删除旧的源文件
    if (dest !== file) {
      renameSync(tmp, dest)
      if (existsSync(file)) { try { unlinkSync(file) } catch {} }
    } else {
      renameSync(tmp, file)
    }
    return true
  } catch (e) {
    console.error('  处理失败:', e.message)
    return false
  } finally {
    for (const t of [tmp, file + '.crop.jpg']) if (existsSync(t)) { try { unlinkSync(t) } catch {} }
  }
}

function fixCase(file, targetId) {
  const ext = extname(file)
  const dir = dirname(file)
  const curBase = basename(file, ext)
  if (curBase === targetId) return file
  const tmp = join(dir, `.__norm_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`)
  renameSync(file, tmp)
  const dest = join(dir, targetId + ext)
  renameSync(tmp, dest)
  return dest
}

function scan() {
  const validIds = collectValidIds()
  const files = []
  for (const [kind, spec] of Object.entries(SPEC)) {
    const dir = join(ROOT, spec.dir)
    if (!existsSync(dir)) continue
    const set = validIds[kind]
    for (const name of readdirSync(dir)) {
      if (!EXT_RE.test(name)) continue
      const file = join(dir, name)
      files.push({ kind, spec, file, ...analyze(file, spec, set) })
    }
  }
  return files
}

// fixAll 需要 await，包成 async
async function fixAll() {
  const validIds = collectValidIds()
  const files = []
  for (const [kind, spec] of Object.entries(SPEC)) {
    const dir = join(ROOT, spec.dir)
    if (!existsSync(dir)) continue
    const set = validIds[kind]
    for (const name of readdirSync(dir)) {
      if (!EXT_RE.test(name)) continue
      const file = join(dir, name)
      files.push({ kind, spec, file, ...await analyze(file, spec, set) })
    }
  }
  const problems = files.filter((f) => f.issues.length || f.needProcess)
  console.log(`扫描完成：共 ${files.length} 张图片，${problems.length} 张有问题\n`)
  let changed = 0
  for (const f of problems) {
    let file = f.file
    let note = []
    if (f.issues.some((i) => i.startsWith('大小写错误'))) {
      file = fixCase(file, f.id)
      note.push('重命名')
    }
    if (f.needProcess && f.dims) {
      if (await processImage(file, f.spec, f.actions)) note.push('压缩/裁剪')
    } else if (f.dims) {
      note.push('尺寸已达标')
    }
    let dimsAfter = '?'
    const after = existsSync(file) ? Math.round(bytes(file) / 1024) + 'KB' : '?'
    if (existsSync(file)) {
      try { const d = await getDims(file); dimsAfter = `${d.w}x${d.h}` } catch { dimsAfter = '?' }
    }
    console.log(`✓ [${f.kind}] ${f.curBase}  ${note.join('+')}  → ${dimsAfter} ${after}`)
    changed++
  }
  for (const f of files) {
    if (f.issues.some((i) => i.startsWith('孤儿文件'))) {
      console.log(`⚠ 孤儿文件保留（未删除）：${f.curBase}，请确认命名或删除`)
    }
  }
  console.log(`\n完成：处理 ${changed} 张。`)
  return files
}

async function checkOnly() {
  const validIds = collectValidIds()
  const files = []
  for (const [kind, spec] of Object.entries(SPEC)) {
    const dir = join(ROOT, spec.dir)
    if (!existsSync(dir)) continue
    const set = validIds[kind]
    for (const name of readdirSync(dir)) {
      if (!EXT_RE.test(name)) continue
      const file = join(dir, name)
      files.push({ kind, spec, file, ...await analyze(file, spec, set) })
    }
  }
  const problems = files.filter((f) => f.issues.length || f.needProcess)
  console.log(`扫描完成：共 ${files.length} 张图片，${problems.length} 张有问题\n`)
  for (const f of files) {
    const ok = !f.issues.length && !f.needProcess
    const dims = f.dims ? `${f.dims.w}x${f.dims.h}` : '?'
    console.log(`${ok ? '✓' : '✗'} [${f.kind}] ${f.curBase}  ${dims}  ${f.sizeKB}KB`)
    for (const i of f.issues) console.log(`     - ${i}`)
    for (const a of f.actions) console.log(`     → ${a.desc}`)
  }
  if (!problems.length) console.log('\n全部符合规范 ✅')
  else console.log(`\n运行 \`node scripts/normalize-images-sharp.mjs --fix\` 自动修复这 ${problems.length} 张。`)
}

async function watchMode() {
  console.log('👁 监听 public/images 三个目录，新增/修改图片将自动处理（Ctrl+C 退出）\n')
  await fixAll()
  const timers = {}
  const handle = async (abs) => {
    if (!EXT_RE.test(abs) || !existsSync(abs)) return
    const rel = abs.replace(ROOT + '/', '')
    const kind = Object.keys(SPEC).find((k) => rel.startsWith(SPEC[k].dir + '/'))
    if (!kind) return
    const spec = SPEC[kind]
    const validIds = new Set(collectValidIds()[kind])
    const a = await analyze(abs, spec, validIds)
    if (a.issues.length || a.needProcess) {
      console.log(`\n检测到变化：[${kind}] ${a.curBase}`)
      let file = abs
      if (a.issues.some((i) => i.startsWith('大小写错误'))) {
        file = fixCase(abs, a.id)
        console.log('  已重命名为', a.id)
      }
      if (a.needProcess && a.dims) {
        await processImage(file, spec, a.actions)
        console.log('  已压缩/裁剪')
      }
    }
  }
  for (const [kind, spec] of Object.entries(SPEC)) {
    const dir = join(ROOT, spec.dir)
    if (!existsSync(dir)) continue
    fsWatch(dir, (event, filename) => {
      const abs = join(dir, filename)
      clearTimeout(timers[abs])
      timers[abs] = setTimeout(() => handle(abs), 800)
    })
  }
  process.stdin.resume()
}

// 顶层入口（ES module 用 await）
const mode = process.argv[2] || '--fix'
if (mode === '--check') await checkOnly()
else if (mode === '--fix') await fixAll()
else if (mode === '--watch') await watchMode()
else {
  console.error('未知模式：', mode, '（可用 --check / --fix / --watch）')
  process.exit(1)
}
