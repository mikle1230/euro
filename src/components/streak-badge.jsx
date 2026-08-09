export default function StreakBadge({ streak }) {
  if (streak < 1) return null

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{
        background: `color-mix(in srgb, var(--gold) 15%, transparent)`,
        color: 'var(--gold)',
      }}
    >
      🔥 连续 {streak} 天
    </div>
  )
}
