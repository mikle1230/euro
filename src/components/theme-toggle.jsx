'use client'

import { useState, useSyncExternalStore } from 'react'

// 外部系统（localStorage + 系统主题）快照：只在挂载后读一次，与原来 [] 依赖 effect 的读取时机一致。
// useSyncExternalStore 在水合时用 server 快照（'light'），水合完成后才切到 client 快照，
// 因此不会出现读 localStorage 造成的 hydration 不一致，也不需要 effect 里 setState。
const subscribeToThemeSource = () => () => {}
function readThemeSource() {
  const stored = localStorage.getItem('euro-theme')
  return stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

export default function ThemeToggle() {
  const detected = useSyncExternalStore(subscribeToThemeSource, readThemeSource, () => 'light')
  // 用户点过按钮后的显式选择；null = 跟随上面探测到的当前主题
  const [chosen, setChosen] = useState(null)
  const theme = chosen ?? detected

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setChosen(next)
    localStorage.setItem('euro-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <button
      onClick={toggle}
      className="theme-toggle w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 hover:bg-[var(--bg-surface)]"
      aria-label={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
    >
      {theme === 'light' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  )
}
