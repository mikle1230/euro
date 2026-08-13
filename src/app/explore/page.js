'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import FloatingPanel from '@/components/floating-panel'
import { getAllCitiesWithCoords, getAllAttractionsFlat } from '@/lib/data'
import { useItineraries, addDay } from '@/lib/itinerary-store'
import { ensureSeeded } from '@/lib/entity-store'
import { useIsMobile } from '@/lib/use-is-mobile'

const MapCore = dynamic(() => import('../../components/map-core'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full mx-auto mb-3 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>加载地图中...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const [cities, setCities] = useState([])
  const [ready, setReady] = useState(false)
  const [hoveredDayId, setHoveredDayId] = useState(null)
  const [highlightedCityIds, setHighlightedCityIds] = useState(new Set())
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 360
    return Math.max(360, Math.min(700, Math.floor(window.innerWidth * 0.5)))
  })
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState('list') // 'list' | 'map'

  // 响应式订阅行程 store：任意 mutation 后自动重渲染，activeId 驱动当前行程
  const { itineraries, activeId } = useItineraries()

  useEffect(() => {
    setCities(getAllCitiesWithCoords())
    setReady(true)
    // Seed entity store from built-in attraction data
    ensureSeeded(getAllAttractionsFlat)
  }, [])

  const activeItinerary = activeId
    ? itineraries.find((t) => t.id === activeId) || itineraries[0] || null
    : itineraries[0] || null

  const routeLine = !ready || !activeItinerary ? [] : activeItinerary.days
    .map((d) => {
      const city = cities.find((c) => c.id === d.cityId)
      return city ? [city.lat, city.lng] : null
    })
    .filter(Boolean)

  const itineraryCityIds = (() => {
    const ids = new Set()
    if (ready && activeItinerary) {
      activeItinerary.days.forEach((d) => { if (d.cityId) ids.add(d.cityId) })
    }
    return ids
  })()

  const dayLabels = (() => {
    if (!ready || !activeItinerary) return []
    const cityDayMap = {}
    activeItinerary.days.forEach((d) => {
      if (d.cityId) {
        if (!cityDayMap[d.cityId]) cityDayMap[d.cityId] = []
        cityDayMap[d.cityId].push(d.dayNumber)
      }
    })
    return Object.entries(cityDayMap).map(([cityId, dayNums]) => {
      const city = cities.find((c) => c.id === cityId)
      const label = dayNums.length === 1 ? `D${dayNums[0]}` : `D${dayNums.join(',')}`
      return { cityId, label, lat: city?.lat || 0, lng: city?.lng || 0 }
    })
  })()

  const hoveredCityId = (() => {
    if (!hoveredDayId || !activeItinerary) return null
    const day = activeItinerary.days.find((d) => d.id === hoveredDayId)
    return day?.cityId || null
  })()

  const handleCityClick = useCallback(() => {
    // Called alongside popup display, for reference
  }, [])

  const handleAddCityToItinerary = useCallback(
    (city) => {
      if (!activeItinerary) return
      addDay(activeItinerary.id, city.id, city.name)
    },
    [activeItinerary],
  )

  const handleEntityAddToItinerary = useCallback(
    (entity) => {
      if (!activeItinerary) return
      if (entity.cityId) addDay(activeItinerary.id, entity.cityId, entity.cityName)
    },
    [activeItinerary],
  )

  const handleDayHover = useCallback((dayId) => {
    setHoveredDayId(dayId)
  }, [])

  const handleSearchHighlight = useCallback((cityIds) => {
    setHighlightedCityIds(new Set(cityIds))
  }, [])

  const showMap = !isMobile || mobileView === 'map'
  const showPanel = !isMobile || mobileView === 'list'

  return (
    <main style={{ flex: 1, position: 'relative' }}>
      {!ready ? (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 animate-pulse"
              style={{ background: 'var(--bg-elevated)' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>加载中...</p>
          </div>
        </div>
      ) : (
        <>
          {showMap && (
            <MapCore
              cities={cities}
              itineraryCityIds={itineraryCityIds}
              routeLine={routeLine}
              onCityClick={handleCityClick}
              onCityAddToItinerary={handleAddCityToItinerary}
              hoveredCityId={hoveredCityId}
              highlightedCityIds={highlightedCityIds}
              dayLabels={dayLabels}
              onEntityAddToItinerary={handleEntityAddToItinerary}
              panelCollapsed={isMobile ? true : panelCollapsed}
              panelWidth={isMobile ? 0 : panelWidth}
            />
          )}
          {showPanel && (
            <FloatingPanel
              isMobile={isMobile}
              cities={cities}
              activeItinerary={activeItinerary}
              onCityClick={handleCityClick}
              onAddToItinerary={handleAddCityToItinerary}
              onDayHover={handleDayHover}
              onSearchHighlight={handleSearchHighlight}
              collapsed={panelCollapsed}
              onCollapsedChange={setPanelCollapsed}
              panelWidth={panelWidth}
              onWidthChange={setPanelWidth}
            />
          )}
        </>
      )}

      {isMobile && ready && (
        <button
          onClick={() => setMobileView((v) => (v === 'list' ? 'map' : 'list'))}
          className="fixed z-[1100] right-4 bottom-5 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full font-medium text-sm shadow-lg border"
          style={{ background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }}
        >
          <span>{mobileView === 'list' ? '🗺️' : '📋'}</span>
          <span>{mobileView === 'list' ? '地图' : '清单'}</span>
        </button>
      )}
    </main>
  )
}
