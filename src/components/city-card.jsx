'use client'

import Link from 'next/link'
import ImageWithPlaceholder from './image-with-placeholder'
import { getCityImage } from '@/lib/images'

export default function CityCard({ city }) {
  function spotMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    e.currentTarget.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  const attractionCount = city.attractions.length

  return (
    <Link
      href={`/explore/${city.country.id}/${city.id}`}
      className="spotlight-card group block rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      onMouseMove={spotMove}
    >
      <ImageWithPlaceholder
        src={getCityImage(city.id)}
        alt={city.name}
        name={city.name}
        subtitle={city.nameEn}
        variant="city"
        size="card"
      />
      <div className="p-3 relative z-[1]">
        <h4 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>{city.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {city.country?.name || ''} · {attractionCount} 个景点
          </span>
        </div>
      </div>
    </Link>
  )
}
