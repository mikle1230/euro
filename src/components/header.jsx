'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './theme-toggle'
import GlobalSearch from './global-search'
import { SITE } from '@/lib/config'

export default function Header() {
  const pathname = usePathname()

  const linkStyle = (active) =>
    active
      ? { background: 'var(--accent)', color: '#fff' }
      : { background: 'transparent', color: 'var(--text-secondary)' }

  const isActive = (href) => {
    if (href === '/explore') return pathname === '/' || pathname.startsWith('/explore')
    return pathname.startsWith(href)
  }

  return (
    <header
      className="sticky top-0 z-[900] border-b h-14 flex items-center justify-between px-4 md:px-6 shrink-0"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🗺️</span>
        <span className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
          {SITE.name}
        </span>
        <span
          className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full ml-1"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
        >
          探索
        </span>
      </div>

      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1">
          <Link
            href="/explore"
            className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80 font-medium"
            style={linkStyle(isActive('/explore'))}
          >
            探索
          </Link>
          <Link
            href="/knowledge"
            className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80 font-medium"
            style={linkStyle(isActive('/knowledge'))}
          >
            📖 知识库
          </Link>
        </nav>
        <GlobalSearch />
        <span className="text-xs hidden md:inline" style={{ color: 'var(--text-tertiary)' }}>
          欧洲地接行程工作台
        </span>
        <ThemeToggle />
      </div>
    </header>
  )
}
