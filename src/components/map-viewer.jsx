'use client'

import { useEffect, useMemo, useState } from 'react'
import { MAPS, GROUP_ORDER, embedUrl, openUrl } from '@/data/maps'

const LAST_KEY = 'euro-map-last'

function MapRow({ map, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className="group w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-start gap-2"
      style={
        active
          ? {
              background: 'var(--tab-on-bg)',
              borderLeft: '2px solid var(--accent)',
              paddingLeft: 8,
            }
          : { borderLeft: '2px solid transparent', paddingLeft: 8 }
      }
    >
      <span className="min-w-0 flex-1">
        <span
          className="block text-[13px] leading-snug truncate"
          style={{ color: active ? 'var(--accent)' : 'var(--text-primary)', fontWeight: active ? 600 : 400 }}
        >
          {map.label}
        </span>
        {map.note ? (
          <span className="block text-[11px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {map.note}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function MapList({ active, onSelect, query, setQuery }) {
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? MAPS.filter(
          (m) =>
            m.label.toLowerCase().includes(q) ||
            (m.group || '').toLowerCase().includes(q) ||
            (m.note || '').toLowerCase().includes(q),
        )
      : MAPS
    const out = []
    const index = new Map()
    list.forEach((m) => {
      const g = m.group || '未分组'
      if (!index.has(g)) {
        index.set(g, { name: g, items: [] })
        out.push(index.get(g))
      }
      index.get(g).items.push(m)
    })
    const rank = (name) => {
      const i = GROUP_ORDER.indexOf(name)
      return i === -1 ? GROUP_ORDER.length : i
    }
    return out
      .map((g, i) => ({ g, i }))
      .sort((a, b) => (rank(a.g.name) - rank(b.g.name)) || (a.i - b.i))
      .map(({ g }) => g)
  }, [query])

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="p-2.5 shrink-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索地图…"
          className="w-full px-2.5 py-1.5 rounded-md text-[13px] outline-none"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--chrome-border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
        {groups.length === 0 ? (
          <p className="px-2 py-6 text-[12px] text-center" style={{ color: 'var(--text-tertiary)' }}>
            没有匹配的地图
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.name} className="mb-1.5">
              <p
                className="px-2.5 pt-2 pb-1 text-[10px] tracking-widest uppercase"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {g.name}
              </p>
              {g.items.map((m) => (
                <MapRow key={m.mid} map={m} active={m.mid === active} onClick={() => onSelect(m.mid)} />
              ))}
            </div>
          ))
        )}
      </nav>
      <p className="px-3 py-2 text-[11px] shrink-0 border-t" style={{ borderColor: 'var(--chrome-border)', color: 'var(--text-tertiary)' }}>
        共 {MAPS.length} 张图
      </p>
    </div>
  )
}

export default function MapViewer() {
  const [active, setActive] = useState(MAPS[0].mid)
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState(false)

  useEffect(() => {
    let wanted = null
    try {
      wanted = new URLSearchParams(window.location.search).get('m') || localStorage.getItem(LAST_KEY)
    } catch (e) {}
    if (wanted && MAPS.some((m) => m.mid === wanted)) setActive(wanted)
  }, [])

  const current = MAPS.find((m) => m.mid === active) || MAPS[0]

  const select = (mid) => {
    setActive(mid)
    setSheet(false)
    try {
      localStorage.setItem(LAST_KEY, mid)
      const url = new URL(window.location.href)
      url.searchParams.set('m', mid)
      window.history.replaceState(null, '', url)
    } catch (e) {}
  }

  return (
    <main className="flex-1 flex min-h-0">
      {/* 桌面端左侧列表 */}
      <aside
        className="hidden md:flex w-[248px] shrink-0 flex-col border-r min-h-0"
        style={{ borderColor: 'var(--chrome-border)', background: 'var(--bg-secondary)' }}
      >
        <MapList active={active} onSelect={select} query={query} setQuery={setQuery} />
      </aside>

      {/* 右侧地图区 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div
          className="flex items-center gap-2 px-2 sm:px-3 py-1.5 border-b text-xs sm:text-sm shrink-0"
          style={{ borderColor: 'var(--chrome-border)' }}
        >
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="md:hidden flex items-center gap-1.5 px-2 py-1 rounded-md max-w-[60%]"
            style={{ background: 'var(--chrome-btn-bg)', border: '1px solid var(--chrome-btn-border)', color: 'var(--chrome-btn-fg)' }}
          >
            <span className="truncate">{current.label}</span>
            <span aria-hidden="true">▾</span>
          </button>
          <span className="hidden md:inline font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {current.label}
          </span>
          {current.group ? (
            <span
              className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded shrink-0"
              style={{ background: 'var(--tab-off-bg)', color: 'var(--text-tertiary)' }}
            >
              {current.group}
            </span>
          ) : null}
          <span className="flex-1" />
          <a
            href={openUrl(current.mid)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 underline underline-offset-2 opacity-70 hover:opacity-100 text-[11px] sm:text-xs"
          >
            在新窗口打开
          </a>
        </div>

        <iframe
          key={current.mid}
          src={embedUrl(current.mid)}
          title={`地图（Google My Maps）：${current.label}`}
          className="w-full flex-1 border-0 bg-transparent"
          style={{ minHeight: 'calc(100vh - 96px)' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      {/* 手机端抽屉 */}
      {sheet ? (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
            style={{ borderColor: 'var(--chrome-border)' }}
          >
            <span className="text-sm font-medium">选择地图</span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setSheet(false)}
              className="px-2.5 py-1 rounded-md text-xs"
              style={{ background: 'var(--chrome-btn-bg)', border: '1px solid var(--chrome-btn-border)', color: 'var(--chrome-btn-fg)' }}
            >
              关闭
            </button>
          </div>
          <MapList active={active} onSelect={select} query={query} setQuery={setQuery} />
        </div>
      ) : null}
    </main>
  )
}
