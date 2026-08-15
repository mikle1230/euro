'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './theme-toggle'
import UploadModal from './upload-modal'
import { SITE } from '@/lib/config'

export default function Header() {
  const pathname = usePathname()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const importFileRef = useRef(null)

  // 点「导入」直接打开本地文件选择器；选中文件后再弹上传弹窗（只显示进度条）
  const handleImportClick = () => {
    importFileRef.current?.click()
  }

  const handleImportChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingFile(file)
    setUploadOpen(true)
  }

  const isActive = (href) => {
    // 首页 = /（重定向到 /explore 工作台）
    if (href === '/') return pathname === '/' || pathname.startsWith('/explore')
    return pathname.startsWith(href)
  }

  // 桌面端：底部吸附的「浏览器标签」样式
  const tabGlass = {
    borderTopLeftRadius: '10px',
    borderTopRightRadius: '10px',
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '0',
    transition: 'all 0.15s ease',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }

  const desktopTabClass =
    'inline-flex items-center justify-center font-medium transition-all w-[88px] h-[40px] text-sm md:w-[110px] md:h-[45px]'

  // 移动端：紧凑分段胶囊，选中态清晰（品牌蓝底白字）
  const mobileTabClass =
    'inline-flex items-center justify-center h-8 px-3 rounded-full text-xs font-medium transition-all whitespace-nowrap'

  // 操作按钮：移动端纯图标（36px 触控目标），桌面端带文字胶囊
  const actionClass =
    'inline-flex items-center justify-center w-9 h-9 sm:h-auto sm:px-3 sm:py-1.5 rounded-full text-sm sm:text-xs font-medium transition-all border shrink-0'

  const activeTabGlass = {
    background: 'rgba(8, 115, 157, 0.18)',
    color: 'var(--accent)',
    boxShadow: '0 -1px 8px rgba(0,0,0,0.04)',
    border: '1px solid var(--border-color)',
    borderBottom: 'none',
  }
  const inactiveTabGlass = { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }

  return (
    <header
      className="sticky top-0 z-[900] border-b flex items-center justify-between gap-1 px-2 sm:px-4 md:px-6 shrink-0 h-14"
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* 左：Logo → 首页（移动端仅图标） */}
      <Link
        href="/"
        className="flex items-center gap-2 sm:gap-3 shrink-0 rounded-lg transition-colors hover:opacity-80"
        title={`回到首页（${SITE.name}）`}
        aria-label="回到首页"
      >
        <span className="text-base sm:text-lg shrink-0">🗺️</span>
        <span className="font-display font-bold text-sm sm:text-base shrink-0 hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
          {SITE.name}
        </span>
      </Link>

      {/* 中：导航（移动端分段胶囊 / 桌面端浏览器标签） */}
      <nav className="flex items-center min-w-0">
        <div className="sm:hidden flex items-center gap-1">
          <Link
            href="/"
            className={mobileTabClass}
            style={isActive('/')
              ? { background: 'var(--accent-strong)', color: '#fff' }
              : { color: 'var(--text-tertiary)' }}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            首页
          </Link>
          <Link
            href="/knowledge"
            className={mobileTabClass}
            style={isActive('/knowledge')
              ? { background: 'var(--accent-strong)', color: '#fff' }
              : { color: 'var(--text-tertiary)' }}
            aria-current={isActive('/knowledge') ? 'page' : undefined}
          >
            知识库
          </Link>
        </div>
        <div className="hidden sm:flex items-end gap-0 h-14">
          <Link
            href="/"
            style={{ ...tabGlass, ...(isActive('/') ? activeTabGlass : inactiveTabGlass) }}
            className={desktopTabClass}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            首页
          </Link>
          <Link
            href="/knowledge"
            style={{ ...tabGlass, ...(isActive('/knowledge') ? activeTabGlass : inactiveTabGlass) }}
            className={desktopTabClass}
            aria-current={isActive('/knowledge') ? 'page' : undefined}
          >
            知识库
          </Link>
        </div>
      </nav>

      {/* 右：导入 / 设置 / 主题 */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          onClick={handleImportClick}
          className={actionClass}
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          title="导入行程文件"
          aria-label="导入行程文件"
        >
          <span className="text-sm">📤</span>
          <span className="hidden sm:inline ml-1">导入</span>
        </button>
        <Link
          href="/settings"
          className={actionClass}
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          title="设置"
          aria-label="设置"
        >
          <span className="text-sm">⚙️</span>
          <span className="hidden sm:inline ml-1">设置</span>
        </Link>
        <div className="flex items-center h-14 ml-0.5 sm:ml-2">
          <ThemeToggle />
        </div>
      </div>

      {/* 隐藏的文件选择器：点「导入」直接打开本地文件夹 */}
      <input
        ref={importFileRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.xls"
        className="hidden"
        onChange={handleImportChange}
      />
      <UploadModal
        open={uploadOpen}
        pendingFile={pendingFile}
        onPendingHandled={() => setPendingFile(null)}
        onClose={() => setUploadOpen(false)}
      />
    </header>
  )
}
