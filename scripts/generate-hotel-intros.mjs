// 一次性：为「酒店价格参考」库（hotel-prices.json）的酒店生成简洁中文简介。
// 运行：node --env-file=.env.local scripts/generate-hotel-intros.mjs
// 输出：src/data/hotel-price-intros.json  → { "<cityCode>|<酒店名>": "简介" }
// 说明：hotel-prices.json 由 build:hotels 从 xlsx 重建，简介放独立文件，避免被覆盖。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const SRC = path.join(root, 'src/data/hotel-prices.json')
const OUT = path.join(root, 'src/data/hotel-price-intros.json')

const prices = JSON.parse(fs.readFileSync(SRC, 'utf8'))

// 汇总唯一酒店（同城同名去重，取首条星级/评分/城市信息）
const hotels = []
const seen = new Set()
for (const [cc, c] of Object.entries(prices)) {
  for (const h of c.hotels || []) {
    const key = `${cc}|${h.hotel}`
    if (seen.has(key)) continue
    seen.add(key)
    hotels.push({
      key,
      cityCode: cc,
      hotel: h.hotel,
      cityZh: c.name || '',
      nameEn: c.nameEn || '',
      star: h.star || 0,
      rating: h.rating || 0,
    })
  }
}
console.log(`共 ${hotels.length} 家酒店待生成简介`)

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
})

const SYSTEM = `你是欧洲地接社的酒店资料整理员。为「酒店价格参考」里的酒店写一句**简洁的中文简介**（25–45 个汉字，1 句），供报价工具卡片展示。
要求：
- 只能依据给到的 酒店名/城市/星级，以及可从酒店名合理推断的定位（如含 Airport、Congress、Messe、Airport/Messe、City、Centre、Downtown 等）。
- 描述酒店的品类/定位/所在城市即可，如「位于米兰的国际连锁四星商务酒店，近展览中心，适合团体入住」。
- **不要编造**具体地址、具体距离、具体设施、开业年份等无法从输入确认的信息。
- 语气中性、专业、简洁。不要写酒店评分/价格。
- 英文酒店名一般不用翻译，除非有通用中文名。

输出严格为 JSON：键是 "城市码|酒店名"（保持原样），值是一句中文简介。只输出 JSON 对象，不要多余文字。`

// 分批调用（避免单次输出过长被截断）
const BATCH = 24
const result = {}
for (let i = 0; i < hotels.length; i += BATCH) {
  const batch = hotels.slice(i, i + BATCH)
  const list = batch.map((h) => `${h.key}| 酒店:${h.hotel}| 城市:${h.cityZh}${h.nameEn ? '/'+h.nameEn : ''}| 星级:${h.star ? h.star+'星' : '未知'}`).join('\n')
  const user = `为以下酒店各写一句中文简介：\n${list}\n返回 JSON。`
  let resp
  try {
    resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    })
  } catch (e) {
    console.error(`批次 ${i / BATCH + 1} 调用失败:`, e.message)
    process.exit(1)
  }
  const text = resp.choices?.[0]?.message?.content || ''
  let obj
  try {
    obj = JSON.parse(text)
  } catch (e) {
    console.error(`批次 ${i / BATCH + 1} JSON 解析失败，原始内容：\n${text}`)
    process.exit(1)
  }
  for (const h of batch) {
    const v = obj[h.key]
    if (v && typeof v === 'string' && v.trim()) result[h.key] = v.trim()
    else console.warn(`缺简介：${h.key}`)
  }
  console.log(`已处理 ${Math.min(i + BATCH, hotels.length)}/${hotels.length}`)
}

fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n')
console.log(`done: ${Object.keys(result).length} 条简介 -> ${OUT}`)
