export default function ProgressBar({ learned, total }) {
  const pct = total > 0 ? Math.round((learned / total) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: pct > 0
              ? `linear-gradient(90deg, var(--accent), var(--gold))`
              : 'transparent',
          }}
        />
      </div>
      <span className="text-xs font-mono font-medium tabular-nums whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
        {learned}/{total}
      </span>
    </div>
  )
}
