'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map-styles.css'
import { getAllEntities } from '@/lib/entity-store'
import { getCountryById } from '@/lib/data'
import { getCityCode } from '@/lib/quos-mapping'
import { getEntityMarkerColor, TYPE_ICONS, TYPE_LABELS, MAP } from '@/lib/config'
import { buildRoutePlan, routeSignature, formatLegLabel } from '@/lib/route-plan'
import europeBoundaries from '@/data/europe-boundaries.json'

// ISO_A2 → project countryId mapping
const ISO_TO_COUNTRY_ID = {
  'GB': 'united-kingdom', 'FR': 'france', 'DE': 'germany', 'IT': 'italy',
  'ES': 'spain', 'PT': 'portugal', 'NL': 'netherlands', 'BE': 'belgium',
  'CH': 'switzerland', 'AT': 'austria', 'GR': 'greece', 'SE': 'sweden',
  'NO': 'norway', 'DK': 'denmark', 'IE': 'ireland', 'PL': 'poland',
  'CZ': 'czech-republic', 'HU': 'hungary', 'HR': 'croatia', 'TR': 'turkey',
  'FI': 'finland', 'IS': 'iceland', 'EE': 'estonia', 'ME': 'montenegro',
}

// Fallback: match by NAME when ISO_A2 is broken (e.g. -99)
const NAME_TO_COUNTRY_ID = {
  'France': 'france',
  'Norway': 'norway',
}

// Reverse map: countryId → ISO code
const COUNTRY_ID_TO_ISO = {}
Object.entries(ISO_TO_COUNTRY_ID).forEach(([iso, id]) => {
  COUNTRY_ID_TO_ISO[id] = iso
})

function resolveCountryId(iso, name) {
  if (iso && ISO_TO_COUNTRY_ID[iso]) return ISO_TO_COUNTRY_ID[iso]
  if (name && NAME_TO_COUNTRY_ID[name]) return NAME_TO_COUNTRY_ID[name]
  return null
}

// 地图配色（与 globals.css 主题 token 同源：主蓝 #08739D / 辅蓝 #4984AC / 绿 #6D9D39 / 青柠 #AEC60C）
const ACCENT_LIGHT = '#08739D'
const ACCENT_DARK = '#4984AC'
const GOLD_LIGHT = '#6D9D39'
const GOLD_DARK = '#9bc554'
const ROUTE_COLOR_LIGHT = '#08739D'
const ROUTE_COLOR_DARK = '#4984AC'

// 按天配电板：前两位直接复用现有主题色（主蓝/辅蓝/绿/青柠系），其余由主题色系派生的相邻色相，
// 相邻天取相邻项 —— 色相+明度都拉开，连续几天的段不会糊成一条。
const DAY_COLORS_LIGHT = [
  ROUTE_COLOR_LIGHT, GOLD_LIGHT, '#C2740F', '#7A4FBF',
  '#C0392B', '#0E8A7D', '#2F6FA8', '#8A7A1F',
]
const DAY_COLORS_DARK = [
  ROUTE_COLOR_DARK, GOLD_DARK, '#E0A33A', '#A98BE8',
  '#E0687A', '#35C0AC', '#7FB4D8', '#D6C05A',
]

// 段标签样式（深浅色主题各一套）
function routeLabelStyle(isDark) {
  return {
    color: isDark ? '#cbd5e1' : '#64748b',
    background: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.85)',
    border: isDark ? '#334155' : '#e2e8f0',
  }
}

export default function MapCore({
  cities = [],
  itineraryCityIds = new Set(),
  routePoints = [],
  onCityClick,
  onCityAddToItinerary,
  dayLabels = [],
  onEntityAddToItinerary,
  panelCollapsed = false,
  panelWidth = 0,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const dayLabelMarkersRef = useRef([])
  const routeRef = useRef([])
  const arrowRouteRef = useRef([])
  const routeLabelRef = useRef([])
  const tileLayerRef = useRef(null)
  const geoJsonLayerRef = useRef(null)
  const entityLayerGroupRef = useRef(null)
  const onCityClickRef = useRef(onCityClick)
  const onAddRef = useRef(onCityAddToItinerary)
  const onEntityAddRef = useRef(onEntityAddToItinerary)
  const initRef = useRef(false)
  // [{ signature, plan }] —— OSRM 真实路线计划；签名与当前点集不一致时视为过期，退回直线
  const [planEntry, setPlanEntry] = useState(null)

  onCityClickRef.current = onCityClick
  onAddRef.current = onCityAddToItinerary
  onEntityAddRef.current = onEntityAddToItinerary

  const getThemeColors = useCallback(() => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    return {
      isDark,
      accent: isDark ? ACCENT_DARK : ACCENT_LIGHT,
      gold: isDark ? GOLD_DARK : GOLD_LIGHT,
      routeColor: isDark ? ROUTE_COLOR_DARK : ROUTE_COLOR_LIGHT,
      dayColors: isDark ? DAY_COLORS_DARK : DAY_COLORS_LIGHT,
    }
  }, [])

  // 行程点集（含天号）：直线兜底与真实几何共用同一份点数据
  const routeLine = useMemo(
    () => routePoints.map((p) => [p.lat, p.lng]),
    [routePoints],
  )
  const routeSig = useMemo(() => routeSignature(routePoints), [routePoints])

  // Initialize map
  useEffect(() => {
    if (initRef.current) return
    if (!containerRef.current) return
    initRef.current = true

    const map = L.map(containerRef.current, {
      center: MAP.initialCenter,
      zoom: MAP.initialZoom,
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: false,
    })

    mapRef.current = map

    if (cities.length > 0) {
      const lats = cities.map((c) => c.lat)
      const lngs = cities.map((c) => c.lng)
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
      map.setView([centerLat, centerLng], MAP.defaultZoom)
    }

    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      // Close any open popups/tooltips first to prevent _leaflet_pos errors
      try { map.closePopup() } catch {}
      try { map.closeTooltip() } catch {}
      // Remove all layers before destroying the map
      if (tileLayerRef.current) try { map.removeLayer(tileLayerRef.current) } catch {}
      if (geoJsonLayerRef.current) try { map.removeLayer(geoJsonLayerRef.current) } catch {}
      Object.values(markersRef.current).forEach((m) => { try { map.removeLayer(m) } catch {} })
      dayLabelMarkersRef.current.forEach((m) => { try { map.removeLayer(m) } catch {} })
      routeRef.current.forEach((l) => { try { map.removeLayer(l) } catch {} })
      arrowRouteRef.current.forEach((l) => { try { map.removeLayer(l) } catch {} })
      routeLabelRef.current.forEach((m) => { try { map.removeLayer(m) } catch {} })
      if (entityLayerGroupRef.current) try { map.removeLayer(entityLayerGroupRef.current) } catch {}
      try { map.remove() } catch {}
      mapRef.current = null
      initRef.current = false
      tileLayerRef.current = null
      geoJsonLayerRef.current = null
      markersRef.current = {}
      dayLabelMarkersRef.current = []
      routeRef.current = []
      arrowRouteRef.current = []
      routeLabelRef.current = []
      entityLayerGroupRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Tile layer + theme switching
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updateTiles = () => {
      const { isDark } = getThemeColors()

      if (tileLayerRef.current && mapRef.current) map.removeLayer(tileLayerRef.current)

      const url = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

      tileLayerRef.current = L.tileLayer(url, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map)
    }

    updateTiles()

    const observer = new MutationObserver(() => updateTiles())
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [getThemeColors])

  // Adjust map when side panel toggles
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // Delay to let CSS transition finish
    const timer = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(timer)
  }, [panelCollapsed, panelWidth])

  // GeoJSON country boundaries
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const geoJsonLayer = L.geoJSON(europeBoundaries, {
      className: 'country-boundary',
      style: () => ({
        fillColor: 'transparent',
        fillOpacity: 0,
        color: '#94a3b8',
        weight: 0.5,
        opacity: 0.3,
      }),
      onEachFeature: (feature, layer) => {
        const iso = feature.properties.ISO_A2
        const name = feature.properties.NAME
        const countryId = resolveCountryId(iso, name)

        if (countryId) {
          const country = getCountryById(countryId)
          const nameZh = country?.name || name
          const nameEn = country?.nameEn || ''
          const code = COUNTRY_ID_TO_ISO[countryId] || ''
          const label = [nameZh, nameEn, code].filter(Boolean).join(' ')
          layer.bindTooltip(label, {
            sticky: true,
            direction: 'top',
            opacity: 1,
          })
        }

        layer.on({
          mouseover: (e) => {
            const l = e.target
            l.setStyle({
              fillColor: '#f97316',
              fillOpacity: 0.08,
              weight: 1.5,
              opacity: 0.6,
              color: '#f97316',
            })
            if (countryId) {
              l.openTooltip()
            }
          },
          mouseout: (e) => {
            geoJsonLayer.resetStyle(e.target)
            e.target.closeTooltip()
          },
        })
      },
    }).addTo(map)

    geoJsonLayerRef.current = geoJsonLayer
    geoJsonLayer.bringToBack()

    return () => {
      if (mapRef.current) {
        mapRef.current.removeLayer(geoJsonLayer)
      }
      geoJsonLayerRef.current = null
    }
  }, [])

  // City markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const { isDark, accent, gold } = getThemeColors()

    Object.values(markersRef.current).forEach((m) => { if (mapRef.current) mapRef.current.removeLayer(m) })
    markersRef.current = {}

    cities.forEach((city) => {
      const inItinerary = itineraryCityIds.has(city.id)
      const fillColor = inItinerary ? gold : accent
      const radius = inItinerary ? 7 : 5

      const marker = L.circleMarker([city.lat, city.lng], {
        radius,
        fillColor,
        color: inItinerary ? gold : isDark ? '#122740' : '#ffffff',
        weight: inItinerary ? 2.5 : 1.5,
        fillOpacity: inItinerary ? 0.8 : 0.65,
      }).addTo(map)

      const cityCodeInfo = getCityCode(city.name, city.nameEn)
      const cityCode = cityCodeInfo?.cityCode || ''
      const tooltipParts = [city.name, city.nameEn, cityCode].filter(Boolean)
      marker.bindTooltip(
        `<span style="font-size:12px;font-weight:600">${tooltipParts.join(' ')}</span>`,
        { direction: 'top', offset: [0, -radius - 4], opacity: 0.95 },
      )

      // Click → popup with action menu
      marker.on('click', () => {
        const dayNumbers = dayLabels
          .filter((d) => d.cityId === city.id)
          .map((d) => d.label)
          .join(', ')

        const popupContent = document.createElement('div')
        popupContent.style.cssText = 'padding:4px;min-width:160px'

        const title = document.createElement('div')
        title.style.cssText =
          'font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:2px;font-family:var(--font-display,Geist,sans-serif)'
        title.textContent = city.name
        popupContent.appendChild(title)

        const subtitle = document.createElement('div')
        subtitle.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin-bottom:8px'
        subtitle.textContent = `${city.nameEn} · ${city.country.name}${dayNumbers ? ' · ' + dayNumbers : ''}`
        popupContent.appendChild(subtitle)

        const btnAdd = document.createElement('button')
        btnAdd.style.cssText =
          'display:block;width:100%;padding:5px 10px;margin-bottom:3px;border-radius:6px;font-size:12px;font-weight:500;border:none;cursor:pointer;text-align:left;background:var(--accent-strong,#0f766e);color:#fff'
        btnAdd.textContent = '+ 添加为新的一天'
        btnAdd.onclick = () => {
          if (onAddRef.current) onAddRef.current(city)
          marker.closePopup()
        }
        popupContent.appendChild(btnAdd)

        marker.bindPopup(popupContent, { maxWidth: 240, minWidth: 180, className: 'city-popup' })
        marker.openPopup()

        if (onCityClickRef.current) onCityClickRef.current(city)
      })

      // Hover effects
      marker.on('mouseover', function () {
        const r = inItinerary ? 9 : 8
        this.setRadius(r)
        this.setStyle({ fillOpacity: inItinerary ? 0.95 : 0.9, weight: 3 })
      })
      marker.on('mouseout', function () {
        const r = inItinerary ? 7 : 5
        this.setRadius(r)
        this.setStyle({
          fillOpacity: inItinerary ? 0.8 : 0.65,
          weight: inItinerary ? 2.5 : 1.5,
        })
      })

      markersRef.current[city.id] = marker
    })
  }, [cities, itineraryCityIds, dayLabels, getThemeColors])

  // Itinerary marker sizing（随行程城市集合变化更新半径/样式）
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([cityId, marker]) => {
      const inItinerary = itineraryCityIds.has(cityId)
      const baseRadius = inItinerary ? 7 : 5

      marker.setRadius(baseRadius)
      const { isDark, gold } = getThemeColors()
      marker.setStyle({
        fillOpacity: inItinerary ? 0.8 : 0.65,
        weight: inItinerary ? 2.5 : 1.5,
        color: inItinerary ? gold : isDark ? '#122740' : '#ffffff',
      })
    })
  }, [cities, itineraryCityIds, getThemeColors])

  // Day labels on itinerary cities
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    dayLabelMarkersRef.current.forEach((m) => { if (mapRef.current) map.removeLayer(m) })
    dayLabelMarkersRef.current = []

    dayLabels.forEach(({ cityId, label, lat, lng }) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:var(--accent-strong,#0f766e);
          color:#fff;
          font-size:10px;
          font-weight:700;
          padding:1px 5px;
          border-radius:3px;
          white-space:nowrap;
          box-shadow:0 1px 3px rgba(0,0,0,0.2);
          transform:translate(-50%, -160%);
          pointer-events:none;
        ">${label}</div>`,
        iconSize: [0, 0],
      })

      const labelMarker = L.marker([lat, lng], { icon, interactive: false }).addTo(map)
      dayLabelMarkersRef.current.push(labelMarker)
    })
  }, [dayLabels])

  // Entity markers (attractions, hotels, restaurants) — appear at zoom > MAP.entityVisibleZoom
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const entities = getAllEntities().filter((e) => e.lat != null && e.lng != null)
    if (entities.length === 0) return

    // Create layer group for all entity markers
    const layerGroup = L.layerGroup().addTo(map)
    entityLayerGroupRef.current = layerGroup

    entities.forEach((entity) => {
      const subtypeOrType = entity.type === 'attraction' ? entity.subtype || 'landmark' : entity.type
      const colors = getEntityMarkerColor(entity.type, entity.subtype)
      const icon = TYPE_ICONS[subtypeOrType] || TYPE_ICONS[entity.type] || '📍'

      const marker = L.circleMarker([entity.lat, entity.lng], {
        radius: 3.5,
        fillColor: colors.fill,
        color: colors.border,
        weight: 1,
        fillOpacity: 0.8,
      })

      marker.bindTooltip(
        `<span style="font-size:11px;font-weight:500">${icon} ${entity.name}</span>`,
        { direction: 'top', offset: [0, -6], opacity: 0.9 },
      )

      marker.on('click', () => {
        const popupContent = document.createElement('div')
        popupContent.style.cssText = 'padding:4px;min-width:160px'

        const title = document.createElement('div')
        title.style.cssText =
          'font-weight:700;font-size:13px;color:var(--text-primary);margin-bottom:2px;font-family:var(--font-display,Geist,sans-serif);display:flex;align-items:center;gap:4px'
        title.innerHTML = `${icon} ${entity.name}`
        popupContent.appendChild(title)

        const sub = document.createElement('div')
        sub.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin-bottom:2px'
        const label = TYPE_LABELS[subtypeOrType] || entity.type
        sub.textContent = `${label} · ${entity.cityName}${entity.countryName ? ' · ' + entity.countryName : ''}`
        popupContent.appendChild(sub)

        if (entity.notes) {
          const desc = document.createElement('div')
          desc.style.cssText =
            'font-size:11px;color:var(--text-secondary);margin-bottom:8px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'
          desc.textContent = entity.notes
          popupContent.appendChild(desc)
        }

        if (onEntityAddRef.current) {
          const btnAdd = document.createElement('button')
          btnAdd.style.cssText =
            'display:block;width:100%;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;border:none;cursor:pointer;text-align:left;background:var(--accent-strong,#0f766e);color:#fff'
          btnAdd.textContent = '+ 加入行程'
          btnAdd.onclick = () => {
            onEntityAddRef.current(entity)
            marker.closePopup()
          }
          popupContent.appendChild(btnAdd)
        }

        marker.bindPopup(popupContent, { maxWidth: 220, minWidth: 170, className: 'entity-popup' })
        marker.openPopup()
      })

      // Hover effect
      marker.on('mouseover', function () {
        this.setRadius(6)
        this.setStyle({ fillOpacity: 0.95, weight: 2.5 })
      })
      marker.on('mouseout', function () {
        this.setRadius(3.5)
        this.setStyle({ fillOpacity: 0.8, weight: 1 })
      })

      marker.addTo(layerGroup)
    })

    // Zoom-based visibility
    const updateVisibility = () => {
      if (!mapRef.current) return
      const zoom = map.getZoom()
      if (zoom > MAP.entityVisibleZoom) {
        if (!map.hasLayer(layerGroup)) layerGroup.addTo(map)
      } else {
        if (map.hasLayer(layerGroup)) map.removeLayer(layerGroup)
      }
    }
    updateVisibility()
    map.on('zoomend', updateVisibility)

    return () => {
      map.off('zoomend', updateVisibility)
      if (mapRef.current) {
        map.removeLayer(layerGroup)
      }
      entityLayerGroupRef.current = null
    }
  }, [])

  // Route plan：OSRM 真实里程/几何（刀1）
  // 每个行程点集只发一次请求（buildRoutePlan 内部按点集签名缓存）；失败自动回退 estimate，不阻塞地图。
  useEffect(() => {
    if (!routePoints || routePoints.length < 2) return
    let cancelled = false
    buildRoutePlan(routePoints)
      .then((plan) => {
        if (!cancelled) setPlanEntry({ signature: plan.signature, plan })
      })
      .catch(() => {
        if (!cancelled) setPlanEntry(null)
      })
    return () => { cancelled = true }
  }, [routePoints])

  // Route lines
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const { isDark, gold, routeColor, dayColors } = getThemeColors()

    routeRef.current.forEach((l) => { if (mapRef.current) mapRef.current.removeLayer(l) })
    arrowRouteRef.current.forEach((l) => { if (mapRef.current) mapRef.current.removeLayer(l) })
    routeLabelRef.current.forEach((m) => { if (mapRef.current) mapRef.current.removeLayer(m) })
    routeRef.current = []
    arrowRouteRef.current = []
    routeLabelRef.current = []

    if (routeLine.length < 2) return

    // 签名不匹配 → 计划属于旧点集，宁可用直线也不用错几何
    const plan = planEntry && planEntry.signature === routeSig ? planEntry.plan : null
    const realGeometry = plan && plan.source === 'osrm' && plan.legs.length > 0 &&
      plan.legs.every((l) => Array.isArray(l.geometry) && l.geometry.length >= 2)

    // 按天配色：第 i 段（离开第 i 天城市的 leg）取当天颜色，相邻天色相拉开
    const legColor = (leg, idx) => {
      const dayNumber = routePoints[leg?.fromIdx]?.dayNumber ?? idx + 1
      return dayColors[(Math.max(1, dayNumber) - 1) % dayColors.length]
    }

    if (realGeometry) {
      plan.legs.forEach((leg, idx) => {
        const color = legColor(leg, idx)
        routeRef.current.push(L.polyline(leg.geometry, {
          color,
          weight: 3,
          opacity: 0.85,
        }).addTo(map))
        // 保留原有金色流动虚线叠加层（按段重复，视觉一致）
        arrowRouteRef.current.push(L.polyline(leg.geometry, {
          color: gold,
          weight: 1.5,
          opacity: 0.9,
          dashArray: '4 12',
        }).addTo(map))
      })
    } else {
      // OSRM 失败/未就绪：回退到原来的点对点直线画法（不白屏）
      routeRef.current.push(L.polyline(routeLine, {
        color: routeColor,
        weight: 3,
        opacity: 0.7,
        dashArray: '10 6',
      }).addTo(map))
      arrowRouteRef.current.push(L.polyline(routeLine, {
        color: gold,
        weight: 1.5,
        opacity: 0.9,
        dashArray: '4 12',
      }).addTo(map))
    }

    // 段标签：数字只来自 OSRM（estimate 加 ~ 前缀且不显示时长）；没有计划时不显示数字，杜绝估算冒充真实值
    if (plan && plan.legs.length) {
      const style = routeLabelStyle(isDark)
      plan.legs.forEach((leg, idx) => {
        const text = formatLegLabel(leg, plan.source)
        if (!text) return
        let at = null
        if (Array.isArray(leg.geometry) && leg.geometry.length >= 2) {
          at = leg.geometry[Math.floor(leg.geometry.length / 2)] // 几何中点（真实路线的中间位置）
        } else {
          const a = routePoints[leg.fromIdx]
          const b = routePoints[leg.toIdx]
          if (!a || !b) return
          at = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2]
        }
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            font-size:11px;font-weight:600;white-space:nowrap;
            color:${style.color};
            background:${style.background};
            border:1px solid ${style.border};
            border-left:3px solid ${legColor(leg, idx)};
            border-radius:6px;padding:2px 6px;
            pointer-events:none;
          ">${text}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })
        routeLabelRef.current.push(L.marker(at, { icon, interactive: false }).addTo(map))
      })
    }
  }, [routeLine, routePoints, routeSig, planEntry, getThemeColors])

  const containerStyle = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
  if (!panelCollapsed && panelWidth > 0) {
    // Shrink the visible map area so center is in the middle of the left portion
    containerStyle.right = panelWidth
  }

  return <div ref={containerRef} style={containerStyle} />
}
