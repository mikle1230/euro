import { getAllCountries } from '@/lib/data'
import { SITE } from '@/lib/config'

export async function GET() {
  const countries = getAllCountries()
  const urls = []

  // Home
  urls.push({ loc: SITE.url, priority: '1.0' })
  urls.push({ loc: `${SITE.url}/explore`, priority: '0.9' })
  urls.push({ loc: `${SITE.url}/learn`, priority: '0.8' })
  urls.push({ loc: `${SITE.url}/passport`, priority: '0.7' })
  urls.push({ loc: `${SITE.url}/search`, priority: '0.6' })

  // Countries, cities, attractions
  for (const country of countries) {
    urls.push({
      loc: `${SITE.url}/explore/${country.id}`,
      priority: '0.8',
    })
    for (const city of country.cities) {
      urls.push({
        loc: `${SITE.url}/explore/${country.id}/${city.id}`,
        priority: '0.7',
      })
      for (const attr of city.attractions) {
        urls.push({
          loc: `${SITE.url}/explore/${country.id}/${city.id}/${attr.id}`,
          priority: '0.6',
        })
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
