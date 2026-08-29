'use client'

import { useState } from 'react'
import { getPlaceholderColors } from '@/lib/images'

// 景点图片组：自动探测主图（封面图 {id}.jpg）+ 附加图（{id}-1/2/3.jpg），
// 成功加载的组成图片组，点击缩略图切换主图。
// 用途：景点详情页右侧 1/4 参考图区；多图内容逐步积累，缺图自动隐藏。
export default function AttractionGallery({ id, name, type = 'landmark' }) {
  const candidates = [
    { src: `/images/attractions/${id}.jpg`, label: '主图' },
    { src: `/images/attractions/${id}-1.jpg`, label: '图 2' },
    { src: `/images/attractions/${id}-2.jpg`, label: '图 3' },
    { src: `/images/attractions/${id}-3.jpg`, label: '图 4' },
  ]
  // 加载状态：pending / ok / fail（用隐藏 img 触发 onLoad/onError 探测）
  const [status, setStatus] = useState({})
  const [activeIdx, setActiveIdx] = useState(0)

  const images = candidates.filter((c) => status[c.src] === 'ok')
  const active = images[Math.min(activeIdx, images.length - 1)]

  const colors = getPlaceholderColors(name || '', type)

  if (images.length === 0) {
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
          <span className="text-2xl mb-1">🖼️</span>
          <span className="text-sm font-semibold" style={{ color: colors.text }}>{name}</span>
          <span className="text-xs mt-1 opacity-60" style={{ color: colors.text }}>图片整理中</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* 隐藏探测：渲染所有候选图，onLoad/onError 记录状态 */}
      {candidates.map((c) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c.src}
          src={c.src}
          alt=""
          className="hidden"
          onLoad={() => setStatus((s) => (s[c.src] === 'ok' ? s : { ...s, [c.src]: 'ok' }))}
          onError={() => setStatus((s) => (s[c.src] === 'fail' ? s : { ...s, [c.src]: 'fail' }))}
        />
      ))}

      {/* 主图 */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.src}
          alt={name}
          className="w-full aspect-[4/3] object-cover"
          loading="eager"
          decoding="async"
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
