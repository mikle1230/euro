export default function InfoGrid({ info }) {
  if (!info) return null

  const items = [
    { label: '开放时间', value: info.hours, icon: '🕐' },
    { label: '门票', value: info.ticketPrice, icon: '🎫' },
    { label: '最佳时间', value: info.bestTime, icon: '✨' },
    { label: '交通', value: info.transport, icon: '🚇' },
  ].filter((item) => item.value)

  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="p-4 rounded-xl border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              {item.label}
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
