import { SITE } from '@/lib/config'

export default function Footer() {
  return (
    <footer className="mt-auto py-8 px-4 md:px-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
      <p className="text-sm">
        {SITE.name} · 制图师的旅行手札 · {new Date().getFullYear()}
      </p>
    </footer>
  )
}
