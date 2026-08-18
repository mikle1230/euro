'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAllCountries, getCountryCoverImage, getStats, getAllAttractionsFlat } from '@/lib/data'
import { ensureSeeded } from '@/lib/entity-store'
import countryMeta from '@/data/country-meta.json'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import GlobalSearch from '@/components/global-search'

export default function KnowledgePage() {
  const [stats, setStats] = useState({ countryCount: 0, cityCount: 0, attractionCount: 0 })
  const [countries, setCountries] = useState([])

  useEffect(() => {
    ensureSeeded(getAllAttractionsFlat)
    setStats(getStats())
    setCountries(getAllCountries())
  }, [])

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Breadcrumb + stats + 搜索（从顶部导航栏移入城市库内部） */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
              📖 城市库
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              共 {stats.countryCount} 个国家 · {stats.cityCount} 个城市 · {stats.attractionCount}+ 个景点
            </p>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <GlobalSearch wide />
          </div>
        </div>

        {/* Country grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {countries.map((country) => {
            const meta = countryMeta[country.id] || {}
            const coverSrc = getCountryCoverImage(country.id)
            const cityCount = country.cities?.length || 0
            const attractionCount = country.cities?.reduce((s, c) => s + (c.attractions?.length || 0), 0) || 0

            return (
              <Link
                key={country.id}
                href={`/knowledge/${country.id}`}
                className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <ImageWithPlaceholder
                  src={coverSrc}
                  alt={country.name}
                  name={country.name}
                  subtitle={[country.nameEn, meta.abbr].filter(Boolean).join(' · ')}
                  size="card"
                  variant="country"
                  countryName={country.name}
                />
                <div className="p-3">
                  <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {country.name}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {[country.nameEn, meta.abbr].filter(Boolean).join(' · ')}
                  </p>
                  {country.description && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {country.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
                    >
                      {cityCount} 个城市
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
                    >
                      {attractionCount} 个景点
                    </span>
                    {meta.currency && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                      >
                        {meta.currency.symbol}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {countries.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🗺️</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>暂无国家数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
