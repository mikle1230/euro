'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getMiceActivityById, resolveCountry } from '@/lib/mice'
import { MICE_ZH } from '@/data/mice-zh'
import MiceImage from '@/components/mice-image'
import { toast } from '@/components/toast'

const CATEGORY_STYLE = {
  'Activity': { label: '🎪 活动', color: 'var(--mice-accent)', bg: 'var(--mice-accent-subtle)' },
  'Technical Visit': { label: '🏭 技术参访', color: '#7c5cff', bg: 'rgba(124, 92, 255, 0.14)' },
}

function statusBadge(status) {
  if (status === 'Temporarily Closed') return { text: '⏸ 暂时关闭', cls: { background: 'rgba(245,158,11,0.15)', color: '#b45309' } }
  if (status === 'Permanently Closed') return { text: '⛔ 永久关闭', cls: { background: 'rgba(239,68,68,0.12)', color: '#dc2626' } }
  return null
}

function SpecItem({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className="w-5 shrink-0 text-center" style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
        <div className="text-sm mt-0.5" style={{ color: 'var(--text-primary)', overflowWrap: 'break-word' }}>{value}</div>
      </div>
    </div>
  )
}

function InfoCard({ icon, title, children, empty }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h2 className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        <span className="text-base">{icon}</span>{title}
      </h2>
      {children || <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{empty}</p>}
    </div>
  )
}

export default function MiceDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const a = getMiceActivityById(id)

  const handleSearch = (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    router.push(q ? `/mice?q=${encodeURIComponent(q)}` : '/mice')
  }

  if (!a) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <p className="text-3xl mb-3">🤷</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>未找到该活动</p>
          <Link href="/mice" className="inline-block mt-4 text-xs underline" style={{ color: 'var(--mice-accent)' }}>← 返回活动目录</Link>
        </div>
      </div>
    )
  }

  const cat = CATEGORY_STYLE[a.category] || { label: a.category, color: 'var(--text-secondary)', bg: 'var(--bg-surface)' }
  const closed = statusBadge(a.productStatus)
  const country = resolveCountry(a.country)
  const titleZh = MICE_ZH.titles[a.id] || ''
  const cityZh = MICE_ZH.cities[a.city] || ''
  const subZh = (a.subCategoryForActivity || '').split(';#').map((s) => MICE_ZH.subCategories[s.trim()] || s.trim()).filter(Boolean).join('、')
  const priceUnitLabel = { pax: '按人', group: '按团', hour: '按小时', course: '按课程', rental: '按租赁', 'set menus/pax': '按套餐/人' }
  const price = a.priceMax > 0
    ? `€${a.priceMin || '?'}–${a.priceMax}`
    : a.priceMin > 0
      ? `€${a.priceMin}`
      : '价格待询'
  const unit = a.priceUnit ? (priceUnitLabel[a.priceUnit] || `/${a.priceUnit}`) : ''

  // 预留：MICE 活动 → 行程草稿 / 报价单对接入口（后续实现 Add Serv 自动填充）
  const handleAddToDraft = () => {
    if (closed) return toast('该活动当前不可用，不能加入行程', 'error')
    const text = [a.title, a.country, a.city, `${price}${unit}`, a.officialWebsite].filter(Boolean).join(' | ')
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast('已复制活动信息，可在行程中添加 OTH/其他服务条目', 'success'))
        .catch(() => toast('复制失败，请手动复制', 'error'))
    } else {
      toast(text, 'info')
    }
  }

  const address = [a.streetAddress, a.city, country?.nameZh || a.country].filter(Boolean).join('，')

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
        {/* 搜索框：随时检索其他活动，回车跳到列表页并带上关键词 */}
        <form onSubmit={handleSearch} className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs" style={{ color: 'var(--text-tertiary)' }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索其他活动：标题、国家、城市、标签…"
            className="w-full pl-9 pr-16 py-2.5 rounded-xl text-sm border outline-none focus-ring-mice"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            aria-label="搜索活动"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--mice-accent-strong)', color: '#fff' }}
          >
            搜索
          </button>
        </form>

        {/* 面包屑 */}
        <div className="text-xs mb-4 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/mice" className="hover:text-[var(--mice-accent)] transition-colors">🎪 MICE 活动</Link>
          <span>/</span>
          <span className="truncate max-w-64">{a.title}</span>
        </div>

        {/* 大图 Hero */}
        <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}>
          <div className="aspect-[16/9] md:aspect-[21/9]">
            <MiceImage activity={a} className="w-full h-full object-cover" fallbackEmoji={a.category === 'Technical Visit' ? '🏭' : '🎪'} />
          </div>
          <div className="absolute inset-x-0 top-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(7,21,33,0.35), transparent)' }} />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
            {closed && <span className="text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur" style={closed.cls}>{closed.text}</span>}
          </div>
        </div>

        {/* 标题 + 价格（中英对照：中文主标题，英文副标题） */}
        <div className="mt-5 flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-2xl leading-snug" style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
              {titleZh || a.title}
            </h1>
            {titleZh && (
              <div className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{a.title}</div>
            )}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                {country?.flag || ''} {country?.nameZh || a.country}{cityZh ? ` · ${cityZh}` : ` · ${a.city}`}
              </span>
              {a.targetTourCategories.map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold leading-none" style={{ color: 'var(--mice-accent)' }}>{price}<span className="text-sm font-normal">{unit}</span></div>
            {a.officeInCharge && <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>负责：{a.officeInCharge}</div>}
          </div>
        </div>

        {/* 操作 */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddToDraft}
            disabled={!!closed}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 focus-ring-mice hover:-translate-y-0.5"
            style={{ background: 'var(--mice-accent-strong)', color: '#fff' }}
          >
            ➕ 复制到报价单（行程草稿）
          </button>
          {a.officialWebsite && (
            <a href={a.officialWebsite} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5 focus-ring-mice"
               style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              🌐 官网
            </a>
          )}
          {a.googleMapLink && (
            <a href={a.googleMapLink} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5 focus-ring-mice"
               style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              🗺️ Google 地图
            </a>
          )}
        </div>

        {/* 介绍 + 行程示例 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard icon="📋" title="活动介绍" empty="暂无描述">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{a.description || ''}</p>
          </InfoCard>
          <InfoCard icon="🗓️" title="行程示例（Tour Program）" empty="暂无行程示例">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{a.tourProgramExample || ''}</p>
          </InfoCard>
        </div>

        {/* 资源与信息 */}
        <div className="mt-4 rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            <span className="text-base">ℹ️</span> 资源与信息
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 mt-2">
            <div>
              <SpecItem icon="👥" label="容量" value={a.capacityMin > 0 || a.capacityMax > 0 ? `${a.capacityMin || '?'}–${a.capacityMax || '?'} 人${a.capacityDetails ? `（${a.capacityDetails}）` : ''}` : (a.capacityDetails || '')} />
              <SpecItem icon="💰" label="价格" value={`${price}${unit ? `（${unit}）` : ''}`} />
              <SpecItem icon="⏱️" label="时长" value={a.activityDuration} />
              <SpecItem icon="🕐" label="营业时间" value={a.openingHours} />
            </div>
            <div>
              <SpecItem icon="📅" label="最佳季节" value={a.bestTimeToVisit.length ? a.bestTimeToVisit.join('、') : ''} />
              <SpecItem icon="📍" label="地址" value={address} />
              <SpecItem icon="🏷️" label="标签" value={a.tags.length ? a.tags.map((t) => `#${t}`).join(' ') : ''} />
              <SpecItem icon="🗂️" label="子类目" value={subZh || a.subCategoryForActivity} />
            </div>
          </div>
          {(a.salesNotes || a.productStatus) && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <SpecItem icon="💡" label="销售提示" value={a.salesNotes} />
              <SpecItem icon="📌" label="状态" value={a.productStatus} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
