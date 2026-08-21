'use client'

import { use } from 'react'
import Link from 'next/link'
import { getMiceActivityById, resolveCountry } from '@/lib/mice'
import MiceImage from '@/components/mice-image'
import { toast } from '@/components/toast'

const CATEGORY_STYLE = {
  'Activity': { label: '🎪 活动', color: 'var(--accent)' },
  'Technical Visit': { label: '🏭 技术参访', color: '#8b5cf6' },
}

function statusBadge(status) {
  if (status === 'Temporarily Closed') return { text: '⏸ 暂时关闭', cls: { background: 'rgba(245,158,11,0.15)', color: '#b45309' } }
  if (status === 'Permanently Closed') return { text: '⛔ 永久关闭', cls: { background: 'rgba(239,68,68,0.12)', color: '#dc2626' } }
  return null
}

function MetaItem({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-sm py-1.5">
      <span className="w-5 shrink-0 text-center" style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <span className="text-xs w-20 shrink-0 font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', overflowWrap: 'break-word' }}>{value}</span>
    </div>
  )
}

export default function MiceDetailPage({ params }) {
  const { id } = use(params)
  const a = getMiceActivityById(id)

  if (!a) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <p className="text-3xl mb-3">🤷</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>未找到该活动</p>
          <Link href="/mice" className="inline-block mt-4 text-xs underline" style={{ color: 'var(--accent)' }}>← 返回活动目录</Link>
        </div>
      </div>
    )
  }

  const cat = CATEGORY_STYLE[a.category] || { label: a.category, color: 'var(--text-secondary)' }
  const closed = statusBadge(a.productStatus)
  const country = resolveCountry(a.country)
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

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
        {/* 面包屑 */}
        <div className="text-xs mb-4 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/mice" className="hover:text-[var(--accent)] transition-colors">🎪 MICE 活动</Link>
          <span>/</span>
          <span className="truncate max-w-64">{a.title}</span>
        </div>

        {/* 大图 */}
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}>
          <MiceImage activity={a} className="w-full max-h-80" fallbackEmoji={a.category === 'Technical Visit' ? '🏭' : '🎪'} />
        </div>

        {/* 标题 + 状态 */}
        <div className="mt-4 flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-xl leading-snug" style={{ color: 'var(--text-primary)' }}>
              {a.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cat.color + '20', color: cat.color }}>
                {cat.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                {country?.flag || ''} {country?.nameZh || a.country}
              </span>
              {a.targetTourCategories.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
                  {t}
                </span>
              ))}
              {closed && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={closed.cls}>{closed.text}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{price}<span className="text-xs font-normal">{unit}</span></div>
            {a.officeInCharge && <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>负责：{a.officeInCharge}</div>}
          </div>
        </div>

        {/* 操作 */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddToDraft}
            disabled={!!closed}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--accent-strong)', color: '#fff' }}
          >
            ➕ 复制到报价单（行程草稿）
          </button>
          {a.officialWebsite && (
            <a href={a.officialWebsite} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
               style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              🌐 官网
            </a>
          )}
          {a.googleMapLink && (
            <a href={a.googleMapLink} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
               style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              🗺️ Google 地图
            </a>
          )}
        </div>

        {/* 详情 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 描述 */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>📋 活动介绍</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {a.description || '暂无描述'}
            </p>
          </div>
          {/* 行程示例 */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>🗓️ 行程示例（Tour Program）</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {a.tourProgramExample || '暂无行程示例'}
            </p>
          </div>
        </div>

        {/* 资源信息 */}
        <div className="mt-4 rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>ℹ️ 资源与信息</h2>
          <MetaItem icon="👥" label="容量" value={a.capacityMin > 0 || a.capacityMax > 0 ? `${a.capacityMin || '?'}–${a.capacityMax || '?'} 人${a.capacityDetails ? `（${a.capacityDetails}）` : ''}` : (a.capacityDetails || '')} />
          <MetaItem icon="💰" label="价格" value={`${price}${unit ? `（${unit}）` : ''}`} />
          <MetaItem icon="⏱️" label="时长" value={a.activityDuration} />
          <MetaItem icon="🕐" label="营业时间" value={a.openingHours} />
          <MetaItem icon="📅" label="最佳季节" value={a.bestTimeToVisit.length ? a.bestTimeToVisit.join('、') : ''} />
          <MetaItem icon="📍" label="地址" value={[a.streetAddress, a.city, country?.nameZh || a.country].filter(Boolean).join('，')} />
          <MetaItem icon="🏷️" label="标签" value={a.tags.length ? a.tags.map((t) => `#${t}`).join(' ') : ''} />
          {a.subCategoryForActivity && <MetaItem icon="🗂️" label="子类目" value={a.subCategoryForActivity} />}
          {a.salesNotes && <MetaItem icon="💡" label="销售提示" value={a.salesNotes} />}
          {a.productStatus && <MetaItem icon="📌" label="状态" value={a.productStatus} />}
          {a.officeInCharge && <MetaItem icon="🏢" label="负责办公室" value={a.officeInCharge} />}
        </div>
      </div>
    </div>
  )
}
