import { NextResponse } from 'next/server'
import { SYSTEM_PROMPT } from '@/lib/prompt'

export async function POST(request) {
  try {
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

    // ---- Call DeepSeek API ----
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    })

    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `请解析以下行程文件内容：\n\n${text}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 16000,
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      return NextResponse.json(
        { error: 'AI 未返回有效结果，请重试' },
        { status: 500 },
      )
    }

    let parsed
    try {
      // Try direct parse first
      parsed = JSON.parse(aiResponse)
    } catch {
      // Fallback: strip markdown fences and try again
      const cleaned = aiResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        console.error('AI response parse error. Raw (first 500):', aiResponse.slice(0, 500))
        return NextResponse.json(
          { error: 'AI 返回格式异常，请重试' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Parse itinerary error:', error)
    return NextResponse.json(
      { error: error.message || '解析失败，请稍后重试' },
      { status: 500 },
    )
  }
}
