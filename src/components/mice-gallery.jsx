'use client'

import { useState } from 'react'

// MICE 活动图片组：自动探测主图 + 附加图，支持多图缩略图切换 + 点击放大（Lightbox）。
// 候选链（与 mice-image.jsx 一致）：public/mice-images/{id}.jpg/.jpeg/.png/.webp → {id}-1/2/3.* → Excel previewImageUrl
// 多图约定：把附加图命名为 {id}-1.jpg、{id}-2.jpg 等放入 public/mice-images/ 即可自动出现，无需改代码。
export default function MiceGallery({ activity, className = '' }) {
  const EXTS = ['jpg', 'jpeg', 'png', 'webp']
  const candidates = []
  // 主图
  for (const ext of EXTS) candidates.push(`/mice-images/${activity.id}.${ext}`)
  // 附加图（-1 ~ -4）
  for (let n = 1; n <= 4; n++) {
    for (const ext of EXTS) candidates.push(`/mice-images/${activity.id}-${n}.${ext}`)
  }
  // Excel 原始图（最后兜底）
  if (activity.previewImageUrl) candidates.push(activity.previewImageUrl)

  // 加载状态：pending / ok / fail
  const [status, setStatus] = useState({})
  const [activeIdx, setActiveIdx] = useState(0)
  const [lightbox, setLightbox] = useState(null)

  const okImages = candidates.filter((c) => status[c] === 'ok')
  const active = okImages[Math.min(activeIdx, okImages.length - 1)]
  const emoji = activity.category === 'Technical Visit' ? '🏭' : '🎪'
  const label = activity.title

  return (
    <div className={className}>
      {/* 隐藏探测：渲染所有候选图，onLoad/onError 记录状态 */}
      {candidates.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="hidden"
          onLoad={() => setStatus((s) => (s[src] === 'ok' ? s : { ...s, [src]: 'ok' }))}
          onError={() => setStatus((s) => (s[src] === 'fail' ? s : { ...s, [src]: 'fail' }))}
        />
      ))}

      {okImages.length === 0 ? (
        /* 占位：全部候选加载失败或加载中 */
        <div
          role="img"
          aria-label={label}
          className="relative aspect-[4/3] rounded-xl border flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(150deg, var(--bg-elevated), var(--bg-surface))', borderColor: 'var(--border-color)' }}
        >
          <span className="text-4xl" aria-hidden="true">{emoji}</span>
          <span className="absolute bottom-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>图片整理中</span>
        </div>
      ) : (
        <>
          {/* 主图（点击放大） */}
          <button
            type="button"
            onClick={() => setLightbox(okImages.indexOf(active))}
            className="w-full block rounded-xl border overflow-hidden focus-ring-mice transition-transform hover:scale-[1.01]"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
            aria-label="点击放大图片"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active} alt={label} className="w-full aspect-[4/3] object-cover" loading="eager" decoding="async" />
          </button>

          {/* 缩略图行（多图时） */}
          {okImages.length > 1 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {okImages.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveIdx(i)}
                  className="rounded-md overflow-hidden border transition-all focus-ring-mice"
                  style={{
                    borderColor: i === okImages.indexOf(active) ? 'var(--mice-accent)' : 'var(--border-color)',
                    opacity: i === okImages.indexOf(active) ? 1 : 0.55,
                  }}
                  aria-label={`查看第 ${i + 1} 张图片`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-14 h-12 object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-center mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
            {okImages.length > 1 ? `共 ${okImages.length} 张 · 点击查看大图` : '点击查看大图'}
          </p>
        </>
      )}

      {/* Lightbox 弹窗 */}
      {lightbox !== null && okImages[lightbox] && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-10"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="图片放大预览"
        >
          {/* 关闭 */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full text-white text-xl hover:bg-white/10 transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="关闭预览"
          >
            ✕
          </button>
          {/* 左右切换 */}
          {okImages.length > 1 && (
            <>
              <button
                className="absolute left-3 md:left-6 w-10 h-10 rounded-full text-white text-3xl hover:bg-white/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + okImages.length - 1) % okImages.length) }}
                aria-label="上一张"
              >
                ‹
              </button>
              <button
                className="absolute right-3 md:right-6 w-10 h-10 rounded-full text-white text-3xl hover:bg-white/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % okImages.length) }}
                aria-label="下一张"
              >
                ›
              </button>
            </>
          )}
          {/* 大图 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={okImages[lightbox]}
            alt={label}
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {/* 页码 */}
          <span className="absolute bottom-4 text-white/85 text-sm font-medium">
            {lightbox + 1} / {okImages.length}
          </span>
        </div>
      )}
    </div>
  )
}
