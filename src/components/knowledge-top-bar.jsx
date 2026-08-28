'use client'

import Link from 'next/link'
import GlobalSearch from './global-search'
import CountryFlag from './country-flag'
import CurrencyInline from './currency-inline'

// 城市库各级页面共用的「吸顶工具条」：面包屑（左）+ 汇率转换（搜索框前）+ 全局搜索（右）。
// 让搜索框与汇率转换在浏览 国家 → 城市 → 景点 时始终停留在页面顶部同一位置，随时可用。
// crumbs = [{ label, href? }]，最后一项为当前页（无 href，不可点）。
// flagCountryId：给「当前项」（最后一项）显示国旗；传国家库 ID 即可。
export default function KnowledgeTopBar({ crumbs, flagCountryId }) {
  return (
    <div
      className="sticky top-14 z-40 border-b px-4 md:px-6 py-2.5"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
    >
      <div className="max-w-5xl mx-auto flex items-center gap-2.5 flex-wrap">
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
                <span className="flex items-center gap-1.5 truncate" style={{ color: 'var(--text-primary)' }}>
                  {i === crumbs.length - 1 && flagCountryId && (
                    <CountryFlag countryId={flagCountryId} size="xs" />
                  )}
                  <span className="truncate">{c.label}</span>
                </span>
              )}
            </span>
          ))}
        </nav>
        {/* 汇率转换（放在搜索框前面） */}
        <CurrencyInline />
        {/* 全局搜索 */}
        <div className="w-40 sm:w-64 shrink-0">
          <GlobalSearch />
        </div>
      </div>
    </div>
  )
}
