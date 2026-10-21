'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { MAPS, GROUP_ORDER, embedUrl, openUrl } from '@/data/maps'

const LAST_KEY = 'euro-map-last'
const RAIL_KEY = 'euro-map-rail'

// ---------------------------------------------------------------
// 「当前选中的图」与「左栏是否收起」都要从 URL / localStorage 恢复。
// 若放在 effect 里同步 setState，会触发级联渲染（React Compiler 规则
// react-hooks/set-state-in-effect）。改用 useSyncExternalStore：
// 服务端与水合时先取快照，水合后再读真实值，切换交给 React 自己处理。
// ---------------------------------------------------------------
const midListeners = new Set()
let midOverride = null

function readMid() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('m')
    const mid = fromUrl || localStorage.getItem(LAST_KEY)
    return MAPS.some((m) => m.mid === mid) ? mid : null
  } catch (e) {
    return null
  }
}
const subscribeMid = (cb) => {
  midListeners.add(cb)
  return () => midListeners.delete(cb)
}
const getMid = () => midOverride || readMid() || MAPS[0].mid
const getMidServer = () => MAPS[0].mid

const railListeners = new Set()
let railOverride = null

function readRail() {
  try {
    return localStorage.getItem(RAIL_KEY) === '1' ? '1' : '0'
  } catch (e) {
    return '0'
  }
}
const subscribeRail = (cb) => {
  railListeners.add(cb)
  return () => railListeners.delete(cb)
}
const getRail = () => railOverride || readRail()
const getRailServer = () => '0'

function persistMid(mid) {
  midOverride = mid
  try {
    localStorage.setItem(LAST_KEY, mid)
    const url = new URL(window.location.href)
    url.searchParams.set('m', mid)
    window.history.replaceState(null, '', url)
  } catch (e) {}
  midListeners.forEach((cb) => cb())
}

function persistRail(next) {
  railOverride = next ? '1' : '0'
  try {
    localStorage.setItem(RAIL_KEY, railOverride)
  } catch (e) {}
  railListeners.forEach((cb) => cb())
}

// 等宽两位序号：列表与收起态序号条、右侧工具条共用同一套编号
const SEQ = new Map(MAPS.map((m, i) => [m.mid, String(i + 1).padStart(2, '0')]))

function groupMaps(list) {
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
    .sort((a, b) => rank(a.g.name) - rank(b.g.name) || a.i - b.i)
    .map(({ g }) => g)
}

function MapRow({ map, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={map.label}
      aria-current={active ? 'true' : undefined}
      className={`e-map-row${active ? ' on' : ''}`}
    >
      <span className="e-map-seq">{SEQ.get(map.mid)}</span>
      <span className="min-w-0 flex-1">
        <span className="e-map-name">{map.label}</span>
        {map.note ? <span className="e-map-note">{map.note}</span> : null}
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
    return groupMaps(list)
  }, [query])

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="p-2 shrink-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索地图…"
          aria-label="搜索地图"
          className="e-map-search"
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-1.5 pb-2 min-h-0">
        {groups.length === 0 ? (
          <p className="e-map-empty">没有匹配的地图</p>
        ) : (
          groups.map((g) => (
            // 排序仍按 GROUP_ORDER，但列表视觉上是一条平铺清单：
            // 不写分类名，也不画组间分隔线。
            <div key={g.name}>
              {g.items.map((m) => (
                <MapRow
                  key={m.mid}
                  map={m}
                  active={m.mid === active}
                  onClick={() => onSelect(m.mid)}
                />
              ))}
            </div>
          ))
        )}
      </nav>
      <p className="e-map-foot">共 {MAPS.length} 张图</p>
    </div>
  )
}

// 收起态：只剩等宽序号条，点击照样切图，不必先展开
function MapRailNums({ active, onSelect }) {
  return (
    <nav className="e-map-nums" aria-label="地图序号">
      {MAPS.map((m) => (
        <button
          key={m.mid}
          type="button"
          onClick={() => onSelect(m.mid)}
          title={m.label}
          aria-label={m.label}
          aria-current={m.mid === active ? 'true' : undefined}
          className={`e-map-num${m.mid === active ? ' on' : ''}`}
        >
          {SEQ.get(m.mid)}
        </button>
      ))}
    </nav>
  )
}

export default function MapViewer() {
  const active = useSyncExternalStore(subscribeMid, getMid, getMidServer)
  const collapsed = useSyncExternalStore(subscribeRail, getRail, getRailServer) === '1'
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState(false)

  const current = MAPS.find((m) => m.mid === active) || MAPS[0]

  const select = (mid) => {
    persistMid(mid)
    setSheet(false)
  }

  return (
    <main
      data-skin="e"
      className="flex-1 flex min-h-0"
      style={{ background: 'var(--page-ground, var(--bg-primary))' }}
    >
      {/* 桌面端：地图索引条（窄，可收起） */}
      <aside
        className={`e-map-rail hidden md:flex shrink-0 flex-col min-h-0${collapsed ? ' is-collapsed' : ''}`}
      >
        <div className="e-map-rail-head">
          {collapsed ? null : (
            <>
              <span className="e-map-rail-title">选择地图</span>
              <span className="flex-1" />
            </>
          )}
          <button
            type="button"
            onClick={() => persistRail(!collapsed)}
            className="e-map-toggle"
            title={collapsed ? '展开地图列表' : '收起地图列表'}
            aria-label={collapsed ? '展开地图列表' : '收起地图列表'}
            aria-expanded={!collapsed}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        {collapsed ? (
          <MapRailNums active={active} onSelect={select} />
        ) : (
          <MapList active={active} onSelect={select} query={query} setQuery={setQuery} />
        )}
      </aside>

      {/* 右侧地图区 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="e-map-bar shrink-0">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="e-map-act md:hidden max-w-[62%] truncate"
          >
            {current.label} ▾
          </button>
          <span className="e-map-bar-no hidden md:inline">{SEQ.get(current.mid)}</span>
          <span className="e-map-bar-name hidden md:block">{current.label}</span>
          <span className="flex-1" />
          <a href={openUrl(current.mid)} target="_blank" rel="noreferrer" className="e-map-act">
            在新窗口打开
          </a>
        </div>

        <iframe
          key={current.mid}
          src={embedUrl(current.mid)}
          title={`地图（Google My Maps）：${current.label}`}
          className="e-map-frame"
          style={{ minHeight: 'calc(100vh - 96px)' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      {/* 手机端选题抽屉 */}
      {sheet ? (
        <div className="e-map-sheet md:hidden">
          <div className="e-map-sheet-head shrink-0">
            <span className="e-map-sheet-title">选择地图</span>
            <span className="flex-1" />
            <button type="button" onClick={() => setSheet(false)} className="e-map-act">
              关闭
            </button>
          </div>
          <MapList active={active} onSelect={select} query={query} setQuery={setQuery} />
        </div>
      ) : null}
    </main>
  )
}
