'use client'

// 刀3 · 段抽屉：点地图上的某一「段路线」或底部行程条的某天 chip → 滑出该天的路线 + 报价条目。
//
// 位置：桌面端贴左侧（右侧已被 FloatingPanel 占用，放右边会打架）；移动端从底部升起（半屏 bottom sheet）。
// 内容顺序（本刀的设计要点，不要调整）：
//   1 标题行 `D2 · 9/18` → 2 `盖朗厄尔 → 奥勒松` → 3 当天各段 km/时长 + 当日累计 + 全行程累计
//   → 4 分隔线 → 5 `▸ 这段的报价条目`（默认折叠）→ 6 底部按钮（复制全部条目 / 全部条目 >）
//
// 数字一律来自 route-plan.js（OSRM）；estimate 兜底时带 ~ 前缀且不显示时长（formatLegLabel 同一实现）。
// 条目来自 lib/quos-rows.js（与 quos-list 同一份派生），不在这里另写一套。
import { useMemo, useState } from 'react'
import { buildQuosRows, sortQuosRows, rowsForDay, formatQuosRowsText, fmtPrice } from '@/lib/quos-rows'
import { getQUOSOrder } from '@/lib/quos-mapping'

const HEADER_H = 56 // 与浮动面板同一顶栏高度（header.jsx h-14）

export default function SegmentDrawer({
  open = false,
  isMobile = false,
  day = null,
  dayPlan = null,
  totalLabel = '',
  itinerary = null,
  version = 0,
  openKey = null,
  onClose,
  onOpenFullPanel,
}) {
  // 「这段的报价条目」展开状态：按 openKey（每次打开一个会话）记录 —— 不跨开关保留，
  // 默认折叠是本刀的设计要点。用派生值而不是 effect，避免 setState-in-effect 的级联渲染。
  const [rowsOpenKey, setRowsOpenKey] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const rowsOpen = open && !!day && rowsOpenKey === openKey
  const copied = copiedKey === openKey

  // 该天条目：复用 quos-list 的派生（默认过滤与面板「收费」视图同口径）。
  // 依赖 version：行程 store 是原地 mutate，只能靠版本号触发重算（见 docs/architecture.md）。
  const rows = useMemo(() => {
    if (!itinerary || !day) return []
    return sortQuosRows(rowsForDay(buildQuosRows(itinerary), day.id), getQUOSOrder())
  }, [itinerary, day, version]) // eslint-disable-line react-hooks/exhaustive-deps -- version：store 原地 mutate，靠版本号触发重算

  const handleCopy = () => {
    if (!day || rows.length === 0) return
    const text = formatQuosRowsText(day, rows)
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => setCopiedKey(openKey)).catch(() => {})
    }
  }

  const legs = dayPlan?.legs || []
  const title = dayPlan ? `D${dayPlan.dayNumber}${dayPlan.date ? ` · ${dayPlan.date}` : ''}` : ''

  const containerStyle = isMobile
    ? {
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '60vh',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
      }
    : {
        left: 0,
        top: HEADER_H,
        bottom: 0,
        width: 380,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
      }

  return (
    <aside
      aria-hidden={!open}
      aria-label="这一天的路线与报价条目"
      className="flex flex-col border shadow-2xl"
      style={{
        position: 'fixed',
        zIndex: 1050,
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        transition: 'transform 220ms ease',
        pointerEvents: open ? 'auto' : 'none',
        ...containerStyle,
      }}
    >
      {/* 0) 移动端 bottom sheet 拖拽把手（无实际拖拽，仅视觉提示） */}
      {isMobile && (
        <div className="flex justify-center pt-1.5 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-color)' }} />
        </div>
      )}

      {/* 1) 标题行 */}
      <div
        className="flex items-start justify-between gap-2 px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="min-w-0">
          <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {title || (day ? `D${day.dayNumber}` : '—')}
          </div>
          {day?.cityName && (
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              第{day.dayNumber}天 · {day.cityName}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="w-7 h-7 shrink-0 rounded-lg border flex items-center justify-center text-xs transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5">
        {/* 2) 当天起点 → 终点 */}
        <div className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
          {dayPlan?.routeText || day?.cityName || '—'}
        </div>

        {/* 3) 当天各段 km/时长 + 当日累计 + 全行程累计 */}
        {legs.length > 0 && (
          <div className="mb-1.5">
            {legs.map((leg, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs py-0.5">
                <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {leg.fromCityName} → {leg.toCityName}
                </span>
                <span className="shrink-0 font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {leg.label}
                </span>
              </div>
            ))}
          </div>
        )}
        {dayPlan && dayPlan.km == null && (
          <div className="text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
            {dayPlan.hasPlan || !dayPlan.canPlan ? '当天无跨城移动（无路线段）' : '路线里程仍在计算中…'}
          </div>
        )}
        <div className="text-xs flex items-center justify-between gap-2" style={{ color: 'var(--text-secondary)' }}>
          <span>当日累计</span>
          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{dayPlan?.label || '—'}</span>
        </div>
        <div className="text-xs flex items-center justify-between gap-2" style={{ color: 'var(--text-secondary)' }}>
          <span>全行程累计</span>
          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{totalLabel || '—'}</span>
        </div>
        {dayPlan?.hasEstimate && dayPlan.hasPlan && (
          <div className="text-[10px] mt-1.5 px-2 py-1 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
            ⚠️ OSRM 未返回真实路线，此段为估算里程（~），不显示时长 —— 与地图段标签同口径
          </div>
        )}

        {/* 4) 分隔线 */}
        <hr className="my-2.5 border-t" style={{ borderColor: 'var(--border-color)' }} />

        {/* 5) 这段的报价条目（默认折叠） */}
        <button
          type="button"
          onClick={() => setRowsOpenKey(rowsOpen ? null : openKey)}
          aria-expanded={rowsOpen}
          className="w-full flex items-center gap-1.5 text-xs font-semibold text-left py-1 rounded-lg transition-colors hover:bg-[var(--bg-surface)]"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="shrink-0 w-3" style={{ color: 'var(--text-tertiary)' }}>{rowsOpen ? '▾' : '▸'}</span>
          <span>这段的报价条目</span>
          <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>({rows.length})</span>
        </button>
        {rowsOpen && (
          <div className="mt-1.5">
            {rows.length === 0 ? (
              <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
                该天没有条目（免费/用餐/景点/内陆交通按面板默认口径已隐藏）
              </p>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id || `${r.dayId}-${r.quosCode}-${r.nameEn || r.name}`}
                  className="rounded-lg border px-2 py-1.5 mb-1.5"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-mono font-bold shrink-0" style={{ color: 'var(--accent)' }}>{r.quosCode}</span>
                    {(r.countryCode || r.cityCode) && (
                      <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {r.countryCode}{r.cityCode ? `/${r.cityCode}` : ''}
                      </span>
                    )}
                    <span className="flex-1 min-w-0 truncate font-medium" style={{ color: 'var(--text-primary)' }} title={r.nameEn || r.name}>
                      {r.nameEn || r.name}
                    </span>
                    {fmtPrice(r) && (
                      <span className="shrink-0 font-semibold" style={{ color: 'var(--gold)' }}>{fmtPrice(r)}</span>
                    )}
                  </div>
                  {r.nameEn && r.name && (
                    <div className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>{r.name}</div>
                  )}
                  {r.notes && (
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)', overflowWrap: 'break-word' }}>
                      {r.notes}
                    </div>
                  )}
                </div>
              ))
            )}
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              与右侧面板「收费」视图同口径（隐藏免费/用餐/景点/内陆交通）
            </p>
          </div>
        )}
      </div>

      {/* 6) 底部按钮 */}
      <div className="px-3 py-2 border-t flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <button
          type="button"
          onClick={handleCopy}
          disabled={rows.length === 0}
          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          title={rows.length === 0 ? '该天没有条目可复制' : '把该天条目复制成纯文本（制表符分列）'}
        >
          {copied ? '✅ 已复制' : '复制全部条目'}
        </button>
        <button
          type="button"
          onClick={onOpenFullPanel}
          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'var(--accent-strong)', color: 'var(--on-accent-strong)' }}
          title="切到右侧面板的「行程详情」（深度模式）"
        >
          全部条目 &gt;
        </button>
      </div>
    </aside>
  )
}
