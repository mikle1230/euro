'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCityById, getAllCitiesWithCoords } from '@/lib/data'
import cityMeta from '@/data/city-meta.json'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import TypeBadge from '@/components/type-badge'
import { haversineKm } from '@/lib/geo'

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
            ← 返回城市库
          </Link>
        </div>
      </div>
    )
  }

  const [typeFilter, setTypeFilter] = useState([])
  const meta = cityMeta[cityId] || {}
  const attractions = city.attractions || []

  // 城市库仅展示人工维护的景点数据（europe-travel.json），不合并导入解析出的实体
  const allItems = useMemo(() => attractions.map((a) => ({
    ...a,
    _type: a.type || 'landmark',
    _href: `/knowledge/${countryId}/${cityId}/${a.id}`,
  })), [attractions, countryId, cityId])

  const filteredItems = useMemo(() => {
    if (typeFilter.length === 0) return allItems
    return allItems.filter((item) => typeFilter.includes(item._type))
  }, [allItems, typeFilter])

  const availableTypes = useMemo(
    () => [...new Set(allItems.map((item) => item._type))],
    [allItems],
  )

  const FILTER_TYPES = [
    { key: 'landmark', icon: '🏛️', label: '景点' },
    { key: 'museum', icon: '🏺', label: '博物馆' },
    { key: 'nature', icon: '🌿', label: '自然' },
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
      {/* Breadcrumb（吸顶，滚动时随时返回上级） */}
      <div className="sticky top-0 z-40 border-b px-4 md:px-6 py-3" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/knowledge" className="hover:text-[var(--accent)] transition-colors">城市库</Link>
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
              onClick={() => setTypeFilter([])}
              className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
              style={
                typeFilter.length === 0
                  ? { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
              }
            >
              全部 ({allItems.length})
            </button>
            {FILTER_TYPES.filter((t) => availableTypes.includes(t.key)).map(({ key, icon, label }) => {
              const count = allItems.filter((item) => item._type === key).length
              return (
                <button
                  key={key}
                  onClick={() =>
                    setTypeFilter((prev) =>
                      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
                    )
                  }
                  className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
                  style={
                    typeFilter.includes(key)
                      ? { background: 'var(--accent-strong)', color: '#fff', borderColor: 'var(--accent)' }
                      : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
                  }
                >
                  {icon} {label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Attractions grid */}
        {filteredItems.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              📍 探索
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Link
                  key={item.id}
                  href={item._href}
                  className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <ImageWithPlaceholder
                    src={null}
                    alt={item.name}
                    type={item._type}
                    name={item.name}
                    size="card"
                    variant="attraction"
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
                  </div>
                </Link>
              ))}
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
    </div>
  )
}
