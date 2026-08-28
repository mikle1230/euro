'use client'

import Link from 'next/link'
import GlobalSearch from './global-search'

// 城市库各级页面共用的「吸顶工具条」：面包屑（左）+ 全局搜索（右）。
// 让搜索框在浏览 国家 → 城市 → 景点 时始终停留在页面顶部同一位置，随时可检索。
// crumbs = [{ label, href? }]，最后一项为当前页（无 href，不可点）。
export default function KnowledgeTopBar({ crumbs }) {
  return (
    <div
      className="sticky top-0 z-40 border-b px-4 md:px-6 py-2.5"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
    >
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        {/* 面包屑 */}
        <nav
          className="flex items-center gap-2 text-xs min-w-0 flex-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2 min-w-0">
              {i > 0 && <span className="shrink-0">/</span>}
              {c.href ? (
                <Link
                  href={c.href}
                  className="hover:text-[var(--accent)] transition-colors truncate"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        {/* 全局搜索（固定在右侧同一位置） */}
        <div className="w-40 sm:w-64 shrink-0">
          <GlobalSearch />
        </div>
      </div>
    </div>
  )
}
