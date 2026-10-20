#!/usr/bin/env node
// 行程 -> Google Maps 路线链接（坐标直出，不走 geocoding）
// 用法: node scripts/itinerary-gmaps.mjs <itinerary.txt> [driving|walking|transit]
import fs from 'node:fs'

const DB = JSON.parse(fs.readFileSync(new URL('../src/data/my-maps-nordic.json', import.meta.url), 'utf8'))
const MAX_POINTS = 10 // origin + 8 waypoints + destination

const norm = (s) => (s || '').toLowerCase().normalize('NFKC').replace(/[\s\-_·.,'’"“”()（）&/]/g, '')
const tokens = (s) => (s || '').toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/).filter((t) => t && t.length > 1)

function distanceKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function scoreName(query, name) {
  const nq = norm(query), np = norm(name)
  if (!nq || !np) return 0
  if (np === nq) return 1
  if (np.includes(nq) || nq.includes(np)) {
    return 0.7 + 0.25 * (Math.min(np.length, nq.length) / Math.max(np.length, nq.length))
  }
  const GENERIC = new Set(['hotel','hotels','the','and','restaurant','cafe','bar','city','stockholm','oslo','copenhagen','helsinki','reykjavik'])
  const tq = tokens(query), tp = tokens(name)
  if (!tq.length || !tp.length) return 0
  const hit = tq.filter((t) => tp.includes(t))
  const strong = hit.filter((t) => !GENERIC.has(t))
  if (!strong.length) return 0
  return 0.35 + 0.3 * (hit.length / Math.max(tq.length, tp.length))
}

// 城市锚点：优先 kind=city，其次任意精确同名点
function cityAnchor(cityName) {
  if (!cityName) return null
  const cities = DB.filter((p) => p.kind === 'city')
  let best = null
  for (const c of cities) {
    const s = scoreName(cityName, c.name)
    if (s > 0.85 && (!best || s > best.s)) best = { ...c, s }
  }
  if (best) return best
  for (const p of DB) {
    if (scoreName(cityName, p.name) > 0.95) return { ...p, s: 1 }
  }
  return null
}

function resolve(query, anchor) {
  const raw = query.trim()
  const coord = raw.match(/^(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)$/)
  if (coord) return { name: raw, lat: +coord[1], lon: +coord[2], kind: 'coord', score: 1, dist: 0 }

  let best = null
  let rejected = null
  for (const p of DB) {
    const s = scoreName(raw, p.name)
    if (s < 0.45) continue
    const dist = anchor ? distanceKm(anchor, p) : null
    let eff = s
    if (dist !== null) {
      if (dist > 150) { if (s >= 0.9 && (!rejected || s > rejected.score)) rejected = { ...p, score: s, dist }; eff = 0 }
      else if (dist > 60) eff = s * 0.7
    }
    if (eff > 0 && (!best || eff > best.eff)) best = { ...p, score: s, eff, dist }
  }
  if (best && best.eff >= 0.6) return best
  if (rejected) return { rejected: true, name: rejected.name, dist: Math.round(rejected.dist) }
  return null
}

function url(parts, mode, useNames) {
  const q = new URLSearchParams({ api: '1', travelmode: mode })
  const fmt = (s) => (useNames ? s.name.replace(/,/g, ' ') : `${s.lat.toFixed(6)},${s.lon.toFixed(6)}`)
  q.set('origin', fmt(parts[0]))
  q.set('destination', fmt(parts[parts.length - 1]))
  const mid = parts.slice(1, -1)
  if (mid.length) q.set('waypoints', mid.map(fmt).join('|'))
  return 'https://www.google.com/maps/dir/?' + q.toString()
}

const file = process.argv[2]
const mode = process.argv[3] || 'driving'
if (!file) { console.error('usage: node scripts/itinerary-gmaps.mjs <itinerary.txt> [driving|walking|transit]'); process.exit(1) }

const days = []
let cur = null
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (!t) continue
  const h = t.match(/^#+\s*(?:D(\d+)|Day\s*(\d+))[\s:：-]*(.*)$/i)
  if (h) { cur = { day: 'D' + (h[1] || h[2]), city: (h[3] || '').trim(), stops: [], missing: [] }; days.push(cur); continue }
  if (!cur) { cur = { day: 'D?', city: '', stops: [], missing: [] }; days.push(cur) }
  const clean = t.replace(/^[-*·•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()
  if (!clean) continue
  const anchor = cityAnchor(cur.city)
  const p = resolve(clean, anchor)
  if (p && p.rejected) cur.missing.push(clean + '（库里同名点距' + cur.city + '约' + p.dist + 'km，疑似跨城同名，已拒收）')
  else if (p) cur.stops.push(p)
  else cur.missing.push(clean)
}

const out = []
for (const d of days) {
  const anchor = cityAnchor(d.city)
  out.push(`\n=== ${d.day} ${d.city || '(未写城市)'} ===`)
  if (anchor) out.push(`  锚点: ${anchor.name} ${anchor.lat.toFixed(4)},${anchor.lon.toFixed(4)}`)
  else if (d.city) out.push('  锚点: 无（城市不在库里，跨城同名无法核验）')
  if (!d.stops.length) { out.push('  无匹配点'); if (d.missing.length) out.push('  未匹配: ' + d.missing.join(' / ')); continue }
  d.stops.forEach((s, i) => {
    const label = String.fromCharCode(65 + (i % 26))
    const flags = []
    if (s.score < 1) flags.push('模糊 ' + s.score.toFixed(2))
    if (s.dist != null && s.dist > 60) flags.push('距城 ' + Math.round(s.dist) + 'km')
    out.push(`  ${label}. ${s.name}  [${s.kind}]  ${s.lat.toFixed(5)},${s.lon.toFixed(5)}${flags.length ? '  ⚠ ' + flags.join(' · ') : ''}`)
  })
  for (let i = 0; i < d.stops.length; i += MAX_POINTS - 1) {
    const chunk = d.stops.slice(i, i + MAX_POINTS)
    const tag = d.stops.length > MAX_POINTS ? `(${Math.floor(i / (MAX_POINTS - 1)) + 1})` : ''
    out.push(`  坐标版${tag}: ${url(chunk, mode, false)}`)
    out.push(`  名称版${tag}: ${url(chunk, mode, true)}`)
    if (i + MAX_POINTS >= d.stops.length) break
  }
  if (d.missing.length) out.push('  未匹配: ' + d.missing.join(' / '))
}
console.log(out.join('\n'))
