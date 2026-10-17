'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { getHotelCatalog, hotelId } from '@/lib/hotel-recommend'
import { findHotelQuote, getBookingInfo } from '@/lib/hotel-prices'
import { getAllCountries } from '@/lib/data'
import { getCountryAccent } from '@/lib/skin'
import SearchToolbar from '@/components/search-toolbar'
import PageHero from '@/components/page-hero'
import InstantSearchDropdown from '@/components/instant-search-dropdown'
import travelData from '@/data/europe-travel.json'
import { COUNTRIES } from '@/data/countries'

// E｜磁贴墙 皮肤：与城市库/国家页/景点页同一套 token（globals.css 末尾 E 段）。
// C+ 布局（2026-10-15 定稿）：左筛选 / 中列表 / 右预览；团号与来源只在**详情页**出现。
// 层切换默认「用过的」；「全部候选」里备选默认折叠，该城没有用过的店时自动展开。

// 国家标签顺序：跟随「城市库」(europe-travel.json) 的国家顺序（而非中文名音序）
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

// 排序：评分（默认）/ 价格升 / 价格降 / 星级；价格 0（待定）始终排最后
function sortedHotels(hotels, sort) {
  const arr = [...hotels]
  const ratingDesc = (a, b) => (b.rating || 0) - (a.rating || 0)
  if (sort === 'priceAsc') {
    arr.sort((a, b) => (a.priceEur || 0) - (b.priceEur || 0))
  } else if (sort === 'priceDesc') {
    arr.sort((a, b) => (b.priceEur || 0) - (a.priceEur || 0))
  } else if (sort === 'star') {
    arr.sort((a, b) => (b.star || 0) - (a.star || 0) || ratingDesc(a, b))
  } else {
    arr.sort(ratingDesc)
  }
  return arr
}

// 列表 / 预览的价格：用过的 → QUOS 录入价（€/人）；备选 → hotel list 报价，其次参考价（€/晚）
function priceOf(h, cityCode) {
  if (h.used) {
    return h.lastPriceRaw
      ? { text: '€' + h.lastPriceRaw, unit: 'EUR / 人' }
      : { text: '待定', muted: true }
  }
  const q = findHotelQuote(cityCode, h.systemName || h.name)
  if (q?.pp) return { text: '€' + q.pp, unit: 'EUR / 人' }
  if (h.priceEur) return { text: '€' + h.priceEur, unit: 'EUR / 晚', muted: true }
  return { text: '待定', muted: true }
}

function bookingHost(link) {
  if (!link) return ''
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const SORT_OPTIONS = [
  { key: 'rating', label: '评分最高' },
  { key: 'priceAsc', label: '价格从低到高' },
  { key: 'priceDesc', label: '价格从高到低' },
  { key: 'star', label: '星级最高' },
]

// 中栏一行：系统名称 + 中文名/城市/套餐/晚数，右侧价格（列表里不出现团号与来源）
function HotelRow({ h, city, active, onSelect }) {
  const sys = h.systemName || h.name
  const meta = [
    h.nameZh && h.nameZh !== sys ? h.nameZh : '',
    city.city,
    city.cityCode,
    h.package,
    h.nights ? h.nights + ' 晚' : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const p = priceOf(h, city.cityCode)
  return (
    <button type="button" onClick={onSelect} className={'e-hrow' + (active ? ' sel' : '')}>
      <span className="min-w-0 flex-1">
        <span className="n truncate" title={sys}>{sys}</span>
        <span className="m truncate" title={meta}>{meta}</span>
      </span>
      <span className={'p' + (p.muted ? ' mut' : '')}>{p.text}</span>
    </button>
  )
}

// 右栏预览：系统名称 / 星级·评分 / 位置 / 价格 / 订房（团号与来源不在这里）
function PreviewPanel({ h, city, accent }) {
  if (!h || !city) {
    return (
      <div className="e-hpanel e-hprev">
        <div className="e-phbox">酒店图片位 · 暂未接入</div>
        <div className="e-dbody">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>在左侧列表里选一家酒店看预览。</p>
        </div>
      </div>
    )
  }
  const sys = h.systemName || h.name
  const booking = getBookingInfo(city.cityCode, h.name)
  const host = bookingHost(booking?.link)
  const p = priceOf(h, city.cityCode)
  const id = hotelId(city.slug, h)
  return (
    <div className="e-hpanel e-hprev" style={accent ? { borderTop: '3px solid ' + accent } : undefined}>
      <div className="e-phbox">酒店图片位 · 暂未接入（先留白）</div>
      <div className="e-dbody">
        <h3>{h.nameZh || sys}</h3>
        <div className="e-den truncate" title={[sys, city.city, city.cityCode].filter(Boolean).join(' · ')}>
          {[sys, city.city, city.cityCode].filter(Boolean).join(' · ')}
        </div>
        <div className="e-dkv"><span>系统名称</span><b className="text-right">{sys}</b></div>
        <div className="e-dkv">
          <span>星级 / 评分</span>
          <b className="dash">{h.star ? h.star + ' 星' : '待补'}{h.rating ? ' · ' + h.rating : ''}</b>
        </div>
        <div className="e-dkv"><span>位置</span><b className="dash">{h.area || h.near || '—'}</b></div>
        <div className="e-bigp">
          <span>{h.used ? (h.package || 'Standard') + (h.nights ? ' · ' + h.nights + ' 晚' : '') + ' / 人' : '参考价'}</span>
          <b>{p.text}</b>
        </div>
        {booking?.link ? (
          <a className="e-dbtn2" href={booking.link} target="_blank" rel="noreferrer">订房 ↗ {host || 'Booking'}</a>
        ) : (
          <span className="e-dbtn2" aria-disabled="true">Booking 链接 待补</span>
        )}
        <Link className="e-dbtn" href={'/hotels/' + id}>查看完整详情 →</Link>
      </div>
    </div>
  )
}

export default function HotelsPage() {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [citySlug, setCitySlug] = useState('')
  const [sort, setSort] = useState('rating')
  const [layer, setLayer] = useState('used') // 'used' = 用过的（默认）｜'all' = 全部候选
  const [selectedId, setSelectedId] = useState('')
  const [expanded, setExpanded] = useState({})

  const catalog = useMemo(() => getHotelCatalog(), [])

  // 国家 → 城市 → 酒店（含 slug / 用过的计数）
  const countries = useMemo(
    () =>
      catalog
        .map((c) => ({
          ...c,
          usedCount: c.cities.reduce((s, ci) => s + ci.hotels.filter((h) => h.used).length, 0),
          total: c.cities.reduce((s, ci) => s + ci.hotels.length, 0),
          cities: c.cities.map((ci) => ({
            ...ci,
            usedCount: ci.hotels.filter((h) => h.used).length,
            total: ci.hotels.length,
          })),
        }))
        .sort((a, b) => countryRank(a.country) - countryRank(b.country)),
    [catalog],
  )

  const totalHotels = useMemo(() => countries.reduce((s, c) => s + c.total, 0), [countries])
  const totalCities = useMemo(() => countries.reduce((s, c) => s + c.cities.length, 0), [countries])
  const usedTotal = useMemo(() => countries.reduce((s, c) => s + c.usedCount, 0), [countries])

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
    for (const item of countries) map[item.country] = getCountryAccent(isoToCountryId.get(item.country) || '')
    return map
  }, [countries])

  // 搜索：在整库（807 家）上按酒店名 / 中文名 / 城市名 / 城市码匹配
  const searchRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const rows = []
    for (const c of countries) {
      for (const ci of c.cities) {
        const cityHit = [ci.city, ci.nameEn, ci.cityCode].some((s) => String(s || '').toLowerCase().includes(q))
        for (const h of ci.hotels) {
          const nameHit = [h.name, h.nameZh, h.systemName].some((s) => String(s || '').toLowerCase().includes(q))
          if (cityHit || nameHit) {
            rows.push({ h, city: { ...ci, country: c.country, countryName: c.countryName } })
          }
        }
      }
    }
    return rows.sort(
      (a, b) => Number(!!b.h.used) - Number(!!a.h.used) || (b.h.rating || 0) - (a.h.rating || 0),
    )
  }, [query, countries])

  // 中栏分组：按国家 / 城市筛选后，每个城市 = 用过的 + 备选
  const sections = useMemo(() => {
    const out = []
    for (const c of countries) {
      if (country && c.country !== country) continue
      for (const ci of c.cities) {
        if (citySlug && ci.slug !== citySlug) continue
        const used = sortedHotels(ci.hotels.filter((h) => h.used), sort)
        const alts = sortedHotels(ci.hotels.filter((h) => !h.used), sort)
        // 「用过的」层：没有任何用过的店的城市不出现（单城选中时除外，见下方提示）
        if (layer === 'used' && used.length === 0 && !citySlug) continue
        if (used.length === 0 && alts.length === 0) continue
        out.push({
          city: { ...ci, country: c.country, countryName: c.countryName },
          used,
          alts,
          accent: accentByCountry[c.country],
        })
      }
    }
    return out
  }, [countries, country, citySlug, layer, sort, accentByCountry])

  // 中栏当前实际可见的行（顺序 = 用户看到的顺序，预览默认取第一行）
  const visibleRows = useMemo(() => {
    if (query.trim()) return searchRows
    const rows = []
    for (const sec of sections) {
      for (const h of sec.used) rows.push({ h, city: sec.city })
      const showAlts = layer === 'all' || sec.used.length === 0
      if (!showAlts) continue
      const open = expanded[sec.city.slug] ?? sec.used.length === 0
      if (open) for (const h of sec.alts) rows.push({ h, city: sec.city })
    }
    return rows
  }, [query, searchRows, sections, layer, expanded])

  const active = useMemo(() => {
    const hit = visibleRows.find((r) => hotelId(r.city.slug, r.h) === selectedId)
    return hit || visibleRows[0] || null
  }, [visibleRows, selectedId])

  const searching = query.trim().length > 0
  const usedTotalInView = useMemo(
    () => (searching ? searchRows.filter((r) => r.h.used).length : sections.reduce((s, sec) => s + sec.used.length, 0)),
    [searching, searchRows, sections],
  )
  const allTotalInView = useMemo(
    () => (searching ? searchRows.length : sections.reduce((s, sec) => s + sec.used.length + sec.alts.length, 0)),
    [searching, searchRows, sections],
  )

  const chipClass = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap focus-ring'
  const chipActive = { background: 'var(--accent-strong)', color: '#fff', borderColor: 'transparent' }
  const chipInactive = { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }

  const scopeLabel = citySlug
    ? (sections[0]?.city.city || '')
    : country
      ? (countries.find((c) => c.country === country)?.countryName || '')
      : '全部'

  return (
    <div className="min-h-full" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
      <PageHero
        maxWidth="max-w-7xl"
        title="酒店库"
        badge={<span className="e-badge">地接报价参考</span>}
        subtitle={'共 ' + countries.length + ' 个国家 · ' + totalCities + ' 城 · ' + totalHotels + ' 家酒店（用过的 ' + usedTotal + ' 家）'}
      />

      <SearchToolbar
        stickyTop="top-14"
        maxWidth="max-w-7xl"
        search={
          <div className="relative max-w-2xl">
            <InstantSearchDropdown
              value={query}
              onChange={setQuery}
              placeholder="搜索酒店名或城市（如 Nice、尼斯、罗马、Hôtel Carré）"
              results={searchRows.slice(0, 8).map((r) => r.h)}
              getKey={(h) => (h.systemName || h.name || '') + '-' + (h.city || '')}
              onSelect={(h) => setQuery(h.systemName || h.name || '')}
              renderItem={(h) => (
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {h.systemName || h.name}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {[h.city, h.cityCode].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span className="e-idx-chip shrink-0">
                    {h.rating ? '评分 ' + h.rating : h.used ? '用过的' : ''}
                  </span>
                </div>
              )}
            />
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* 层切换：用过的（默认）/ 全部候选 */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button onClick={() => setLayer('used')} className={chipClass + ' filter-chip'} style={layer === 'used' ? chipActive : chipInactive}>
            用过的 {usedTotal}
          </button>
          <button onClick={() => setLayer('all')} className={chipClass + ' filter-chip'} style={layer === 'all' ? chipActive : chipInactive}>
            全部候选 {totalHotels}
          </button>
        </div>

        <div className="e-hgrid">
          {/* 左：筛选 */}
          <aside className="e-hpanel">
            <div className="e-hhead">
              <span>筛选</span>
              <span className="mut">{searching ? searchRows.length : allTotalInView} 家</span>
            </div>
            <div className="e-tree">
              <button className={!country && !citySlug ? 'on' : ''} onClick={() => { setCountry(''); setCitySlug('') }}>
                <span>全部国家</span><em>{usedTotal} / {totalHotels}</em>
              </button>
              {countries.map((c) => (
                <div key={c.country}>
                  <button
                    className={country === c.country && !citySlug ? 'on' : ''}
                    onClick={() => { setCountry(c.country === country && !citySlug ? '' : c.country); setCitySlug('') }}
                  >
                    <span>{c.countryName}</span><em>{c.usedCount} / {c.total}</em>
                  </button>
                  {country === c.country &&
                    c.cities.map((ci) => (
                      <button
                        key={ci.slug}
                        className={'sub' + (citySlug === ci.slug ? ' on' : '')}
                        onClick={() => setCitySlug(citySlug === ci.slug ? '' : ci.slug)}
                      >
                        <span>{ci.city} <em>{ci.cityCode}</em></span><em>{ci.usedCount} / {ci.total}</em>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </aside>

          {/* 中：列表 */}
          <section className="e-hpanel">
            <div className="e-hhead">
              <span>{searching ? '搜索结果 ' + searchRows.length + ' 家' : scopeLabel + ' · ' + (layer === 'used' ? '用过的 ' + usedTotalInView + ' 家' : '全部候选 ' + allTotalInView + ' 家')}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="sort-select border outline-none focus-ring"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                aria-label="排序方式"
              >
                {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>

            {searching ? (
              searchRows.length === 0 ? (
                <div className="e-hint">没有匹配的酒店 —— 换个关键词，或点左侧国家 / 城市筛选。</div>
              ) : (
                searchRows.map((r) => (
                  <HotelRow
                    key={hotelId(r.city.slug, r.h)}
                    h={r.h}
                    city={r.city}
                    active={active === r}
                    onSelect={() => setSelectedId(hotelId(r.city.slug, r.h))}
                  />
                ))
              )
            ) : sections.length === 0 ? (
              <div className="e-hint">
                {layer === 'used'
                  ? '这一范围还没有用过的酒店 —— 切到「全部候选」看备选，或换个国家。'
                  : '这一范围还没有酒店数据。'}
              </div>
            ) : (
              sections.map((sec) => {
                const showAlts = layer === 'all' || sec.used.length === 0
                const open = expanded[sec.city.slug] ?? sec.used.length === 0
                return (
                  <div key={sec.city.slug}>
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ borderBottom: '1px solid var(--e-line)', borderLeft: '4px solid ' + (sec.accent || 'transparent') }}
                    >
                      <span className="code-plate inline" aria-hidden>
                        <span className="cc">{sec.city.country}</span>
                        {sec.city.cityCode && <span className="cty">{sec.city.cityCode}</span>}
                      </span>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{sec.city.city}</span>
                      {sec.city.nameEn && (
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--e-mono)' }}>{sec.city.nameEn}</span>
                      )}
                      <span className="ml-auto text-[10.5px]" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--e-mono)' }}>
                        {sec.used.length > 0 ? sec.used.length + ' 用过的' : '暂无用过'}
                      </span>
                    </div>

                    {sec.used.map((h) => (
                      <HotelRow
                        key={hotelId(sec.city.slug, h)}
                        h={h}
                        city={sec.city}
                        active={!!active && hotelId(active.city.slug, active.h) === hotelId(sec.city.slug, h)}
                        onSelect={() => setSelectedId(hotelId(sec.city.slug, h))}
                      />
                    ))}

                    {showAlts && sec.alts.length > 0 && (
                      <>
                        <div className="e-hdiv">
                          <span>
                            {sec.used.length === 0
                              ? '这个城市还没有用过的酒店 —— 备选 ' + sec.alts.length + ' 家'
                              : '备选候选 · 未用过（' + sec.alts.length + ' 家）'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpanded((m) => ({ ...m, [sec.city.slug]: !open }))}
                          >
                            {open ? '收起 ▴' : '展开 ▾'}
                          </button>
                        </div>
                        {open &&
                          sec.alts.map((h) => (
                            <HotelRow
                              key={hotelId(sec.city.slug, h)}
                              h={h}
                              city={sec.city}
                              active={!!active && hotelId(active.city.slug, active.h) === hotelId(sec.city.slug, h)}
                              onSelect={() => setSelectedId(hotelId(sec.city.slug, h))}
                            />
                          ))}
                      </>
                    )}
                  </div>
                )
              })
            )}
          </section>

          {/* 右：预览（团号 / 来源不在此出现） */}
          <PreviewPanel h={active?.h} city={active?.city} accent={active ? accentByCountry[active.city.country] : ''} />
        </div>
      </div>
    </div>
  )
}
