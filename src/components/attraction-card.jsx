'use client'

import Link from 'next/link'
import ImageWithPlaceholder from './image-with-placeholder'
import TypeBadge from './type-badge'
import { getAttractionImage } from '@/lib/images'

export default function AttractionCard({ attraction }) {
  function spotMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    e.currentTarget.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  const countryId = attraction.country?.id
  const cityId = attraction.city?.id

  return (
    <Link
      href={`/explore/${countryId}/${cityId}/${attraction.id}`}
      className="spotlight-card group block rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      onMouseMove={spotMove}
    >
      <ImageWithPlaceholder
        src={getAttractionImage(attraction.id)}
        alt={attraction.name}
        name={attraction.name}
        type={attraction.type}
        variant="attraction"
        size="card"
      />
      <div className="p-3 relative z-[1]">
        <div className="flex items-center gap-2 mb-1.5">
          <TypeBadge type={attraction.type} />
        </div>
        <h4 className="font-display font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          {attraction.name}
        </h4>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {attraction.country?.name} · {attraction.city?.name}
        </p>
        {attraction.description && (
          <p className="text-sm mt-1.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {attraction.description}
          </p>
        )}
      </div>
    </Link>
  )
}
