'use client'

import Link from 'next/link'
import ImageWithPlaceholder from './image-with-placeholder'
import { getCountryImage } from '@/lib/images'

export default function CountryCard({ country }) {
  function spotMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    e.currentTarget.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  const cityCount = country.cities.length
  const attractionCount = country.cities.reduce((sum, city) => sum + city.attractions.length, 0)

  return (
    <Link
      href={`/explore/${country.id}`}
      className="spotlight-card group block rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      onMouseMove={spotMove}
    >
      <ImageWithPlaceholder
        src={getCountryImage(country.id)}
        alt={country.name}
        name={country.name}
        subtitle={`${cityCount} 座城市 · ${attractionCount} 个景点`}
        variant="country"
        size="card"
      />
      <div className="p-4 relative z-[1]">
        <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          {country.name}
        </h3>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {country.nameEn}
        </p>
        {country.description && (
          <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
            {country.description}
          </p>
        )}
      </div>
    </Link>
  )
}
