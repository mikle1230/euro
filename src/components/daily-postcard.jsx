'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageWithPlaceholder from './image-with-placeholder'
import TypeBadge from './type-badge'
import StreakBadge from './streak-badge'
import ProgressBar from './progress-bar'
import { getAttractionImage } from '@/lib/images'
import { getTodayDestination, getLearningState, markAsLearned, isLearnedToday, getStats } from '@/lib/learning'
import { getAttractionById } from '@/lib/data'

export default function DailyPostcard() {
  const [expanded, setExpanded] = useState(false)
  const [learned, setLearned] = useState(false)
  const [attraction, setAttraction] = useState(null)
  const [stats, setStats] = useState({ learned: 0, total: 137, streak: 0 })
  const [todayId, setTodayId] = useState(null)

  useEffect(() => {
    const { attractionId, total } = getTodayDestination()
    setTodayId(attractionId)
    const attr = getAttractionById(attractionId)
    setAttraction(attr)
    setStats({ ...getStats(), total })
    setLearned(isLearnedToday())
  }, [])

  function handleLearn() {
    if (!attraction) return
    markAsLearned(attraction.id)
    setLearned(true)
    setStats(getStats())
  }

  if (!attraction) {
    return (
      <div className="animate-pulse rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', height: '400px' }} />
    )
  }

  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

  return (
    <div className="relative">
      <div
        className={`rounded-2xl overflow-hidden border transition-all duration-500 ${
          expanded ? 'shadow-xl' : 'shadow-md hover:shadow-lg'
        }`}
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
      >
        {/* Hero image */}
        <div className="relative cursor-pointer" onClick={() => !learned && setExpanded(!expanded)}>
          <ImageWithPlaceholder
            src={getAttractionImage(attraction.id)}
            alt={attraction.name}
            name={attraction.name}
            type={attraction.type}
            variant="attraction"
            size="hero"
            countryName={attraction.country?.name}
            cityName={attraction.city?.name}
          />

          {/* Learned stamp */}
          {learned && (
            <div className="absolute top-4 right-4 z-10">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transform rotate-12"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                ✓
              </div>
            </div>
          )}

          {/* Date & expand hint */}
          <div className="absolute top-4 left-4 z-10">
            <div className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
              style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}>
              📮 {dateStr}
            </div>
          </div>
          {!learned && !expanded && (
            <div className="absolute bottom-4 right-4 z-10">
              <span className="px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm transition-colors"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                点击展开 →
              </span>
            </div>
          )}
        </div>

        {/* Expanded content */}
        {expanded && !learned && (
          <div className="p-5 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TypeBadge type={attraction.type} />
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {attraction.country?.name} · {attraction.city?.name}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                  {attraction.name}
                </h2>
                {attraction.nameEn && (
                  <p className="text-sm mt-1 italic" style={{ color: 'var(--text-tertiary)' }}>
                    {attraction.nameEn}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none mb-6" style={{ color: 'var(--text-secondary)' }}>
              <p className="leading-relaxed">{attraction.description}</p>
            </div>

            {/* Tips */}
            {attraction.tips && (
              <div className="p-4 rounded-xl mb-6" style={{ background: 'var(--accent-subtle)', borderLeft: `3px solid var(--accent)` }}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>💡 旅行贴士</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{attraction.tips}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleLearn}
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                ✅ 我已了解这个地方
              </button>
              <Link
                href={`/explore/${attraction.country?.id}/${attraction.city?.id}/${attraction.id}`}
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                查看完整信息 →
              </Link>
              <button
                onClick={() => setExpanded(false)}
                className="px-5 py-2.5 rounded-full text-sm transition-all duration-300"
                style={{ color: 'var(--text-tertiary)' }}
              >
                收起
              </button>
            </div>
          </div>
        )}

        {/* Learned state */}
        {learned && (
          <div className="p-5 md:p-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                  ✅ 今日已打卡
                </p>
                <h2 className="text-xl font-display font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {attraction.name}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  明天再来认识一个新地方！
                </p>
              </div>
              <Link
                href="/passport"
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border hover:bg-[var(--bg-surface)]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                📔 查看我的护照 →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="mt-4 flex flex-wrap items-center gap-4 px-1">
        <StreakBadge streak={stats.streak} />
        <div className="flex-1 min-w-[120px]">
          <ProgressBar learned={stats.learned} total={stats.total} />
        </div>
      </div>
    </div>
  )
}
