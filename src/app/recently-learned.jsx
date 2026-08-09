'use client'

import { useState, useEffect } from 'react'
import { getLearningState } from '@/lib/learning'
import { getAllAttractionsFlat } from '@/lib/data'
import PassportStamp from '@/components/passport-stamp'
import ScrollReveal from '@/components/scroll-reveal'
import Link from 'next/link'

export default function RecentlyLearned() {
  const [learnedAttractions, setLearnedAttractions] = useState([])

  useEffect(() => {
    const state = getLearningState()
    if (state.learned.length === 0) return
    const all = getAllAttractionsFlat()
    const recent = state.learned
      .slice(-6)
      .reverse()
      .map((id) => all.find((a) => a.id === id))
      .filter(Boolean)
    setLearnedAttractions(recent)
  }, [])

  if (learnedAttractions.length === 0) return null

  return (
    <section className="px-4 md:px-8 py-12" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <ScrollReveal>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-px w-8" style={{ background: 'var(--gold)' }} />
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
              📔 最近收集
            </h2>
          </div>
          <Link
            href="/passport"
            className="text-xs font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            查看全部 →
          </Link>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 stagger-children">
        {learnedAttractions.map((attr) => (
          <ScrollReveal key={attr.id}>
            <PassportStamp attraction={attr} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
