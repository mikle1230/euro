'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function MapTestInner() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    if (!containerRef.current) return
    initRef.current = true

    const map = L.map(containerRef.current).setView([48.8566, 2.3522], 5)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM',
    }).addTo(map)

    L.circleMarker([48.8566, 2.3522], {
      radius: 10,
      fillColor: '#14b8a6',
      color: '#fff',
      weight: 2,
      fillOpacity: 0.8,
    })
      .addTo(map)
      .bindPopup('Paris')

    L.circleMarker([52.52, 13.405], {
      radius: 10,
      fillColor: '#14b8a6',
      color: '#fff',
      weight: 2,
      fillOpacity: 0.8,
    })
      .addTo(map)
      .bindPopup('Berlin')

    mapRef.current = map
    console.log('✅ Map initialized with vanilla Leaflet')

    return () => {
      map.remove()
      mapRef.current = null
      initRef.current = false
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />
}
