import Header from '@/components/header'
import Footer from '@/components/footer'
import Breadcrumb from '@/components/breadcrumb'
import AttractionCard from '@/components/attraction-card'
import ScrollReveal from '@/components/scroll-reveal'
import { getCountryById, getAllCountries } from '@/lib/data'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const countries = getAllCountries()
  const params = []
  for (const c of countries) {
    for (const city of c.cities) {
      params.push({ country: c.id, city: city.id })
    }
  }
  return params
}

export async function generateMetadata({ params }) {
  const { country: countryId, city: cityId } = await params
  const country = getCountryById(countryId)
  const city = country?.cities.find((ci) => ci.id === cityId)
  if (!city) return { title: '未找到' }
  return {
    title: `${city.name} · ${country.name}`,
    description: `探索${country.name}${city.name}的${city.attractions.length}个景点`,
  }
}

export default async function CityPage({ params }) {
  const { country: countryId, city: cityId } = await params
  const country = getCountryById(countryId)
  if (!country) notFound()
  const city = country.cities.find((ci) => ci.id === cityId)
  if (!city) notFound()

  const attractionsWithContext = city.attractions.map((a) => ({
    ...a,
    city: { id: city.id, name: city.name, nameEn: city.nameEn },
    country: { id: country.id, name: country.name, nameEn: country.nameEn },
  }))

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="px-4 md:px-8" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Breadcrumb items={[
            { label: '探索图集', href: '/explore' },
            { label: country.name, href: `/explore/${country.id}` },
            { label: city.name },
          ]} />

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {city.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <span>{country.name} · {city.nameEn}</span>
              <span>·</span>
              <span>{city.attractions.length} 个景点</span>
            </div>
          </div>
        </div>

        {/* Attractions grid */}
        <section className="px-4 md:px-8 py-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {attractionsWithContext.map((attr) => (
              <ScrollReveal key={attr.id}>
                <AttractionCard attraction={attr} />
              </ScrollReveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
