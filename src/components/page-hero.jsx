'use client'

// 统一页面 Hero：标题 + 一行说明（紧凑风格，高度/排版与城市库 hero 一致）。
//   - title：标题文本；badge：标题旁的彩色标签（ReactNode，由调用方配色）；subtitle：一行说明。
//   - right：右侧操作区（ReactNode，如 导出/添加 按钮）。
//   - maxWidth：内容宽度；sticky：是否吸顶（默认否——搜索栏负责吸顶；城市库 header 为 relative 时用 true）。
// 高度对齐知识库 hero：title text-xl + subtitle text-xs + py-3 + border-b + bg-secondary。
export default function PageHero({ title, badge, subtitle, right, maxWidth = 'max-w-7xl', sticky = false }) {
  return (
    <div
      className={`${sticky ? 'sticky top-0 ' : ''}border-b px-4 md:px-6 py-3`}
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
    >
      <div className={`${maxWidth} mx-auto flex items-start justify-between gap-3 flex-wrap`}>
        <div>
          <h1
            className="font-display font-bold text-xl flex items-center gap-2"
            style={{ color: 'var(--text-primary)', textWrap: 'balance' }}
          >
            {title}
            {badge}
          </h1>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
      </div>
    </div>
  )
}
