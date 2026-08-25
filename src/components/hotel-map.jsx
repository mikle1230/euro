'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import europeBoundaries from '@/data/europe-boundaries.json'
import { getHotelMapData } from '@/lib/hotel-map'

// 分层：zoom < CITY_ZOOM 只显示国家首都点 + 国家轮廓；>= CITY_ZOOM 显示城市酒店点位
const CITY_ZOOM = 6

export default function HotelMap({ height = '100%' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const capitalLayerRef = useRef(null)
  const cityLayerRef = useRef(null)
  const countryLayerRef = useRef(null)
  const hoveredRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { minZoom: 3, maxZoom: 14, zoomControl: true })
    mapRef.current = map

    // 动态加载的容器初始尺寸可能为 0，必须 invalidateSize 否则无法缩放/交互
    requestAnimationFrame(() => map.invalidateSize())
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    // 底图（暗色/明色瓦片，与首页一致的 CartoDB）
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 18,
    }).addTo(map)

    // 初始视野：欧洲中部
    map.setView([48.5, 10.5], 4)

    const data = getHotelMapData()

    // 国家轮廓（hover 高亮）
    countryLayerRef.current = L.geoJSON(europeBoundaries, {
      style: () => ({ color: '#4984AC', weight: 0.8, fillColor: '#4984AC', fillOpacity: 0.03 }),
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: () => {
            hoveredRef.current = layer
            layer.setStyle({ fillOpacity: 0.25, weight: 1.4, color: '#08739D' })
          },
          mouseout: () => {
            if (hoveredRef.current === layer) {
              hoveredRef.current = null
              layer.setStyle({ fillOpacity: 0.03, weight: 0.8, color: '#4984AC' })
            }
          },
        })
      },
    }).addTo(map)

    // ---- 国家层：有酒店的国家 → 首都点 ----
    capitalLayerRef.current = L.layerGroup().addTo(map)
    for (const cap of data.capitals) {
      const icon = L.divIcon({
        className: 'hotel-capital-marker',
        html: `<div class="hc-icon">${cap.flag}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const marker = L.marker([cap.lat, cap.lng], { icon }).addTo(capitalLayerRef.current)
      marker.bindTooltip(`${cap.nameZh} · ${cap.hotelCount} 家酒店`, { direction: 'top', offset: [0, -14] })
    }

    // ---- 城市层：酒店点位（zoom 高时显示）----
    cityLayerRef.current = L.layerGroup()
    for (const cinfo of data.cityHotels) {
      const icon = L.divIcon({
        className: 'hotel-city-marker',
        html: '<div class="hc-hotel"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      const marker = L.marker([cinfo.lat, cinfo.lng], { icon }).addTo(cityLayerRef.current)
      const names = cinfo.hotels.map((h) => h.bookingName || h.hotel).join('<br/>')
      marker.bindTooltip(`<b>${cinfo.cityZh}</b><br/>${names}`, { direction: 'top', offset: [0, -10] })
    }

    // 初始按 zoom 切层
    const updateLayers = () => {
      const large = map.getZoom() >= CITY_ZOOM
      if (large) {
        if (!map.hasLayer(cityLayerRef.current)) cityLayerRef.current.addTo(map)
        if (map.hasLayer(capitalLayerRef.current)) map.removeLayer(capitalLayerRef.current)
      } else {
        if (!map.hasLayer(capitalLayerRef.current)) capitalLayerRef.current.addTo(map)
        if (map.hasLayer(cityLayerRef.current)) map.removeLayer(cityLayerRef.current)
      }
    }
    map.on('zoomend', updateLayers)
    updateLayers()

    // 样式注入
    if (!document.getElementById('hotel-map-styles')) {
      const s = document.createElement('style')
      s.id = 'hotel-map-styles'
      s.textContent = `
        .hc-icon { background: transparent; font-size: 22px; line-height: 32px; text-align: center; text-shadow: 0 0 3px #fff; }
        .hotel-city-marker { }
        .hc-hotel { width: 14px; height: 14px; border-radius: 50%; background: #08739D; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
      `
      document.head.appendChild(s)
    }

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} style={{ height, width: '100%' }} />
}
