import { NextResponse } from 'next/server'
import { applyQuoteRules } from '@/lib/coach-plan'
import { aiParse } from '@/lib/ai-parse'

// AI 反馈重解析：导入后人工检查发现问题 → 带原文 + 反馈 + 上次结果，
// 让 AI 修正后重新输出完整 JSON，前端原地替换行程内容。

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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 })
    }

    const { sourceText, feedback, current } = body || {}

    if (!sourceText || !sourceText.trim()) {
      return NextResponse.json({ error: '缺少原始行程文本（sourceText）' }, { status: 400 })
    }
    if (!feedback || !feedback.trim()) {
      return NextResponse.json({ error: '请填写反馈内容' }, { status: 400 })
    }

    const text = sourceText.slice(0, 50000)

    // 带上原文 + 上次解析结果 + 用户反馈，让 AI 修正而非重来
    let userContent = `请解析以下行程文件内容：\n\n${text}`
    if (current && Array.isArray(current.days)) {
      userContent += `\n\n【上次解析结果（仅作参考，如有误请修正）】\n${JSON.stringify(current)}`
    }
    userContent += `\n\n【用户反馈 —— 上次解析有误，请根据反馈修正后重新输出完整 JSON】\n${feedback}`

    const { parsed, error } = await aiParse(userContent)
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json(applyQuoteRules(parsed))
  } catch (error) {
    console.error('Reparse itinerary error:', error)
    return NextResponse.json(
      { error: error.message || '重新解析失败，请稍后重试' },
      { status: 500 },
    )
  }
}
