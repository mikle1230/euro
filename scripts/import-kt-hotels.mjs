// 一次性数据迁移：读取 KT 项目 6 城酒店 xlsx，生成 src/data/hotel-recommendations.json
// 用法：node scripts/import-kt-hotels.mjs
import XLSX from 'xlsx'
import { writeFileSync } from 'node:fs'

const CITIES = [
  { file: '/Users/michael/Projects/KT/系统拷贝列表/巴黎酒店.xlsx', key: 'paris', name: '巴黎', nameEn: 'Paris' },
  { file: '/Users/michael/Projects/KT/系统拷贝列表/罗马酒店.xlsx', key: 'rome', name: '罗马', nameEn: 'Rome' },
  { file: '/Users/michael/Projects/KT/系统拷贝列表/柏林酒店.xlsx', key: 'berlin', name: '柏林', nameEn: 'Berlin' },
  { file: '/Users/michael/Projects/KT/系统拷贝列表/巴塞罗那 酒店.xlsx', key: 'barcelona', name: '巴塞罗那', nameEn: 'Barcelona' },
  { file: '/Users/michael/Projects/KT/系统拷贝列表/维也纳 酒店.xlsx', key: 'vienna', name: '维也纳', nameEn: 'Vienna' },
  { file: '/Users/michael/Projects/KT/系统拷贝列表/因特拉肯酒店.xlsx', key: 'interlaken', name: '因特拉肯', nameEn: 'Interlaken' },
]

function parseStar(raw) {
  const s = String(raw || '').trim()
  const m = s.match(/^(\d)\s*\+?\s*Star/i) // "4 Star"→4, "4+ Star"→4, "5 Star"→5
  if (m) return parseInt(m[1], 10)
  if (/\d\s*-\s*\d/.test(s)) return 0 // "1-5 Star" 区间 → 跳过
  return 0
}

const out = {}
for (const c of CITIES) {
  const wb = XLSX.readFile(c.file)
  const hotels = []
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' })
    for (const r of rows) {
      const star = parseStar(r['Star Rating'])
      if (star < 4) continue
      const address = String(r['Address'] || '').trim()
      const email = String(r['Main E-Mail'] || '').trim()
      if (!address && !email) continue // 排除「报价组」（无地址无 email）
      hotels.push({
        name: String(r['Supplier'] || '').trim(),
        star,
        rating: 0,
        reviewCount: 0,
        bookingUrl: '',
        address,
        chain: String(r['Chain Name'] || '').trim(),
      })
    }
  }
  const seen = new Set()
  out[c.key] = {
    name: c.name,
    nameEn: c.nameEn,
    hotels: hotels.filter((h) => {
      if (!h.name || seen.has(h.name)) return false
      seen.add(h.name)
      return true
    }),
  }
}

writeFileSync('src/data/hotel-recommendations.json', JSON.stringify(out, null, 2) + '\n')
console.log('done:', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.hotels.length])))
