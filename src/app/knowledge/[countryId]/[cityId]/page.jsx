'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCityById, getAllCitiesWithCoords, getAllAttractionsFlat } from '@/lib/data'
import { getAllEntities, ensureSeeded } from '@/lib/entity-store'
import cityMeta from '@/data/city-meta.json'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import TypeBadge from '@/components/type-badge'
import EntityCard from '@/components/dictionary/entity-card'
import EntityDetail from '@/components/dictionary/entity-detail'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function CityPage() {
  const params = useParams()
  const { countryId, cityId } = params

  const city = getCityById(cityId)
  if (!city) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🏙️</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>城市未找到</p>
          <Link href="/knowledge" className="text-xs mt-2 inline-block" style={{ color: 'var(--accent)' }}>
            ← 返回知识库
          </Link>
        </div>
      </div>
    )
  }

  const [entityFilter, setEntityFilter] = useState([])
  const [selectedEntity, setSelectedEntity] = useState(null)

  // Seed entity store
  useEffect(() => { ensureSeeded(getAllAttractionsFlat) }, [])

  const meta = cityMeta[cityId] || {}
  const attractions = city.attractions || []

  // Merge JSON attractions + entity-store entities for this city
  const allCityItems = useMemo(() => {
    const attractionIds = new Set(attractions.map((a) => a.id))
    const items = []

    // JSON attractions
    attractions.forEach((a) => {
      items.push({
        ...a,
        _type: a.type || 'landmark',
        _href: `/knowledge/${countryId}/${cityId}/${a.id}`,
        _isStatic: true,
      })
    })

    // Entity-store entities (non-attraction: hotels, restaurants, etc.)
    const entities = getAllEntities().filter(
      (e) => e.cityId === cityId && !attractionIds.has(e.id),
    )
    entities.forEach((e) => {
      items.push({
        ...e,
        _type: e.type === 'attraction' ? e.subtype || 'landmark' : e.type,
        _href: null,
        _isStatic: false,
      })
    })

    return items
  }, [cityId, attractions])

  const filteredItems = useMemo(() => {
    if (entityFilter.length === 0) return allCityItems
    return allCityItems.filter((item) => entityFilter.includes(item._type))
  }, [allCityItems, entityFilter])

  // Available types in this city for filter chips
  const availableTypes = useMemo(() => {
    const types = new Set(allCityItems.map((item) => item._type))
    return [...types]
  }, [allCityItems])

  const FILTER_TYPES = [
    { key: 'landmark', icon: '🏛️', label: '景点' },
    { key: 'museum', icon: '🏺', label: '博物馆' },
    { key: 'nature', icon: '🌿', label: '自然' },
    { key: 'hotel', icon: '🏨', label: '酒店' },
    { key: 'restaurant', icon: '🍽️', label: '餐厅' },
    { key: 'transport', icon: '🚌', label: '交通' },
    { key: 'guide', icon: '🧑‍💼', label: '导游' },
  ]

  // Nearby cities (by geographic distance, cross-country)
  const allCities = getAllCitiesWithCoords()
  const nearbyCities = allCities
    .filter((c) => c.id !== cityId && city.lat != null && c.lat != null)
    .map((c) => ({
      ...c,
      distance: haversineKm(city.lat, city.lng, c.lat, c.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8)

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Breadcrumb */}
      <div className="px-4 md:px-6 py-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/knowledge" className="hover:text-[var(--accent)] transition-colors">知识库</Link>
          <span>/</span>
          <Link href={`/knowledge/${countryId}`} className="hover:text-[var(--accent)] transition-colors">
            {city.country?.name || countryId}
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{city.name}</span>
        </div>
      </div>

      {/* Hero postcard */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 mb-6">
        <div className="rounded-2xl overflow-hidden border shadow-lg" style={{ borderColor: 'var(--border-color)' }}>
          <ImageWithPlaceholder
            src={null}
            alt={city.name}
            name={city.name}
            subtitle={city.nameEn ? `${city.nameEn} · ${city.country?.name || ''}` : city.country?.name}
            size="hero"
            variant="city"
            cityName={city.name}
            countryName={city.country?.name}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
        {/* Description */}
        {meta.description && (
          <div className="mb-8">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {meta.description}
            </p>
          </div>
        )}

        {/* Type filter chips */}
        {availableTypes.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <button
              onClick={() => setEntityFilter([])}
              className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
              style={
                entityFilter.length === 0
                  ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
              }
            >
              全部 ({allCityItems.length})
            </button>
            {FILTER_TYPES.filter((t) => availableTypes.includes(t.key)).map(({ key, icon, label }) => {
              const count = allCityItems.filter((item) => item._type === key).length
              return (
                <button
                  key={key}
                  onClick={() =>
                    setEntityFilter((prev) =>
                      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
                    )
                  }
                  className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
                  style={
                    entityFilter.includes(key)
                      ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                      : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
                  }
                >
                  {icon} {label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Attractions + entities grid */}
        {filteredItems.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              🏛️ 景点
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const card = (
                  <>
                    <ImageWithPlaceholder
                      src={null}
                      alt={item.name}
                      type={item._type}
                      name={item.name}
                      size="card"
                      variant={item._type === 'hotel' || item._type === 'restaurant' ? 'attraction' : 'attraction'}
                    />
                    <div className="p-3">
                      <div className="mb-1">
                        <TypeBadge type={item._type} />
                      </div>
                      <h3 className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {item.description}
                        </p>
                      )}
                      {item.notes && !item.description && (
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </>
                )

                if (item._isStatic) {
                  return (
                    <Link
                      key={item.id}
                      href={item._href}
                      className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    >
                      {card}
                    </Link>
                  )
                }

                return (
                  <div key={item.id}>
                    <EntityCard entity={item} onClick={setSelectedEntity} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Nearby cities */}
        {nearbyCities.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
              🏙️ 周边城市
            </h2>
            <div className="flex flex-wrap gap-2">
              {nearbyCities.map((c) => (
                <Link
                  key={c.id}
                  href={`/knowledge/${c.country?.id || 'unknown'}/${c.id}`}
                  className="text-sm px-3 py-1.5 rounded-full border transition-all hover:bg-[var(--bg-surface)]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  {c.name}
                  <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
                    {c.country?.name} · {Math.round(c.distance)}km
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Entity detail panel */}
      {selectedEntity && (
        <EntityDetail
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  )
}
