'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCountryById, getCountryCoverImage, getAllAttractionsFlat } from '@/lib/data'
import countryMeta from '@/data/country-meta.json'
import cityMeta from '@/data/city-meta.json'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import TypeBadge from '@/components/type-badge'

const COUNTRY_FLAGS = {
  '英国': '🇬🇧', '法国': '🇫🇷', '意大利': '🇮🇹', '德国': '🇩🇪',
  '西班牙': '🇪🇸', '葡萄牙': '🇵🇹', '荷兰': '🇳🇱', '比利时': '🇧🇪',
  '瑞士': '🇨🇭', '奥地利': '🇦🇹', '捷克': '🇨🇿', '匈牙利': '🇭🇺',
  '波兰': '🇵🇱', '希腊': '🇬🇷', '瑞典': '🇸🇪', '挪威': '🇳🇴',
  '丹麦': '🇩🇰', '芬兰': '🇫🇮', '克罗地亚': '🇭🇷', '爱尔兰': '🇮🇪',
  '土耳其': '🇹🇷', '冰岛': '🇮🇸', '爱沙尼亚': '🇪🇪', '黑山': '🇲🇪',
}

export default function CountryPage() {
  const params = useParams()
  const countryId = params.countryId

  const country = getCountryById(countryId)
  if (!country) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>国家未找到</p>
          <Link href="/knowledge" className="text-xs mt-2 inline-block" style={{ color: 'var(--accent)' }}>
            ← 返回知识库
          </Link>
        </div>
      </div>
    )
  }

  const meta = countryMeta[countryId] || {}
  const flag = COUNTRY_FLAGS[country.name] || '📍'
  const coverSrc = getCountryCoverImage(countryId)
  const cities = country.cities || []

  const neighbors = (meta.neighbors || []).map((nid) => {
    // Use getAllCountries or just show the ID
    return { id: nid }
  })

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Breadcrumb */}
      <div className="px-4 md:px-6 py-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/knowledge" className="hover:text-[var(--accent)] transition-colors">知识库</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{country.name}</span>
        </div>
      </div>

      {/* Hero postcard */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 mb-6">
        <div className="rounded-2xl overflow-hidden border shadow-lg" style={{ borderColor: 'var(--border-color)' }}>
          <ImageWithPlaceholder
            src={coverSrc}
            alt={country.name}
            name={`${flag} ${country.name}`}
            subtitle={`${country.nameEn}${meta.abbr ? ' · ' + meta.abbr : ''}`}
            size="hero"
            variant="country"
            countryName={country.name}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
        {/* Currency & meta bar */}
        {meta.currency && (
          <div
            className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>💶 货币：</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.currency.name} · {meta.currency.code}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
              1 {meta.currency.code} ≈ {meta.currency.rateToCny} CNY
            </span>
            <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>仅供参考</span>
          </div>
        )}

        {/* Description */}
        {country.description && (
          <div className="mb-8">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {country.description}
            </p>
          </div>
        )}

        {/* Cities grid */}
        {cities.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              主要城市
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.map((city) => {
                const cmeta = cityMeta[city.id] || {}
                return (
                  <Link
                    key={city.id}
                    href={`/knowledge/${countryId}/${city.id}`}
                    className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  >
                    <ImageWithPlaceholder
                      src={null}
                      alt={city.name}
                      type="landmark"
                      name={city.name}
                      subtitle={city.nameEn}
                      size="card"
                      variant="city"
                    />
                    <div className="p-3">
                      <h3 className="font-display font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {city.name}
                      </h3>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                        {city.nameEn}
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
        {(() => {
          const countryAttractions = getAllAttractionsFlat().filter(
            (a) => a.country?.id === countryId,
          )
          if (countryAttractions.length === 0) return null
          return (
            <div className="mb-8">
              <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
                🏛️ 全部景点
                <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-tertiary)' }}>
                  {countryAttractions.length} 个
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {countryAttractions.map((attr) => (
                  <Link
                    key={attr.id}
                    href={`/knowledge/${countryId}/${attr.city?.id || 'unknown'}/${attr.id}`}
                    className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  >
                    <ImageWithPlaceholder
                      src={null}
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
          )
        })()}

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
                const nflag = COUNTRY_FLAGS[name] || '📍'
                return (
                  <Link
                    key={id}
                    href={`/knowledge/${id}`}
                    className="text-sm px-3 py-1.5 rounded-full border transition-all hover:bg-[var(--bg-surface)]"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    {nflag} {name}
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
