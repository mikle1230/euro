// 诊断：用真实行程文件复现 /api/parse-itinerary 的 AI 调用，
// 打印 finish_reason / 输出长度 / JSON 是否可解析，定位「AI 返回格式异常」根因。
// 用法：node scripts/diag-parse.mjs <文件路径>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'
import OpenAI from 'openai'
import { SYSTEM_PROMPT } from '../src/lib/prompt.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const filePath = process.argv[2]
if (!filePath) {
  console.error('用法：node scripts/diag-parse.mjs <行程文件路径>')
  process.exit(1)
}

// 读取 DEEPSEEK_API_KEY（不打印）
const envRaw = fs.readFileSync(path.join(root, '.env.local'), 'utf8')
const keyMatch = envRaw.match(/^DEEPSEEK_API_KEY=(.+)$/m)
const apiKey = keyMatch ? keyMatch[1].trim() : process.env.DEEPSEEK_API_KEY
if (!apiKey || apiKey.startsWith('sk-your')) {
  console.error('❌ .env.local 里没有有效的 DEEPSEEK_API_KEY')
  process.exit(1)
}

const buf = fs.readFileSync(filePath)

// ---- 提取文本（与 route.js 的 docx 分支一致）----
const result = await mammoth.extractRawText({ buffer: buf })
let text = result.value
console.log('📄 提取文本长度:', text.length, '字符')

let maxChars = 50000
let truncated = false
if (text.length > maxChars) {
  truncated = true
  text = text.slice(0, maxChars) + '\n\n[文本过长，已截断...]'
}
console.log('✂️  截断至 50000 字符:', truncated)
console.log('📏 SYSTEM_PROMPT 长度:', SYSTEM_PROMPT.length, '字符')
console.log('📏 总输入 ≈', (SYSTEM_PROMPT.length + text.length).toLocaleString(), '字符')
console.log('---')

// ---- 与 route.js 完全一致的调用参数 ----
const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com/v1' })
const completion = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `请解析以下行程文件内容：\n\n${text}` },
  ],
  response_format: { type: 'json_object' },
  temperature: 0.1,
  max_tokens: 16384,
})

const choice = completion.choices?.[0]
const aiResponse = choice?.message?.content || ''
console.log('✅ API 调用成功')
console.log('⚙️  finish_reason:', choice?.finish_reason)
console.log('📏 输出长度:', aiResponse.length, '字符 /', (aiResponse.length / 4).toFixed(0), '≈ tokens(按4字符估算)')
console.log('🧩 输出开头 200 字符:', JSON.stringify(aiResponse.slice(0, 200)))
console.log('🧩 输出结尾 200 字符:', JSON.stringify(aiResponse.slice(-200)))
console.log('---')

// ---- 尝试解析（与 route.js 相同的三层逻辑）----
const extractJson = (raw) => {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try { return JSON.parse(raw.slice(start, end + 1)) } catch { return null }
}

let parsed = null
try { parsed = JSON.parse(aiResponse) } catch {
  const cleaned = aiResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { parsed = JSON.parse(cleaned) } catch {
    parsed = extractJson(aiResponse) || extractJson(cleaned)
  }
}

if (parsed) {
  console.log('✅ JSON 可解析')
  console.log('📋 days 数量:', parsed.days?.length)
  console.log('📋 tourName:', parsed.tourName)
} else {
  console.log('❌ JSON 解析失败 —— 这就是「AI 返回格式异常」的根因')
  if (choice?.finish_reason === 'length') {
    console.log('👉 finish_reason=length：输出被 max_tokens=8192 截断（行程太大）')
  }
}
