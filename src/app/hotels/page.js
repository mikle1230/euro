'use client'

import { useState, useMemo } from 'react'
import { getHotelCatalog, searchHotels, COUNTRY_CURRENCIES } from '@/lib/hotel-recommend'
import { getHotelQuoteCatalog, findHotelQuote } from '@/lib/hotel-prices'

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

function HotelCard({ h, showCity = false, cityCode = '' }) {
  // 价格以 hotel list 实际价为准：推荐库酒店若在报价库匹配到 → 显示 €/人（标间单人价）
  const quote = findHotelQuote(cityCode, h.name)
  const fromList = !!quote?.pp
  return (
    <div
      className="rounded-xl border p-3 transition-shadow hover:shadow-md"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      {showCity && (
        <div className="text-[11px] mb-1 font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {h.countryName} · {h.city}{h.cityCode ? ` ${h.cityCode}` : ''}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
            {h.nameZh && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{h.nameZh}</span>}
          </div>
          {h.area && (
            <div className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-tertiary)', overflowWrap: 'break-word' }}>
              {h.area}
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <SourceBadge fromList={fromList} />
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ background: 'var(--accent-subtle)', color: ratingColor(h.rating) }}
            >
              ★{h.rating}
            </span>
            {h.star > 0 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px]"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
              >
                {h.star}星
              </span>
            )}
            {nearTags(h.near).map((n, i) => (
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
        <div className="shrink-0 text-right whitespace-nowrap">
          {fromList ? (
            <div className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>€{quote.pp}/人</div>
          ) : h.priceEur ? (
            <div className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>€{h.priceEur}/晚</div>
          ) : (
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>价格待定</div>
          )}
        </div>
      </div>
    </div>
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
  const results = useMemo(() => searchHotels(query), [query])
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

  // 国家筛选 + 排序后的目录
  const visibleCountries = useMemo(
    () => (country ? merged.filter((c) => c.country === country) : merged),
    [merged, country],
  )
  // 搜索结果的筛选 + 排序
  const visibleResults = useMemo(() => {
    const filtered = country ? results.filter((h) => h.country === country) : results
    return sortedHotels(filtered, sort)
  }, [results, country, sort])

  const chipClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap'
  const chipActive = { background: 'var(--accent-strong)', color: '#fff', borderColor: 'transparent' }
  const chipInactive = { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* 页头 + 搜索 */}
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>🏨 酒店库</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {merged.length} 国 · {totalHotels} 家酒店 · 推荐库（Booking 评分≥7）+ 酒店价格参考（€/人，以 hotel list 为准）
        </p>
        <div className="mt-3 relative max-w-xl">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
            style={{ color: 'var(--text-tertiary)' }}
          >
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
            className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm border outline-none"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            aria-label="搜索酒店"
          />
          {searching && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              aria-label="清空搜索"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 筛选 + 排序工具栏 */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCountry('')}
            className={chipClass}
            style={country === '' ? chipActive : chipInactive}
          >
            全部
          </button>
          {merged.map((c) => (
            <button
              key={c.country}
              onClick={() => setCountry(country === c.country ? '' : c.country)}
              className={chipClass}
              style={country === c.country ? chipActive : chipInactive}
            >
              {c.countryName}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs border outline-none"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          aria-label="排序方式"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* 搜索结果 */}
      {searching ? (
        <>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            找到 {visibleResults.length} 家酒店
          </p>
          {visibleResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>没有匹配的酒店，换个关键词或国家筛选试试</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {visibleResults.map((h, i) => <HotelCard key={i} h={h} showCity cityCode={h.cityCode} />)}
            </div>
          )}
        </>
      ) : (
        /* 完整目录：国家 → 城市 → 酒店 */
        visibleCountries.map((countryItem) => (
          <section key={countryItem.country} className="mb-7">
            <div className="flex items-baseline gap-2 mb-3 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {countryItem.countryName}
              </h2>
              <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{countryItem.country}</span>
              {(() => {
                const cur = COUNTRY_CURRENCIES[countryItem.country]
                if (!cur) return null
                return (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px]"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                  >
                    {cur.symbol} {cur.code} {cur.name}
                  </span>
                )
              })()}
            </div>
            {countryItem.cities.map((city) => (
              <div key={city.cityCode || city.city} className="mb-5">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{city.city}</h3>
                  {city.nameEn && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{city.nameEn}</span>}
                  {city.cityCode && <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{city.cityCode}</span>}
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{city.hotels.length + (city.quotes?.hotels?.length || 0)} 家</span>
                </div>
                {city.note && (
                  <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-tertiary)' }}>{city.note}</p>
                )}
                {city.hotels.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {sortedHotels(city.hotels, sort).map((h, i) => <HotelCard key={i} h={h} cityCode={city.cityCode} />)}
                  </div>
                )}
                {city.quotes?.hotels?.length > 0 && (
                  <div className="mt-2.5 rounded-lg border border-dashed p-2.5" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      💰 酒店价格参考（€/人 · 以 hotel list 为准）
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {city.quotes.hotels.map((h, i) => {
                        const prices = h.prices || []
                        const monthLabel = prices.length === 1 ? prices[0]?.month : prices.map((p) => p.month).join('/')
                        return (
                          <div key={i} className="text-xs rounded-lg px-2 py-1.5 flex items-start justify-between gap-2" style={{ background: 'var(--bg-surface)' }}>
                            <div className="min-w-0">
                              <div className="font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }} title={h.hotel}>
                                <span className="truncate">{h.hotel}</span>
                                <SourceBadge fromList />
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {h.rating > 0 && <span className="text-[10px] font-semibold" style={{ color: ratingColor(h.rating) }}>★{h.rating}</span>}
                                {h.star > 0 && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{h.star}星</span>}
                              </div>
                            </div>
                            <div className="shrink-0 text-right whitespace-nowrap">
                              <div className="font-semibold" style={{ color: 'var(--gold)' }}>
                                {prices[0]?.pp ? `€${prices[0].pp}` : ''}
                              </div>
                              {monthLabel && <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{monthLabel}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  )
}
