'use client'

import { useState } from 'react'
import { getPlaceholderColors, getAttractionImageSources } from '@/lib/images'

// 景点图片组：主图（{id}.jpg）+ 附加图（{id}-1/2/3.jpg），点击缩略图切换主图。
// 候选图先过图片清单（getAttractionImageSources）：磁盘上没有的图根本不渲染 <img>，
// 因此缺图不会产生 404 请求；全部缺图时直接给渐变占位。
// 用途：景点详情页右侧 1/4 参考图区；多图内容逐步积累。
export default function AttractionGallery({ id, name, type = 'landmark' }) {
  const sources = getAttractionImageSources(id)
  const candidates = sources.map((src, i) => ({ src, label: i === 0 ? '主图' : `图 ${i + 1}` }))
  const [activeIdx, setActiveIdx] = useState(0)
  const [failed, setFailed] = useState({})

  // 清单保证文件存在，但仍保留 onError 兜底：文件损坏/被误删时不至于显示破图
  const images = candidates.filter((c) => !failed[c.src])
  const active = images[Math.min(activeIdx, Math.max(images.length - 1, 0))]

  const colors = getPlaceholderColors(name || '', type)

  if (!active) {
    // 全部未加载成功（或加载中）→ 渐变占位
    return (
      <div
        className="rounded-xl overflow-hidden border"
        style={{
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="aspect-[4/3] flex flex-col items-center justify-center p-4 text-center">
          <span className="text-2xl mb-1 gallery-emoji">🖼️</span>
          <span className="text-sm font-semibold" style={{ color: colors.text }}>{name}</span>
          <span className="text-xs mt-1 opacity-60" style={{ color: colors.text }}>图片整理中</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* 主图 */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.src}
          alt={name}
          className="w-full aspect-[4/3] object-cover"
          loading="eager"
          decoding="async"
          onError={() => setFailed((f) => ({ ...f, [active.src]: true }))}
        />
      </div>
      {/* 缩略图行（多图时显示） */}
      {images.length > 1 && (
        <div className="flex gap-1.5">
          {images.map((img, idx) => (
            <button
              key={img.src}
              onClick={() => setActiveIdx(idx)}
              className="rounded-md overflow-hidden border transition-all focus-ring"
              style={{
                borderColor: idx === activeIdx ? 'var(--accent)' : 'var(--border-color)',
                opacity: idx === activeIdx ? 1 : 0.6,
              }}
              aria-label={img.label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={`${name} ${img.label}`} className="w-14 h-12 object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-center" style={{ color: 'var(--text-tertiary)' }}>
        {images.length > 1 ? `共 ${images.length} 张 · 点击缩略图切换` : '参考图'}
      </p>
    </div>
  )
}
