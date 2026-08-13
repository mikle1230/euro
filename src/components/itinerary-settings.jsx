'use client'

import { updateItineraryMeta } from '@/lib/itinerary-store'

export default function ItinerarySettings({ itinerary, onClose }) {
  const set = (field, value) => updateItineraryMeta(itinerary.id, { [field]: value })

  const inputStyle = {
    background: 'var(--bg-card)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
  }
  const labelStyle = { color: 'var(--text-tertiary)' }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl p-4 w-80 max-w-[90vw]"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>行程设置</h3>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--text-tertiary)' }}>✕</button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs mb-0.5 block" style={labelStyle}>开始日期</label>
            <input
              type="date"
              value={itinerary.startDate || ''}
              onChange={(e) => set('startDate', e.target.value)}
              className="w-full px-2 py-1.5 rounded text-xs border outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs mb-0.5 block" style={labelStyle}>结束日期</label>
            <input
              type="date"
              value={itinerary.endDate || ''}
              onChange={(e) => set('endDate', e.target.value)}
              className="w-full px-2 py-1.5 rounded text-xs border outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs mb-0.5 block" style={labelStyle}>团号</label>
            <input
              type="text"
              value={itinerary.tourCode || ''}
              onChange={(e) => set('tourCode', e.target.value)}
              placeholder="如 TL2024-001"
              className="w-full px-2 py-1.5 rounded text-xs border outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs mb-0.5 block" style={labelStyle}>团人数</label>
            <input
              type="number"
              value={itinerary.groupSize || ''}
              onChange={(e) => set('groupSize', parseInt(e.target.value) || 0)}
              placeholder="30"
              min="0"
              className="w-full px-2 py-1.5 rounded text-xs border outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="mt-2.5">
          <label className="text-xs mb-0.5 block" style={labelStyle}>备注</label>
          <textarea
            value={itinerary.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="内部备注..."
            rows={2}
            className="w-full px-2 py-1.5 rounded text-xs border outline-none resize-none"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  )
}
