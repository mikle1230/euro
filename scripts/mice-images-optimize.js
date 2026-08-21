// MICE 活动图片压缩：public/mice-images/ 下的图片统一压缩为网页适配尺寸（加载速度优先）。
// 运行：npm run mice:images（或 node scripts/mice-images-optimize.js）
// 规则：宽度 > 800px 或文件 > 150KB → 缩放到 ≤800px + 高质量压缩（jpeg/webp q72，png 压缩级 9）；
//       已达标（≤800px 且 ≤150KB）的跳过。原地覆盖，保留原扩展名。
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const IMG_DIR = path.resolve(process.cwd(), 'public', 'mice-images')
const MAX_WIDTH = 800
const MAX_BYTES = 150 * 1024

const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

async function optimize(file) {
  // 统一正斜杠路径；先读入内存再交给 sharp 处理（libvips 从路径读取时会在 Windows 持有文件句柄，
  // 导致随后 writeFileSync 覆盖同文件失败），完成后写回
  const full = path.join(IMG_DIR, file).replace(/\\/g, '/')
  const stat = fs.statSync(full)
  try {
    const input = fs.readFileSync(full)
    const meta = await sharp(input).metadata()
    const width = meta.width || 0
    if (width <= MAX_WIDTH && stat.size <= MAX_BYTES) {
      return { file, skipped: true, reason: '已达标' }
    }
    const ext = path.extname(file).toLowerCase()
    let buf
    if (ext === '.png') {
      buf = await sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
    } else if (ext === '.webp') {
      buf = await sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()
    } else {
      buf = await sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer()
    }
    const before = stat.size
    fs.writeFileSync(full, buf)
    return { file, skipped: false, before, after: buf.length, savedPct: Math.round((1 - buf.length / before) * 100) }
  } catch (e) {
    return { file, skipped: false, error: e.message }
  }
}

async function main() {
  if (!fs.existsSync(IMG_DIR)) {
    console.log('目录不存在：' + IMG_DIR)
    return
  }
  const files = fs.readdirSync(IMG_DIR).filter((f) => EXTS.has(path.extname(f).toLowerCase()))
  if (!files.length) {
    console.log('没有图片需要处理')
    return
  }
  console.log(`共 ${files.length} 个图片文件，开始压缩…`)
  let done = 0, skipped = 0, saved = 0, errors = 0
  // 串行处理（sharp 并发受限，串行更稳）
  for (const f of files) {
    const r = await optimize(f)
    if (r.error) { errors++; console.log(`❌ ${f}: ${r.error}`) }
    else if (r.skipped) { skipped++; console.log(`⏭ ${f}: ${r.reason}`) }
    else {
      done++
      saved += r.before - r.after
      console.log(`✓ ${f}: ${(r.before / 1024).toFixed(0)}KB → ${(r.after / 1024).toFixed(0)}KB（省 ${r.savedPct}%）`)
    }
  }
  console.log(`\n完成：压缩 ${done}，跳过 ${skipped}，失败 ${errors}，共节省 ${(saved / 1024).toFixed(0)} KB`)
}

main()
