'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAllCitiesWithCoords, getAllAttractionsFlat } from '@/lib/data'

const TYPE_CONFIG = {
  landmark: { icon: '🏰', label: '地标' },
  museum: { icon: '🏛️', label: '博物馆' },
  nature: { icon: '🌿', label: '自然' },
}

export default function Database({
  cities: _cities,
  activeItinerary,
  onAddToItinerary,
  onSearchHighlight,
}) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('cities')
  const [attrTab, setAttrTab] = useState('all') // 'all' | type key

  const allCities = useMemo(() => {
    if (typeof window === 'undefined') return []
    return getAllCitiesWithCoords()
  }, [])

  const allAttractions = useMemo(() => {
    if (typeof window === 'undefined') return []
    return getAllAttractionsFlat()
  }, [])

  // Itinerary city ID set for checkmarks
  const itineraryCityIds = useMemo(() => {
    if (!activeItinerary) return new Set()
    return new Set(activeItinerary.days.map((d) => d.cityId).filter(Boolean))
  }, [activeItinerary])

  // Filtered cities
  const filteredCities = useMemo(() => {
    if (!search) return allCities
    const q = search.toLowerCase()
    return allCities.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.country.name.toLowerCase().includes(q)
    )
  }, [allCities, search])

  // Filtered attractions
  const filteredAttractions = useMemo(() => {
    let list = allAttractions
    if (attrTab !== 'all') {
      list = list.filter((a) => a.type === attrTab)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.city.name.toLowerCase().includes(q) ||
        a.country.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
      )
    }
    return list
  }, [allAttractions, attrTab, search])

  // Attraction type counts
  const typeCounts = useMemo(() => {
    const counts = { all: allAttractions.length }
    allAttractions.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1
    })
    return counts
  }, [allAttractions])

  // Emit highlighted city IDs when searching
  useEffect(() => {
    if (onSearchHighlight) {
      if (search.trim()) {
        onSearchHighlight(filteredCities.map((c) => c.id))
      } else {
        onSearchHighlight([])
      }
    }
    return () => {
      if (onSearchHighlight) onSearchHighlight([])
    }
  }, [search, filteredCities, onSearchHighlight])

  const tabs = [
    { key: 'cities', label: '城市', icon: '🏙️', count: allCities.length },
    { key: 'attractions', label: '景点', icon: '🏛️', count: allAttractions.length },
  ]

  const handleAddCity = (city) => {
    if (onAddToItinerary) onAddToItinerary(city)
  }

  return (
    <div className="p-3">
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'cities' ? '搜索城市、国家...' : '搜索景点、城市...'}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: tab === t.key ? 'var(--accent)' : 'var(--bg-surface)',
              color: tab === t.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {t.icon} {t.label}
            <span style={{ opacity: 0.6 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Cities tab */}
      {tab === 'cities' && (
        <div className="flex flex-col gap-1">
          {filteredCities.map((city) => {
            const inItinerary = itineraryCityIds.has(city.id)
            return (
              <div
                key={city.id}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer group"
              >
                <span className="text-lg shrink-0">{inItinerary ? '📍' : '🏙️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {city.name}
                    </p>
                    {inItinerary && (
                      <span className="text-xs shrink-0" style={{ color: 'var(--accent)' }}>✓ 已加入</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {city.nameEn} · {city.country.name}
                    {city.attractionCount ? ` · ${city.attractionCount} 景点` : ''}
                  </p>
                </div>
                {activeItinerary && (
                  <button
                    onClick={() => handleAddCity(city)}
                    className="px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    + 加入行程
                  </button>
                )}
              </div>
            )
          })}
          {filteredCities.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-tertiary)' }}>
              没有找到匹配的城市
            </p>
          )}
        </div>
      )}

      {/* Attractions tab */}
      {tab === 'attractions' && (
        <>
          {/* Type filter chips */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {[
              { key: 'all', icon: '📋', label: '全部' },
              { key: 'landmark', icon: '🏰', label: '地标' },
              { key: 'museum', icon: '🏛️', label: '博物馆' },
              { key: 'nature', icon: '🌿', label: '自然' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setAttrTab(key)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all"
                style={{
                  background: attrTab === key ? 'var(--accent)' : 'var(--bg-surface)',
                  color: attrTab === key ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {icon} {label}
                <span style={{ opacity: 0.6 }}>{typeCounts[key] || 0}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {filteredAttractions.map((attr) => {
              const typeCfg = TYPE_CONFIG[attr.type] || { icon: '📍', label: attr.type }
              return (
                <div
                  key={attr.id}
                  className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors group"
                >
                  <span className="text-lg shrink-0 mt-0.5">{typeCfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {attr.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {typeCfg.label} · {attr.city.name}, {attr.country.name}
                    </p>
                    {attr.description && (
                      <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                        {attr.description}
                      </p>
                    )}
                    {attr.tips && (
                      <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>
                        💡 {attr.tips}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredAttractions.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: 'var(--text-tertiary)' }}>
                没有找到匹配的景点
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
