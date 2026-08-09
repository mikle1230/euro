'use client'

import Link from 'next/link'
import ImageWithPlaceholder from './image-with-placeholder'
import { getAttractionImage } from '@/lib/images'

export default function PassportStamp({ attraction, learnedDate }) {
  function spotMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    e.currentTarget.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  return (
    <Link
      href={`/explore/${attraction.country?.id}/${attraction.city?.id}/${attraction.id}`}
      className="spotlight-card group block rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-md hover:-translate-y-1"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      onMouseMove={spotMove}
    >
      <div className="relative">
        <ImageWithPlaceholder
          src={getAttractionImage(attraction.id)}
          alt={attraction.name}
          name={attraction.name}
          type={attraction.type}
          variant="attraction"
          size="card"
          className="opacity-60 group-hover:opacity-80 transition-opacity"
        />
        {/* Stamp overlay */}
        <div className="absolute top-3 right-3 z-10">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg transform rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-md"
            style={{ background: 'var(--accent)', color: '#fff' }}
            title="已收集"
          >
            ✓
          </div>
        </div>
      </div>
      <div className="p-2.5 relative z-[1]">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {attraction.name}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
          {attraction.city?.name} · {attraction.country?.name}
        </p>
      </div>
    </Link>
  )
}
