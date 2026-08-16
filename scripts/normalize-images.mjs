// 图片规范化脚本：检查/修复 public/images 下的国家封面图、城市图、景点图。
// 规范见 docs/image-spec.md。零依赖，用 macOS 自带 sips。
//
// 用法：
//   node scripts/normalize-images.mjs --check   只检查 + 报告，不改文件
//   node scripts/normalize-images.mjs --fix     检查并自动处理（重命名/裁剪/缩放/压缩）
//   node scripts/normalize-images.mjs --watch   后台监听 public/images，新增图片自动处理
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, watch as fsWatch } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_FILE = join(ROOT, 'src/data/europe-travel.json')

// —— 规范（与 docs/image-spec.md 保持一致）——
const SPEC = {
  countries: { dir: 'public/images/countries', maxDim: 1200, quality: 75, ratio: [4, 3] },
  cities: { dir: 'public/images/cities', maxDim: 1600, quality: 80, ratio: [3, 2] },
  attractions: { dir: 'public/images/attractions', maxDim: 1600, quality: 80, ratio: [3, 2] },
}
const EXT_RE = /\.(jpe?g|png|webp|gif|heic|tif|tiff)$/i

// 从 europe-travel.json 收集合法 id（全小写）
function collectIds() {
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

function sips(args) {
  return execFileSync('sips', args, { encoding: 'utf8' })
}

function getDims(file) {
  const out = sips(['-g', 'pixelWidth', '-g', 'pixelHeight', file])
  const w = +out.match(/pixelWidth:\s*(\d+)/)[1]
  const h = +out.match(/pixelHeight:\s*(\d+)/)[1]
  return { w, h }
}

// 分析单张图，返回问题清单 + 是否需要处理
function analyze(file, spec, validIds) {
  const ext = extname(file)
  const curBase = file.slice(0, -ext.length).split('/').pop() // 保留大小写
  const id = curBase.toLowerCase()
  const issues = []
  const actions = []

  if (!validIds.has(id)) issues.push(`孤儿文件：${id} 不在数据里`)
  else if (curBase !== id) issues.push(`大小写错误：${curBase} 应改为 ${id}`)

  let dims = null
  let sizeKB = 0
  try {
    dims = getDims(file)
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

function bytes(file) {
  return statSync(file).size
}

// 执行处理：裁剪（如需要）+ 缩放 + 转 JPEG + 压缩，输出到临时文件后原子替换
function processImage(file, spec, dims, actions) {
  const tmp1 = file + '.normtmp.jpg'
  const tmp2 = file + '.normout.jpg'
  let src = file
  try {
    const crop = actions.find((a) => a.kind === 'crop')
    if (crop) {
      sips(['-c', String(crop.cropH), String(crop.cropW), src, '--out', tmp1])
      src = tmp1
    }
    sips(['-Z', String(spec.maxDim), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(spec.quality), src, '--out', tmp2])
    renameSync(tmp2, file)
    return true
  } catch (e) {
    console.error('  处理失败:', e.message)
    return false
  } finally {
    for (const t of [tmp1, tmp2]) if (existsSync(t)) { try { unlinkSync(t) } catch {} }
  }
}

// 大小写重命名（两步，避免大小写不敏感文件系统问题）
function fixCase(file, targetId) {
  const ext = extname(file)
  const dir = dirname(file)
  const curBase = file.slice(0, -ext.length).split('/').pop()
  if (curBase === targetId) return file
  const tmp = join(dir, `.__norm_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`)
  renameSync(file, tmp)
  const dest = join(dir, targetId + ext)
  renameSync(tmp, dest)
  return dest
}

function scan() {
  const validIds = collectIds()
  const files = []
  for (const [kind, spec] of Object.entries(SPEC)) {
    const dir = join(ROOT, spec.dir)
    if (!existsSync(dir)) continue
    const set = validIds[kind]
    for (const name of readdirSync(dir)) {
      if (!EXT_RE.test(name)) continue
      const file = join(dir, name)
      const a = analyze(file, spec, set)
      files.push({ kind, spec, file, ...a })
    }
  }
  return files
}

function checkOnly() {
  const files = scan()
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
  else console.log(`\n运行 \`npm run images:fix\` 自动修复这 ${problems.length} 张。`)
}

function fixAll() {
  const files = scan()
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
      if (processImage(file, f.spec, f.dims, f.actions)) note.push('压缩/裁剪')
    } else if (f.dims) {
      note.push('尺寸已达标')
    }
    const after = existsSync(file) ? Math.round(bytes(file) / 1024) + 'KB' : '?'
    const dimsAfter = existsSync(file) ? (() => { try { const d = getDims(file); return `${d.w}x${d.h}` } catch { return '?' } })() : '?'
    console.log(`✓ [${f.kind}] ${f.curBase}  ${note.join('+')}  → ${dimsAfter} ${after}`)
    changed++
  }
  // 孤儿文件仅提示，不删除
  for (const f of files) {
    if (f.issues.some((i) => i.startsWith('孤儿文件'))) {
      console.log(`⚠ 孤儿文件保留（未删除）：${f.curBase}，请确认命名或删除`)
    }
  }
  console.log(`\n完成：处理 ${changed} 张。`)
}

function watchMode() {
  console.log('👁 监听 public/images 三个目录，新增/修改图片将自动处理（Ctrl+C 退出）\n')
  fixAll()
  const timers = {}
  const handle = (abs) => {
    if (!EXT_RE.test(abs) || !existsSync(abs)) return
    const rel = abs.replace(ROOT + '/', '')
    const kind = Object.keys(SPEC).find((k) => rel.startsWith(SPEC[k].dir + '/'))
    if (!kind) return
    const spec = SPEC[kind]
    const validIds = new Set(collectIds()[kind])
    const a = analyze(abs, spec, validIds)
    if (a.issues.length || a.needProcess) {
      console.log(`\n检测到变化：[${kind}] ${a.curBase}`)
      let file = abs
      if (a.issues.some((i) => i.startsWith('大小写错误'))) {
        file = fixCase(abs, a.id)
        console.log('  已重命名为', a.id)
      }
      if (a.needProcess && a.dims) {
        processImage(file, spec, a.dims, a.actions)
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

const mode = process.argv[2] || '--fix'
if (mode === '--check') checkOnly()
else if (mode === '--fix') fixAll()
else if (mode === '--watch') watchMode()
else {
  console.error('未知模式：', mode, '（可用 --check / --fix / --watch）')
  process.exit(1)
}
