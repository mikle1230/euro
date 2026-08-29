'use client'

// 中英对照文本组件：有中文翻译时，中文 + 英文原文**同时显示**（上下对照）；
// 无翻译时直接显示英文原文。用于 MICE 详情页的长文本（活动介绍/行程示例）。
export default function BilingualText({ zh, en }) {
  if (!en) return null

  // 无中文翻译 → 直接显示英文
  if (!zh) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
        {en}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {/* 中文（主，对照阅读） */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
        {zh}
      </p>
      {/* 英文原文（对照显示，弱化一点便于区分） */}
      <p className="text-xs leading-relaxed whitespace-pre-wrap border-t pt-2" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-light)' }}>
        {en}
      </p>
    </div>
  )
}
