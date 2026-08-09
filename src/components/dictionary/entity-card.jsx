'use client'

import ImageWithPlaceholder from '@/components/image-with-placeholder'
import TypeBadge from '@/components/type-badge'
import { TYPE_ICONS } from '@/lib/config'

export default function EntityCard({ entity, onClick }) {
  const subtypeOrType = entity.type === 'attraction' ? entity.subtype || 'landmark' : entity.type
  const icon = TYPE_ICONS[subtypeOrType] || TYPE_ICONS[entity.type] || '📍'

  return (
    <button
      onClick={() => onClick(entity)}
      className="spotlight-card group text-left rounded-xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Image area */}
      <ImageWithPlaceholder
        src={null}
        alt={entity.name}
        type={subtypeOrType}
        name={entity.name}
        size="card"
        variant="attraction"
      />

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <TypeBadge type={subtypeOrType} />
          {entity.starRating > 0 && (
            <span className="text-xs" style={{ color: 'var(--gold)' }}>
              {'★'.repeat(entity.starRating)}
            </span>
          )}
          {entity.cuisine && (
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
              {entity.cuisine}
            </span>
          )}
        </div>

        <h3
          className="font-display font-semibold text-sm mb-1 truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {icon} {entity.name}
        </h3>

        <p className="text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          {entity.cityName}{entity.countryName ? ` · ${entity.countryName}` : ''}
        </p>

        <p
          className="text-xs line-clamp-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {entity.notes || '暂无描述'}
        </p>

        {entity.priceRange && (
          <div className="mt-2 flex items-center gap-1">
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              {entity.priceRange}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
