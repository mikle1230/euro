'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './theme-toggle'
import { SITE } from '@/lib/config'

export default function Header() {
  const pathname = usePathname()

  const isActive = (href) => {
    // 首页 = /（重定向到 /explore 工作台）
    if (href === '/') return pathname === '/' || pathname.startsWith('/explore')
    return pathname.startsWith(href)
  }

  const tabGlass = {
    borderTopLeftRadius: '10px',
    borderTopRightRadius: '10px',
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '0',
    transition: 'all 0.15s ease',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }

  const tabClass =
    'inline-flex items-center justify-center font-medium transition-all w-[60px] h-[36px] text-xs sm:w-[88px] sm:h-[40px] sm:text-sm md:w-[110px] md:h-[45px] md:text-sm'

  // 城市库（/knowledge）页面：顶栏随页面滚动收起，让面包屑吸顶常驻，留出浏览空间
  const isKnowledge = pathname.startsWith('/knowledge')

  return (
    <header
      className={`${isKnowledge ? 'relative' : 'sticky top-0'} z-[900] border-b flex items-center justify-between px-2 sm:px-4 md:px-6 shrink-0 h-14`}
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Logo → 首页 */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 shrink-0 rounded-lg transition-colors hover:opacity-80"
          title={`回到首页（${SITE.name}）`}
        >
          <span className="text-base sm:text-lg shrink-0">🗺️</span>
          <span className="font-display font-bold text-sm sm:text-base shrink-0 hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
            {SITE.name}
          </span>
        </Link>
      </div>

      <div className="flex items-end gap-1 self-end h-14">
        <nav className="flex items-end gap-0 h-full">
          <Link
            href="/"
            style={{
              ...tabGlass,
              ...(isActive('/')
                ? { background: 'rgba(8, 115, 157, 0.18)', color: 'var(--accent)', boxShadow: '0 -1px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', borderBottom: 'none' }
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }),
            }}
            className={tabClass}
          >
            首页
          </Link>
          <Link
            href="/knowledge"
            style={{
              ...tabGlass,
              ...(isActive('/knowledge')
                ? { background: 'rgba(8, 115, 157, 0.18)', color: 'var(--accent)', boxShadow: '0 -1px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', borderBottom: 'none' }
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }),
            }}
            className={tabClass}
          >
            城市库
          </Link>
          <Link
            href="/hotels"
            style={{
              ...tabGlass,
              ...(isActive('/hotels')
                ? { background: 'rgba(8, 115, 157, 0.18)', color: 'var(--accent)', boxShadow: '0 -1px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', borderBottom: 'none' }
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }),
            }}
            className={tabClass}
          >
            酒店库
          </Link>
          <Link
            href="/mice"
            style={{
              ...tabGlass,
              ...(isActive('/mice')
                ? { background: 'rgba(8, 115, 157, 0.18)', color: 'var(--accent)', boxShadow: '0 -1px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', borderBottom: 'none' }
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }),
            }}
            className={tabClass}
          >
            MICE
          </Link>
        </nav>
        {/* 设置（独立页面 /settings） */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 self-end mb-1 sm:mb-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          title="设置"
        >
          <span className="text-sm">⚙️</span>
          <span className="hidden sm:inline">设置</span>
        </Link>
        <div className="flex items-center h-14 ml-1 sm:ml-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
