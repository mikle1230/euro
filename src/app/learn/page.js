'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import DailyPostcard from '@/components/daily-postcard'
import ScrollReveal from '@/components/scroll-reveal'
import AttractionCard from '@/components/attraction-card'
import StreakBadge from '@/components/streak-badge'
import ProgressBar from '@/components/progress-bar'
import { getStats, getReviewQueue, getTodayDestination } from '@/lib/learning'
import { getAttractionById, getAllAttractionsFlat } from '@/lib/data'

export default function LearnPage() {
  const [stats, setStats] = useState(null)
  const [reviewQueue, setReviewQueue] = useState([])

  useEffect(() => {
    setStats(getStats())
    setReviewQueue(getReviewQueue())
  }, [])

  const total = getAllAttractionsFlat().length

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="px-4 md:px-8 pt-10 pb-4" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 className="text-3xl font-display font-bold tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>
            📮 每日一景
          </h1>
          <p className="text-sm text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
            每天认识一个欧洲角落，逐步走遍整个大陆
          </p>
        </div>

        {/* Today's card */}
        <section className="px-4 md:px-8 pt-6 pb-8" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <DailyPostcard />
        </section>

        {/* Progress dashboard */}
        {stats && (
          <section className="px-4 md:px-8 py-8" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <ScrollReveal>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="text-2xl font-display font-bold" style={{ color: 'var(--accent)' }}>{stats.learned}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>已学 / {total}</div>
                </div>
                <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="text-2xl font-display font-bold" style={{ color: 'var(--gold)' }}>{stats.streak}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>连续天数</div>
                </div>
                <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="text-2xl font-display font-bold" style={{ color: 'var(--accent)' }}>{stats.countriesCovered}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>国家覆盖</div>
                </div>
                <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="text-2xl font-display font-bold" style={{ color: 'var(--gold)' }}>{stats.saved}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>已收藏</div>
                </div>
              </div>

              <div className="mb-8 px-1">
                <ProgressBar learned={stats.learned} total={total} />
              </div>
            </ScrollReveal>
          </section>
        )}

        {/* Review queue */}
        {reviewQueue.length > 0 && (
          <section className="px-4 md:px-8 py-8" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                  💪 温故知新
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
      </main>
      <Footer />
    </>
  )
}
