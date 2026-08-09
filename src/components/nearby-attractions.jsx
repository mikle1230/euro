import AttractionCard from './attraction-card'

export default function NearbyAttractions({ attractions, currentId }) {
  const nearby = attractions.filter((a) => a.id !== currentId).slice(0, 3)

  if (nearby.length === 0) return null

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
        <span className="text-sm font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
          附近探索
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {nearby.map((attr) => (
          <AttractionCard key={attr.id} attraction={attr} />
        ))}
      </div>
    </section>
  )
}
