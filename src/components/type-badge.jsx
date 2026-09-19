import { TYPE_LABELS, TYPE_ICONS } from '@/lib/config'

export default function TypeBadge({ type, icon = true }) {
  const badgeMap = {
    landmark: 'badge-landmark',
    museum: 'badge-museum',
    nature: 'badge-nature',
    hotel: 'badge-hotel',
    restaurant: 'badge-restaurant',
    transport: 'badge-transport',
    guide: 'badge-guide',
  }
  const cls = badgeMap[type] || 'badge-landmark'

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {icon && <span className="type-badge-icon">{TYPE_ICONS[type] || '📍'}</span>}
      {TYPE_LABELS[type] || type}
    </span>
  )
}
