'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAllCountries, getAllCitiesWithCoords, getAllAttractionsFlat } from '@/lib/data'
import { getAllEntities, ensureSeeded } from '@/lib/entity-store'

const TYPE_CONFIG = {
  country: { icon: '🗺️', label: '国家', color: '#14b8a6' },
  city: { icon: '🏙️', label: '城市', color: '#f0a030' },
  landmark: { icon: '🏛️', label: '地标', color: '#d4a854' },
  museum: { icon: '🏺', label: '博物馆', color: '#14b8a6' },
  nature: { icon: '🌿', label: '自然', color: '#22c55e' },
  hotel: { icon: '🏨', label: '酒店', color: '#4a8fcf' },
  restaurant: { icon: '🍽️', label: '餐厅', color: '#e8784a' },
  transport: { icon: '🚌', label: '交通', color: '#8b5cf6' },
  guide: { icon: '🧑‍💼', label: '导游', color: '#718096' },
}

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Seed entity store once
  useEffect(() => { ensureSeeded(getAllAttractionsFlat) }, [])

  // Build unified search index
  const index = useMemo(() => {
    const items = []

    // Countries
    const countries = getAllCountries()
    countries.forEach((c) => {
      items.push({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn || '',
        type: 'country',
        path: `/knowledge/${c.id}`,
        parentName: '',
      })
    })

    // Cities
    const cities = getAllCitiesWithCoords()
    cities.forEach((c) => {
      items.push({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn || '',
        type: 'city',
        path: `/knowledge/${c.country.id}/${c.id}`,
        parentName: c.country.name,
      })
    })

    // Entities (from entity-store, includes seeded JSON attractions + user-created)
    const entities = getAllEntities()
    entities.forEach((e) => {
      const subtype = e.type === 'attraction' ? e.subtype || 'landmark' : e.type
      const hasDetailPage = e.type === 'attraction' && e.countryId && e.cityId
      items.push({
        id: e.id,
        name: e.name,
        nameEn: '',
        type: subtype,
        path: hasDetailPage
          ? `/knowledge/${e.countryId}/${e.cityId}/${e.id}`
          : e.cityId && e.countryId
            ? `/knowledge/${e.countryId}/${e.cityId}`
            : e.countryId
              ? `/knowledge/${e.countryId}`
              : '/knowledge',
        parentName: [e.cityName, e.countryName].filter(Boolean).join(' · '),
      })
    })

    return items
  }, [])

  // Filtered results
  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()

    // Score each item
    const scored = index
      .map((item) => {
        let score = 0
        const nameLow = item.name.toLowerCase()
        const nameEnLow = item.nameEn.toLowerCase()
        const parentLow = item.parentName.toLowerCase()
        const typeLabel = (TYPE_CONFIG[item.type]?.label || '').toLowerCase()

        if (nameLow === q) score += 100
        else if (nameLow.startsWith(q)) score += 50
        else if (nameLow.includes(q)) score += 20

        if (nameEnLow.includes(q)) score += 15
        if (parentLow.includes(q)) score += 10
        if (typeLabel.includes(q)) score += 5

        return { ...item, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        // Sort by type priority then score
        const typeOrder = { country: 0, city: 1 }
        const aOrder = typeOrder[a.type] ?? 2
        const bOrder = typeOrder[b.type] ?? 2
        if (aOrder !== bOrder) return aOrder - bOrder
        return b.score - a.score
      })
      .slice(0, 10)

    return scored
  }, [query, index])

  const selectItem = useCallback(
    (item) => {
      router.push(item.path)
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
    },
    [router],
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!open || results.length === 0) {
        if (e.key === 'Escape') {
          setOpen(false)
          inputRef.current?.blur()
        }
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIdx]) selectItem(results[selectedIdx])
      } else if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        inputRef.current?.blur()
      }
    },
    [open, results, selectedIdx, selectItem],
  )

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reset selectedIdx when results change
  useEffect(() => { setSelectedIdx(0) }, [results])

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
          style={{ color: 'var(--text-tertiary)' }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="搜索国家、城市、景点..."
          className="w-48 pl-7 pr-3 py-1.5 text-xs rounded-full border outline-none transition-all focus:ring-2 focus:w-64"
          style={{
            background: 'var(--bg-surface)',
            borderColor: open ? 'var(--accent)' : 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="absolute right-0 mt-1.5 w-80 rounded-xl border shadow-xl overflow-hidden z-[1100]"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((item, idx) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.landmark
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => selectItem(item)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                  style={{
                    background:
                      idx === selectedIdx
                        ? 'var(--bg-surface)'
                        : 'transparent',
                  }}
                >
                  {/* Type icon */}
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: cfg.color + '20', color: cfg.color }}
                  >
                    {cfg.icon}
                  </span>
                  {/* Name + parent */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.name}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {item.parentName || cfg.label}
                    </div>
                  </div>
                  {/* Type label */}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
                  >
                    {cfg.label}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Footer hint */}
          <div
            className="px-3 py-1.5 border-t text-[10px]"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-tertiary)',
            }}
          >
            ↑↓ 导航 · ↵ 选择 · Esc 关闭
          </div>
        </div>
      )}

      {/* No results */}
      {open && query.trim() && results.length === 0 && (
        <div
          className="absolute right-0 mt-1.5 w-72 rounded-xl border shadow-xl z-[1100] px-4 py-6 text-center"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>未找到匹配结果</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>试试其他关键词</p>
        </div>
      )}
    </div>
  )
}
