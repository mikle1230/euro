'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCityById, getAllCitiesWithCoords } from '@/lib/data'
import cityMeta from '@/data/city-meta.json'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import TypeBadge from '@/components/type-badge'
import KnowledgeTopBar from '@/components/knowledge-top-bar'
import { getCountryAccent } from '@/lib/skin'
import { getCityImagePath, getAttractionImagePath } from '@/lib/images'
import { haversineKm } from '@/lib/geo'

export default function CityPage() {
  const params = useParams()
  const { countryId, cityId } = params
  const [typeFilter, setTypeFilter] = useState([])

  // 同景点页：URL 的 country 段必须与城市真实归属一致，避免 /knowledge/<任意国>/<城> 张冠李戴
  const foundCity = getCityById(cityId)
  const city = foundCity && foundCity.country?.id === countryId ? foundCity : null
  // E 皮肤：国家色条（同一国家在各级页面同色，色表见 lib/skin.js）
  const accent = getCountryAccent(countryId)
  if (!city) {
    return (
      <div className="min-h-full flex items-center justify-center" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
        <div className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>城市未找到</p>
          <Link href="/knowledge" className="text-xs mt-2 inline-block" style={{ color: 'var(--accent)' }}>
            ← 返回城市库
          </Link>
        </div>
      </div>
    )
  }

  const meta = cityMeta[cityId] || {}
  const attractions = city.attractions || []

  // 城市库仅展示人工维护的景点数据（europe-travel.json），不合并导入解析出的实体。
  // 数据为静态 JSON、数组很小，直接计算即可，无需 useMemo。
  const allItems = attractions.map((a) => ({
    ...a,
    _type: a.type || 'landmark',
    _href: `/knowledge/${countryId}/${cityId}/${a.id}`,
  }))

  const filteredItems = typeFilter.length === 0
    ? allItems
    : allItems.filter((item) => typeFilter.includes(item._type))

  const availableTypes = [...new Set(allItems.map((item) => item._type))]

  const FILTER_TYPES = [
    { key: 'landmark', label: '地标' },
    { key: 'museum', label: '博物馆' },
    { key: 'nature', label: '自然' },
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
    <div className="min-h-full" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
      {/* 吸顶工具条：面包屑 + 全局搜索（搜索框全程停留在顶部，随时可检索） */}
      <KnowledgeTopBar
        crumbs={[
          { label: '城市库', href: '/knowledge' },
          { label: city.country?.name || countryId, href: `/knowledge/${countryId}` },
          { label: city.name },
        ]}
        flagCountryId={city.country?.id || countryId}
      />

      {/* Hero postcard：PPT 式左右分栏 —— 左半边城市图，右半边蒙版文字（与国家页全幅蒙版区分） */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 mb-6">
        <div className="rounded-2xl overflow-hidden border md:flex" style={{ borderColor: 'var(--border-color)' }}>
          {/* 左：城市图（移动端在上，16/9；桌面端填满左栏高度） */}
          <div className="md:w-1/2 shrink-0">
            <ImageWithPlaceholder
              src={getCityImagePath(cityId)}
              alt={city.name}
              name={city.name}
              subtitle={city.nameEn ? `${city.nameEn} · ${city.country?.name || ''}` : city.country?.name}
              size="hero"
              variant="city"
              className="md:h-full md:aspect-auto"
            />
          </div>
          {/* 右：蒙版 + 文字（城市名/英文名/国家/描述） */}
          <div
            className="e-city-hero-mask md:w-1/2 p-6 md:p-8 flex flex-col justify-center"
          >
            <h1 className="text-white font-display font-bold text-2xl md:text-3xl mb-2">
              {city.name}
              {city.nameEn && (
                <span className="text-lg md:text-xl font-normal ml-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{city.nameEn}</span>
              )}
            </h1>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {city.country?.flag || ''} {city.country?.name || ''}
            </p>
            {meta.description && (
              <p className="text-sm md:text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.94)' }}>
                {meta.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
        {/* Type filter chips */}
        {availableTypes.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <button
              onClick={() => setTypeFilter([])}
              className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
              style={
                typeFilter.length === 0
                  ? { background: 'var(--accent-strong)', color: 'var(--on-accent-strong)', borderColor: 'var(--accent)' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
              }
            >
              全部 ({allItems.length})
            </button>
            {FILTER_TYPES.filter((t) => availableTypes.includes(t.key)).map(({ key, label }) => {
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
                      ? { background: 'var(--accent-strong)', color: 'var(--on-accent-strong)', borderColor: 'var(--accent)' }
                      : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
                  }
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Attractions grid */}
        {filteredItems.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              探索
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Link
                  key={item.id}
                  href={item._href}
                  className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderLeft: `6px solid ${accent}` }}
                >
                  <ImageWithPlaceholder
                    src={getAttractionImagePath(item.id)}
                    alt={item.name}
                    type={item._type}
                    name={item.name}
                    size="card"
                    variant="attraction"
                  />
                  <div className="p-3 card-body">
                    <div className="mb-1">
                      <TypeBadge type={item._type} />
                    </div>
                    <h3 className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                      {item.name}
                      {item.nameEn && <span className="ml-1 font-normal" style={{ color: 'var(--text-tertiary)' }}>{item.nameEn}</span>}
                    </h3>
                    {item.description && (
                      <p className="text-xs line-clamp-2 card-desc" style={{ color: 'var(--text-secondary)' }}>
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
              周边城市
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
