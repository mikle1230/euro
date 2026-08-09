import Header from '@/components/header'
import Footer from '@/components/footer'
import Breadcrumb from '@/components/breadcrumb'
import TypeBadge from '@/components/type-badge'
import AttractionGallery from '@/components/attraction-gallery'
import InfoGrid from '@/components/info-grid'
import NearbyAttractions from '@/components/nearby-attractions'
import { getAllCountries, getAttractionInfo } from '@/lib/data'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const countries = getAllCountries()
  const params = []
  for (const c of countries) {
    for (const city of c.cities) {
      for (const attr of city.attractions) {
        params.push({ country: c.id, city: city.id, attraction: attr.id })
      }
    }
  }
  return params
}

export async function generateMetadata({ params }) {
  const { country: countryId, city: cityId, attraction: attractionId } = await params
  const countries = getAllCountries()
  const country = countries.find((c) => c.id === countryId)
  const city = country?.cities.find((ci) => ci.id === cityId)
  const attraction = city?.attractions.find((a) => a.id === attractionId)
  if (!attraction) return { title: '未找到' }
  return {
    title: `${attraction.name} · ${city.name} · ${country.name}`,
    description: attraction.description?.slice(0, 160) || `了解${attraction.name}`,
  }
}

export default async function AttractionPage({ params }) {
  const { country: countryId, city: cityId, attraction: attractionId } = await params
  const countries = getAllCountries()
  const country = countries.find((c) => c.id === countryId)
  if (!country) notFound()
  const city = country.cities.find((ci) => ci.id === cityId)
  if (!city) notFound()
  const attraction = city.attractions.find((a) => a.id === attractionId)
  if (!attraction) notFound()

  const extraInfo = getAttractionInfo(attraction.id)

  const attractionWithContext = {
    ...attraction,
    city: { id: city.id, name: city.name, nameEn: city.nameEn },
    country: { id: country.id, name: country.name, nameEn: country.nameEn },
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="px-4 md:px-8" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <Breadcrumb items={[
            { label: '探索图集', href: '/explore' },
            { label: country.name, href: `/explore/${country.id}` },
            { label: city.name, href: `/explore/${country.id}/${city.id}` },
            { label: attraction.name },
          ]} />

          {/* Gallery */}
          <AttractionGallery attraction={attractionWithContext} />

          {/* Meta info */}
          <div className="mt-6 flex flex-wrap items-center gap-3 mb-6">
            <TypeBadge type={attraction.type} />
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {country.name} · {city.name}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
            {attraction.name}
          </h1>
          {attraction.nameEn && (
            <p className="text-base italic mb-6" style={{ color: 'var(--text-tertiary)' }}>
              {attraction.nameEn}
            </p>
          )}

          {/* Hidden metadata for Pagefind indexing */}
          <div data-pagefind-meta={`country:${country.name}, city:${city.name}, type:${attraction.type}`} className="hidden" />
          <div data-pagefind-body className="hidden">
            {attraction.name} {attraction.nameEn} {country.name} {country.nameEn} {city.name} {city.nameEn}
          </div>

          {/* Description */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
              简介
            </h2>
            <div className="prose max-w-none">
              <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {attraction.description}
              </p>
            </div>
          </section>

          {/* Tips */}
          {attraction.tips && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                旅行贴士
              </h2>
              <div
                className="p-5 rounded-xl"
                style={{ background: 'var(--accent-subtle)', borderLeft: '3px solid var(--accent)' }}
              >
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {attraction.tips}
                </p>
              </div>
            </section>
          )}

          {/* Info grid */}
          {extraInfo && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                实用信息
              </h2>
              <InfoGrid info={extraInfo} />
            </section>
          )}

          {/* External links */}
          <section className="mb-10 flex flex-wrap gap-3">
            {extraInfo?.officialUrl && (
              <a
                href={extraInfo.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 hover:shadow-sm"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                🌐 官方网站
              </a>
            )}
            {attraction.image_search_url && (
              <a
                href={attraction.image_search_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 hover:shadow-sm"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                📷 图片搜索
              </a>
            )}
          </section>

          {/* Nearby */}
          <NearbyAttractions
            attractions={city.attractions.map((a) => ({
              ...a,
              city: { id: city.id, name: city.name, nameEn: city.nameEn },
              country: { id: country.id, name: country.name, nameEn: country.nameEn },
            }))}
            currentId={attraction.id}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
