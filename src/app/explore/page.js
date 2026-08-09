'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import FloatingPanel from '@/components/floating-panel'
import { getAllCitiesWithCoords, getAllAttractionsFlat } from '@/lib/data'
import { getActiveItinerary, addDay } from '@/lib/itinerary-store'
import { ensureSeeded } from '@/lib/entity-store'

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
  const [activeItinerary, setActiveItinerary] = useState(null)
  const [ready, setReady] = useState(false)
  const [hoveredDayId, setHoveredDayId] = useState(null)
  const [highlightedCityIds, setHighlightedCityIds] = useState(new Set())

  useEffect(() => {
    const c = getAllCitiesWithCoords()
    setCities(c)
    setActiveItinerary(getActiveItinerary())
    setReady(true)
    // Seed entity store from built-in attraction data
    ensureSeeded(getAllAttractionsFlat)
  }, [])

  const routeLine = useMemo(() => {
    if (!ready || !activeItinerary) return []
    return activeItinerary.days
      .map((d) => {
        const city = cities.find((c) => c.id === d.cityId)
        return city ? [city.lat, city.lng] : null
      })
      .filter(Boolean)
  }, [ready, activeItinerary, cities])

  const itineraryCityIds = useMemo(() => {
    const ids = new Set()
    if (ready && activeItinerary) {
      activeItinerary.days.forEach((d) => { if (d.cityId) ids.add(d.cityId) })
    }
    return ids
  }, [ready, activeItinerary])

  const dayLabels = useMemo(() => {
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
  }, [ready, activeItinerary, cities])

  const hoveredCityId = useMemo(() => {
    if (!hoveredDayId || !activeItinerary) return null
    const day = activeItinerary.days.find((d) => d.id === hoveredDayId)
    return day?.cityId || null
  }, [hoveredDayId, activeItinerary])

  const handleItineraryChange = useCallback((it) => {
    setActiveItinerary(it)
  }, [])

  const handleCityClick = useCallback((city) => {
    // This is called alongside popup display, for reference
  }, [])

  const handleCityAddToItinerary = useCallback(
    (city) => {
      if (!activeItinerary) return
      addDay(activeItinerary.id, city.id, city.name)
      const raw = localStorage.getItem('euro-itineraries')
      if (raw) {
        const data = JSON.parse(raw)
        const updated = data.itineraries?.find((t) => t.id === activeItinerary.id)
        if (updated) setActiveItinerary(updated)
      }
    },
    [activeItinerary],
  )

  const handleAddToItinerary = useCallback(
    (city) => {
      if (!activeItinerary) return
      addDay(activeItinerary.id, city.id, city.name)
      const raw = localStorage.getItem('euro-itineraries')
      if (raw) {
        const data = JSON.parse(raw)
        const updated = data.itineraries?.find((t) => t.id === activeItinerary.id)
        if (updated) setActiveItinerary(updated)
      }
    },
    [activeItinerary],
  )

  const handleDayHover = useCallback((dayId) => {
    setHoveredDayId(dayId)
  }, [])

  const handleSearchHighlight = useCallback((cityIds) => {
    setHighlightedCityIds(new Set(cityIds))
  }, [])

  const handleEntityAddToItinerary = useCallback(
    (entity) => {
      if (!activeItinerary) return
      if (entity.cityId) {
        addDay(activeItinerary.id, entity.cityId, entity.cityName)
        const raw = localStorage.getItem('euro-itineraries')
        if (raw) {
          const data = JSON.parse(raw)
          const updated = data.itineraries?.find((t) => t.id === activeItinerary.id)
          if (updated) setActiveItinerary(updated)
        }
      }
    },
    [activeItinerary],
  )

  return (
    <main style={{ flex: 1, position: 'relative' }}>
        {ready ? (
          <MapCore
            cities={cities}
            itineraryCityIds={itineraryCityIds}
            routeLine={routeLine}
            onCityClick={handleCityClick}
            onCityAddToItinerary={handleCityAddToItinerary}
            hoveredCityId={hoveredCityId}
            highlightedCityIds={highlightedCityIds}
            dayLabels={dayLabels}
            onEntityAddToItinerary={handleEntityAddToItinerary}
          />
        ) : (
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
        )}

        {ready && (
          <FloatingPanel
            cities={cities}
            activeItinerary={activeItinerary}
            onItineraryChange={handleItineraryChange}
            onCityClick={handleCityClick}
            onAddToItinerary={handleAddToItinerary}
            onDayHover={handleDayHover}
            onSearchHighlight={handleSearchHighlight}
          />
        )}
      </main>
  )
}
