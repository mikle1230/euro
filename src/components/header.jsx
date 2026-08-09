'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import ThemeToggle from './theme-toggle'
import { SITE } from '@/lib/config'
import { getLearningState } from '@/lib/learning'

export default function Header() {
  const pathname = usePathname()
  const [streak, setStreak] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const state = getLearningState()
    setStreak(state.streak || 0)
  }, [pathname])

  const navLinks = [
    { href: '/', label: '今日明信片', icon: '📮' },
    { href: '/explore', label: '探索图集', icon: '🗺️' },
    { href: '/passport', label: '我的护照', icon: '📔' },
    { href: '/search', label: '搜索', icon: '🔍' },
  ]

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 border-b" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
      <div className="mx-auto flex items-center justify-between h-14 px-4 md:px-8" style={{ maxWidth: '1400px' }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg no-underline" style={{ color: 'var(--text-primary)' }}>
          <span>{SITE.name}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                isActive(link.href)
                  ? 'bg-[var(--accent-subtle)]'
                  : 'hover:bg-[var(--bg-surface)]'
              }`}
              style={{ color: isActive(link.href) ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              <span className="mr-1">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--gold)' }}>
              🔥 {streak} 天
            </span>
          )}
          <ThemeToggle />
          {/* Mobile menu toggle */}
          <button
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--bg-surface)]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="菜单"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t p-2" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href) ? 'bg-[var(--accent-subtle)]' : ''
              }`}
              style={{ color: isActive(link.href) ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
