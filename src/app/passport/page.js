'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import PassportStamp from '@/components/passport-stamp'
import ProgressBar from '@/components/progress-bar'
import StreakBadge from '@/components/streak-badge'
import AttractionCard from '@/components/attraction-card'
import ScrollReveal from '@/components/scroll-reveal'
import { getLearningState, getSavedAttractions, getStats, getReviewQueue } from '@/lib/learning'
import { getAllAttractionsFlat, getAllCountries } from '@/lib/data'

export default function PassportPage() {
  const [learnedAttractions, setLearnedAttractions] = useState([])
  const [savedAttractions, setSavedAttractions] = useState([])
  const [reviewQueue, setReviewQueue] = useState([])
  const [stats, setStats] = useState(null)
  const [countryProgress, setCountryProgress] = useState([])

  useEffect(() => {
    const state = getLearningState()
    const all = getAllAttractionsFlat()
    const learned = state.learned
      .map((id) => all.find((a) => a.id === id))
      .filter(Boolean)
      .reverse()
    setLearnedAttractions(learned)
    setSavedAttractions(getSavedAttractions())
    setReviewQueue(getReviewQueue())
    setStats(getStats())

    // Country progress
    const countries = getAllCountries()
    const progress = countries.map((c) => {
      const total = c.cities.reduce((sum, city) => sum + city.attractions.length, 0)
      const done = c.cities.reduce((sum, city) =>
        sum + city.attractions.filter((a) => state.learned.includes(a.id)).length, 0)
      return { ...c, total, done }
    }).filter((c) => c.total > 0)
    setCountryProgress(progress)
  }, [])

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="px-4 md:px-8 pt-10 pb-4" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h1 className="text-3xl font-display font-bold tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>
            📔 我的旅行护照
          </h1>
          <p className="text-sm text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
            收集每一个探索过的角落
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <section className="px-4 md:px-8 py-6" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="flex justify-center mb-4">
              <StreakBadge streak={stats.streak} />
            </div>
            <ProgressBar learned={stats.learned} total={stats.total} />
            <div className="flex justify-center gap-6 mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <span>🏛️ {stats.countriesCovered} 个国家</span>
              <span>⭐ {stats.saved} 个收藏</span>
            </div>
          </section>
        )}

        {/* Country progress */}
        {countryProgress.length > 0 && (
          <section className="px-4 md:px-8 py-6" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: 'var(--text-tertiary)' }}>
              按国家
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {countryProgress.map((c) => (
                <div key={c.id} className="p-3 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${c.total > 0 ? Math.round((c.done / c.total) * 100) : 0}%`,
                          background: c.done > 0 ? 'var(--accent)' : 'transparent',
                        }}
                      />
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      {c.done}/{c.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Learned stamps */}
        {learnedAttractions.length > 0 && (
          <section className="px-4 md:px-8 py-8" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: 'var(--accent-dim)' }} />
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                  ✅ 已收集 · {learnedAttractions.length} 枚
                </h2>
                <div className="h-px flex-1" style={{ background: 'var(--accent-dim)' }} />
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 stagger-children">
              {learnedAttractions.map((attr) => (
                <ScrollReveal key={attr.id}>
                  <PassportStamp attraction={attr} />
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}

        {/* Saved/wishlist */}
        {savedAttractions.length > 0 && (
          <section className="px-4 md:px-8 py-8" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                  ⭐ 收藏清单 · {savedAttractions.length} 个
                </h2>
                <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {savedAttractions.map((attr) => (
                <ScrollReveal key={attr.id}>
                  <AttractionCard attraction={attr} />
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}

        {/* Review queue */}
        {reviewQueue.length > 0 && (
          <section className="px-4 md:px-8 py-8" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                  💪 复习建议
                </h2>
                <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {reviewQueue.map((attr) => (
                <ScrollReveal key={attr.id}>
                  <AttractionCard attraction={attr} />
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {learnedAttractions.length === 0 && (
          <section className="px-4 py-16 text-center" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div className="text-5xl mb-4">📔</div>
            <h2 className="text-lg font-display font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              还没有收集任何印章
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              回到首页开始今天的探索，每次学习都会在这里留下一枚印章。
            </p>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
