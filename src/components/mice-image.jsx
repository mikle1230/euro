'use client'

import { useState } from 'react'

// MICE 活动图片：按优先级尝试候选源，全部失败显示占位。
// 候选链：public/mice-images/<id>.jpg → .jpeg → .png → .webp → Excel 里的 previewImageUrl（SharePoint）→ 占位
// 批量配置：把图片按活动 id 重命名（如 mice-YWx0YXVzc2VlIHNhbHQgbWlu.jpg）放进 public/mice-images/ 即可。
//
// 无障碍：真正的 <img> 设为装饰性（alt=""），把语义放在容器上（role="img" + aria-label = 活动名），
// 避免「图片加载失败时浏览器把 alt 文字铺满占位区」的残片。加载中/失败都垫一层渐变 + 图标，不裸奔。
export default function MiceImage({ activity, alt, className, fallbackEmoji = '🎪' }) {
  const [idx, setIdx] = useState(0)
  const candidates = [
    `/mice-images/${activity.id}.jpg`,
    `/mice-images/${activity.id}.jpeg`,
    `/mice-images/${activity.id}.png`,
    `/mice-images/${activity.id}.webp`,
    activity.previewImageUrl,
  ].filter(Boolean)

  const emoji = activity.category === 'Technical Visit' ? '🏭' : fallbackEmoji
  const label = alt || activity.title

  if (idx >= candidates.length) {
    return (
      <div
        role="img"
        aria-label={label}
        className={`relative flex items-center justify-center w-full h-full ${className || ''}`}
        style={{ background: 'linear-gradient(150deg, var(--bg-elevated), var(--bg-surface))' }}
      >
        <span className="text-4xl" aria-hidden="true">{emoji}</span>
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: 'linear-gradient(150deg, var(--bg-elevated), var(--bg-surface))' }}
    >
      {/* 兜底层：图片加载中或失败时显示，避免空荡荡 */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className="text-4xl">{emoji}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={candidates[idx]}
        alt=""
        loading="lazy"
        className={`relative w-full h-full object-cover ${className || ''}`}
        onError={() => setIdx((i) => i + 1)}
      />
    </div>
  )
}
