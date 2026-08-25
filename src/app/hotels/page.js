'use client'

import { useState, useMemo } from 'react'
import { getHotelCatalog, searchHotels, COUNTRY_CURRENCIES } from '@/lib/hotel-recommend'
import { getHotelQuoteCatalog, findHotelQuote, getBookingInfo, searchHotelQuotes } from '@/lib/hotel-prices'

// Booking 评分配色：≥9 深绿 / ≥8 品牌蓝 / ≥7 琥珀
function ratingColor(r) {
  if (r >= 9) return '#1e7d32'
  if (r >= 8) return 'var(--accent-strong)'
  return '#b8860b'
}

// near 字段可能含 "/" 或 "、"（如「火车站/港口」），拆成多个「近X」标签
function nearTags(near) {
  if (!near) return []
  return String(near).split(/[/、,，]/).map((s) => s.trim()).filter(Boolean)
}

// 排序：评分（默认）/ 价格升 / 价格降 / 星级；价格 0（待定）始终排最后
function sortedHotels(hotels, sort) {
  const arr = [...hotels]
  const ratingDesc = (a, b) => (b.rating || 0) - (a.rating || 0)
  if (sort === 'priceAsc') {
    arr.sort((a, b) => (a.priceEur || 0) - (b.priceEur || 0))
    arr.sort((a, b) => ((a.priceEur || 0) === 0 ? 1 : 0) - ((b.priceEur || 0) === 0 ? 1 : 0))
  } else if (sort === 'priceDesc') {
    arr.sort((a, b) => (b.priceEur || 0) - (a.priceEur || 0))
    arr.sort((a, b) => ((a.priceEur || 0) === 0 ? 1 : 0) - ((b.priceEur || 0) === 0 ? 1 : 0))
  } else if (sort === 'star') {
    arr.sort((a, b) => (b.star || 0) - (a.star || 0) || ratingDesc(a, b))
  } else {
    arr.sort(ratingDesc)
  }
  return arr
}

const stagger = (i, cap = 360) => ({ animationDelay: `${Math.min(i * 36, cap)}ms` })

// 来源标签样式：hotel list（权威报价）用品牌色；AI 探索（待替换参考）用中性色
function SourceBadge({ fromList }) {
  return fromList ? (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium"
      style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
    >
      📋 hotel list
    </span>
  ) : (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium"
      style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
    >
      🤖 AI 探索
    </span>
  )
}

function HotelCard({ h, showCity = false, cityCode = '', idx = 0 }) {
  // 报价库对象（有 hotel 字段，来自 hotel list）→ 按报价库样式；推荐库对象（有 name）→ 推荐库样式
  const priceRef = !!h.hotel
  // 推荐库酒店：找报价库匹配价（€/人）
  const quote = priceRef ? null : findHotelQuote(cityCode, h.name)
  const fromList = priceRef || !!quote?.pp

  // 名称
  const name = h.hotel || h.name
  const nameZh = h.nameZh
  // QUOS 名 → Booking 实际名/链接（hotel-booking-map.js），帮助识别 Booking 上的对应酒店
  const booking = getBookingInfo(cityCode, name)

  // 价格 + 单位 + 月份（priceRef 才有月份）
  let price, unit, month
  if (priceRef) {
    const prices = h.prices || []
    price = prices[0]?.pp != null ? `€${prices[0].pp}` : null
    unit = '/人'
    month = prices.length ? prices.map((p) => p.month).filter(Boolean).join('/') : ''
  } else if (quote?.pp) {
    price = `€${quote.pp}`
    unit = '/人'
  } else if (h.priceEur) {
    price = `€${h.priceEur}`
    unit = '/晚'
  }

  return (
    <article
      className="fade-up overflow-hidden rounded-2xl border flex flex-col transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 1px 2px rgba(23,40,61,0.04)',
        animationDelay: stagger(idx).animationDelay,
      }}
    >
      {/* 深蓝条：酒店名称（中英文）+ 价格 */}
      <div className="shrink-0 px-4 py-3" style={{ background: 'linear-gradient(120deg, #0a7aa6, #075e83)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[15px] leading-snug" style={{ color: '#fff' }} title={name}>
              {name}
            </h3>
            {nameZh && (
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.86)' }}>{nameZh}</div>
            )}
            {booking && (
              <a
                href={booking.link || undefined}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { if (!booking.link) e.preventDefault() }}
                className="block text-[11px] mt-0.5 truncate"
                style={{ color: 'rgba(255,255,255,0.92)', textDecoration: 'underline' }}
                title={booking.link ? '打开 Booking 页面' : `Booking 名：${booking.name}`}
              >
                🔗 {booking.name}{booking.link ? ' ↗' : ''}
              </a>
            )}
          </div>
          <div className="shrink-0 text-right whitespace-nowrap">
            {price ? (
              <>
                <div className="text-sm font-bold leading-none" style={{ color: '#fff' }}>{price}<span className="text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.86)' }}>{unit}</span></div>
                {month && <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>{month}</div>}
              </>
            ) : (
              <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.72)' }}>价格待定</div>
            )}
          </div>
        </div>
      </div>

      {/* 白色区：城市/介绍 + 标签 */}
      <div className="p-3.5 flex flex-col flex-1">
        {showCity && !priceRef && (
          <div className="text-[11px] mb-2 font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {h.countryName} · {h.city}
          </div>
        )}

        {h.area && (
          <div className="text-xs leading-snug" style={{ color: 'var(--text-tertiary)', overflowWrap: 'break-word' }}>
            {h.area}
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <SourceBadge fromList={fromList} />
          {h.rating > 0 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ background: 'var(--accent-subtle)', color: ratingColor(h.rating) }}
            >
              ★{h.rating}
            </span>
          )}
          {h.star > 0 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px]"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              {h.star}星
            </span>
          )}
          {!priceRef && nearTags(h.near).map((n, i) => (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px]"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
            >
              近{n}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

const SORT_OPTIONS = [
  { key: 'rating', label: '评分最高' },
  { key: 'priceAsc', label: '价格从低到高' },
  { key: 'priceDesc', label: '价格从高到低' },
  { key: 'star', label: '星级最高' },
]

export default function HotelsPage() {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('') // '' = 全部
  const [sort, setSort] = useState('rating')
  const catalog = useMemo(() => getHotelCatalog(), [])
  const quoteCatalog = useMemo(() => getHotelQuoteCatalog(), [])
  const results = useMemo(() => {
    if (!query.trim()) return []
    // 合并推荐库 + 报价库（hotel list 来源）结果：推荐库常缺报价库独有城市（如斯德哥尔摩 BW TEN）
    const rec = searchHotels(query)
    const quote = searchHotelQuotes(query)
    // 去重（同名酒店若两边都有，保留推荐库）
    const seen = new Set()
    const merged = [...rec, ...quote].filter((h) => {
      const key = (h.hotel || h.name || '').toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return merged
  }, [query])
  const searching = query.trim().length > 0

  // 合并目录：推荐库 ∪ 报价库（同一城市两种数据都挂上；报价库独有城市也显示）
  const merged = useMemo(() => {
    const byCountry = new Map()
    const getC = (cc) => {
      if (!byCountry.has(cc)) byCountry.set(cc, new Map())
      return byCountry.get(cc)
    }
    for (const c of catalog) {
      for (const city of c.cities) {
        const m = getC(c.country)
        m.set(city.cityCode || city.city, { ...city, country: c.country, countryName: c.countryName })
      }
    }
    for (const c of quoteCatalog) {
      for (const city of c.cities) {
        const m = getC(c.country)
        const key = city.cityCode || city.city
        const ex = m.get(key)
        if (ex) ex.quotes = city
        else {
          m.set(key, {
            city: city.city, nameEn: city.nameEn, cityCode: city.cityCode,
            hotels: [], note: '', country: c.country, countryName: c.countryName, quotes: city,
          })
        }
      }
    }
    return [...byCountry.entries()].map(([cc, m]) => ({
      country: cc,
      countryName: [...m.values()][0]?.countryName || cc,
      cities: [...m.values()].sort((a, b) => String(a.city).localeCompare(String(b.city), 'zh')),
    })).sort((a, b) => String(a.countryName).localeCompare(String(b.countryName), 'zh'))
  }, [catalog, quoteCatalog])

  const totalHotels = useMemo(
    () => merged.reduce((s, c) => s + c.cities.reduce((x, ci) => x + ci.hotels.length + (ci.quotes?.hotels?.length || 0), 0), 0),
    [merged],
  )

  const visibleCountries = useMemo(
    () => (country ? merged.filter((c) => c.country === country) : merged),
    [merged, country],
  )
  const visibleResults = useMemo(() => {
    const filtered = country ? results.filter((h) => h.country === country) : results
    return sortedHotels(filtered, sort)
  }, [results, country, sort])

  const chipClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap focus-ring'
  const chipActive = { background: 'var(--accent-strong)', color: '#fff', borderColor: 'transparent' }
  const chipInactive = { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Masthead — 编辑/展示风 */}
      <div
        className="border-b"
        style={{
          borderColor: 'var(--border-color)',
          background: 'linear-gradient(180deg, var(--bg-primary) 0%, transparent 100%)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-9">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl md:text-3xl" style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
              酒店库
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
              <span className="text-sm leading-none">🏨</span> 地接报价参考
            </span>
          </div>
          <p className="text-xs md:text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            Booking 评分 ≥7 推荐库 + 酒店价格参考（€/人，以 hotel list 为准）
          </p>

          {/* 统计 */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {[
              { label: '国家', value: merged.length },
              { label: '酒店', value: totalHotels },
            ].map((s) => (
              <div key={s.label} className="px-3 py-1.5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                <span className="text-[11px] ml-1.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* 搜索 */}
        <div className="relative max-w-2xl">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索酒店名或城市（如 Nice、尼斯、罗马、Hôtel Carré）"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border outline-none focus-ring"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            aria-label="搜索酒店"
          />
          {searching && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs focus-ring"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              aria-label="清空搜索"
            >
              ✕
            </button>
          )}
        </div>

        {/* 筛选 + 排序 */}
        <div className="flex items-start justify-between gap-3 flex-wrap mt-4 mb-6">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCountry('')} className={chipClass} style={country === '' ? chipActive : chipInactive}>
              全部
            </button>
            {merged.map((c) => (
              <button key={c.country} onClick={() => setCountry(country === c.country ? '' : c.country)} className={chipClass} style={country === c.country ? chipActive : chipInactive}>
                {c.countryName}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-2.5 py-1.5 rounded-lg text-xs border outline-none focus-ring" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} aria-label="排序方式">
            {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        {/* 搜索结果 */}
        {searching ? (
          <div className="fade-up">
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              找到 <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{visibleResults.length}</span> 家酒店
            </p>
            {visibleResults.length === 0 ? (
              <EmptyState icon="🔍" title="没有匹配的酒店" hint="换个关键词，或点上方国家标签筛选" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleResults.map((h, i) => <HotelCard key={`${h.name}-${i}`} h={h} showCity cityCode={h.cityCode} idx={i} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {visibleCountries.map((countryItem) => (
              <section key={countryItem.country} className="fade-up">
                {/* 国家标题 */}
                <div className="flex items-baseline gap-2 mb-3 flex-wrap pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <h2 className="font-display font-bold text-lg md:text-xl" style={{ color: 'var(--text-primary)' }}>
                    {countryItem.countryName}
                  </h2>
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{countryItem.country}</span>
                  {(() => {
                    const cur = COUNTRY_CURRENCIES[countryItem.country]
                    if (!cur) return null
                    return (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] ml-auto" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                        {cur.symbol} {cur.code} {cur.name}
                      </span>
                    )
                  })()}
                </div>

                <div className="space-y-5">
                  {countryItem.cities.map((city) => (
                    <div key={city.cityCode || city.city}>
                      <div className="flex items-baseline gap-2 mb-2">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{city.city}</h3>
                        {city.nameEn && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{city.nameEn}</span>}
                        {city.cityCode && <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{city.cityCode}</span>}
                        <span className="text-[11px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>{city.hotels.length + (city.quotes?.hotels?.length || 0)} 家</span>
                      </div>
                      {city.note && <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-tertiary)' }}>{city.note}</p>}

                      {city.hotels.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                          {sortedHotels(city.hotels, sort).map((h, i) => <HotelCard key={i} h={h} cityCode={city.cityCode} idx={i} />)}
                        </div>
                      )}

                      {city.quotes?.hotels?.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            💰 酒店价格参考（€/人 · 以 hotel list 为准）
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {city.quotes.hotels.map((h, i) => <HotelCard key={i} h={h} priceRef cityCode={city.cityCode} idx={i} />)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, hint }) {
  return (
    <div className="text-center py-16 border border-dashed rounded-2xl" style={{ borderColor: 'var(--border-color)' }}>
      <p className="text-3xl mb-3">{icon}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
    </div>
  )
}
