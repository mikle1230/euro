'use client'

import { useMemo } from 'react'
import { getItineraryStats } from '@/lib/itinerary-store'
import { openPrintView } from '@/lib/print-itinerary'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function Overview({ itinerary, cities }) {
  const stats = getItineraryStats(itinerary)

  // City order with coords
  const cityOrder = useMemo(() => {
    const result = []
    itinerary.days.forEach((d) => {
      if (d.cityId && !result.find((c) => c.id === d.cityId)) {
        const city = cities.find((c) => c.id === d.cityId)
        if (city) {
          result.push({
            id: d.cityId,
            name: d.cityName || city.name,
            country: city.country.name,
            lat: city.lat,
            lng: city.lng,
          })
        }
      }
    })
    return result
  }, [itinerary, cities])

  // Country set
  const countrySet = useMemo(() => {
    const s = new Set()
    cityOrder.forEach((c) => s.add(c.country))
    return s
  }, [cityOrder])

  // Distance segments
  const segments = useMemo(() => {
    const segs = []
    for (let i = 0; i < cityOrder.length - 1; i++) {
      const from = cityOrder[i]
      const to = cityOrder[i + 1]
      const km = haversineKm(from.lat, from.lng, to.lat, to.lng)
      segs.push({ from: from.name, to: to.name, km })
    }
    return segs
  }, [cityOrder])

  const totalKm = Math.round(segments.reduce((s, seg) => s + seg.km, 0))

  // Item counts by type
  const itemCounts = useMemo(() => {
    const counts = { attraction: 0, transport: 0, hotel: 0, meal: 0, other: 0 }
    itinerary.days.forEach((d) => {
      d.items.forEach((item) => {
        if (counts[item.type] !== undefined) counts[item.type]++
        else counts.other++
      })
    })
    return counts
  }, [itinerary])

  // Cost calculation
  const costSummary = useMemo(() => {
    const groupSize = itinerary.groupSize || 1
    let perPersonTotal = 0
    let perGroupTotal = 0
    itinerary.days.forEach((d) => {
      d.items.forEach((item) => {
        if (!item.price) return
        const qty = item.quantity || 1
        switch (item.priceUnit) {
          case 'perPerson':
            perPersonTotal += item.price * qty
            break
          case 'perGroup':
            perGroupTotal += item.price * qty
            break
          case 'perDay':
            // Per day pricing: price × number of days items span × quantity
            perGroupTotal += item.price * qty
            break
          case 'included':
            break
          default:
            perPersonTotal += item.price * qty
        }
      })
    })
    return {
      perPersonTotal,
      perGroupTotal,
      estimatedTotal: perPersonTotal * groupSize + perGroupTotal,
      hasCosts: perPersonTotal > 0 || perGroupTotal > 0,
    }
  }, [itinerary])

  // Date range display
  const dateRange = useMemo(() => {
    if (!itinerary.startDate && !itinerary.endDate) return null
    const fmt = (d) => {
      if (!d) return '?'
      const parts = d.split('-')
      return `${parts[1] || '?'}/${parts[2] || '?'}`
    }
    const start = itinerary.startDate ? fmt(itinerary.startDate) : '?'
    const end = itinerary.endDate ? fmt(itinerary.endDate) : '?'
    return `${start} → ${end}`
  }, [itinerary.startDate, itinerary.endDate])

  return (
    <div className="p-3">
      {/* Meta bar */}
      {(itinerary.startDate || itinerary.endDate || itinerary.groupSize > 0 || itinerary.tourCode) && (
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg text-xs mb-4"
          style={{ background: 'var(--bg-surface)' }}
        >
          {dateRange && (
            <span style={{ color: 'var(--text-secondary)' }}>
              📅 {dateRange}
            </span>
          )}
          {itinerary.groupSize > 0 && (
            <span style={{ color: 'var(--text-secondary)' }}>
              👥 {itinerary.groupSize}人
            </span>
          )}
          {itinerary.tourCode && (
            <span style={{ color: 'var(--text-tertiary)' }}>
              🏷️ {itinerary.tourCode}
            </span>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: 'var(--bg-surface)' }}
        >
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stats.dayCount}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>天数</p>
        </div>
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: 'var(--bg-surface)' }}
        >
          <p className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{stats.cityCount}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>城市</p>
        </div>
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: 'var(--bg-surface)' }}
        >
          <p className="text-2xl font-bold" style={{ color: 'var(--text-secondary)' }}>{countrySet.size}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>国家</p>
        </div>
      </div>

      {/* Item breakdown */}
      {stats.dayCount > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            项目统计
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { key: 'attraction', icon: '🏛️', label: '景点' },
              { key: 'transport', icon: '🚌', label: '交通' },
              { key: 'hotel', icon: '🏨', label: '酒店' },
              { key: 'meal', icon: '🍽️', label: '餐饮' },
            ].map(({ key, icon, label }) => (
              <div
                key={key}
                className="p-2 rounded-lg text-center"
                style={{ background: 'var(--bg-surface)' }}
              >
                <p className="text-lg">{icon}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {itemCounts[key]}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost summary */}
      {costSummary.hasCosts && (
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            费用估算
          </p>
          <div
            className="p-3 rounded-lg"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="grid grid-cols-2 gap-2 mb-2">
              {costSummary.perPersonTotal > 0 && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>人均费用</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    €{costSummary.perPersonTotal.toFixed(0)}
                  </p>
                </div>
              )}
              {costSummary.perGroupTotal > 0 && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>固定团费</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    €{costSummary.perGroupTotal.toFixed(0)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                估算总价 {itinerary.groupSize > 0 ? `(${itinerary.groupSize}人)` : ''}
              </span>
              <span className="text-lg font-bold" style={{ color: 'var(--gold)' }}>
                €{costSummary.estimatedTotal.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Day-by-day timeline */}
      {stats.dayCount > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            每日节奏
          </p>
          <div className="flex flex-col gap-0.5">
            {itinerary.days.map((day) => {
              const city = day.cityId ? cities.find((c) => c.id === day.cityId) : null
              const itemIcons = {
                attraction: '🏛️',
                transport: '🚌',
                hotel: '🏨',
                meal: '🍽️',
              }
              const typeCounts = {}
              day.items.forEach((it) => {
                typeCounts[it.type] = (typeCounts[it.type] || 0) + 1
              })

              return (
                <div
                  key={day.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'var(--bg-surface)' }}
                >
                  {/* Day number badge */}
                  <span
                    className="w-8 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    D{day.dayNumber}
                  </span>

                  {/* City name */}
                  <span
                    className="text-sm font-medium truncate min-w-0 shrink-0"
                    style={{ width: '5em', color: city ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                  >
                    {day.cityName || city?.name || '未分配'}
                  </span>

                  {/* Item icons mini-bar */}
                  <div className="flex-1 flex items-center gap-1 min-w-0">
                    {day.items.length === 0 ? (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                    ) : (
                      Object.entries(typeCounts).map(([type, count]) => (
                        <span
                          key={type}
                          className="text-xs px-1 py-0.5 rounded"
                          style={{ background: 'var(--bg-card)' }}
                          title={`${count} ${{ attraction: '景点', transport: '交通', hotel: '酒店', meal: '餐饮' }[type] || type}`}
                        >
                          {itemIcons[type] || '📌'}{count > 1 ? count : ''}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Item count */}
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {day.items.length}项
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Route overview with distances */}
      {cityOrder.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            线路概览
            {totalKm > 0 && (
              <span className="ml-1 font-normal normal-case" style={{ color: 'var(--text-tertiary)' }}>
                · 约 {totalKm} km
              </span>
            )}
          </p>
          <div className="flex flex-col gap-1">
            {cityOrder.map((city, i) => (
              <div key={city.id + '-' + i}>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{city.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{city.country}</span>
                </div>
                {i < cityOrder.length - 1 && segments[i] && (
                  <div className="flex items-center gap-2 pl-7 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="w-0.5 h-4 rounded" style={{ background: 'var(--border-color)' }} />
                    ↓ {Math.round(segments[i].km)} km → {segments[i].to}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export actions */}
      <div>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          导出
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => openPrintView(itinerary, cities)}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            🖨️ 打印行程单
          </button>
          <button
            disabled
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium opacity-40 cursor-not-allowed flex items-center justify-center gap-1.5"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
          >
            📊 Excel 报价
          </button>
        </div>
      </div>

      {cityOrder.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-tertiary)' }}>
          还没有添加城市，在行程中点击地图上的城市开始规划
        </p>
      )}
    </div>
  )
}
