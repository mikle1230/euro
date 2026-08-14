// 从 quos-cities.json 提炼「常用城市 QUOS 码表」→ src/data/city-hints.js
// 用途：SYSTEM_PROMPT 附带该表，让 AI 直接输出 day.cityCode/countryCode，
// 避免仅靠中/英文名匹配（小城市、异名翻译）失败。
// 运行：node scripts/build-city-hints.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const quosCities = JSON.parse(fs.readFileSync(path.join(root, 'src/data/quos-cities.json'), 'utf8'))

// 别名链（与 src/lib/quos-mapping.js 的 CITY_ALIASES 保持一致的思路）
const ALIASES = {
  'Milan': 'Milano', 'Munich': 'Munchen', 'Cologne': 'Koln', 'Copenhagen': 'Kobenhavn',
  'Rome': 'Roma', 'Venice': 'Venezia', 'Florence': 'Firenze', 'Naples': 'Napoli',
  'Turin': 'Torino', 'Geneva': 'Genf', 'Lucerne': 'Luzern',
  'Vienna': 'Wien', 'Prague': 'Praha', 'Warsaw': 'Warszawa',
  'The Hague': 'Den Haag', 'Antwerp': 'Antwerpen', 'Ghent': 'Gent',
  'Brussels': 'Bruxelles', 'Bruges': 'Brugge',
  'Seville': 'Sevilla', 'Cordoba': 'Cordoba', 'Malaga': 'Malaga', 'Malmö': 'Malmo',
  'Gothenburg': 'Goteborg',
  'Pompeii': 'Pompei', 'Genoa': 'Genova', 'Dusseldorf': 'Dusseldorf',
  'Nuremberg': 'Nurnberg', 'Tromso': 'Tromsoe', 'Alesund': 'Aalesund',
  'Frankfurt': 'Frankfurt am Main', 'Mont Saint Michel': 'Mont-St-Michel',
  'Monaco': 'Monaco', 'Cinque Terre': 'Cinque Terre',
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

function lookup(name) {
  if (!name) return null
  const direct = quosCities[name]
  if (direct) return direct
  const alias = ALIASES[name]
  if (alias && quosCities[alias]) return quosCities[alias]
  // 模糊匹配（去符号转小写）
  const target = norm(name)
  if (target) {
    const hit = Object.keys(quosCities).find((k) => norm(k) === target)
    if (hit) return quosCities[hit]
  }
  return null
}

// 常用欧洲城市（中文行程高频）：[中文名, 英文名]
const CITIES = [
  // 法国
  ['巴黎', 'Paris'], ['尼斯', 'Nice'], ['马赛', 'Marseille'], ['戛纳', 'Cannes'],
  ['阿维尼翁', 'Avignon'], ['里昂', 'Lyon'], ['斯特拉斯堡', 'Strasbourg'], ['波尔多', 'Bordeaux'],
  ['第戎', 'Dijon'], ['科尔马', 'Colmar'], ['安纳西', 'Annecy'], ['霞慕尼', 'Chamonix'],
  ['凡尔赛', 'Versailles'], ['圣米歇尔山', 'Mont Saint Michel'],
  // 意大利
  ['罗马', 'Rome'], ['佛罗伦萨', 'Florence'], ['威尼斯', 'Venice'], ['米兰', 'Milan'],
  ['维罗纳', 'Verona'], ['比萨', 'Pisa'], ['那不勒斯', 'Naples'], ['索伦托', 'Sorrento'],
  ['庞贝', 'Pompeii'], ['五渔村', 'Cinque Terre'], ['博洛尼亚', 'Bologna'], ['都灵', 'Turin'],
  ['热那亚', 'Genoa'], ['锡耶纳', 'Siena'], ['圣吉米尼亚诺', 'San Gimignano'], ['阿马尔菲', 'Amalfi'],
  ['科莫', 'Como'], ['巴勒莫', 'Palermo'], ['卡塔尼亚', 'Catania'], ['陶尔米纳', 'Taormina'],
  // 瑞士
  ['苏黎世', 'Zurich'], ['日内瓦', 'Geneva'], ['卢塞恩', 'Lucerne'], ['因特拉肯', 'Interlaken'],
  ['伯尔尼', 'Bern'], ['采尔马特', 'Zermatt'], ['洛桑', 'Lausanne'], ['蒙特勒', 'Montreux'],
  ['圣莫里茨', 'St Moritz'], ['卢加诺', 'Lugano'], ['达沃斯', 'Davos'], ['格林德瓦', 'Grindelwald'],
  // 奥地利
  ['维也纳', 'Vienna'], ['萨尔茨堡', 'Salzburg'], ['因斯布鲁克', 'Innsbruck'], ['哈尔施塔特', 'Hallstatt'],
  ['格拉茨', 'Graz'],
  // 捷克
  ['布拉格', 'Prague'], ['克鲁姆洛夫', 'Cesky Krumlov'], ['卡罗维发利', 'Karlovy Vary'], ['布尔诺', 'Brno'],
  // 匈牙利
  ['布达佩斯', 'Budapest'],
  // 波兰
  ['克拉科夫', 'Krakow'], ['华沙', 'Warsaw'], ['格但斯克', 'Gdansk'], ['弗罗茨瓦夫', 'Wroclaw'],
  // 德国
  ['柏林', 'Berlin'], ['慕尼黑', 'Munich'], ['法兰克福', 'Frankfurt'], ['科隆', 'Cologne'],
  ['汉堡', 'Hamburg'], ['德累斯顿', 'Dresden'], ['莱比锡', 'Leipzig'], ['斯图加特', 'Stuttgart'],
  ['海德堡', 'Heidelberg'], ['罗滕堡', 'Rothenburg'], ['杜塞尔多夫', 'Dusseldorf'], ['波恩', 'Bonn'],
  ['纽伦堡', 'Nuremberg'], ['维尔茨堡', 'Wurzburg'],
  // 英国
  ['伦敦', 'London'], ['爱丁堡', 'Edinburgh'], ['曼彻斯特', 'Manchester'], ['格拉斯哥', 'Glasgow'],
  ['利物浦', 'Liverpool'], ['剑桥', 'Cambridge'], ['牛津', 'Oxford'], ['巴斯', 'Bath'],
  ['约克', 'York'], ['贝尔法斯特', 'Belfast'],
  // 西班牙
  ['巴塞罗那', 'Barcelona'], ['马德里', 'Madrid'], ['塞维利亚', 'Seville'], ['格拉纳达', 'Granada'],
  ['托莱多', 'Toledo'], ['瓦伦西亚', 'Valencia'], ['毕尔巴鄂', 'Bilbao'], ['龙达', 'Ronda'],
  ['科尔多瓦', 'Cordoba'], ['萨拉戈萨', 'Zaragoza'], ['马拉加', 'Malaga'],
  // 葡萄牙
  ['里斯本', 'Lisbon'], ['波尔图', 'Porto'], ['辛特拉', 'Sintra'],
  // 荷兰
  ['阿姆斯特丹', 'Amsterdam'], ['鹿特丹', 'Rotterdam'], ['海牙', 'The Hague'], ['乌得勒支', 'Utrecht'],
  // 比利时 / 卢森堡
  ['布鲁塞尔', 'Brussels'], ['布鲁日', 'Bruges'], ['安特卫普', 'Antwerp'], ['根特', 'Ghent'],
  ['卢森堡', 'Luxembourg'],
  // 北欧
  ['哥本哈根', 'Copenhagen'], ['斯德哥尔摩', 'Stockholm'], ['哥德堡', 'Gothenburg'], ['马尔默', 'Malmo'],
  ['奥斯陆', 'Oslo'], ['卑尔根', 'Bergen'], ['斯塔万格', 'Stavanger'], ['特罗姆瑟', 'Tromso'],
  ['奥勒松', 'Alesund'], ['赫尔辛基', 'Helsinki'], ['罗瓦涅米', 'Rovaniemi'],
  // 爱尔兰
  ['都柏林', 'Dublin'],
  // 希腊
  ['雅典', 'Athens'], ['圣托里尼', 'Santorini'], ['米科诺斯', 'Mykonos'], ['塞萨洛尼基', 'Thessaloniki'],
  // 土耳其
  ['伊斯坦布尔', 'Istanbul'], ['格雷梅', 'Goreme'],
  // 克罗地亚 / 斯洛文尼亚 / 斯洛伐克
  ['杜布罗夫尼克', 'Dubrovnik'], ['斯普利特', 'Split'], ['萨格勒布', 'Zagreb'],
  ['卢布尔雅那', 'Ljubljana'], ['布莱德', 'Bled'], ['布拉迪斯拉发', 'Bratislava'],
  // 波罗的海 / 冰岛 / 摩纳哥
  ['塔林', 'Tallinn'], ['里加', 'Riga'], ['维尔纽斯', 'Vilnius'],
  ['雷克雅未克', 'Reykjavik'], ['摩纳哥', 'Monaco'],
]

const hints = []
const missing = []
for (const [cn, en] of CITIES) {
  const hit = lookup(en) || lookup(cn)
  if (hit) {
    hints.push({ cn, en, cityCode: hit.cityCode, countryCode: hit.countryCode })
  } else {
    missing.push(`${cn}/${en}`)
  }
}

hints.sort((a, b) => a.countryCode.localeCompare(b.countryCode) || a.en.localeCompare(b.en))

const out = `// 自动生成：scripts/build-city-hints.js —— 勿手改
// 常用欧洲城市 QUOS 码表（来自 src/data/quos-cities.json）
// 用途：SYSTEM_PROMPT 附此表，AI 解析时直接输出 day.cityCode/countryCode
export const CITY_HINTS = ${JSON.stringify(hints, null, 2)}
`

fs.writeFileSync(path.join(root, 'src/data/city-hints.js'), out)
console.log(`✅ 生成 src/data/city-hints.js：${hints.length} 个城市`)
if (missing.length) {
  console.log(`⚠️ 未匹配 ${missing.length} 个（已跳过）：\n  ${missing.join('\n  ')}`)
}
