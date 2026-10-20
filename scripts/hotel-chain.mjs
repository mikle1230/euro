#!/usr/bin/env node
// 酒店主线 -> 一条 Google Maps 链接
// 输入: 每行一家酒店，可写 "城市: 酒店名" 或 "酒店名"
// 用法: node scripts/hotel-chain.mjs <hotels.txt> [driving|walking]
import fs from 'node:fs'

const DB = JSON.parse(fs.readFileSync(new URL('../src/data/my-maps-nordic.json', import.meta.url), 'utf8'))
const MAX_POINTS = 10

const norm = (s) => (s || '').toLowerCase().normalize('NFKC').replace(/[\s\-_·.,'’"“”()（）&/]/g, '')
const tokens = (s) => (s || '').toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/).filter((t) => t && t.length > 1)
const GENERIC = new Set(['hotel','hotels','the','and','resort','spa','by','at','inn','city','stockholm','oslo','copenhagen','helsinki','reykjavik','bergen'])

function distKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function scoreName(q, name) {
  const nq = norm(q), np = norm(name)
  if (!nq || !np) return 0
  if (np === nq) return 1
  if (np.includes(nq) || nq.includes(np)) return 0.7 + 0.25 * (Math.min(np.length, nq.length) / Math.max(np.length, nq.length))
  const tq = tokens(q), tp = tokens(name)
  if (!tq.length || !tp.length) return 0
  const hit = tq.filter((t) => tp.includes(t))
  if (!hit.length || !hit.some((t) => !GENERIC.has(t))) return 0
  return 0.35 + 0.3 * (hit.length / Math.max(tq.length, tp.length))
}

function cityPoint(name) {
  if (!name) return null
  let best = null
  for (const p of DB.filter((p) => p.kind === 'city')) {
    const s = scoreName(name, p.name)
    if (s > 0.85 && (!best || s > best.s)) best = { ...p, s }
  }
  return best
}

function findHotel(query, city) {
  const anchor = cityPoint(city)
  let best = null, rejected = null
  for (const p of DB) {
    if (p.kind !== 'hotel' && p.kind !== 'ktHotel') continue
    const s = scoreName(query, p.name)
    if (s < 0.45) continue
    let eff = s
    let d = null
    if (anchor) {
      d = distKm(anchor, p)
      if (d > 150) { if (s >= 0.85 && (!rejected || s > rejected.s)) rejected = { ...p, s, d }; eff = 0 }
      else if (d > 60) eff = s * 0.7
    }
    if (eff > 0 && (!best || eff > best.eff)) best = { ...p, s, eff, d }
  }
  if (best && best.eff >= 0.6) return best
  if (rejected) return { rejected: true, name: rejected.name, city, km: Math.round(rejected.d) }
  return null
}

const file = process.argv[2]
const mode = process.argv[3] || 'driving'
if (!file) { console.error('usage: node scripts/hotel-chain.mjs <hotels.txt> [driving|walking]'); process.exit(1) }

const stops = [], missing = []
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const m = t.match(/^(.+?)\s*[:：|]\s*(.+)$/)
  const city = m ? m[1].trim() : ''
  const hotel = m ? m[2].trim() : t
  const hit = findHotel(hotel, city)
  if (hit && hit.rejected) missing.push(`${hotel}（${city || '?'}）库里同名点在 ${hit.km}km 外，已拒收`)
  else if (hit) stops.push({ ...hit, city: city || '' })
  else missing.push(`${hotel}${city ? '（' + city + '）' : ''}`)
}

console.log('\n酒店主线（' + stops.length + ' 站）')
stops.forEach((s, i) => {
  const label = String.fromCharCode(65 + (i % 26))
  let extra = ''
  if (i > 0) extra = '  直线 ' + Math.round(distKm(stops[i - 1], s)) + ' km'
  console.log(`  ${label}. ${s.city || ''} ${s.name}  ${s.lat.toFixed(5)},${s.lon.toFixed(5)}${extra}${s.s < 0.9 ? '  ⚠模糊' : ''}`)
})

const build = (arr) => {
  const pts = arr.map((s) => `${s.lat.toFixed(6)},${s.lon.toFixed(6)}`)
  const q = new URLSearchParams({ api: '1', origin: pts[0], destination: pts[pts.length - 1], travelmode: mode })
  if (pts.length > 2) q.set('waypoints', pts.slice(1, -1).join('|'))
  return 'https://www.google.com/maps/dir/?' + q.toString()
}

for (let i = 0; i < stops.length; i += MAX_POINTS) {
  const chunk = stops.slice(i, i + MAX_POINTS)
  const tag = stops.length > MAX_POINTS ? `（${Math.floor(i / MAX_POINTS) + 1}/${Math.ceil(stops.length / MAX_POINTS)}）` : ''
  console.log('\nGoogle Maps' + tag + ': ' + build(chunk))
}
if (missing.length) console.log('\n未匹配:\n  ' + missing.join('\n  '))
