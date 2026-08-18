import { NextResponse } from 'next/server'
import { applyQuoteRules, patchEmptyRunRoadKm } from '@/lib/coach-plan'
import { aiParse, cleanText } from '@/lib/ai-parse'

// Vercel 平台函数时长上限：Pro/Enterprise 支持最长 300s（大行程 AI 解析需要）；
// Hobby 免费版固定 10s 不可配置，大行程会 504 —— 请在本机 npm run dev 解析或拆分行程。
export const maxDuration = 300

// PDF 页面文本重建：pdf2json 的 Texts 是逐字形/片段（CJK 每字一条），
// 若像旧代码那样整页用空格拼成一行，cleanText 的按行降噪（页码/页眉/去重）全部失效。
// 这里按 y 坐标重建「行」，行内按 x 排序；相邻字形间距明显大于该页中位间距时补一个空格
// 以区分词/字段边界（如 "PEK" 与 "CA933"），否则直接拼接（CJK 不再逐字加空格）。
function pdfPageToText(page) {
  const texts = page.Texts || []
  if (!texts.length) return ''

  const glyphs = texts.map((t) => ({
    x: t.x || 0,
    y: t.y || 0,
    text: decodeURIComponent((t.R && t.R[0] && t.R[0].T) || ''),
  }))
  glyphs.sort((a, b) => (a.y - b.y) || (a.x - b.x))

  // 同一行内相邻字形的 x 间距中位数 → 词边界阈值（尺度自适应，不硬编码像素）
  const gaps = []
  for (let i = 1; i < glyphs.length; i++) {
    if (Math.abs(glyphs[i].y - glyphs[i - 1].y) < 0.5) {
      gaps.push(glyphs[i].x - glyphs[i - 1].x)
    }
  }
  const positive = gaps.filter((g) => g > 0).sort((a, b) => a - b)
  const medianGap = positive.length ? positive[Math.floor(positive.length / 2)] : 0
  const wordGap = medianGap > 0 ? medianGap * 2.5 : 2

  const lines = []
  let cur = []
  let curKey = null
  let prevX = null
  for (const g of glyphs) {
    const key = Math.round(g.y)
    if (curKey === null || key === curKey) {
      if (prevX !== null && g.x - prevX > wordGap) cur.push(' ')
      cur.push(g.text)
      prevX = g.x
      if (curKey === null) curKey = key
    } else {
      lines.push(cur.join(''))
      cur = [g.text]
      curKey = key
      prevX = g.x
    }
  }
  if (cur.length) lines.push(cur.join(''))
  return lines.join('\n')
}

// 可选鉴权：.env.local 配置 PARSE_API_TOKEN 后，请求必须带
// Authorization: Bearer <token>，防止公网部署被刷 DeepSeek API 额度。
function checkAuth(request) {
  const apiToken = process.env.PARSE_API_TOKEN
  if (!apiToken) return null
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${apiToken}`) {
    return NextResponse.json(
      { error: '未授权：缺少或错误的 API Token（在行程设置中配置）' },
      { status: 401 },
    )
  }
  return null
}

export async function POST(request) {
  try {
    const authError = checkAuth(request)
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 })
    }

    // Size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()
    const mimeType = file.type

    let text = ''

    // ---- PDF ----
    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
      const PDFParser = (await import('pdf2json')).default
      text = await new Promise((resolve, reject) => {
        const parser = new PDFParser()
        parser.on('pdfParser_dataReady', (data) => {
          const pages = data.Pages || []
          resolve(pages.map(pdfPageToText).join('\n\n'))
        })
        parser.on('pdfParser_dataError', (err) => reject(err.parserError || err))
        parser.parseBuffer(buffer)
      })
    }
    // ---- Word .docx ----
    else if (
      fileName.endsWith('.docx') ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    }
    // ---- Excel .xlsx / .xls ----
    else if (
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      mimeType.includes('spreadsheet')
    ) {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name]
        return `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`
      })
      text = sheets.join('\n\n')
    }
    // ---- Unsupported ----
    else {
      return NextResponse.json(
        { error: '不支持的文件格式，请上传 PDF、Word (.docx) 或 Excel (.xlsx) 文件' },
        { status: 400 },
      )
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '文件内容为空或无法提取文本，请检查文件' },
        { status: 400 },
      )
    }

    // 输入降噪（页码/页眉页脚/重复行等）压缩 token，然后截断
    text = cleanText(text)

    // Truncate to avoid token limits (DeepSeek context: 128K)。
    // 保留头 + 尾：返程航班/结尾说明常落在文件尾部，盲切头部会丢掉。
    const maxChars = 50000
    if (text.length > maxChars) {
      const headChars = Math.floor(maxChars * 0.8)
      const tailChars = maxChars - headChars
      text =
        text.slice(0, headChars) +
        `\n\n[文本过长，已截断中间 ${text.length - maxChars} 字符]\n\n` +
        text.slice(-tailChars)
    }

    // ---- Call DeepSeek API（共享 aiParse）----
    const { parsed, error } = await aiParse(`请解析以下行程文件内容：\n\n${text}`)
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // sourceText 随结果返回，前端存到行程上，供「AI 反馈重解析」复用原文
    const result = applyQuoteRules(parsed)
    await patchEmptyRunRoadKm(result) // EMPTY RUN 真实车程（OSRM，失败回退估算）
    return NextResponse.json({ ...result, sourceText: text })
  } catch (error) {
    console.error('Parse itinerary error:', error)
    return NextResponse.json(
      { error: error.message || '解析失败，请稍后重试' },
      { status: 500 },
    )
  }
}
