'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { getAllMiceActivities, getMiceCountries, getMiceTags, getMiceTourCategories, filterMiceActivities, PRICE_RANGES, resolveCountry } from '@/lib/mice'
import MiceImage from '@/components/mice-image'

const CATEGORY_STYLE = {
  'Activity': { label: '🎪 活动', color: 'var(--accent)' },
  'Technical Visit': { label: '🏭 技术参访', color: '#8b5cf6' },
}

function statusBadge(status) {
  if (status === 'Temporarily Closed') return { text: '⏸ 暂时关闭', cls: { background: 'rgba(245,158,11,0.15)', color: '#b45309' } }
  if (status === 'Permanently Closed') return { text: '⛔ 永久关闭', cls: { background: 'rgba(239,68,68,0.12)', color: '#dc2626' } }
  return null
}

function ActivityCard({ a }) {
  const cat = CATEGORY_STYLE[a.category] || { label: a.category, color: 'var(--text-secondary)' }
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
      className="rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        opacity: closed ? 0.7 : 1,
      }}
    >
      <div className="h-32 relative overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <MiceImage activity={a} className="w-full h-full" />
        {closed && (
          <span
            className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={closed.cls}
          >
            {closed.text}
          </span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: cat.color + '20', color: cat.color }}>
            {cat.label}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
            {country?.flag || ''} {country?.nameZh || a.country}
          </span>
        </div>
        <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }} title={a.title}>
          {a.title}
        </h3>
        <div className="text-xs flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
          {a.city && <span>📍 {a.city}</span>}
          {cap && <span>{cap}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
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

const chipClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap'
const chipActive = { background: 'var(--accent-strong)', color: '#fff', borderColor: 'transparent' }
const chipInactive = { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
const selectClass = 'px-2.5 py-1.5 rounded-lg text-xs border outline-none'
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

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        {/* 页头 + 搜索 */}
        <div className="mb-4">
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            🎪 MICE 特色活动
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            共 {stats.total} 项 · 活动 {stats.activity} · 技术参访 {stats.tv} · 数据源：MICE 活动目录（可扩充）
          </p>
          <div className="mt-3 relative max-w-xl">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs" style={{ color: 'var(--text-tertiary)' }}>🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShown(60) }}
              placeholder="搜索活动标题、国家、城市、标签…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
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
          <button
            onClick={() => setHideClosed(!hideClosed)}
            className={chipClass}
            style={hideClosed ? chipActive : chipInactive}
          >
            {hideClosed ? '🙈 隐藏关闭' : '👁️ 显示关闭'}
          </button>
          {(query || country || categories.length || tourCat || priceRange || tag || !hideClosed) && (
            <button onClick={reset} className={chipClass} style={chipInactive}>✕ 重置</button>
          )}
        </div>

        {/* 类别 chips */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
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

        {/* 结果统计 */}
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          找到 {results.length} 项{results.length > shown ? `，显示前 ${shown} 项` : ''}
        </p>

        {/* 卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.slice(0, shown).map((a) => <ActivityCard key={a.id} a={a} />)}
        </div>

        {results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>没有匹配的活动，调整筛选条件试试</p>
          </div>
        )}

        {results.length > shown && (
          <div className="text-center py-6">
            <button
              onClick={() => setShown((s) => s + 60)}
              className="px-5 py-2 rounded-full text-sm font-medium border transition-all"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              加载更多（{results.length - shown}）
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
