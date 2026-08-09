'use client'

import { useState, useEffect } from 'react'

export default function SearchResults() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [results, setResults] = useState([])

  // Client-side search using the data module directly
  // (Pagefind enhances this in production but the data search is always available)
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { getAllAttractionsFlat } = await import('@/lib/data')
      const all = getAllAttractionsFlat()
      const q = query.toLowerCase()
      const filtered = all.filter((a) => {
        if (typeFilter !== 'all' && a.type !== typeFilter) return false
        return (
          a.name.toLowerCase().includes(q) ||
          (a.nameEn && a.nameEn.toLowerCase().includes(q)) ||
          a.city?.name?.toLowerCase().includes(q) ||
          a.country?.name?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
        )
      }).slice(0, 20)
      setResults(filtered.map((a) => ({
        id: a.id,
        url: `/explore/${a.country?.id}/${a.city?.id}/${a.id}`,
        title: a.name,
        excerpt: a.description?.slice(0, 120) || '',
        type: a.type,
        countryName: a.country?.name,
        cityName: a.city?.name,
      })))
    }, 200)
    return () => clearTimeout(timer)
  }, [query, typeFilter])

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'landmark', label: '🏛️ 地标' },
    { key: 'museum', label: '🏺 博物馆' },
    { key: 'nature', label: '🌿 自然' },
  ]

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索国家、城市、景点..."
          autoFocus
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border text-base outline-none transition-all duration-300"
          style={{
            background: 'var(--bg-card)',
            borderColor: query ? 'var(--accent)' : 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border"
            style={
              typeFilter === f.key
                ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {query && results.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>没有找到相关结果</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>试试其他关键词？</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>
            找到 {results.length} 个结果
          </p>
          <div className="space-y-3">
            {results.map((item) => (
              <a
                key={item.id}
                href={item.url}
                className="block p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {item.type && (
                    <span className={`text-xs px-2 py-0.5 rounded-full badge-${item.type}`}>
                      {item.type === 'landmark' ? '地标' : item.type === 'museum' ? '博物馆' : '自然'}
                    </span>
                  )}
                  {item.countryName && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {item.countryName}{item.cityName ? ` · ${item.cityName}` : ''}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                {item.excerpt && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {item.excerpt}
                  </p>
                )}
              </a>
            ))}
          </div>
        </>
      )}

      {!query && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🗺️</div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            搜索欧洲旅行知识库
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            输入国家、城市或景点名称开始搜索
          </p>
        </div>
      )}
    </div>
  )
}
