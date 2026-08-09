import Header from '@/components/header'
import Footer from '@/components/footer'
import DailyPostcard from '@/components/daily-postcard'
import CountryCard from '@/components/country-card'
import ScrollReveal from '@/components/scroll-reveal'
import RecentlyLearned from './recently-learned'
import { getAllCountries, getStats } from '@/lib/data'
import { SITE } from '@/lib/config'

export default function Home() {
  const countries = getAllCountries()
  const { countryCount, attractionCount } = getStats()

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero section */}
        <section className="px-4 md:px-8 pt-8 md:pt-12 pb-6" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="text-center mb-8">
            <h1 className="text-sm font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--gold)' }}>
              {SITE.tagline}
            </h1>
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {SITE.name} · {countryCount} 个国家 · {attractionCount} 个目的地
            </p>
          </div>

          <DailyPostcard />
        </section>

        {/* Explore section */}
        <section className="px-4 md:px-8 py-12" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                🗺️ 探索图集 · 按国家浏览
              </h2>
              <div className="h-px flex-1" style={{ background: 'var(--border-color)' }} />
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4 stagger-children">
            {countries.map((country) => (
              <ScrollReveal key={country.id}>
                <CountryCard country={country} />
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Recently learned */}
        <RecentlyLearned />
      </main>
      <Footer />
    </>
  )
}
