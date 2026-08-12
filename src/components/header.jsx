'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './theme-toggle'
import GlobalSearch from './global-search'
import UploadModal from './upload-modal'
import { SITE } from '@/lib/config'

export default function Header() {
  const pathname = usePathname()
  const [uploadOpen, setUploadOpen] = useState(false)

  const isActive = (href) => {
    if (href === '/explore') return pathname === '/' || pathname.startsWith('/explore')
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

  return (
    <header
      className="sticky top-0 z-[900] border-b flex items-center justify-between px-2 sm:px-4 md:px-6 shrink-0 h-14"
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-base sm:text-lg shrink-0">🗺️</span>
        <span className="font-display font-bold text-sm sm:text-base shrink-0 hidden xs:inline" style={{ color: 'var(--text-primary)' }}>
          {SITE.name}
        </span>
        <GlobalSearch />
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          title="导入行程文件"
        >
          <span className="text-sm">📤</span>
          <span className="hidden sm:inline">导入</span>
        </button>
      </div>

      <div className="flex items-end gap-0 self-end h-14">
        <nav className="flex items-end gap-0 h-full">
          <Link
            href="/explore"
            style={{
              ...tabGlass,
              ...(isActive('/explore')
                ? { background: 'rgba(20, 184, 166, 0.18)', color: 'var(--accent)', boxShadow: '0 -1px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', borderBottom: 'none' }
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }
              ),
            }}
            className="inline-flex items-center justify-center font-medium transition-all
              w-[72px] h-[36px] text-xs
              sm:w-[96px] sm:h-[40px] sm:text-sm
              md:w-[120px] md:h-[45px] md:text-sm"
          >
            探索
          </Link>
          <Link
            href="/knowledge"
            style={{
              ...tabGlass,
              ...(isActive('/knowledge')
                ? { background: 'rgba(20, 184, 166, 0.18)', color: 'var(--accent)', boxShadow: '0 -1px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', borderBottom: 'none' }
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }
              ),
            }}
            className="inline-flex items-center justify-center font-medium transition-all
              w-[72px] h-[36px] text-xs
              sm:w-[96px] sm:h-[40px] sm:text-sm
              md:w-[120px] md:h-[45px] md:text-sm"
          >
            📖 知识库
          </Link>
        </nav>
        <div className="flex items-center h-14 ml-1 sm:ml-3">
          <ThemeToggle />
        </div>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </header>
  )
}
