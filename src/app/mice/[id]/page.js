'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getMiceActivityById, resolveCountry } from '@/lib/mice'
import { MICE_ZH } from '@/data/mice-zh'
import { getCountryAccentByIso } from '@/lib/skin'
import MiceGallery from '@/components/mice-gallery'
import BilingualText from '@/components/bilingual-text'
import { toast } from '@/components/toast'

// E｜磁贴墙 皮肤：与列表页/城市库同一套 token（globals.css 末尾 E 段）。
// 颜色只做编码：国家色条取自 lib/skin.js 的国家色表（ISO 码 → 城市库 id）。
function SpecItem({ label, value }) {
  if (!value) return null
  return (
    <div className="e-spec">
      <div className="e-spec-label">{label}</div>
      <div className="e-spec-value">{value}</div>
    </div>
  )
}

// 长时间文本（数据里既有「3 hours」也有整段说明）→ 短的贴红棕贴纸，长的保持纸底正文
function durationNode(value) {
  const t = String(value || '').trim()
  if (!t) return null
  return t.length <= 18 ? <span className="e-price">{t}</span> : t
}

function InfoPanel({ title, children, empty, accent }) {
  return (
    <div className="e-panel" style={accent ? { borderLeft: `6px solid ${accent}` } : undefined}>
      <div className="e-panel-head">
        <h2>{title}</h2>
      </div>
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
      <div className="min-h-full flex items-center justify-center" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
        <div className="text-center">
          <span className="code-plate inline" aria-hidden><span className="cc">0</span><span className="cty">结果</span></span>
          <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>未找到该活动</p>
          <Link href="/mice" className="inline-block mt-4 text-xs underline" style={{ color: 'var(--accent)' }}>← 返回活动目录</Link>
        </div>
      </div>
    )
  }

  const country = resolveCountry(a.country)
  const accent = getCountryAccentByIso(country?.code)
  const titleZh = MICE_ZH.titles[a.id] || ''
  const cityZh = MICE_ZH.cities[a.city] || ''
  const subZh = (a.subCategoryForActivity || '').split(';#').map((s) => MICE_ZH.subCategories[s.trim()] || s.trim()).filter(Boolean).join('、')
  const priceUnitLabel = { pax: '按人', group: '按团', hour: '按小时', course: '按课程', rental: '按租赁', 'set menus/pax': '按套餐/人' }
  const price = a.priceMax > 0
    ? `€${a.priceMin || '?'}–${a.priceMax}`
    : a.priceMin > 0
      ? `€${a.priceMin}`
      : '价格待询'
  const hasPrice = a.priceMin > 0 || a.priceMax > 0
  const unit = a.priceUnit ? (priceUnitLabel[a.priceUnit] || `/${a.priceUnit}`) : ''
  // 与旧版 statusBadge 的真值语义完全一致（其余状态不禁用）
  const closed = a.productStatus === 'Temporarily Closed' || a.productStatus === 'Permanently Closed'

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
    <div className="min-h-full" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
        {/* 搜索框：随时检索其他活动，回车跳到列表页并带上关键词 */}
        <form onSubmit={handleSearch} className="relative mb-4">
          <span className="search-icon absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs" aria-hidden>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索其他活动：标题、国家、城市、标签…"
            className="search-input w-full pl-9 pr-16 py-2.5 rounded-xl text-sm border outline-none focus-ring-mice"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            aria-label="搜索活动"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--mice-accent-strong)', color: 'var(--on-accent-strong)' }}
          >
            搜索
          </button>
        </form>

        {/* 面包屑 */}
        <div className="text-xs mb-4 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/mice" className="hover:text-[var(--mice-accent)] transition-colors">MICE 活动</Link>
          <span>/</span>
          <span className="truncate max-w-64">{a.title}</span>
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
              {/* 国家码牌（深墨等宽）+ 国家/城市/团型 */}
              {country?.code && <span className="e-country-code">{country.code}</span>}
              <div className="e-tk-chips" style={{ marginTop: 0 }}>
                <span>{country?.nameZh || a.country}{cityZh ? ` · ${cityZh}` : ` · ${a.city}`}</span>
                {a.targetTourCategories.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            {/* 价格：红棕等宽贴纸（确无价时只写「价格待询」，不贴纸） */}
            {hasPrice ? (
              <span className="e-price lg">
                {price}
                {unit && <span className="u">{unit}</span>}
              </span>
            ) : (
              <span className="e-price lg none">
                价格待询
                {unit && <span className="u">{unit}</span>}
              </span>
            )}
            {a.officeInCharge && <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>负责：{a.officeInCharge}</div>}
          </div>
        </div>

        {/* 操作 */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddToDraft}
            disabled={!!closed}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 focus-ring-mice hover:-translate-y-0.5"
            style={{ background: 'var(--mice-accent-strong)', color: 'var(--on-accent-strong)' }}
          >
            复制到报价单（行程草稿）
          </button>
          {a.officialWebsite && (
            <a href={a.officialWebsite} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5 focus-ring-mice"
               style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              官网
            </a>
          )}
          {a.googleMapLink && (
            <a href={a.googleMapLink} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5 focus-ring-mice"
               style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              Google 地图
            </a>
          )}
        </div>

        {/* 活动介绍（2/3）+ 图片组（1/3，可多张点击放大）——替代原 Hero 大图与行程示例块 */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2">
            <InfoPanel title="活动介绍" empty="暂无描述" accent={accent}>
              <BilingualText zh={MICE_ZH.descriptions?.[a.id] || ''} en={a.description || ''} />
            </InfoPanel>
          </div>
          <div className="lg:col-span-1">
            <MiceGallery activity={a} />
          </div>
        </div>

        {/* 资源与信息 */}
        <div className="mt-4 e-panel" style={{ borderLeft: `6px solid ${accent}` }}>
          <div className="e-panel-head">
            <h2>资源与信息</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 mt-1">
            <div>
              <SpecItem label="容量" value={a.capacityMin > 0 || a.capacityMax > 0 ? `${a.capacityMin || '?'}–${a.capacityMax || '?'} 人${a.capacityDetails ? `（${a.capacityDetails}）` : ''}` : (a.capacityDetails || '')} />
              <SpecItem label="价格" value={hasPrice ? <span className="e-price">{price}{unit ? `（${unit}）` : ''}</span> : `价格待询${unit ? `（${unit}）` : ''}`} />
              <SpecItem label="时长" value={durationNode(a.activityDuration)} />
              <SpecItem label="营业时间" value={a.openingHours} />
            </div>
            <div>
              <SpecItem label="最佳季节" value={a.bestTimeToVisit.length ? a.bestTimeToVisit.join('、') : ''} />
              <SpecItem label="地址" value={address} />
              <SpecItem label="标签" value={a.tags.length ? a.tags.map((t) => `#${t}`).join(' ') : ''} />
              <SpecItem label="子类目" value={subZh || a.subCategoryForActivity} />
            </div>
          </div>
          {(a.salesNotes || a.productStatus) && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px dashed var(--border-light)' }}>
              <SpecItem label="销售提示" value={a.salesNotes} />
              <SpecItem label="状态" value={a.productStatus} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
