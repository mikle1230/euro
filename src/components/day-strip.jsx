'use client'

// 刀3 · 底部行程条：每天一个 chip（`D1 奥斯陆`），点击 → 打开该天段抽屉。
// chip 是「天」，不是「段」：当天多个城市也合成一个 chip（城市名取行程数据当天 cityName）。
// 行程为空时不渲染。定位/居中由父容器（explore/page.js）负责，本组件只画一排芯片。
export default function DayStrip({ days = [], activeDayNumber = null, onSelectDay }) {
  if (!days.length) return null

  const sorted = [...days].sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0))

  return (
    <div
      className="flex items-center gap-1.5 max-w-full overflow-x-auto px-2 py-1.5 rounded-xl border shadow-lg"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        pointerEvents: 'auto',
      }}
      role="group"
      aria-label="行程条：按天查看路线与报价条目"
    >
      {sorted.map((d) => {
        const active = activeDayNumber != null && d.dayNumber === activeDayNumber
        return (
          <button
            key={d.id || d.dayNumber}
            type="button"
            aria-pressed={active}
            onClick={() => onSelectDay && onSelectDay(d.dayNumber)}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap hover:opacity-90"
            style={active
              ? { background: 'var(--accent-strong)', color: 'var(--on-accent-strong)', borderColor: 'var(--accent)' }
              : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
            title={d.cityName ? `第${d.dayNumber}天 · ${d.cityName}` : `第${d.dayNumber}天`}
          >
            <span className="font-bold">D{d.dayNumber}</span>
            {d.cityName && <span className="truncate max-w-[7rem]">{d.cityName}</span>}
          </button>
        )
      })}
    </div>
  )
}
