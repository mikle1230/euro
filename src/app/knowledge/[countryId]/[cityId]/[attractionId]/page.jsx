'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getAttractionById, getAllAttractionsFlat } from '@/lib/data'
import attractionInfo from '@/data/attraction-info.json'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import TypeBadge from '@/components/type-badge'
import { haversineKm } from '@/lib/geo'

export default function AttractionPage() {
  const params = useParams()
  const { countryId, cityId, attractionId } = params

  const attraction = getAttractionById(attractionId)
  if (!attraction) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🏛️</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>景点未找到</p>
          <Link href="/knowledge" className="text-xs mt-2 inline-block" style={{ color: 'var(--accent)' }}>
            ← 返回知识库
          </Link>
        </div>
      </div>
    )
  }

  const info = attractionInfo[attractionId] || {}
  const type = attraction.type || 'landmark'

  // Nearby attractions (same city first, then by distance)
  const allAttrs = getAllAttractionsFlat()
  const sameCity = allAttrs.filter(
    (a) => a.city?.id === attraction.city?.id && a.id !== attractionId,
  )
  const otherNear = allAttrs
    .filter((a) => a.city?.id !== attraction.city?.id && a.id !== attractionId && a.lat != null && attraction.lat != null)
    .map((a) => ({
      ...a,
      distance: haversineKm(attraction.lat, attraction.lng, a.lat, a.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6)

  const fieldLabel = {
    color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.05em', fontWeight: 600, marginBottom: '4px',
  }
  const fieldValue = { color: 'var(--text-primary)', fontSize: '13px' }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Breadcrumb */}
      <div className="px-4 md:px-6 py-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/knowledge" className="hover:text-[var(--accent)] transition-colors">知识库</Link>
          <span>/</span>
          <Link href={`/knowledge/${countryId}`} className="hover:text-[var(--accent)] transition-colors">
            {attraction.country?.name || countryId}
          </Link>
          <span>/</span>
          <Link href={`/knowledge/${countryId}/${cityId}`} className="hover:text-[var(--accent)] transition-colors">
            {attraction.city?.name || cityId}
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{attraction.name}</span>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 mb-6">
        <div className="rounded-2xl overflow-hidden border shadow-lg" style={{ borderColor: 'var(--border-color)' }}>
          <ImageWithPlaceholder
            src={null}
            alt={attraction.name}
            type={type}
            name={attraction.name}
            subtitle={`${attraction.city?.name || ''}${attraction.country?.name ? ' · ' + attraction.country.name : ''}`}
            size="hero"
            variant="attraction"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Title */}
            <div className="flex items-center gap-2 mb-1">
              <TypeBadge type={type} />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              {attraction.name}
            </h1>
            <p className="text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>
              {attraction.city?.name} · {attraction.country?.name}
            </p>

            {/* Description */}
            {attraction.description && (
              <div className="mb-6">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {attraction.description}
                </p>
              </div>
            )}

            {/* Tips */}
            {attraction.tips && (
              <div
                className="p-4 rounded-xl mb-6 text-sm"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span className="font-semibold mr-1" style={{ color: 'var(--text-primary)' }}>💡 贴士</span>
                {attraction.tips}
              </div>
            )}

            {/* Image search link */}
            {attraction.image_search_url && (
              <div className="mb-6">
                <a
                  href={attraction.image_search_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                >
                  🖼️ 搜索图片
                </a>
              </div>
            )}
          </div>

          {/* Sidebar: info card */}
          <div>
            <div
              className="rounded-xl border p-4 sticky top-20"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <h3 className="font-display font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                实用信息
              </h3>

              {info.hours && (
                <div className="mb-3">
                  <p style={fieldLabel}>开放时间</p>
                  <p style={fieldValue}>{info.hours}</p>
                </div>
              )}
              {info.ticketPrice && (
                <div className="mb-3">
                  <p style={fieldLabel}>门票</p>
                  <p style={fieldValue}>{info.ticketPrice}</p>
                </div>
              )}
              {info.bestTime && (
                <div className="mb-3">
                  <p style={fieldLabel}>最佳时间</p>
                  <p style={fieldValue}>{info.bestTime}</p>
                </div>
              )}
              {info.transport && (
                <div className="mb-3">
                  <p style={fieldLabel}>交通</p>
                  <p style={fieldValue}>{info.transport}</p>
                </div>
              )}
              {info.officialUrl && (
                <div className="mb-3">
                  <p style={fieldLabel}>官网</p>
                  <a
                    href={info.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...fieldValue, color: 'var(--accent)' }}
                    className="hover:underline break-all text-xs"
                  >
                    {info.officialUrl}
                  </a>
                </div>
              )}

              {!info.hours && !info.ticketPrice && !info.bestTime && !info.transport && !info.officialUrl && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>暂无详细信息</p>
              )}
            </div>
          </div>
        </div>

        {/* Same-city attractions */}
        {sameCity.length > 0 && (
          <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              🏛️ 同城景点
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sameCity.map((a) => (
                <Link
                  key={a.id}
                  href={`/knowledge/${countryId}/${cityId}/${a.id}`}
                  className="spotlight-card rounded-xl border overflow-hidden transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <ImageWithPlaceholder src={null} alt={a.name} type={a.type || 'landmark'} name={a.name} size="card" variant="attraction" />
                  <div className="p-2">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Nearby attractions (other cities) */}
        {otherNear.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              🧭 周边景点
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherNear.map((a) => (
                <Link
                  key={a.id}
                  href={`/knowledge/${a.country?.id || countryId}/${a.city?.id || cityId}/${a.id}`}
                  className="text-sm px-3 py-1.5 rounded-full border transition-all hover:bg-[var(--bg-surface)]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  {a.name}
                  <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
                    {a.city?.name} · {Math.round(a.distance)}km
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
