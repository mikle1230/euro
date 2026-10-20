'use client'

import { useState } from 'react'
import { MAPS, embedUrl, openUrl } from '@/data/maps'

export default function MapViewer() {
  const [active, setActive] = useState(0)
  const map = MAPS[active] || MAPS[0]

  const tabActive = {
    background: 'var(--tab-on-bg)',
    color: 'var(--tab-on-fg)',
    border: '1px solid var(--tab-on-border)',
  }
  const tabInactive = {
    background: 'transparent',
    color: 'inherit',
    border: '1px solid transparent',
    opacity: 0.6,
  }

  return (
    <main className="flex-1 flex flex-col min-h-0">
      <div
        className="flex flex-wrap items-center gap-1.5 px-2 sm:px-5 py-1.5 border-b text-xs sm:text-sm shrink-0"
        style={{ borderColor: 'var(--chrome-border)' }}
      >
        {MAPS.map((m, i) => (
          <button
            key={m.mid}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className="px-2.5 py-1 rounded-md transition-all hover:opacity-100"
            style={i === active ? tabActive : tabInactive}
          >
            {m.label}
          </button>
        ))}
        <span className="flex-1" />
        <a
          href={openUrl(map.mid)}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 underline underline-offset-2 opacity-70 hover:opacity-100 text-[11px] sm:text-xs"
        >
          在新窗口打开
        </a>
      </div>

      <iframe
        key={map.mid}
        src={embedUrl(map.mid)}
        title={`地图（Google My Maps）：${map.label}`}
        className="w-full flex-1 border-0 bg-transparent"
        style={{ minHeight: 'calc(100vh - 96px)' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />

      <p className="px-3 sm:px-5 py-1.5 text-[11px] opacity-50 shrink-0">
        共 {MAPS.length} 张图 · 如地图空白，多半是当前网络无法访问 Google 服务。
      </p>
    </main>
  )
}
