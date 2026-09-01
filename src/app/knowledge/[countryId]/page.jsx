'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getCountryById, getAllAttractionsFlat } from '@/lib/data'
import countryMeta from '@/data/country-meta.json'
import cityMeta from '@/data/city-meta.json'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import TypeBadge from '@/components/type-badge'
import KnowledgeTopBar from '@/components/knowledge-top-bar'
import CountryFlag from '@/components/country-flag'
import { CURRENCY_SYMBOLS } from '@/lib/config'
import { getCityCode, getCityEnglishName } from '@/lib/quos-mapping'
import { COUNTRY_INTROS } from '@/data/country-intros'
import { COUNTRY_INFO } from '@/data/country-info'

// 地图组件动态加载（leaflet 需客户端初始化，SSR 关闭）
const CountryMap = dynamic(() => import('@/components/country-map'), {
  ssr: false,
  loading: () => <div className="absolute inset-0" style={{ background: 'var(--bg-surface)' }} />,
})

// 从「货币名 码」字符串（如「欧元 EUR」）提取货币符号
function currencySymbol(currency) {
  const code = String(currency || '').trim().split(/\s+/).pop()
  return code ? (CURRENCY_SYMBOLS[code] || '') : ''
}

export default function CountryPage() {
  const params = useParams()
  const countryId = params.countryId
  const [attrFilter, setAttrFilter] = useState([])

  const country = getCountryById(countryId)
  if (!country) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>国家未找到</p>
          <Link href="/knowledge" className="text-xs mt-2 inline-block" style={{ color: 'var(--accent)' }}>
            ← 返回城市库
          </Link>
        </div>
      </div>
    )
  }

  const meta = countryMeta[countryId] || {}
  const cities = country.cities || []
  const mapCities = cities.filter((c) => c.lat != null && c.lng != null)
  const intro = COUNTRY_INTROS[countryId] || country.description || ''
  const info = COUNTRY_INFO[countryId]

  // 国家 QUOS 二字码：取该国任一城市反查
  let countryCode = ''
  for (const city of cities) {
    countryCode = getCityCode(city.name, city.nameEn)?.countryCode || ''
    if (countryCode) break
  }
  // 首都：英文名 + QUOS 三字码（首都一般在 europe-travel 城市列表内；英文名兜底按码反查）
  const capCity = cities.find((c) => c.name === info?.capital)
  const capCode = getCityCode(info?.capital, capCity?.nameEn)?.cityCode || ''
  const capEn = capCity?.nameEn || getCityEnglishName(capCode)
  const infoRows = [
    info?.capital && { label: '首都', value: [info.capital, capEn, capCode].filter(Boolean).join(' · ') },
    info?.nationalDay && { label: '国庆日', value: info.nationalDay },
    info?.language && { label: '官方语言', value: info.language },
    info?.currency && { label: '货币', value: info.currency, symbol: currencySymbol(info.currency) },
  ].filter(Boolean)

  const neighbors = (meta.neighbors || []).map((nid) => ({ id: nid }))

  // 全国景点（含类型筛选）
  const countryAttractions = getAllAttractionsFlat().filter((a) => a.country?.id === countryId)
  const filteredAttractions = attrFilter.length === 0
    ? countryAttractions
    : countryAttractions.filter((a) => attrFilter.includes(a.type || 'landmark'))
  const attrTypeCounts = { landmark: 0, museum: 0, nature: 0 }
  for (const a of countryAttractions) {
    const t = a.type || 'landmark'
    if (t in attrTypeCounts) attrTypeCounts[t]++
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* 吸顶工具条：面包屑 + 全局搜索（搜索框全程停留在顶部，随时可检索） */}
      <KnowledgeTopBar
        crumbs={[
          { label: '城市库', href: '/knowledge' },
          { label: country.name },
        ]}
        flagCountryId={country.id}
      />

      {/* Hero：左 3/5 国家地图（含城市点位）+ 右 2/5 国家介绍 */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 左：地图 */}
          <div

            className="md:col-span-3 relative rounded-2xl overflow-hidden border shadow-lg"
            style={{ minHeight: '300px', borderColor: 'var(--border-color)' }}
          >
            <CountryMap countryId={country.id} cities={mapCities} />
          </div>
          {/* 右：国家介绍 */}
          <div
            className="md:col-span-2 rounded-2xl border shadow-lg p-5 md:p-6 flex flex-col justify-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <h1 className="font-display font-bold text-xl md:text-2xl mb-3 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-primary)' }}>
              <span className="inline-flex items-center gap-2">
                <CountryFlag countryId={country.id} size="lg" />
                {country.name}
                {country.nameEn && <span className="text-base md:text-lg font-normal" style={{ color: 'var(--text-secondary)' }}>{country.nameEn}</span>}
                {countryCode && <span className="text-base md:text-lg font-mono font-normal" style={{ color: 'var(--text-tertiary)' }}>{countryCode}</span>}
              </span>
            </h1>
            {intro && (
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                {intro}
              </p>
            )}
            {infoRows.length > 0 && (
              <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {infoRows.map((row) => (
                  <div key={row.label}>
                    <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                      {row.label}
                    </div>
                    <div className="font-medium mt-0.5 leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {row.symbol && (
                        <span className="mr-1 font-semibold">{row.symbol}</span>
                      )}
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
        {/* Cities grid */}
        {cities.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              主要城市
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.map((city) => {
                const cmeta = cityMeta[city.id] || {}
                const cityQuosCode = getCityCode(city.name, city.nameEn)?.cityCode || ''
                return (
                  <Link
                    key={city.id}
                    href={`/knowledge/${countryId}/${city.id}`}
                    className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  >
                    <ImageWithPlaceholder
                      src={`/images/cities/${city.id}.jpg`}
                      alt={city.name}
                      type="landmark"
                      name={city.name}
                      subtitle={[city.nameEn, cityQuosCode].filter(Boolean).join(' · ')}
                      size="card"
                      variant="city"
                    />
                    <div className="p-3">
                      <h3 className="font-display font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {city.name}
                      </h3>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                        {[city.nameEn, cityQuosCode].filter(Boolean).join(' · ')}
                      </p>
                      {cmeta.description && (
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {cmeta.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
                          {city.attractions?.length || 0} 个景点
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* All attractions in this country */}
        {countryAttractions.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              🏛️ 全部景点
              <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-tertiary)' }}>
                {countryAttractions.length} 个
              </span>
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              <button
                onClick={() => setAttrFilter([])}
                className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
                style={
                  attrFilter.length === 0
                    ? { background: 'var(--accent-strong)', color: 'var(--on-accent-strong)', borderColor: 'var(--accent)' }
                    : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
                }
              >
                全部 ({countryAttractions.length})
              </button>
              {[
                { key: 'landmark', icon: '🏛️', label: '地标' },
                { key: 'museum', icon: '🏺', label: '博物馆' },
                { key: 'nature', icon: '🌿', label: '自然' },
              ].filter((t) => attrTypeCounts[t.key] > 0).map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() =>
                    setAttrFilter((prev) =>
                      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
                    )
                  }
                  className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
                  style={
                    attrFilter.includes(key)
                      ? { background: 'var(--accent-strong)', color: 'var(--on-accent-strong)', borderColor: 'var(--accent)' }
                      : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
                  }
                >
                  {icon} {label} ({attrTypeCounts[key]})
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAttractions.map((attr) => (
                  <Link
                    key={attr.id}
                    href={`/knowledge/${countryId}/${attr.city?.id || 'unknown'}/${attr.id}`}
                    className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  >
                    <ImageWithPlaceholder
                      src={`/images/attractions/${attr.id}.jpg`}
                      alt={attr.name}
                      type={attr.type || 'landmark'}
                      name={attr.name}
                      size="card"
                      variant="attraction"
                    />
                    <div className="p-3">
                      <div className="mb-1">
                        <TypeBadge type={attr.type || 'landmark'} />
                      </div>
                      <h3 className="font-display font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {attr.name}
                        {attr.nameEn && <span className="ml-1 font-normal" style={{ color: 'var(--text-tertiary)' }}>{attr.nameEn}</span>}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {attr.city?.name || ''}
                      </p>
                      {attr.description && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {attr.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
        )}

        {/* Neighboring countries */}
        {neighbors.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
              🌍 周边国家
            </h2>
            <div className="flex flex-wrap gap-2">
              {neighbors.map(({ id }) => {
                // Try to resolve neighbor name from available data
                const neighborCountry = getCountryById(id)
                const name = neighborCountry?.name || id
                return (
                  <Link
                    key={id}
                    href={`/knowledge/${id}`}
                    className="text-sm px-3 py-1.5 rounded-full border transition-all hover:bg-[var(--bg-surface)]"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    {name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
