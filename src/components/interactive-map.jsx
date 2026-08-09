'use client'

import dynamic from 'next/dynamic'

const MapCore = dynamic(() => import('./map-core'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-full mx-auto mb-3 animate-pulse"
          style={{ background: 'var(--bg-elevated)' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          加载地图中...
        </p>
      </div>
    </div>
  ),
})

export default function InteractiveMap({ cities, highlightedCityId, itineraryCityIds, routeLine, onCityClick }) {
  return (
    <MapCore
      cities={cities}
      highlightedCityId={highlightedCityId}
      itineraryCityIds={itineraryCityIds}
      routeLine={routeLine}
      onCityClick={onCityClick}
    />
  )
}
