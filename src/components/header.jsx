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

  return (
    <header
      className="sticky top-0 z-[900] border-b flex items-center justify-between px-2 sm:px-4 md:px-6 shrink-0 h-14"
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
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }
              ),
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
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }
              ),
            }}
            className={tabClass}
          >
            知识库
          </Link>
          {/* 暂注释：录入Copilot（功能待定）
          <Link
            href="/guide"
            style={{
              ...tabGlass,
              ...(isActive('/guide')
                ? { background: 'rgba(8, 115, 157, 0.18)', color: 'var(--accent)', boxShadow: '0 -1px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', borderBottom: 'none' }
                : { background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-tertiary)' }
              ),
            }}
            className={tabClass}
          >
            🧭 录入Copilot
          </Link>
          */}
        </nav>
        {/* 导入行程文件（点一下直接打开本地文件选择器） */}
        <button
          onClick={handleImportClick}
          className="inline-flex items-center gap-1 self-end mb-1 sm:mb-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border"
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
