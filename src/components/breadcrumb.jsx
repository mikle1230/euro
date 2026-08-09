import Link from 'next/link'

export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null

  return (
    <nav className="flex items-center gap-1.5 text-sm py-3 overflow-x-auto whitespace-nowrap" aria-label="面包屑导航">
      <Link href="/" className="hover:underline" style={{ color: 'var(--text-tertiary)' }}>
        首页
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {item.href ? (
            <Link href={item.href} className="hover:underline truncate max-w-[200px]" style={{ color: i === items.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {item.label}
            </Link>
          ) : (
            <span className="truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
