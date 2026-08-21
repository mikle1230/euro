'use client'

import { useState } from 'react'

// MICE 活动图片：按优先级尝试候选源，全部失败显示占位。
// 候选链：public/mice-images/<id>.jpg → .png → .webp → Excel 里的 previewImageUrl（SharePoint）→ 占位
// 批量配置：把图片按活动 id 重命名（如 mice-YWx0YXVzc2VlIHNhbHQgbWlu.jpg）放进 public/mice-images/ 即可。
export default function MiceImage({ activity, alt, className, fallbackEmoji = '🎪' }) {
  const [idx, setIdx] = useState(0)
  const candidates = [
    `/mice-images/${activity.id}.jpg`,
    `/mice-images/${activity.id}.png`,
    `/mice-images/${activity.id}.webp`,
    activity.previewImageUrl,
  ].filter(Boolean)

  if (idx >= candidates.length) {
    return (
      <div className={`flex items-center justify-center ${className || ''}`} style={{ color: 'var(--text-tertiary)' }}>
        <span className="text-3xl">{activity.category === 'Technical Visit' ? '🏭' : fallbackEmoji}</span>
      </div>
    )
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={candidates[idx]}
      alt={alt || activity.title}
      loading="lazy"
      className={`object-cover ${className || ''}`}
      onError={() => setIdx((i) => i + 1)}
    />
  )
}
