'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import mapPoints from '@/data/my-maps-nordic.json'

const TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'

const KIND_LABEL = {
  city: '城市',
  hotel: '酒店',
  ktHotel: 'KT酒店',
  restaurant: '餐厅',
  attraction: '景点',
  venue: '场地',
  parking: '停车费',
}

const COLORS = {
  city: { line: '#075985', fill: '#0ea5e9' },
  hotel: { line: '#b45309', fill: '#f59e0b' },
  ktHotel: { line: '#6d28d9', fill: '#c4b5fd' },
  restaurant: { line: '#7c2d12', fill: '#fb7185' },
  attraction: { line: '#166534', fill: '#4ade80' },
  venue: { line: '#5b21b6', fill: '#a78bfa' },
  parking: { line: '#7f1d1d', fill: '#ef4444' },
}

const COUNTRIES = ['挪威', '瑞典', '芬兰', '丹麦', '冰岛']

function layerName(p) {
  return p.country + ' · ' + (KIND_LABEL[p.kind] || p.kind)
}

export default function NordicMapPage() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [stats, setStats] = useState({ total: mapPoints.length, hotels: 0, cities: 0 })

  useEffect(() => {
    let cancelled = false
    let ro = null

    setStats({
      total: mapPoints.length,
      hotels: mapPoints.filter((p) => p.kind === 'hotel').length,
      cities: mapPoints.filter((p) => p.kind === 'city').length,
    })

    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        preferCanvas: true,
      })
      mapRef.current = map

      L.tileLayer(TILE, {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
      }).addTo(map)

      const groups = {}
      const order = []
      for (const p of mapPoints) {
        const key = layerName(p)
        if (!groups[key]) {
          groups[key] = L.layerGroup()
          order.push(key)
        }
        const c = COLORS[p.kind] || COLORS.city
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: p.kind === 'city' ? 6 : 5,
          color: c.line,
          weight: 1.4,
          fillColor: c.fill,
          fillOpacity: 0.85,
        })
        const desc = p.desc
          ? '<div style="margin-top:4px;opacity:.75;max-height:120px;overflow:auto">' + p.desc + '</div>'
          : ''
        marker.bindPopup(
          '<div style="font-size:13px;line-height:1.45;min-width:160px"><b>' + p.name + '</b><br>' +
            '<span style="opacity:.55">' + layerName(p) + '</span>' + desc + '</div>'
        )
        marker.bindTooltip(p.name, { direction: 'top', offset: [0, -6] })
        marker.addTo(groups[key])
      }

      const byCountry = {}
      for (const key of order) {
        const country = key.split(' · ')[0]
        byCountry[country] = byCountry[country] || {}
        byCountry[country][key] = groups[key]
      }
      for (const country of COUNTRIES) {
        const sub = byCountry[country]
        if (!sub) continue
        for (const key of Object.keys(sub)) sub[key].addTo(map)
      }
      L.control.layers(null, groups, { collapsed: true, position: 'topright' }).addTo(map)

      const bounds = L.latLngBounds(mapPoints.map((p) => [p.lat, p.lon]))
      map.fitBounds(bounds, { padding: [30, 30] })

      ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(containerRef.current)
    })()

    return () => {
      cancelled = true
      if (ro) ro.disconnect()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const counts = {}
  for (const p of mapPoints) {
    const k = p.country + '·' + (KIND_LABEL[p.kind] || p.kind)
    counts[k] = (counts[k] || 0) + 1
  }

  return (
    <main className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b text-xs sm:text-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium shrink-0">北欧点位</span>
          <span className="opacity-60 truncate">
            去重后 {stats.total} 点 · 酒店 {stats.hotels} · 城市 {stats.cities}
          </span>
        </div>
        <span className="shrink-0 opacity-50">来源：My Maps KML（已合并去重）</span>
      </div>
      <div ref={containerRef} className="w-full flex-1" style={{ minHeight: 'calc(100vh - 120px)' }} />
      <div className="px-3 sm:px-5 py-2 border-t text-[11px] leading-relaxed opacity-70 flex flex-wrap gap-x-4 gap-y-1 shrink-0">
        {Object.keys(counts).sort().map((k) => (
          <span key={k}>{k} {counts[k]}</span>
        ))}
      </div>
    </main>
  )
}
