'use client'

import { countryIsoCode } from '@/lib/country-flags'

// 国旗组件：用本地 /flags/{iso}.svg 图片渲染，跨平台（Win/mac/iOS/Android）都能正确显示。
// 不用 emoji 国旗（🇫🇷 这类）——Windows 的 Segoe UI Emoji 缺少国旗字形，会显示成字母无法显示。
// size: 尺寸（h 宽度）；variant 为内置档位。rounded 圆角 + 细边框便于在卡片/文字旁混排。
const SIZES = {
  xs: 'w-5',
  sm: 'w-6',
  md: 'w-8',
  lg: 'w-10',
  xl: 'w-14',
}

export default function CountryFlag({ countryId, size = 'sm', rounded = true, className = '', style }) {
  const iso = countryIsoCode(countryId)
  if (!iso) return null
  return (
    // 实际尺寸由 width/height 按 4:3 决定；这里外层一个固定圆角容器，避免图片拉伸导致圆角变形
    <span
      className={`inline-flex shrink-0 ${SIZES[size] || SIZES.sm} ${className}`}
      style={{ ...style }}
    >
      <img
        src={`/flags/${iso}.svg`}
        alt={`${countryId} 国旗`}
        width="40"
        height="30"
        loading="lazy"
        className={`w-full h-auto object-contain ${rounded ? 'rounded-[3px]' : ''}`}
        style={{ border: rounded ? '1px solid var(--border-color)' : 'none' }}
      />
    </span>
  )
}
