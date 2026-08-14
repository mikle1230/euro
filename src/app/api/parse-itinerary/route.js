import { NextResponse } from 'next/server'
import { applyQuoteRules } from '@/lib/coach-plan'
import { aiParse } from '@/lib/ai-parse'

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
          resolve(
            pages
              .map((page) =>
                (page.Texts || [])
                  .map((t) => decodeURIComponent(t.R[0].T))
                  .join(' '),
              )
              .join('\n\n'),
          )
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

    // Truncate to avoid token limits (DeepSeek context: 128K)
    const maxChars = 50000
    if (text.length > maxChars) {
      text = text.slice(0, maxChars) + '\n\n[文本过长，已截断...]'
    }

    // ---- Call DeepSeek API（共享 aiParse）----
    const { parsed, error } = await aiParse(`请解析以下行程文件内容：\n\n${text}`)
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // sourceText 随结果返回，前端存到行程上，供「AI 反馈重解析」复用原文
    return NextResponse.json({ ...applyQuoteRules(parsed), sourceText: text })
  } catch (error) {
    console.error('Parse itinerary error:', error)
    return NextResponse.json(
      { error: error.message || '解析失败，请稍后重试' },
      { status: 500 },
    )
  }
}
