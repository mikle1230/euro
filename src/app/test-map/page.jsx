'use client'

import dynamic from 'next/dynamic'

const MapTest = dynamic(() => import('./map-test-inner'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0e8' }}>
      <p>Loading map...</p>
    </div>
  ),
})

export default function MapTestPage() {
  return <MapTest />
}
