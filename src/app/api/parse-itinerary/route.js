import { NextResponse } from 'next/server'

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

    const systemPrompt = `你是一个专业的欧洲地接行程解析助手。你的任务是从行程文件中提取结构化数据。

请仔细阅读以下行程文本，提取所有信息并输出JSON格式。

**输出JSON结构：**
{
  "tourName": "行程名称（如：法意瑞10天经典游）",
  "tourCode": "行程编号（如果有明确编号则提取，否则留空）",
  "startDate": "开始日期 YYYY-MM-DD，文本中没有则留空",
  "endDate": "结束日期 YYYY-MM-DD",
  "groupSize": 人数数字，未提及时为0,
  "days": [
    {
      "dayNumber": 1,
      "cityName": "城市中文名（如：巴黎、罗马）",
      "cityNameEn": "城市英文名（如：Paris、Rome、Lucerne、Milan、Florence），务必输出准确的英文名，用于系统匹配",
      "date": "该天日期 YYYY-MM-DD，未知则留空",
      "items": [
        {
          "type": "attraction/hotel/breakfast/lunch/dinner/transport/other",
          "transportSubtype": "day/overnight/空 — 仅当 type=transport 时填写。train 区分日间火车(day)和夜火车(overnight)，boat/ferry 区分日间渡轮(day)和夜间渡轮(overnight)，其他留空",
          "name": "项目名称",
          "startTime": "HH:MM 格式，未知留空",
          "endTime": "HH:MM 格式，未知留空",
          "costCategory": "free 或 paid",
          "estimatedCost": 预估人均费用人民币数字，免费则为0,
          "notes": "备注"
        }
      ]
    }
  ],
  "stats": {
    "freeItems": ["免费项目名称列表"],
    "paidItems": ["收费项目名称列表"],
    "estimatedTotalCost": 预估总费用人民币数字
  }
}

**重要规则：**
1. 按天组织内容，即使原文没有明确分天，也根据上下文推断
2. 区分免费和收费：
   - 免费：车辆接送、导游陪同、外观拍照、免费景点、城市漫步、路过
   - 收费：门票、博物馆、讲解费/耳机费、进城费、过路费、缆车、船票
3. 酒店作为 hotel 类型 item
4. 早餐/午餐/晚餐各自单独列出
5. 交通方式单独列出（大巴/火车/飞机/船）
5b. 交通方式需要区分 sub-type：
    - 火车：日间行驶为 day（DTR），夜间/卧铺为 overnight（OTR）
    - 渡轮/船：日间为 day（DFR），夜间为 overnight（OFR）
    - 大巴/飞机/步行/地铁不需要此字段
6. 费用用人民币估算，仅作参考
7. 每个城市务必输出准确的英文名 cityNameEn（如巴黎→Paris，罗马→Rome，卢塞恩/琉森→Lucerne，米兰→Milan，佛罗伦萨→Florence），用于后续数据匹配
8. 只输出 JSON，不要任何解释文字`

    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请解析以下行程文件内容：\n\n${text}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 8000,
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
      parsed = JSON.parse(aiResponse)
    } catch {
      return NextResponse.json(
        { error: 'AI 返回格式异常，请重试' },
        { status: 500 },
      )
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
