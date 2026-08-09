import Header from '@/components/header'
import Footer from '@/components/footer'
import CountryCard from '@/components/country-card'
import ScrollReveal from '@/components/scroll-reveal'
import Link from 'next/link'
import { getAllCountries, getFeaturedAttractions } from '@/lib/data'

export const metadata = {
  title: '探索图集',
  description: '按国家浏览欧洲旅行知识库，24 个国家、84 座城市、137 个目的地。',
}

export default function ExplorePage() {
  const countries = getAllCountries()
  const featured = getFeaturedAttractions()

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero header */}
        <div className="px-4 md:px-8 pt-12 pb-6 text-center" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            探索图集
          </h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            按国家浏览欧洲旅行知识库 · {countries.length} 个国家
          </p>
          <div className="mt-5">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm transition-all duration-200 hover:shadow-sm"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              搜索目的地
            </Link>
          </div>
        </div>

        {/* Countries grid */}
        <section className="px-4 md:px-8 py-8" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
            {countries.map((country) => (
              <ScrollReveal key={country.id}>
                <CountryCard country={country} />
              </ScrollReveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
