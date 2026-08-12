'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllCitiesWithCoords } from '@/lib/data'
import { importItinerary } from '@/lib/itinerary-store'
import { createEntity } from '@/lib/entity-store'

const ACCEPTED = '.pdf,.docx,.xlsx,.xls'
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const TYPE_CONFIG = {
  attraction: { icon: '🏛️', label: '景点' },
  hotel: { icon: '🏨', label: '酒店' },
  breakfast: { icon: '🥐', label: '早餐' },
  lunch: { icon: '🍽️', label: '午餐' },
  dinner: { icon: '🍷', label: '晚餐' },
  transport: { icon: '🚌', label: '交通' },
  other: { icon: '📌', label: '其他' },
}

export default function UploadModal({ open, onClose }) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // AI parse result
  const [importing, setImporting] = useState(false)
  const [expandedDays, setExpandedDays] = useState({})
  const fileInputRef = useRef(null)

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setError('')
      setResult(null)
      setLoading(false)
      setImporting(false)
      setExpandedDays({})
    }
  }, [open])

  const handleFile = useCallback(async (file) => {
    // Validate
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx', 'xlsx', 'xls'].includes(ext)) {
      setError('不支持的文件格式，请上传 PDF、Word (.docx) 或 Excel (.xlsx) 文件')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('文件大小不能超过 10MB')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-itinerary', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '解析失败')
      }

      setResult(data)

      // Auto-expand all days
      const expanded = {}
      data.days?.forEach((_, i) => { expanded[i] = true })
      setExpandedDays(expanded)
    } catch (err) {
      setError(err.message || '解析失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  // Drag & drop handlers
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  // Match city name to city ID from our data
  const matchCity = useCallback((cityName) => {
    if (!cityName) return null
    const cities = getAllCitiesWithCoords()
    const cleaned = cityName.trim()
    // Exact match
    let match = cities.find((c) => c.name === cleaned)
    // Contains match
    if (!match) match = cities.find((c) => cleaned.includes(c.name) || c.name.includes(cleaned))
    // English name match
    if (!match) match = cities.find((c) => c.nameEn?.toLowerCase() === cleaned.toLowerCase())
    return match ? { id: match.id, name: match.name, countryId: match.country.id, countryName: match.country.name } : null
  }, [])

  // Import to itinerary store
  const handleImport = useCallback(() => {
    if (!result) return
    setImporting(true)

    try {
      // Build days with city matching
      const days = (result.days || []).map((d) => {
        const city = matchCity(d.cityName)
        const items = (d.items || []).map((item) => ({
          id: undefined, // will be generated
          type: item.type || 'attraction',
          name: item.name || '',
          startTime: item.startTime || '',
          endTime: item.endTime || '',
          transportMode: 'bus',
          // Cost
          price: item.estimatedCost || 0,
          priceUnit: 'perPerson',
          quantity: 1,
          // Notes — include cost category
          notes: [
            item.costCategory === 'paid' ? '💰 收费项目' : '🆓 免费项目',
            item.notes || '',
          ].filter(Boolean).join(' | '),
        }))

        return {
          dayNumber: d.dayNumber || days.indexOf(d) + 1,
          cityId: city?.id || '',
          cityName: city?.name || d.cityName || '',
          items,
          _matchedCity: city,
        }
      })

      // Filter out days with no city match
      const unmatchedCities = days
        .filter((d) => !d._matchedCity && d.cityName)
        .map((d) => d.cityName)

      const itinerary = importItinerary({
        name: result.tourName || '导入行程',
        tourCode: result.tourCode || '',
        startDate: result.startDate || '',
        endDate: result.endDate || '',
        groupSize: result.groupSize || 0,
        days: days.map(({ _matchedCity, ...d }) => d),
      })

      // Also add hotels as entities
      const hotelItems = (result.days || []).flatMap((d) =>
        (d.items || []).filter((i) => i.type === 'hotel'),
      )
      hotelItems.forEach((hotel) => {
        try {
          const city = matchCity(result.days.find((d) =>
            d.items?.some((i) => i === hotel),
          )?.cityName)
          createEntity({
            name: hotel.name,
            type: 'hotel',
            subtype: 'business',
            cityId: city?.id || '',
            cityName: city?.name || '',
            countryId: city?.countryId || '',
            countryName: city?.countryName || '',
            notes: hotel.notes || '',
          })
        } catch { /* entity creation is best-effort */ }
      })

      onClose()
      router.push('/explore')
    } catch (err) {
      setError('导入失败：' + (err.message || '未知错误'))
    } finally {
      setImporting(false)
    }
  }, [result, matchCity, onClose, router])

  // Keyboard: Escape to close
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape' && !loading && !importing) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, loading, importing, onClose])

  if (!open) return null

  const toggleDay = (idx) => {
    setExpandedDays((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading && !importing) onClose() }}
    >
      <div
        className="rounded-2xl border shadow-2xl w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: 640,
          maxHeight: '85vh',
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            📤 导入行程文件
          </h2>
          <button
            onClick={loading || importing ? undefined : onClose}
            disabled={loading || importing}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              color: 'var(--text-tertiary)',
              opacity: loading || importing ? 0.3 : 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {/* ---- Upload zone (no result yet) ---- */}
          {!result && (
            <div className="p-5">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
                style={{
                  borderColor: dragOver ? 'var(--accent)' : 'var(--border-color)',
                  background: dragOver ? 'rgba(20, 184, 166, 0.05)' : 'var(--bg-surface)',
                }}
              >
                <div className="text-4xl mb-3">📎</div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  支持 PDF、Word (.docx)、Excel (.xlsx) — 最大 10MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleChange}
                className="hidden"
              />

              {/* Loading */}
              {loading && (
                <div className="mt-4 flex items-center justify-center gap-3 py-4">
                  <div
                    className="w-5 h-5 border-2 rounded-full animate-spin"
                    style={{
                      borderColor: 'var(--border-color)',
                      borderTopColor: 'var(--accent)',
                    }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    正在解析文件，AI 分析中...
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className="mt-4 px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                  }}
                >
                  <span className="font-medium">⚠️ </span>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ---- Result preview ---- */}
          {result && (
            <div className="p-5 space-y-4">
              {/* Success badge */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{
                  background: 'rgba(20, 184, 166, 0.1)',
                  color: 'var(--accent)',
                }}
              >
                <span>✅</span>
                <span className="font-medium">AI 解析完成</span>
              </div>

              {/* Tour summary */}
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: 'var(--bg-surface)' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {result.tourName || '未命名行程'}
                  </h3>
                  {result.tourCode && (
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{
                        background: 'var(--accent)',
                        color: '#fff',
                      }}
                    >
                      {result.tourCode}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>📅 {result.startDate || '未指定'} — {result.endDate || '未指定'}</span>
                  <span>📆 {result.days?.length || 0} 天</span>
                  {result.groupSize > 0 && <span>👥 {result.groupSize} 人</span>}
                </div>
                {/* Route */}
                <div className="flex flex-wrap items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>🗺️</span>
                  {result.days?.map((d, i) => {
                    const cityName = d.cityName || '?'
                    // Show city name only when it changes
                    const prev = i > 0 ? result.days[i - 1]?.cityName : null
                    if (cityName !== prev) {
                      return (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && prev && <span>→</span>}
                          <span
                            className="px-1.5 py-0.5 rounded font-medium"
                            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                          >
                            {cityName}
                          </span>
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
              </div>

              {/* Cost stats */}
              {result.stats && (
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(34, 197, 94, 0.08)' }}
                  >
                    <div className="text-xs font-medium mb-1" style={{ color: '#22c55e' }}>
                      🆓 免费项目
                    </div>
                    <div className="text-lg font-bold" style={{ color: '#22c55e' }}>
                      {result.stats.freeItems?.length || 0}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(239, 68, 68, 0.08)' }}
                  >
                    <div className="text-xs font-medium mb-1" style={{ color: '#ef4444' }}>
                      💰 收费项目
                    </div>
                    <div className="text-lg font-bold" style={{ color: '#ef4444' }}>
                      {result.stats.paidItems?.length || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Days accordion */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  按天预览
                </h4>
                {(result.days || []).map((d, idx) => {
                  const expanded = expandedDays[idx]
                  const city = matchCity(d.cityName)
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border overflow-hidden"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <button
                        onClick={() => toggleDay(idx)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{ background: 'var(--bg-surface)' }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                          D{d.dayNumber || idx + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {d.cityName || '未知城市'}
                          {!city && d.cityName && (
                            <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                              未匹配
                            </span>
                          )}
                        </span>
                        {d.date && (
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {d.date}
                          </span>
                        )}
                        <span
                          className="text-xs transition-transform"
                          style={{
                            color: 'var(--text-tertiary)',
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                          }}
                        >
                          ▼
                        </span>
                      </button>

                      {expanded && (
                        <div className="px-4 pb-3 pt-1 space-y-1">
                          {(d.items || []).map((item, i) => {
                            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm"
                                style={{ background: 'var(--bg-card)' }}
                              >
                                <span className="text-sm shrink-0">{cfg.icon}</span>
                                <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                                  {item.name}
                                </span>
                                {item.startTime && (
                                  <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                                    {item.startTime}{item.endTime ? `-${item.endTime}` : ''}
                                  </span>
                                )}
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                                  style={{
                                    background:
                                      item.costCategory === 'paid'
                                        ? 'rgba(239, 68, 68, 0.1)'
                                        : 'rgba(34, 197, 94, 0.1)',
                                    color:
                                      item.costCategory === 'paid' ? '#ef4444' : '#22c55e',
                                  }}
                                >
                                  {item.costCategory === 'paid' ? '💰' : '🆓'}
                                </span>
                              </div>
                            )
                          })}
                          {(!d.items || d.items.length === 0) && (
                            <p className="text-xs py-2 text-center" style={{ color: 'var(--text-tertiary)' }}>
                              无项目
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer — confirm/cancel */}
        {result && (
          <div
            className="flex items-center justify-end gap-3 px-5 py-4 border-t shrink-0"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <button
              onClick={() => {
                setResult(null)
                setError('')
              }}
              disabled={importing}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                color: 'var(--text-secondary)',
                opacity: importing ? 0.3 : 1,
              }}
            >
              重新上传
            </button>
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                color: 'var(--text-secondary)',
                opacity: importing ? 0.3 : 1,
              }}
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                opacity: importing ? 0.6 : 1,
              }}
            >
              {importing ? '导入中...' : '✅ 确认导入'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
