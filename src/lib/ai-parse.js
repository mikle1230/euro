// AI 解析调用（服务端）：调 DeepSeek 并把返回内容解析为 JSON。
// parse-itinerary 与 reparse-itinerary 两个路由共用，避免重复。
// 返回 { parsed } 或 { error }。
import OpenAI from 'openai'
import { SYSTEM_PROMPT } from './prompt.js'

// 清理提取文本中的噪声，压缩输入 token（PDF/Word 常见：页码、重复页眉页脚、
// 分隔线、URL、连续空行）。只删明显的噪声，不碰行程内容。
export function cleanText(raw) {
  const lines = String(raw || '').split('\n')
  const seen = new Set()
  const out = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      if (out.length && out[out.length - 1] !== '') out.push('')
      continue
    }
    // 纯数字（页码）、"第 N 页"、URL、纯分隔线
    if (/^\d{1,3}$/.test(t)) continue
    if (/^(第\s*\d+\s*页|page\s*\d+)/i.test(t)) continue
    if (/^(https?:\/\/|www\.)/i.test(t)) continue
    if (/^[-=_*·•—~]{4,}$/.test(t)) continue
    // 重复行（页眉/页脚等）只保留一次
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

export async function aiParse(userContent) {
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
  })

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // 最多尝试 2 次：DeepSeek API 偶发超时/限流、或输出偶发非 JSON，重试一次成功率显著提升。
  // 截断（finish_reason=length）是输入过大导致的，重试无意义，直接返回提示。
  for (let attempt = 1; attempt <= 2; attempt++) {
    let completion
    try {
      completion = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        // 大行程（如 15+ 天）的输出 JSON 可能超过 8192 tokens；16384 + prompt 规则 12（省略空字段）兜底
        max_tokens: 16384,
      })
    } catch (e) {
      console.error(`DeepSeek API error (attempt ${attempt}/2):`, e?.message || e)
      if (attempt === 2) {
        return { error: `AI 服务调用失败：${e?.message || e}。已自动重试一次，请稍后再试` }
      }
      await sleep(1500)
      continue
    }

    const choice = completion.choices?.[0]
    const aiResponse = choice?.message?.content

    // 截断检测：输出被 max_tokens 截断时 JSON 必然不完整
    if (choice?.finish_reason === 'length') {
      return { error: '行程内容太多，AI 输出被截断。请重试；若仍失败，请将行程拆成两段（如 1-8 天 / 9-17 天）分别导入' }
    }

    if (!aiResponse) {
      if (attempt === 2) return { error: 'AI 未返回有效结果，请重试' }
      continue
    }

    // 提取最外层花括号包裹的 JSON（容忍前后多余文字 / 未净化的代码围栏）
    const extractJson = (raw) => {
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start === -1 || end === -1 || end <= start) return null
      try { return JSON.parse(raw.slice(start, end + 1)) } catch { return null }
    }

    let parsed
    try {
      parsed = JSON.parse(aiResponse)
    } catch {
      const cleaned = aiResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = extractJson(aiResponse) || extractJson(cleaned)
      }
    }

    if (!parsed) {
      console.error('AI response parse error. finish_reason:', choice?.finish_reason, 'length:', aiResponse.length)
      console.error('Raw head (300):', aiResponse.slice(0, 300))
      console.error('Raw tail (300):', aiResponse.slice(-300))
      if (attempt === 2) {
        return { error: `AI 返回格式异常（输出 ${aiResponse.length} 字符，${choice?.finish_reason || '未知'}）。已自动重试一次，若反复出现请截图反馈` }
      }
      continue
    }

    return { parsed }
  }

  return { error: 'AI 解析失败，请重试' }
}
