'use client'

import { useState, useMemo } from 'react'
import { getHotelCatalog, searchHotels, COUNTRY_CURRENCIES } from '@/lib/hotel-recommend'
import { getHotelQuoteCatalog, findHotelQuote, getBookingInfo, searchHotelQuotes } from '@/lib/hotel-prices'
import { getAllCountries } from '@/lib/data'
import { getCountryAccent } from '@/lib/skin'
import SearchToolbar from '@/components/search-toolbar'
import PageHero from '@/components/page-hero'
import InstantSearchDropdown from '@/components/instant-search-dropdown'
import travelData from '@/data/europe-travel.json'
import { COUNTRIES } from '@/data/countries'

// E｜磁贴墙 皮肤：本页与城市库/国家页/景点页同一套 token（globals.css 末尾 E 段）。
// 国家色条复用 lib/skin.js 的国家色表；色表按「城市库国家顺序」取色，
// 所以这里先把 ISO 二字码（酒店数据用的是 ISO 码）映射回城市库的 country id，
// 保证同一个国家在 /knowledge 与 /hotels 颜色一致。

// 国家标签顺序：跟随「城市库」(europe-travel.json) 的国家顺序（而非中文名音序），便于对照查找
const COUNTRY_ORDER = (() => {
  const isoByName = new Map()
  for (const [cc, info] of Object.entries(COUNTRIES)) {
    isoByName.set(String(info.nameEn || '').toLowerCase(), cc)
    isoByName.set(String(info.name || ''), cc)
  }
  const order = new Map()
  ;(travelData.countries || []).forEach((c, i) => {
    const cc =
      isoByName.get(String(c.nameEn || '').toLowerCase()) ||
      isoByName.get(String(c.name || '')) ||
      c.id
    if (!order.has(cc)) order.set(cc, i)
  })
  return order
})()

function countryRank(cc) {
  return COUNTRY_ORDER.has(cc) ? COUNTRY_ORDER.get(cc) : 999
}

// near 字段可能含 "/" 或 "、"（如「火车站/港口」），拆成多个「近X」标签
function nearTags(near) {
  if (!near) return []
  return String(near).split(/[/、,，]/).map((s) => s.trim()).filter(Boolean)
}

// 排序：hotel list（报价项）优先，AI 探索靠后；同来源内按评分（默认）/ 价格升 / 价格降 / 星级；
// 价格 0（待定）始终排最后
function isFromList(h) {
  // 报价库（hotel list）对象：有 hotel + prices 字段；或推荐库对象能匹配到报价库价格（€/人）
  if (!!h.hotel) return true
  return !!findHotelQuote(h.cityCode, h.name)?.pp
}
function sortedHotels(hotels, sort) {
  const arr = [...hotels]
  const ratingDesc = (a, b) => (b.rating || 0) - (a.rating || 0)
  const listFirst = (a, b) => {
    const la = isFromList(a) ? 0 : 1
    const lb = isFromList(b) ? 0 : 1
    return la - lb
  }
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
  // 无论哪种排序，hotel list 来源始终排在 AI 探索之前（稳定排序保留组内顺序）
  arr.sort(listFirst)
  return arr
}

const stagger = (i, cap = 360) => ({ animationDelay: `${Math.min(i * 36, cap)}ms` })

// 价贴字号阶梯：hotel list 的 pp 可能是双价/区间（如 '€46.28/60.11/100.53'），
// 长串降档位保证整串可见、不被卡片裁切；常规单价一律 38px（价格是卡的唯一主角）。
const PRICE_STEPS = [[6, 38], [8, 32], [10, 26], [12, 20], [15, 16]]
function priceFontSize(price) {
  const len = String(price).length
  for (const [max, size] of PRICE_STEPS) if (len <= max) return size
  return 13
}

// 从 Booking 链接取域名（E10 稿的订房行只显示域名；Booking 名保留在 title 上）
function bookingHost(link) {
  if (!link) return ''
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// 价目名片（E10 稿）：无照片、无 emoji —— 价格是唯一主角。
// 字段与旧卡完全一致：中文名/英文名、城市码、星/评分/来源、近X、介绍(area)、订房、城市；
// 只换「衣服」：左上深墨码牌 + 右上红棕等宽价贴 + 虚线打孔 + 4 栏网格。
function HotelCard({ h, showCity = false, cityCode = '', countryCode = '', accent, idx = 0 }) {
  // 报价库对象（有 hotel 字段，来自 hotel list）→ 按报价库样式；推荐库对象（有 name）→ 推荐库样式
  const priceRef = !!h.hotel
  // 推荐库酒店：找报价库匹配价（€/人）
  const quote = priceRef ? null : findHotelQuote(cityCode, h.name)
  const fromList = priceRef || !!quote?.pp

  // 名称：中文名优先，数据里没有中文名 → 回退英文名（不编造翻译）
  const name = h.hotel || h.name
  const nameZh = h.nameZh
  // QUOS 名 → Booking 实际名/链接（hotel-booking-map.js），帮助识别 Booking 上的对应酒店
  const booking = getBookingInfo(cityCode, name)

  // 价格 + 单位 + 标注（priceRef 才有月份）
  let price, unit, priceLabel
  if (priceRef) {
    const prices = h.prices || []
    // pp 非数值（数据里有 "/" 这种占位）→ 视同无价，走「价格待定」（口径同 getQuoteRange 的 parseFloat 过滤）
    const first = prices[0]
    const hasPp = first?.pp != null && !isNaN(parseFloat(String(first.pp)))
    price = hasPp ? `€${first.pp}` : null
    unit = 'EUR / 人'
    const month = prices.length ? prices.map((p) => p.month).filter(Boolean).join('/') : ''
    priceLabel = month ? `每人 · ${month}` : '每人报价'
  } else if (quote?.pp) {
    price = `€${quote.pp}`
    unit = 'EUR / 人'
    priceLabel = 'hotel list · 每人'
  } else if (h.priceEur) {
    price = `€${h.priceEur}`
    unit = 'EUR / 晚'
    priceLabel = '参考价'
  }

  const near = priceRef ? [] : nearTags(h.near)
  const host = bookingHost(booking?.link)
  const priceSize = price ? priceFontSize(price) : 0

  return (
    <article
      className="e-ticket fade-up flex flex-col transition-all duration-200 hover:-translate-y-0.5"
      style={{
        borderLeft: `6px solid ${accent}`,
        animationDelay: stagger(idx).animationDelay,
      }}
    >
      {/* 票头：码牌 + 价贴（价格最响） */}
      <div className="e-tk-strip">
        <span className="code-plate inline" aria-hidden>
          {countryCode && <span className="cc">{countryCode}</span>}
          {cityCode && <span className="cty">{cityCode}</span>}
        </span>
        <div className="e-tk-price">
          {price ? (
            <>
              <span className="lab">{priceLabel}</span>
              <b style={{ fontSize: priceSize }}>{price}</b>
              <u>{unit}</u>
            </>
          ) : (
            <span className="lab">价格待定</span>
          )}
        </div>
      </div>
      {/* 打孔线（纯装饰） */}
      <div className="e-tk-perf" aria-hidden><i className="l" /><i className="r" /></div>

      {/* 票身：中文名 + 英文名 + 标签 + 近X + 订房 */}
      <div className="e-tk-body">
        <div className="e-tk-name">
          <h3 title={name}>{nameZh || name}</h3>
          <span className="e-tk-seq" aria-hidden>{String(idx + 1).padStart(2, '0')}</span>
        </div>
        <div className="e-tk-meta" title={name}>{[name, cityCode].filter(Boolean).join(' · ')}</div>
        <div className="e-tk-chips">
          {h.star > 0 && <span>{h.star} 星</span>}
          {h.rating > 0 && <span>评分 {h.rating}</span>}
          <span className={fromList ? 'dark' : ''}>{fromList ? 'QUOS 资源' : 'AI 推荐'}</span>
          {showCity && !priceRef && <span>{[h.countryName, h.city].filter(Boolean).join(' · ')}</span>}
        </div>
        {near.length > 0 && (
          <div className="e-tk-near" title={h.near}>{near.map((n) => `近 ${n}`).join(' · ')}</div>
        )}
        {h.area && <div className="e-tk-area" title={h.area}>{h.area}</div>}
        <div className="e-tk-foot">
          {booking ? (
            <a
              href={booking.link || undefined}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => { if (!booking.link) e.preventDefault() }}
              className="lnk"
              title={booking.link ? `打开 Booking 页面 · ${booking.name || name}` : `Booking 名：${booking.name}`}
            >
              {host ? `订房 ↗ ${host}` : `Booking 名：${booking.name}`}
            </a>
          ) : null}
          <span className="cmp" aria-hidden><i />对比</span>
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
    })).sort(
      (a, b) =>
        countryRank(a.country) - countryRank(b.country) ||
        String(a.countryName).localeCompare(String(b.countryName), 'zh'),
    )
  }, [catalog, quoteCatalog])

  const totalHotels = useMemo(
    () => merged.reduce((s, c) => s + c.cities.reduce((x, ci) => x + ci.hotels.length + (ci.quotes?.hotels?.length || 0), 0), 0),
    [merged],
  )

  const visibleCountries = useMemo(
    () => (country ? merged.filter((c) => c.country === country) : merged),
    [merged, country],
  )
  // 国家色条：酒店数据用 ISO 二字码 → 映射回城市库 country id 取色（同表同色，见 lib/skin.js）
  const accentByCountry = useMemo(() => {
    const isoToCountryId = new Map()
    for (const c of getAllCountries()) {
      for (const [cc, info] of Object.entries(COUNTRIES)) {
        if (info.nameEn === c.nameEn || info.name === c.name) {
          isoToCountryId.set(cc, c.id)
          break
        }
      }
    }
    const map = {}
    for (const item of merged) map[item.country] = getCountryAccent(isoToCountryId.get(item.country) || '')
    return map
  }, [merged])
  const visibleResults = useMemo(() => {
    const filtered = country ? results.filter((h) => h.country === country) : results
    return sortedHotels(filtered, sort)
  }, [results, country, sort])

  const chipClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap focus-ring'
  const chipActive = { background: 'var(--accent-strong)', color: '#fff', borderColor: 'transparent' }
  const chipInactive = { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }

  return (
    <div className="min-h-full" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
      {/* Hero — 与城市库统一风格/高度 */}
      <PageHero
        maxWidth="max-w-7xl"
        title="酒店库"
        badge={<span className="e-badge">地接报价参考</span>}
        subtitle={`共 ${merged.length} 个国家 · ${totalHotels} 家酒店 · Booking 评分 ≥7 推荐库 + 酒店价格参考（€/人，以 hotel list 为准）`}
      />

      {/* 搜索工具栏：汇率转换 + 酒店搜索（吸顶，任何滚动位置都能用，输入即下拉） */}
      <SearchToolbar
        stickyTop="top-14"
        maxWidth="max-w-7xl"
        search={
          <div className="relative max-w-2xl">
            <InstantSearchDropdown
              value={query}
              onChange={setQuery}
              placeholder="搜索酒店名或城市（如 Nice、尼斯、罗马、Hôtel Carré）"
              results={results.slice(0, 8)}
              getKey={(h) => h.hotel || h.name || `${h.city}-${h.name}`}
              onSelect={(h) => setQuery(h.name || h.hotel || '')}
              renderItem={(h) => (
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {h.name || h.hotel}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {[h.countryName, h.city, h.cityNameEn].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span className="e-idx-chip shrink-0">
                    {h.rating ? `评分 ${h.rating}` : h.priceEur ? `€${h.priceEur}` : ''}
                  </span>
                </div>
              )}
            />
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* 筛选 + 排序：整条纸带内换行，国家 chip 再多也不会把排序选择挤出屏幕 */}
        <div className="filter-strip">
          <div className="flex flex-wrap gap-1.5 filter-chips">
            <button onClick={() => setCountry('')} className={`${chipClass} filter-chip`} style={country === '' ? chipActive : chipInactive}>
              全部
            </button>
            {merged.map((c) => (
              <button key={c.country} onClick={() => setCountry(country === c.country ? '' : c.country)} className={`${chipClass} filter-chip`} style={country === c.country ? chipActive : chipInactive}>
                {c.countryName}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="sort-select border outline-none focus-ring" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} aria-label="排序方式">
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
              <EmptyState title="没有匹配的酒店" hint="换个关键词，或点上方国家标签筛选" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {visibleResults.map((h, i) => (
                  <HotelCard
                    key={`${h.name}-${i}`}
                    h={h}
                    showCity
                    cityCode={h.cityCode}
                    countryCode={h.country}
                    accent={accentByCountry[h.country]}
                    idx={i}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {visibleCountries.map((countryItem) => (
              <section key={countryItem.country} className="fade-up">
                {/* 国家标题（字段不变：国家名 / 国家码 / 货币） */}
                <div className="e-country-head">
                  <h2 className="font-display" style={{ color: 'var(--text-primary)' }}>
                    {countryItem.countryName}
                  </h2>
                  <span className="e-country-code">{countryItem.country}</span>
                  {(() => {
                    const cur = COUNTRY_CURRENCIES[countryItem.country]
                    if (!cur) return null
                    return (
                      <span className="e-country-cur">
                        {cur.symbol} {cur.code} {cur.name}
                      </span>
                    )
                  })()}
                </div>

                <div className="space-y-5">
                  {countryItem.cities.map((city) => (
                    <div key={city.cityCode || city.city}>
                      {/* 城市分组标题 = E 城市牌：深墨码牌 + 中文名/英文名 + 家数（字段不变） */}
                      <div
                        className="e-city-head"
                        style={{ borderLeft: `6px solid ${accentByCountry[countryItem.country]}` }}
                      >
                        <span className="code-plate inline" aria-hidden>
                          <span className="cc">{countryItem.country}</span>
                          {city.cityCode && <span className="cty">{city.cityCode}</span>}
                        </span>
                        <h3 className="e-city-name">{city.city}</h3>
                        {city.nameEn && <span className="e-city-en">{city.nameEn}</span>}
                        <span className="e-city-count">
                          {city.hotels.length + (city.quotes?.hotels?.length || 0)} 家
                        </span>
                      </div>
                      {city.note && <p className="e-city-note">{city.note}</p>}

                      {city.hotels.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mt-2">
                          {sortedHotels(city.hotels, sort).map((h, i) => (
                            <HotelCard
                              key={i}
                              h={h}
                              cityCode={city.cityCode}
                              countryCode={countryItem.country}
                              accent={accentByCountry[countryItem.country]}
                              idx={i}
                            />
                          ))}
                        </div>
                      )}

                      {city.quotes?.hotels?.length > 0 && (
                        <div className="mt-4">
                          <div className="e-sublab">酒店价格参考（€/人 · 以 hotel list 为准）</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                            {city.quotes.hotels.map((h, i) => (
                              <HotelCard
                                key={i}
                                h={h}
                                priceRef
                                cityCode={city.cityCode}
                                countryCode={countryItem.country}
                                accent={accentByCountry[countryItem.country]}
                                idx={i}
                              />
                            ))}
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

function EmptyState({ title, hint }) {
  return (
    <div className="text-center py-16 border border-dashed rounded-2xl" style={{ borderColor: 'var(--border-color)' }}>
      {/* E 皮禁 emoji：空态用码牌代替图标（纯装饰） */}
      <span className="code-plate inline" aria-hidden><span className="cc">0</span><span className="cty">结果</span></span>
      <p className="text-sm font-medium mt-3" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
    </div>
  )
}
