import Header from '@/components/header'
import Footer from '@/components/footer'
import Breadcrumb from '@/components/breadcrumb'
import CityCard from '@/components/city-card'
import ImageWithPlaceholder from '@/components/image-with-placeholder'
import ScrollReveal from '@/components/scroll-reveal'
import { getCountryById, getCountryCoverImage } from '@/lib/data'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const { getAllCountries } = await import('@/lib/data')
  return getAllCountries().map((c) => ({ country: c.id }))
}

export async function generateMetadata({ params }) {
  const { country } = await params
  const data = getCountryById(country)
  if (!data) return { title: '未找到' }
  return {
    title: `${data.name} (${data.nameEn})`,
    description: data.description || `探索${data.name}的旅行目的地`,
  }
}

export default async function CountryPage({ params }) {
  const { country: countryId } = await params
  const country = getCountryById(countryId)
  if (!country) notFound()

  const cityCount = country.cities.length
  const attractionCount = country.cities.reduce((sum, c) => sum + c.attractions.length, 0)

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="px-4 md:px-8" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Breadcrumb items={[{ label: '探索图集', href: '/explore' }, { label: country.name }]} />

          {/* Country hero */}
          <div className="mb-10">
            <ImageWithPlaceholder
              src={getCountryCoverImage(country.id)}
              alt={country.name}
              name={country.name}
              subtitle={country.nameEn}
              variant="country"
              size="hero"
              className="rounded-2xl overflow-hidden"
            />
          </div>

          {/* Description */}
          {country.description && (
            <div className="mb-8 max-w-2xl">
              <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {country.description}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-4 mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <span>{cityCount} 座城市</span>
            <span>·</span>
            <span>{attractionCount} 个景点</span>
          </div>
        </div>

        {/* Cities section */}
        <section className="px-4 md:px-8 py-6" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 className="text-lg font-display font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
            城市
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
            {country.cities.map((city) => (
              <ScrollReveal key={city.id}>
                <CityCard city={{ ...city, country: { id: country.id, name: country.name, nameEn: country.nameEn } }} />
              </ScrollReveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
