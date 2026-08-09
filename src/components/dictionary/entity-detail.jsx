'use client'

import { useEffect, useRef } from 'react'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import TypeBadge from '@/components/type-badge'
import { TYPE_ICONS, TYPE_LABELS } from '@/lib/config'

export default function EntityDetail({ entity, onClose, onAddToItinerary }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    // Trigger slide-in animation
    if (panelRef.current) {
      requestAnimationFrame(() => {
        panelRef.current.style.transform = 'translateX(0)'
      })
    }
  }, [])

  const subtypeOrType = entity.type === 'attraction' ? entity.subtype || 'landmark' : entity.type
  const icon = TYPE_ICONS[subtypeOrType] || TYPE_ICONS[entity.type] || '📍'
  const label = TYPE_LABELS[subtypeOrType] || entity.type

  const fieldStyle = {
    label: { color: 'var(--text-tertiary)', fontSize: '11px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 },
    value: { color: 'var(--text-primary)', fontSize: '13px' },
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[1500] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-full max-w-lg z-[1501] overflow-y-auto shadow-2xl transition-transform duration-300"
        style={{
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-color)',
          transform: 'translateX(100%)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:bg-[var(--bg-surface)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          ✕
        </button>

        {/* Hero image */}
        <ImageWithPlaceholder
          src={null}
          alt={entity.name}
          type={subtypeOrType}
          name={entity.name}
          subtitle={`${entity.cityName} · ${entity.countryName}`}
          size="hero"
          variant="attraction"
        />

        <div className="p-5">
          {/* Title section */}
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={subtypeOrType} />
            {entity.starRating > 0 && (
              <span className="text-sm" style={{ color: 'var(--gold)' }}>
                {'★'.repeat(entity.starRating)}
              </span>
            )}
          </div>
          <h2 className="font-display font-bold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>
            {icon} {entity.name}
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            {entity.cityName} · {entity.countryName}
          </p>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {entity.address && (
              <div>
                <p style={fieldStyle.label}>地址</p>
                <p style={fieldStyle.value}>{entity.address}</p>
              </div>
            )}
            {entity.phone && (
              <div>
                <p style={fieldStyle.label}>电话</p>
                <p style={fieldStyle.value}>{entity.phone}</p>
              </div>
            )}
            {entity.website && (
              <div className="col-span-2">
                <p style={fieldStyle.label}>网站</p>
                <a
                  href={entity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...fieldStyle.value, color: 'var(--accent)' }}
                  className="hover:underline"
                >
                  {entity.website}
                </a>
              </div>
            )}
            {entity.openingHours && (
              <div className="col-span-2">
                <p style={fieldStyle.label}>开放时间</p>
                <p style={fieldStyle.value}>{entity.openingHours}</p>
              </div>
            )}
            {entity.duration && (
              <div>
                <p style={fieldStyle.label}>建议游览时长</p>
                <p style={fieldStyle.value}>{entity.duration} 分钟</p>
              </div>
            )}
            {entity.priceRange && (
              <div>
                <p style={fieldStyle.label}>价格区间</p>
                <p style={fieldStyle.value}>{entity.priceRange}</p>
              </div>
            )}
            {entity.cuisine && (
              <div>
                <p style={fieldStyle.label}>菜系</p>
                <p style={fieldStyle.value}>{entity.cuisine}</p>
              </div>
            )}
            {entity.languages && entity.languages.length > 0 && (
              <div className="col-span-2">
                <p style={fieldStyle.label}>语言</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entity.languages.map((lang) => (
                    <span
                      key={lang}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {entity.mode && (
              <div>
                <p style={fieldStyle.label}>交通方式</p>
                <p style={fieldStyle.value}>{entity.mode}</p>
              </div>
            )}
            {entity.capacity > 0 && (
              <div>
                <p style={fieldStyle.label}>容量</p>
                <p style={fieldStyle.value}>{entity.capacity} 人</p>
              </div>
            )}
            {entity.lat != null && entity.lng != null && (
              <div className="col-span-2">
                <p style={fieldStyle.label}>坐标</p>
                <p style={fieldStyle.value}>
                  {entity.lat.toFixed(4)}, {entity.lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {entity.notes && (
            <div className="mb-4">
              <p style={fieldStyle.label}>描述</p>
              <p className="text-sm leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>
                {entity.notes}
              </p>
            </div>
          )}

          {/* Tips */}
          {entity.tips && (
            <div
              className="p-3 rounded-lg mb-4 text-sm"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                borderLeft: '3px solid var(--accent)',
              }}
            >
              <span className="mr-1">💡</span>
              {entity.tips}
            </div>
          )}

          {/* Add to itinerary button */}
          {onAddToItinerary && (
            <button
              onClick={() => onAddToItinerary(entity)}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              + 加入行程
            </button>
          )}
        </div>
      </div>
    </>
  )
}
