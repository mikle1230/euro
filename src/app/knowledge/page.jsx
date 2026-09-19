'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { getAllCountries, getCountryCoverImage, getStats, getAllAttractionsFlat, getCustomCities, saveCustomCities, invalidateDataCache } from '@/lib/data'
import { ensureSeeded } from '@/lib/entity-store'
import countryMeta from '@/data/country-meta.json'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import GlobalSearch from '@/components/global-search'
import CountryFlag from '@/components/country-flag'
import SearchToolbar from '@/components/search-toolbar'
import PageHero from '@/components/page-hero'
import { toast } from '@/components/toast'
import { getCityCode } from '@/lib/quos-mapping'

// 国家色条调色板：逐值取自已批准的静态视觉稿 media/mock/E6-knowledge.html，
// 数组顺序与视觉稿一致 → 与国家列表前 20 项逐一对得上（同一张图）。
// 颜色只作国家编码（左侧 6px 色条），不做装饰性用色；刻意避开紫。
const CARD_ACCENTS = [
  '#2F5D8C', '#9C3A3A', '#B4432B', '#A85A2B', '#4B6B3A',
  '#5B6E4A', '#2E7C8A', '#6E7A3A', '#3F6E63', '#C9A227',
  '#A8574F', '#8C6E5A', '#5E7A6E', '#4A5D3A', '#4E8C5A',
  '#4E5E8C', '#8C4A5D', '#7A6E4A', '#3A6E8C', '#8C3A5D',
]

export default function KnowledgePage() {
  // getStats / getAllCountries 走模块级缓存（getMergedCountries）；
  // ensureSeeded 是副作用（种子化实体库），放 effect 里执行一次。
  // refresh 版本号：添加自定义城市后 invalidateDataCache + setRefresh 触发重渲染重读。
  useEffect(() => {
    ensureSeeded(getAllAttractionsFlat)
  }, [])
  const [refresh, setRefresh] = useState(0)
  const stats = getStats()
  const countries = getAllCountries()

  // 国家 QUOS 二字码：取该国任一城市反查（不依赖 country-meta 的旧 abbr，如 UK→GB 统一走 QUOS）
  const countryCodes = {}
  for (const c of countries) {
    for (const city of c.cities) {
      const cc = getCityCode(city.name, city.nameEn)?.countryCode
      if (cc) {
        countryCodes[c.id] = cc
        break
      }
    }
  }

  // ---- 「添加城市」弹窗 ----
  const [showAdd, setShowAdd] = useState(false)
  const [countrySel, setCountrySel] = useState('')
  const [cityZh, setCityZh] = useState('')
  const [cityEn, setCityEn] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [formError, setFormError] = useState('')

  const resetForm = useCallback(() => {
    setCountrySel('')
    setCityZh('')
    setCityEn('')
    setLat('')
    setLng('')
    setFormError('')
  }, [])

  const handleSave = useCallback(() => {
    if (!countrySel) return setFormError('请选择国家')
    if (!cityZh.trim() || !cityEn.trim()) return setFormError('城市中文名和英文名必填')
    // id 从英文名生成（小写连字符）；与现有城市/已存补丁去冲突
    const base = cityEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'custom-city'
    const taken = new Set()
    for (const c of getAllCountries()) for (const city of c.cities) taken.add(city.id)
    for (const item of getCustomCities()) taken.add(item.city?.id)
    let id = base
    let n = 2
    while (taken.has(id)) id = `${base}-${n++}`
    const latN = lat.trim() ? parseFloat(lat) : null
    const lngN = lng.trim() ? parseFloat(lng) : null
    if (latN != null && (isNaN(latN) || latN < -90 || latN > 90)) return setFormError('纬度需在 -90~90 之间')
    if (lngN != null && (isNaN(lngN) || lngN < -180 || lngN > 180)) return setFormError('经度需在 -180~180 之间')
    const list = getCustomCities()
    // 自动补齐 QUOS 码：保存时反查城市三字码 + 国家二字码（查不到留空，toast 提示）
    const codeInfo = getCityCode(cityZh.trim(), cityEn.trim()) || {}
    list.push({
      countryId: '',
      countryName: countrySel,
      city: {
        id,
        name: cityZh.trim(),
        nameEn: cityEn.trim(),
        cityCode: codeInfo.cityCode || '',
        countryCode: codeInfo.countryCode || '',
        lat: latN,
        lng: lngN,
        attractions: [],
      },
    })
    saveCustomCities(list)
    invalidateDataCache()
    setShowAdd(false)
    resetForm()
    setRefresh((v) => v + 1)
    const codeSuffix = codeInfo.cityCode
      ? `（QUOS：${codeInfo.cityCode}/${codeInfo.countryCode}）`
      : '（未查到 QUOS 码，导出补丁时请附上城市码）'
    toast(`已添加「${cityZh.trim()}」到 ${countrySel}${codeSuffix}`, 'success')
  }, [countrySel, cityZh, cityEn, lat, lng, resetForm])

  const handleExport = useCallback(() => {
    const list = getCustomCities()
    if (!list.length) return toast('暂无自定义城市补丁', 'error')
    const text = JSON.stringify(list, null, 2)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast('补丁 JSON 已复制，发给开发者合并进 git 即可全端生效', 'success'))
        .catch(() => toast('复制失败，请手动复制', 'error'))
    } else {
      toast(text, 'error')
    }
  }, [])

  return (
    <div className="min-h-full" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
      {/* Breadcrumb + stats */}
      <PageHero
        maxWidth="max-w-7xl"
        title="城市库"
        subtitle={`共 ${stats.countryCount} 个国家 · ${stats.cityCount} 个城市 · ${stats.attractionCount}+ 个景点`}
        right={
          <>
            <button
              onClick={handleExport}
              title="把本机自定义城市补丁导出为 JSON（发给开发者合并进 git 全端生效）"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              导出补丁
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'var(--accent-strong)', color: 'var(--on-accent-strong)' }}
            >
              添加城市
            </button>
          </>
        }
      />

      {/* 搜索工具栏：汇率转换 + 全局搜索（吸顶，任何滚动位置都能用） */}
      <SearchToolbar
        stickyTop="top-14"
        maxWidth="max-w-7xl"
        search={<div><GlobalSearch wide /></div>}
      />

      {/* 内容区 */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        {/* Country grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {countries.map((country, idx) => {
            const meta = countryMeta[country.id] || {}
            const coverSrc = getCountryCoverImage(country.id)
            const cityCount = country.cities?.length || 0
            const attractionCount = country.cities?.reduce((s, c) => s + (c.attractions?.length || 0), 0) || 0
            const quosCode = countryCodes[country.id] || meta.abbr || ''
            const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length]

            return (
              <Link
                key={country.id}
                href={`/knowledge/${country.id}`}
                className="spotlight-card group rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderLeft: `6px solid ${accent}` }}
              >
                <div className="relative">
                  <ImageWithPlaceholder
                    src={coverSrc}
                    alt={country.name}
                    name={country.name}
                    subtitle={[country.nameEn, quosCode].filter(Boolean).join(' · ')}
                    size="card"
                    variant="country"
                    countryName={country.name}
                  />
                  {(quosCode || country.nameEn) && (
                    <span className="code-plate" aria-hidden>
                      {quosCode && <span className="cc">{quosCode}</span>}
                      {country.nameEn && <span className="cty">{country.nameEn.toUpperCase()}</span>}
                    </span>
                  )}
                  <span className="punch-hole" aria-hidden />
                </div>
                <div className="p-3 card-body">
                  <h3 className="font-display font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <CountryFlag countryId={country.id} size="md" />
                    <span className="truncate">{country.name}</span>
                  </h3>
                  <p className="text-xs mt-0.5 card-meta" style={{ color: 'var(--text-tertiary)' }}>
                    {[country.nameEn, quosCode].filter(Boolean).join(' · ')}
                  </p>
                  {country.description && (
                    <p className="text-xs mt-2 line-clamp-2 card-desc" style={{ color: 'var(--text-secondary)' }}>
                      {country.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 card-tags">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
                    >
                      {cityCount} 个城市
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
                    >
                      {attractionCount} 个景点
                    </span>
                    {meta.currency && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                      >
                        {meta.currency.symbol}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {countries.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>暂无国家数据</p>
          </div>
        )}
      </div>

      {/* 添加城市弹窗 */}
      {showAdd &&
        createPortal(
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
            style={{ background: 'rgba(42,39,35,0.4)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false) }}
          >
            <div
              className="rounded-2xl border shadow-2xl w-full overflow-hidden flex flex-col"
              style={{ maxWidth: 420, maxHeight: '85vh', background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>添加城市</h2>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg" style={{ color: 'var(--text-tertiary)' }}>✕</button>
              </div>
              <div className="p-5 space-y-3.5 overflow-y-auto">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  添加后本机立即显示；坐标可不填（地图/车程需坐标，建议填）。需要全端生效时点「📋 导出补丁」把 JSON 发给开发者。
                </p>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>国家 *</label>
                  <select
                    value={countrySel}
                    onChange={(e) => setCountrySel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="">选择国家</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}（{c.nameEn}）</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>城市中文名 *</label>
                  <input
                    value={cityZh}
                    onChange={(e) => setCityZh(e.target.value)}
                    placeholder="如：科赫姆"
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>英文名 *</label>
                  <input
                    value={cityEn}
                    onChange={(e) => setCityEn(e.target.value)}
                    placeholder="如：Cochem"
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>纬度（可选）</label>
                    <input
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="如：50.1469"
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>经度（可选）</label>
                    <input
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="如：7.1656"
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                {formError && (
                  <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(158, 59, 31, 0.1)', color: '#9E3B1F' }}>
                    {formError}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--accent-strong)', color: 'var(--on-accent-strong)' }}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
