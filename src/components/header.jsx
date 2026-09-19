'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './theme-toggle'
import { SITE } from '@/lib/config'

export default function Header() {
  const pathname = usePathname()

  // 导航不再有「首页」项：logo 直接指向城市库（/knowledge），`/` 仍由 app/page.js 重定向过来。
  const isActive = (href) => pathname.startsWith(href)

  // 配色全部走 chrome token：默认值 = 旧的浅色外观（见 globals.css :root）；
  // 皮肤作用域（body:has([data-skin="e"])）内改 token 即可整条顶栏换皮。
  const tabActive = {
    background: 'var(--tab-on-bg)',
    color: 'var(--tab-on-fg)',
    boxShadow: 'var(--tab-on-shadow)',
    border: '1px solid var(--tab-on-border)',
    borderBottom: 'none',
  }
  const tabInactive = {
    background: 'var(--tab-off-bg)',
    color: 'var(--tab-off-fg)',
  }

  const tabGlass = {
    borderTopLeftRadius: '10px',
    borderTopRightRadius: '10px',
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '0',
    transition: 'all 0.15s ease',
    backdropFilter: 'var(--chrome-blur)',
    WebkitBackdropFilter: 'var(--chrome-blur)',
  }

  const tabClass =
    'inline-flex items-center justify-center font-medium transition-all w-[60px] h-[36px] text-xs sm:w-[88px] sm:h-[40px] sm:text-sm md:w-[110px] md:h-[45px] md:text-sm'

  // 顶部导航始终吸顶：任何页面滚动时 tab 都保持在顶部，方便随时切换（不再依赖路径特殊处理）
  return (
    <header
      className="sticky top-0 z-[900] border-b flex items-center justify-between px-2 sm:px-4 md:px-6 shrink-0 h-14"
      style={{
        background: 'var(--chrome-bg)',
        borderColor: 'var(--chrome-border)',
        color: 'var(--chrome-text)',
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Logo → 城市库（/knowledge） */}
        <Link
          href="/knowledge"
          className="flex items-center gap-2 sm:gap-3 shrink-0 rounded-lg transition-colors hover:opacity-80"
          title={`返回城市库（${SITE.name}）`}
        >
          <span className="site-mark" aria-hidden>EA</span>
          <span className="text-base sm:text-lg shrink-0 site-emoji" aria-hidden>🗺️</span>
          <span className="site-brand font-display font-bold text-sm sm:text-base shrink-0 hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
            {SITE.name}
          </span>
        </Link>
      </div>

      <div className="flex items-end gap-1 self-end h-14">
        <nav className="flex items-end gap-0 h-full">
          <Link
            href="/knowledge"
            style={{
              ...tabGlass,
              ...(isActive('/knowledge') ? tabActive : tabInactive),
            }}
            className={tabClass}
          >
            城市库
          </Link>
          <Link
            href="/hotels"
            style={{
              ...tabGlass,
              ...(isActive('/hotels') ? tabActive : tabInactive),
            }}
            className={tabClass}
          >
            酒店库
          </Link>
          <Link
            href="/mice"
            style={{
              ...tabGlass,
              ...(isActive('/mice') ? tabActive : tabInactive),
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
            background: 'var(--chrome-btn-bg)',
            borderColor: 'var(--chrome-btn-border)',
            color: 'var(--chrome-btn-fg)',
          }}
          title="设置"
        >
          <span className="text-sm site-emoji" aria-hidden>⚙️</span>
          <span className="hidden sm:inline">设置</span>
        </Link>
        <div className="flex items-center h-14 ml-1 sm:ml-3" style={{ color: 'var(--chrome-text)' }}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
