import { TYPE_LABELS, TYPE_ICONS } from '@/lib/config'

export default function TypeBadge({ type, icon = true }) {
  const cls = type === 'landmark' ? 'badge-landmark'
    : type === 'museum' ? 'badge-museum'
    : type === 'nature' ? 'badge-nature'
    : 'badge-landmark'

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {icon && <span>{TYPE_ICONS[type] || '📍'}</span>}
      {TYPE_LABELS[type] || type}
    </span>
  )
}
