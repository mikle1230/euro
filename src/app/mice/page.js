'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAllMiceActivities, getMiceCountries, getMiceTags, getMiceTourCategories, filterMiceActivities, PRICE_RANGES, resolveCountry } from '@/lib/mice'
import { MICE_ZH } from '@/data/mice-zh'
import { getCountryAccentByIso } from '@/lib/skin'
import SearchToolbar from '@/components/search-toolbar'
import PageHero from '@/components/page-hero'
import InstantSearchDropdown from '@/components/instant-search-dropdown'

// E｜磁贴墙 皮肤：本页与城市库/国家页/景点页/酒店库同一套 token（globals.css 末尾 E 段）。
// 颜色只做编码：类别用两个非紫的收敛色（赭棕 / 石板灰蓝），国家用 lib/skin.js 的国家色表
// （ISO 码 → 城市库 country id，同一国家各级页面同色）。
const CATEGORY_STYLE = {
  Activity: { label: '活动', color: '#8C5A2B', bg: 'rgba(140, 90, 43, 0.12)' },
  'Technical Visit': { label: '技术参访', color: '#4A5D6B', bg: 'rgba(74, 93, 107, 0.14)' },
}

function statusBadge(status) {
  if (status === 'Temporarily Closed') return { text: '暂时关闭', soft: true }
  if (status === 'Permanently Closed') return { text: '永久关闭', soft: false }
  return null
}

// 无图码卡（E）：1,697 条活动只有 1 张可用图 → 不用假图、不用 emoji。
// 卡面 = 色块头（左 6px 国家色条 + 深墨码牌 MICE｜IT + 红棕价贴）+ 打孔线 + 纸身，
// 字段与旧卡完全一致：类别 / 国家 / 城市 / 中英标题 / 最多人数 / 价格+单位 / 时长 / 标签。
function ActivityCard({ a, idx = 0 }) {
  const cat = CATEGORY_STYLE[a.category] || { label: a.category, color: 'var(--text-secondary)', bg: 'var(--bg-surface)' }
  const closed = statusBadge(a.productStatus)
  const country = resolveCountry(a.country)
  const accent = getCountryAccentByIso(country?.code)
  const titleZh = MICE_ZH.titles[a.id] || ''
  const cityZh = MICE_ZH.cities[a.city] || ''
  const price = a.priceMax > 0
    ? `€${a.priceMin || '?'}–${a.priceMax}`
    : a.priceMin > 0
      ? `€${a.priceMin}`
      : ''
  const unit = a.priceUnit ? `/${a.priceUnit}` : ''
  // 时长字段里既有「3 hours 30 minutes」也有整段说明（数据原样）；
  // 短的贴红棕贴纸，长的降为纸底等宽辅文（不裁切、不假装是短值）。
  const duration = String(a.activityDuration || '').trim()
  const durationAsSticker = duration.length > 0 && duration.length <= 18

  return (
    <Link
      href={`/mice/${a.id}`}
      className="e-ticket fade-up group flex flex-col transition-all duration-200 hover:-translate-y-0.5 focus-ring-mice"
      style={{
        opacity: closed ? 0.72 : 1,
        animationDelay: `${Math.min(idx * 40, 360)}ms`,
      }}
    >
      {/* 色块头：国家色条 + 码牌 + 价贴（无图牌，不假装有照片） */}
      <div className="e-mc-block" style={{ borderLeft: `6px solid ${accent}` }}>
        <span className="code-plate inline" aria-hidden>
          <span className="cc">MICE</span>
          {country?.code && <span className="cty">{country.code}</span>}
        </span>
        {closed && <span className={`e-mc-flag${closed.soft ? ' soft' : ''}`}>{closed.text}</span>}
        {price ? (
          <span className="e-price lg">
            {price}
            {unit && <span className="u">{unit}</span>}
          </span>
        ) : (
          <span className="e-price none">价格待询</span>
        )}
      </div>

      {/* 打孔线（纯装饰） */}
      <div className="e-tk-perf" aria-hidden><i className="l" /><i className="r" /></div>

      {/* 纸身：中英标题 + 类别/国家/城市/容量/标签 */}
      <div className="e-tk-body">
        <div className="e-tk-name">
          <h3 title={a.title}>{titleZh || a.title}</h3>
          <span className="e-tk-seq" aria-hidden>{String(idx + 1).padStart(2, '0')}</span>
        </div>
        {titleZh && <div className="e-tk-meta" title={a.title}>{a.title}</div>}

        <div className="e-tk-chips">
          {/* 类别圆点用类别色（赭棕 / 石板蓝），左侧 6px 色条仍是国家色 */}
          <span className="e-mc-cat" style={{ color: cat.color }}>{cat.label}</span>
          <span>{country?.nameZh || a.country}</span>
          {(cityZh || a.city) && <span>{cityZh || a.city}</span>}
          {a.capacityMax > 0 && <span>最多 {a.capacityMax} 人</span>}
        </div>

        {/* 票根行：时长（红棕贴纸）+ 标签，贴到卡底 */}
        {(duration || a.tags.length > 0) && (
          <div className="e-mc-foot">
            {duration && (
              durationAsSticker
                ? <span className="e-price" title={duration}>{duration}</span>
                : <span className="e-mc-note" title={duration}>{duration}</span>
            )}
            {a.tags.slice(0, 2).map((t) => <span key={t} className="e-mc-tag">#{t}</span>)}
          </div>
        )}
      </div>
    </Link>
  )
}

const chipClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap focus-ring-mice'
// 激活态用 --mice-accent-strong（E 皮肤下 = 深墨实底，浅纸底上对比 ≥4.5:1）
const chipActive = { background: 'var(--mice-accent-strong)', color: 'var(--on-accent-strong)', borderColor: 'transparent' }
const chipInactive = { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
const selectClass = 'px-2.5 py-1.5 rounded-lg text-xs border outline-none focus-ring-mice'
const selectStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

// URL 的 ?q= 属于外部系统（不在 React 里），用 useSyncExternalStore 读：
// 水合时 React 用 server 快照（''），水合完成后才切到 client 快照（浏览器 location.search），
// 所以不会出现 hydration 不一致；随后在 render 期按 previous 值同步到 query
// （React 官方「按 previous 值调整 state」模式），与原来 [] 依赖的 effect 行为一致。
const subscribeNoop = () => () => {}
const readUrlQuery = () => new URLSearchParams(window.location.search).get('q') || ''

export default function MicePage() {
  const router = useRouter()
  const urlQuery = useSyncExternalStore(subscribeNoop, readUrlQuery, () => '')
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [categories, setCategories] = useState([])
  const [tourCat, setTourCat] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [tag, setTag] = useState('')
  const [hideClosed, setHideClosed] = useState(true)
  const [shown, setShown] = useState(60)
  const [urlQueryApplied, setUrlQueryApplied] = useState(false)

  // 支持从详情页搜索框跳转过来：/mice?q=关键词 → 自动初始化搜索
  if (!urlQueryApplied && urlQuery) {
    setUrlQueryApplied(true)
    setQuery(urlQuery)
    setShown(60)
  }

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
    <div className="min-h-full" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
      {/* Hero — 与城市库统一风格/高度 */}
      <PageHero
        maxWidth="max-w-7xl"
        title="MICE 特色活动"
        badge={<span className="e-badge">活动 / 技术参访</span>}
        subtitle={`共 ${stats.total} 项（${stats.activity} 活动 · ${stats.tv} 技术参访）· 为地接团组精选的可落地特色活动与技术参访，可直接复制进报价单`}
      />

      {/* 搜索工具栏：汇率转换 + MICE 搜索（吸顶，任何滚动位置都能用，输入即下拉） */}
      <SearchToolbar
        stickyTop="top-14"
        maxWidth="max-w-7xl"
        search={
          <div className="relative max-w-2xl">
            <InstantSearchDropdown
              value={query}
              onChange={(v) => { setQuery(v); setShown(60) }}
              placeholder="搜索活动标题、国家、城市、标签…"
              results={results.slice(0, 8)}
              getKey={(a) => a.id}
              onSelect={(a) => router.push(`/mice/${a.id}`)}
              accentVar="var(--mice-accent)"
              renderItem={(a) => {
                const country = resolveCountry(a.country)
                const price = a.priceMax > 0 ? `€${a.priceMin || '?'}–${a.priceMax}` : a.priceMin > 0 ? `€${a.priceMin}` : '价格待询'
                return (
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {MICE_ZH.titles[a.id] || a.title}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {[country?.nameZh || a.country, a.city].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="e-idx-chip shrink-0">{price}</span>
                  </div>
                )
              }}
            />
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* 筛选纸带：类别 chips + 国家/团型/价格/标签下拉 + 隐藏关闭 / 重置（顺序与旧版一致） */}
        <div className="filter-strip">
          <div className="flex flex-wrap gap-1.5 filter-chips">
            {Object.keys(CATEGORY_STYLE).map((c) => (
              <button
                key={c}
                onClick={() => { toggleCategory(c); setShown(60) }}
                className={`${chipClass} filter-chip`}
                style={categories.includes(c) ? chipActive : chipInactive}
              >
                {CATEGORY_STYLE[c].label}
              </button>
            ))}
          </div>

          <select value={country} onChange={(e) => { setCountry(e.target.value); setShown(60) }} className={`${selectClass} filter-select`} style={selectStyle} aria-label="国家筛选">
            <option value="">全部国家</option>
            {countries.map((c) => (
              <option key={c.code || c.nameEn} value={c.code || c.nameEn}>
                {c.nameZh || c.nameEn}（{c.count}）
              </option>
            ))}
          </select>
          <select value={tourCat} onChange={(e) => { setTourCat(e.target.value); setShown(60) }} className={`${selectClass} filter-select`} style={selectStyle} aria-label="团型筛选">
            <option value="">全部团型</option>
            {tourCategories.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={priceRange} onChange={(e) => { setPriceRange(e.target.value); setShown(60) }} className={`${selectClass} filter-select`} style={selectStyle} aria-label="价格筛选">
            <option value="">全部价格</option>
            {PRICE_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <select value={tag} onChange={(e) => { setTag(e.target.value); setShown(60) }} className={`${selectClass} filter-select`} style={selectStyle} aria-label="标签筛选">
            <option value="">全部标签</option>
            {tags.map((t) => <option key={t} value={t}>#{t}</option>)}
          </select>
          <button onClick={() => setHideClosed(!hideClosed)} className={`${chipClass} filter-chip filter-toggle`} style={hideClosed ? chipActive : chipInactive}>
            {hideClosed ? '隐藏关闭' : '显示关闭'}
          </button>
          {hasFilter && <button onClick={reset} className={`${chipClass} filter-chip filter-toggle`} style={chipInactive}>重置</button>}
        </div>

        {/* 结果统计 */}
        <p className="e-count">
          找到 <b>{results.length}</b> 项{results.length > shown ? `，显示前 ${shown} 项` : ''}
        </p>

        {/* 卡片网格 */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.slice(0, shown).map((a, i) => <ActivityCard key={a.id} a={a} idx={i} />)}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed" style={{ borderColor: 'var(--e-line, var(--border-color))' }}>
            {/* E 皮禁 emoji：空态用码牌代替图标（纯装饰） */}
            <span className="code-plate inline" aria-hidden><span className="cc">0</span><span className="cty">结果</span></span>
            <p className="text-sm font-medium mt-3" style={{ color: 'var(--text-secondary)' }}>没有匹配的活动</p>
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
