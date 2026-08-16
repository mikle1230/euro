'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getPlaceholderColors, getCountryPlaceholderColors } from '@/lib/images'
import TypeBadge from './type-badge'

/**
 * Image component with graceful placeholder fallback.
 *
 * Props:
 * - src: image path (may be null)
 * - alt: alt text
 * - type: 'landmark' | 'museum' | 'nature' (for placeholder coloring)
 * - name: display name (for placeholder text)
 * - subtitle: optional subtitle (e.g., "法国 · 巴黎")
 * - size: 'card' | 'hero' | 'thumb'
 * - variant: 'attraction' | 'country' | 'city'
 * - countryName, cityName: for location overlay on hero
 * - className: additional classes
 */
export default function ImageWithPlaceholder({
  src,
  alt,
  type = 'landmark',
  name,
  subtitle,
  size = 'card',
  variant = 'attraction',
  countryName,
  cityName,
  className = '',
}) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const showPlaceholder = !src || imgError
  const colors = variant === 'country'
    ? getCountryPlaceholderColors(name)
    : getPlaceholderColors(name || '', type)

  const sizeClasses = {
    hero: 'aspect-[16/9] md:aspect-[21/9]',
    card: variant === 'country' ? 'aspect-[4/3]' : 'aspect-[3/2]',
    thumb: 'aspect-square',
  }

  // 响应式 sizes：告诉浏览器按实际渲染宽度选 srcset（next/image 生成多档尺寸）。
  // hero 容器是 max-w-5xl（1024px），所以桌面端最多 1024px，而非 100vw。
  const sizes = {
    hero: '(max-width: 1024px) 100vw, 1024px',
    card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw',
    thumb: '(max-width: 640px) 50vw, 160px',
  }[size]

  if (showPlaceholder) {
    return (
      <div
        className={`relative overflow-hidden ${sizeClasses[size] || sizeClasses.card} ${className}`}
        style={{
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        }}
      >
        {/* Decorative grid lines */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: `${size === 'hero' ? '60px' : '40px'} ${size === 'hero' ? '60px' : '40px'}`,
          }}
        />
        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          {variant === 'attraction' && type && size !== 'thumb' && (
            <div className="mb-2 opacity-80">
              <TypeBadge type={type} />
            </div>
          )}
          {name && (
            <span
              className="font-display font-semibold tracking-tight px-4"
              style={{
                color: colors.text,
                fontSize: size === 'hero' ? 'clamp(1.5rem, 4vw, 2.5rem)' : '1rem',
              }}
            >
              {name}
            </span>
          )}
          {subtitle && size !== 'thumb' && (
            <span className="mt-1 text-sm opacity-60" style={{ color: colors.text }}>
              {subtitle}
            </span>
          )}
          {variant === 'country' && subtitle && size !== 'thumb' && (
            <span className="mt-2 text-xs opacity-50" style={{ color: colors.text }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${sizeClasses[size] || sizeClasses.card} bg-[var(--bg-surface)] ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={size === 'hero'}
        className={`object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
      />
      {!imgLoaded && (
        <div className="absolute inset-0 animate-pulse" style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }} />
      )}
      {/* Location overlay for hero images */}
      {size === 'hero' && (countryName || cityName) && imgLoaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 md:p-10">
          {countryName && <p className="text-white/80 text-sm md:text-base font-medium">{countryName}{cityName ? ` · ${cityName}` : ''}</p>}
          {name && <h1 className="text-white text-2xl md:text-4xl font-display font-bold mt-1">{name}</h1>}
        </div>
      )}
    </div>
  )
}
