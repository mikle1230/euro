'use client'

import { use } from 'react'
import Link from 'next/link'
import PageHero from '@/components/page-hero'
import { getHotelById } from '@/lib/hotel-recommend'
import { getBookingInfo } from '@/lib/hotel-prices'

// 酒店详情页：**团号 / 来源 / 使用记录只在这一页出现**（列表与右栏预览都不放）。
// 图位留白（先不上图）；星级 / Booking 评分 / Booking 链接按约定留「待补」。

function bookingHost(link) {
  if (!link) return ''
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function KV({ label, value, dash = false }) {
  return (
    <div className="e-dkv">
      <span>{label}</span>
      <b className={dash ? 'dash' : ''}>{value}</b>
    </div>
  )
}

export default function HotelDetailPage({ params }) {
  const { id } = use(params)
  const h = getHotelById(decodeURIComponent(String(id || '')))

  if (!h) {
    return (
      <div className="min-h-full flex items-center justify-center" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
        <div className="text-center">
          <span className="code-plate inline" aria-hidden><span className="cc">0</span><span className="cty">结果</span></span>
          <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>未找到这家酒店</p>
          <Link href="/hotels" className="inline-block mt-3 text-sm" style={{ color: 'var(--accent-strong)' }}>← 返回酒店库</Link>
        </div>
      </div>
    )
  }

  const sys = h.systemName || h.name
  const booking = getBookingInfo(h.cityCode, h.name)
  const host = bookingHost(booking?.link)
  const tours = h.tours || []
  const price = h.used
    ? (h.lastPriceRaw ? '€' + h.lastPriceRaw : '待定')
    : (h.priceEur ? '€' + h.priceEur : '待定')

  return (
    <div className="min-h-full" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
      <PageHero
        maxWidth="max-w-5xl"
        title="酒店详情"
        badge={<span className="e-badge">{h.used ? '用过的' : '备选候选'}</span>}
        subtitle={[h.countryName, h.city, h.cityCode].filter(Boolean).join(' · ')}
      />

      <div className="e-dwrap px-4 md:px-6 py-6">
        <Link href="/hotels" className="e-dback">← 返回酒店库</Link>

        <div className="e-dcard">
          <div className="e-dhero">
            <div className="e-phbox e-bigph">酒店图片位 · 暂未接入（先留白）</div>
            <div className="e-thumbs">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i}>图位</div>)}
            </div>
          </div>

          <div className="e-dhd">
            <h1>{h.nameZh || sys}</h1>
            <div className="en">{[sys, h.name].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ')}</div>
            <div className="e-dtags">
              {h.used && <span className="e-dtag hot">用过的</span>}
              <span className="e-dtag">{h.city} {h.cityCode}</span>
              {h.package && <span className="e-dtag">{h.package}</span>}
              {h.chain && <span className="e-dtag">{h.chain}</span>}
            </div>
          </div>

          <div className="e-dsec">酒店信息</div>
          <div className="e-dgrid">
            <KV label="系统名称" value={sys} />
            <KV label="星级 / Booking 评分" value={(h.star ? h.star + ' 星' : '待补') + (h.rating ? ' · ' + h.rating : '')} dash={!h.star} />
            <KV label="Booking 名称" value={booking?.name || '待补'} dash={!booking?.name} />
            <KV label="位置" value={h.area || h.near || '—'} dash />
            <KV label="地址" value={h.address || '—'} dash />
            <KV
              label="Booking 链接"
              value={booking?.link ? <a href={booking.link} target="_blank" rel="noreferrer">打开 ↗ {host}</a> : '待补'}
              dash={!booking?.link}
            />
            <KV label="连锁" value={h.chain || '—'} dash={!h.chain} />
            <KV label="参考价" value={h.priceEur ? '€' + h.priceEur + ' / 晚' : '—'} dash />
          </div>

          <div className="e-dsec">来源 / 使用记录</div>
          <div className="e-usebox">
            <div className="h">{h.used ? '用过的团（' + tours.length + ' 条）' : '还没有用过这家酒店'}</div>
            {h.used && tours.length > 0 ? (
              tours.map((t) => (
                <div key={t}>
                  <div className="e-uline"><span>团号</span><b>{t}</b><span>Package</span><span>{h.package || 'Standard'}</span></div>
                  <div className="e-uline"><span>来源</span><b>QUOS 资源</b><span>价格</span><span>{h.lastPriceRaw ? '€' + h.lastPriceRaw : '待定'}</span></div>
                  <div className="e-uline"><span>晚数</span><b>{h.nights ? h.nights + ' 晚' : '—'}</b><span>P / G</span><span>{h.pg || '—'}</span></div>
                </div>
              ))
            ) : (
              <div className="e-uline" style={{ gridTemplateColumns: '1fr' }}>
                <span>来源：AI 推荐 / 价格库备选，没有 QUOS 使用记录。</span>
              </div>
            )}
          </div>

          <div className="e-dprice">
            <span>{h.used ? (h.package || 'Standard') + (h.nights ? ' · ' + h.nights + ' 晚' : '') + ' / 人' : '参考价 / 晚'}</span>
            <b>{price}</b>
          </div>

          <div className="e-dactions">
            {booking?.link ? (
              <a className="p1" href={booking.link} target="_blank" rel="noreferrer">订房 / Booking 链接 ↗</a>
            ) : (
              <span className="p1" aria-disabled="true">Booking 链接 待补</span>
            )}
            <Link className="p2" href="/hotels">返回酒店库</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
