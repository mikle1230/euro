'use client'

import CurrencyInline from './currency-inline'

// 共享「吸顶搜索工具栏」：把汇率转换放到搜索框前面（左边）。
//   - left = 汇率转换（内联、始终展开）
//   - search = 各页面自己的搜索控件（GlobalSearch 下拉 或 页内过滤输入框），由调用方传入
// 放在页面顶部，吸顶（sticky），在任何滚动位置都能看到并使用搜索 + 汇率。
// stickyTop 为吸顶偏移类（顶栏 h-14=56px 下方通常是 top-14；知识库 header 为 relative 用 top-0）。
export default function SearchToolbar({ search, stickyTop = 'top-14', maxWidth = 'max-w-6xl', extraRight, className = '' }) {
  return (
    <div
      className={`sticky ${stickyTop} z-40 border-b px-4 md:px-6 py-2.5 ${className}`}
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
    >
      <div className={`${maxWidth} mx-auto flex items-center gap-3 flex-wrap`}>
        <CurrencyInline />
        {search && <div className="flex-1 min-w-[240px]">{search}</div>}
        {extraRight}
      </div>
    </div>
  )
}
