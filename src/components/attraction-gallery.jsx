'use client'

import { useState } from 'react'
import ImageWithPlaceholder from './image-with-placeholder'
import { getAttractionImage } from '@/lib/images'

export default function AttractionGallery({ attraction }) {
  const [activeIndex, setActiveIndex] = useState(0)

  // Generate 3 "slides": primary image + 2 alternates
  const slides = [
    { src: getAttractionImage(attraction.id), label: attraction.name },
    { src: null, label: `${attraction.name} — 全景` },
    { src: null, label: `${attraction.name} — 细节` },
  ]

  return (
    <div className="relative">
      <ImageWithPlaceholder
        src={slides[activeIndex].src}
        alt={slides[activeIndex].label}
        name={slides[activeIndex].label}
        type={attraction.type}
        variant="attraction"
        size="hero"
        countryName={attraction.country?.name}
        cityName={attraction.city?.name}
        className="rounded-xl overflow-hidden"
      />

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'w-6' : ''
            }`}
            style={{
              background: i === activeIndex ? 'var(--accent)' : 'var(--border-color)',
            }}
            aria-label={`第 ${i + 1} 张图片`}
          />
        ))}
      </div>
    </div>
  )
}
