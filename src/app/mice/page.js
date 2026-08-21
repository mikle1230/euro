'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { getAllMiceActivities, getMiceCountries, getMiceTags, getMiceTourCategories, filterMiceActivities, PRICE_RANGES, resolveCountry } from '@/lib/mice'
import MiceImage from '@/components/mice-image'

const CATEGORY_STYLE = {
  'Activity': { label: '🎪 活动', color: 'var(--mice-accent)', bg: 'var(--mice-accent-subtle)' },
  'Technical Visit': { label: '🏭 技术参访', color: '#7c5cff', bg: 'rgba(124, 92, 255, 0.14)' },
}

function statusBadge(status) {
  if (status === 'Temporarily Closed') return { text: '⏸ 暂时关闭', cls: { background: 'rgba(245,158,11,0.15)', color: '#b45309' } }
  if (status === 'Permanently Closed') return { text: '⛔ 永久关闭', cls: { background: 'rgba(239,68,68,0.12)', color: '#dc2626' } }
  return null
}

function ActivityCard({ a, idx = 0 }) {
  const cat = CATEGORY_STYLE[a.category] || { label: a.category, color: 'var(--text-secondary)', bg: 'var(--bg-surface)' }
  const closed = statusBadge(a.productStatus)
  const country = resolveCountry(a.country)
  const price = a.priceMax > 0
    ? `€${a.priceMin || '?'}–${a.priceMax}`
    : a.priceMin > 0
      ? `€${a.priceMin}`
      : '价格待询'
  const unit = a.priceUnit ? `/${a.priceUnit}` : ''
  const cap = a.capacityMax > 0 ? `👥 最多 ${a.capacityMax} 人` : ''

  return (
    <Link
      href={`/mice/${a.id}`}
      className="fade-up group flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-ring-mice"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        opacity: closed ? 0.72 : 1,
        animationDelay: `${Math.min(idx * 40, 360)}ms`,
        boxShadow: '0 1px 2px rgba(23,40,61,0.04)',
      }}
    >
      <div className="h-36 relative overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <MiceImage
          activity={a}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
        />
        {closed && (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold backdrop-blur" style={closed.cls}>
            {closed.text}
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: cat.bg, color: cat.color }}>
            {cat.label}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
            {country?.flag || ''} {country?.nameZh || a.country}
          </span>
        </div>

        <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)', textWrap: 'balance' }} title={a.title}>
          {a.title}
        </h3>

        <div className="text-xs flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
          {a.city && <span className="inline-flex items-center gap-1">📍 <span className="truncate max-w-28">{a.city}</span></span>}
          {cap && <span>{cap}</span>}
        </div>

        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--mice-accent)' }}>
            {price}{unit}
          </span>
          {a.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-24" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              #{t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

const chipClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap focus-ring-mice'
// 激活态用 --mice-accent-strong（深橙，白字深浅主题都 ≥4.5:1）；--mice-accent 在深色会提亮，白字不达标
const chipActive = { background: 'var(--mice-accent-strong)', color: '#fff', borderColor: 'transparent' }
const chipInactive = { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
const selectClass = 'px-2.5 py-1.5 rounded-lg text-xs border outline-none focus-ring-mice'
const selectStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

export default function MicePage() {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [categories, setCategories] = useState([])
  const [tourCat, setTourCat] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [tag, setTag] = useState('')
  const [hideClosed, setHideClosed] = useState(true)
  const [shown, setShown] = useState(60)

  const countries = useMemo(() => getMiceCountries(), [])
  const tourCategories = useMemo(() => getMiceTourCategories(), [])
  const tags = useMemo(() => getMiceTags(40), [])
  const stats = useMemo(() => {
    const all = getAllMiceActivities()
    return { total: all.length, activity: all.filter((a) => a.category === 'Activity').length, tv: all.filter((a) => a.category === 'Technical Visit').length }
  }, [])

  const results = useMemo(
    () => filterMiceActivities({
      query,
      countries: country ? [country] : [],
      categories,
      tourCategories: tourCat ? [tourCat] : [],
      priceRange,
      tags: tag ? [tag] : [],
      hideClosed,
    }),
    [query, country, categories, tourCat, priceRange, tag, hideClosed],
  )

  const toggleCategory = (c) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const reset = () => {
    setQuery(''); setCountry(''); setCategories([]); setTourCat(''); setPriceRange(''); setTag(''); setHideClosed(true); setShown(60)
  }

  const hasFilter = query || country || categories.length || tourCat || priceRange || tag || !hideClosed

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Masthead — MICE 暖色展示风 */}
      <div className="border-b" style={{ borderColor: 'var(--border-color)', background: 'linear-gradient(180deg, var(--bg-primary) 0%, transparent 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-9">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl md:text-3xl" style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
              MICE 特色活动
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'var(--mice-accent-subtle)', color: 'var(--mice-accent)' }}>
              <span className="text-sm leading-none">🎪</span> 活动 / 技术参访
            </span>
          </div>
          <p className="text-xs md:text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            为地接团组精选的可落地特色活动与技术参访，可直接复制进报价单
          </p>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {[{ label: '总活动', value: stats.total }, { label: '活动', value: stats.activity }, { label: '技术参访', value: stats.tv }].map((s) => (
              <div key={s.label} className="px-3 py-1.5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                <span className="text-[11px] ml-1.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* 搜索 */}
        <div className="relative max-w-2xl">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs" style={{ color: 'var(--text-tertiary)' }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShown(60) }}
            placeholder="搜索活动标题、国家、城市、标签…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus-ring-mice"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            aria-label="搜索活动"
          />
        </div>

        {/* 类别 chips */}
        <div className="flex items-center gap-1.5 mt-4 mb-3 flex-wrap">
          {Object.keys(CATEGORY_STYLE).map((c) => (
            <button
              key={c}
              onClick={() => { toggleCategory(c); setShown(60) }}
              className={chipClass}
              style={categories.includes(c) ? chipActive : chipInactive}
            >
              {CATEGORY_STYLE[c].label}
            </button>
          ))}
        </div>

        {/* 筛选器 */}
        <div className="flex items-start gap-2 flex-wrap mb-4">
          <select value={country} onChange={(e) => { setCountry(e.target.value); setShown(60) }} className={selectClass} style={selectStyle} aria-label="国家筛选">
            <option value="">🌍 全部国家</option>
            {countries.map((c) => (
              <option key={c.code || c.nameEn} value={c.code || c.nameEn}>
                {c.flag} {c.nameZh || c.nameEn}（{c.count}）
              </option>
            ))}
          </select>
          <select value={tourCat} onChange={(e) => { setTourCat(e.target.value); setShown(60) }} className={selectClass} style={selectStyle} aria-label="团型筛选">
            <option value="">🧳 全部团型</option>
            {tourCategories.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={priceRange} onChange={(e) => { setPriceRange(e.target.value); setShown(60) }} className={selectClass} style={selectStyle} aria-label="价格筛选">
            <option value="">💰 全部价格</option>
            {PRICE_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <select value={tag} onChange={(e) => { setTag(e.target.value); setShown(60) }} className={selectClass} style={selectStyle} aria-label="标签筛选">
            <option value="">🏷️ 全部标签</option>
            {tags.map((t) => <option key={t} value={t}>#{t}</option>)}
          </select>
          <button onClick={() => setHideClosed(!hideClosed)} className={chipClass} style={hideClosed ? chipActive : chipInactive}>
            {hideClosed ? '🙈 隐藏关闭' : '👁️ 显示关闭'}
          </button>
          {hasFilter && <button onClick={reset} className={chipClass} style={chipInactive}>✕ 重置</button>}
        </div>

        {/* 结果统计 */}
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          找到 <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{results.length}</span> 项{results.length > shown ? `，显示前 ${shown} 项` : ''}
        </p>

        {/* 卡片网格 */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.slice(0, shown).map((a, i) => <ActivityCard key={a.id} a={a} idx={i} />)}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed rounded-2xl" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>没有匹配的活动</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>调整筛选条件，或点击「重置」回到全部</p>
          </div>
        )}

        {results.length > shown && (
          <div className="text-center py-8">
            <button
              onClick={() => setShown((s) => s + 60)}
              className="px-6 py-2.5 rounded-full text-sm font-medium border transition-all focus-ring-mice hover:-translate-y-0.5"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              加载更多（{results.length - shown}）
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
