'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map-styles.css'
import europeBoundaries from '@/data/europe-boundaries.json'
import { getCityCode } from '@/lib/quos-mapping'

// ISO_A2 → 项目 countryId 映射（与 map-core.jsx 保持一致）
const ISO_TO_COUNTRY_ID = {
  'GB': 'united-kingdom', 'FR': 'france', 'DE': 'germany', 'IT': 'italy',
  'ES': 'spain', 'PT': 'portugal', 'NL': 'netherlands', 'BE': 'belgium',
  'CH': 'switzerland', 'AT': 'austria', 'GR': 'greece', 'SE': 'sweden',
  'NO': 'norway', 'DK': 'denmark', 'IE': 'ireland', 'PL': 'poland',
  'CZ': 'czech-republic', 'HU': 'hungary', 'HR': 'croatia', 'TR': 'turkey',
  'FI': 'finland', 'IS': 'iceland', 'EE': 'estonia', 'ME': 'montenegro',
}

const NAME_TO_COUNTRY_ID = {
  'France': 'france',
  'Norway': 'norway',
}

function resolveCountryId(iso, name) {
  if (iso && ISO_TO_COUNTRY_ID[iso]) return ISO_TO_COUNTRY_ID[iso]
  if (name && NAME_TO_COUNTRY_ID[name]) return NAME_TO_COUNTRY_ID[name]
  return null
}

// 国家页 Hero 里的迷你地图：显示当前国家轮廓（高亮）+ 该国家所有城市点位。
export default function CountryMap({ countryId, cities = [] }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false, // hero 内不抢页面滚动
      attributionControl: false,
    })
    mapRef.current = map

    requestAnimationFrame(() => map.invalidateSize())
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'
    const tileUrl = () =>
      isDark()
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

    let tileLayer = L.tileLayer(tileUrl(), {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map)

    // 国家边界：当前国家高亮，其余淡显
    const boundaryLayer = L.geoJSON(europeBoundaries, {
      className: 'country-boundary',
      style: (feature) => {
        const id = resolveCountryId(feature.properties.ISO_A2, feature.properties.NAME)
        if (id === countryId) {
          return { color: '#08739D', weight: 2, fillColor: '#08739D', fillOpacity: 0.08 }
        }
        return { color: '#94a3b8', weight: 0.5, opacity: 0.3, fillColor: 'transparent', fillOpacity: 0 }
      },
    }).addTo(map)

    // 城市点位
    const cityLayer = L.layerGroup().addTo(map)
    const points = []
    cities.forEach((city) => {
      if (city.lat == null || city.lng == null) return
      points.push([city.lat, city.lng])
      const code = getCityCode(city.name, city.nameEn)?.cityCode || ''
      const parts = [city.name, city.nameEn, code].filter(Boolean)
      const marker = L.circleMarker([city.lat, city.lng], {
        radius: 5,
        fillColor: '#08739D',
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.85,
      })
      marker.bindTooltip(
        `<span style="font-size:12px;font-weight:600">${parts.join(' ')}</span>`,
        { direction: 'top', offset: [0, -7], opacity: 0.95 },
      )
      marker.addTo(cityLayer)
    })

    // 视口：优先按城市点 fitBounds；单点 setView；无点回退按国家边界
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [24, 24], maxZoom: 8 })
    } else if (points.length === 1) {
      map.setView(points[0], 7)
    } else {
      boundaryLayer.eachLayer((layer) => {
        const f = layer.feature
        if (f && resolveCountryId(f.properties?.ISO_A2, f.properties?.NAME) === countryId && layer.getBounds) {
          map.fitBounds(layer.getBounds(), { padding: [16, 16] })
        }
      })
    }

    // 主题切换时换瓦片
    const observer = new MutationObserver(() => {
      if (!mapRef.current) return
      tileLayer.remove()
      tileLayer = L.tileLayer(tileUrl(), {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }).addTo(map)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [countryId, cities])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
