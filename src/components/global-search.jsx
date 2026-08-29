'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { getAllCountries, getAllCitiesWithCoords, getAllAttractionsFlat } from '@/lib/data'
import { getAllEntities, ensureSeeded } from '@/lib/entity-store'
import { getCityCode } from '@/lib/quos-mapping'

const TYPE_CONFIG = {
  country: { icon: '🗺️', label: '国家', color: '#08739D' },
  city: { icon: '🏙️', label: '城市', color: '#4984AC' },
  landmark: { icon: '🏛️', label: '地标', color: '#AEC60C' },
  museum: { icon: '🏺', label: '博物馆', color: '#4984AC' },
  nature: { icon: '🌿', label: '自然', color: '#22c55e' },
  hotel: { icon: '🏨', label: '酒店', color: '#4a8fcf' },
  restaurant: { icon: '🍽️', label: '餐厅', color: '#e8784a' },
  transport: { icon: '🚌', label: '交通', color: '#8b5cf6' },
  guide: { icon: '🧑‍💼', label: '导游', color: '#718096' },
}

export default function GlobalSearch({ wide = false }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  // 下拉用 portal 渲染到 body：header 是 z-[900] 堆叠上下文，
  // 若放在 header 内会被右侧面板（z-[1000]）盖住
  const [dropPos, setDropPos] = useState(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)

  const openDropdown = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return
    setDropPos({
      top: rect.bottom + 6,
      left: Math.max(8, rect.left),
      width: Math.min(Math.max(288, rect.width), window.innerWidth - 16),
    })
  }, [])

  // Seed entity store once
  useEffect(() => { ensureSeeded(getAllAttractionsFlat) }, [])

  // Build unified search index
  const index = useMemo(() => {
    const items = []

    // Countries（QUOS 国家二字码：取该国任一可解析城市的 countryCode 反查）
    const countries = getAllCountries()
    countries.forEach((c) => {
      let quosCode = ''
      for (const city of c.cities) {
        const cc = getCityCode(city.name, city.nameEn)?.countryCode
        if (cc) { quosCode = cc; break }
      }
      items.push({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn || '',
        type: 'country',
        path: `/knowledge/${c.id}`,
        parentName: '',
        quosCode,
      })
    })

    // Cities（QUOS 城市三字码）
    const cities = getAllCitiesWithCoords()
    cities.forEach((c) => {
      const cityInfo = getCityCode(c.name, c.nameEn)
      items.push({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn || '',
        type: 'city',
        path: `/knowledge/${c.country.id}/${c.id}`,
        parentName: c.country.name,
        quosCode: cityInfo?.cityCode || '',
        parentCode: cityInfo?.countryCode || '',
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
        const quosLow = (item.quosCode || '').toLowerCase()
        const typeLabel = (TYPE_CONFIG[item.type]?.label || '').toLowerCase()

        if (nameLow === q) score += 100
        else if (nameLow.startsWith(q)) score += 50
        else if (nameLow.includes(q)) score += 20

        if (nameEnLow.includes(q)) score += 15
        if (parentLow.includes(q)) score += 10
        if (typeLabel.includes(q)) score += 5

        // QUOS 码匹配（如 PAR/VIE/FR/DE）：精确命中高权重，支持前缀/包含
        if (quosLow === q) score += 40
        else if (quosLow.startsWith(q)) score += 20
        else if (quosLow.includes(q)) score += 10

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

  // Close dropdown on outside click（portal 下拉在 container 外，需同时检查下拉自身）
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const inContainer = containerRef.current && containerRef.current.contains(e.target)
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target)
      if (!inContainer && !inDropdown) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // 滚动时收起，避免下拉悬空错位；但下拉框**内部**滚动（滚动结果列表）不关闭
  useEffect(() => {
    if (!open) return
    const onScroll = (e) => {
      // 滚动源在下拉框内部（滚动结果列表）→ 不关闭；否则收起
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
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
            openDropdown()
          }}
          onFocus={() => { if (query.trim()) { setOpen(true); openDropdown() } }}
          onKeyDown={handleKeyDown}
          placeholder="搜索..."
          className={wide ? 'w-full pl-8 pr-3 py-2 text-sm rounded-full border outline-none transition-all focus:ring-2' : 'w-36 sm:w-48 pl-7 pr-3 py-1.5 text-xs rounded-full border outline-none transition-all focus:ring-2 focus:w-44 sm:focus:w-64'}
          style={{
            background: 'var(--bg-surface)',
            borderColor: open ? 'var(--accent)' : 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Dropdown（portal 到 body，fixed 定位，避免被面板 z-[1000] 遮挡） */}
      {open && results.length > 0 && dropPos && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-xl border shadow-xl overflow-hidden"
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 1300,
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
                      {item.quosCode && (
                        <span className="ml-1.5 text-xs font-mono" style={{ color: 'var(--accent)' }}>
                          {item.quosCode}
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {item.parentName || cfg.label}
                      {item.parentCode && <span className="ml-1 font-mono">{item.parentCode}</span>}
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
        </div>,
        document.body,
      )}

      {/* No results */}
      {open && query.trim() && results.length === 0 && dropPos && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-xl border shadow-xl px-4 py-6 text-center"
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 1300,
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>未找到匹配结果</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>试试其他关键词</p>
        </div>,
        document.body,
      )}
    </div>
  )
}
