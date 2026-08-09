import travelData from '@/data/europe-travel.json'
import exploreConfig from '@/data/explore-config.json'
import attractionInfo from '@/data/attraction-info.json'

const { countries } = travelData

export function getAllCountries() {
  return countries
}

export function getCountryById(id) {
  return countries.find((c) => c.id === id) || null
}

export function getCityById(id) {
  for (const c of countries) {
    const city = c.cities.find((ci) => ci.id === id)
    if (city) return { ...city, country: { id: c.id, name: c.name, nameEn: c.nameEn } }
  }
  return null
}

export function getAttractionById(id) {
  for (const c of countries) {
    for (const city of c.cities) {
      const attr = city.attractions.find((a) => a.id === id)
      if (attr) {
        return {
          ...attr,
          city: { id: city.id, name: city.name, nameEn: city.nameEn },
          country: { id: c.id, name: c.name, nameEn: c.nameEn },
        }
      }
    }
  }
  return null
}

export function getAllAttractionsFlat() {
  const list = []
  for (const c of countries) {
    for (const city of c.cities) {
      for (const attr of city.attractions) {
        list.push({
          ...attr,
          city: { id: city.id, name: city.name, nameEn: city.nameEn },
          country: { id: c.id, name: c.name, nameEn: c.nameEn },
        })
      }
    }
  }
  return list
}

export function getFeaturedAttractions() {
  return exploreConfig.featured
    .map((id) => getAttractionById(id))
    .filter(Boolean)
}

export function getPopularCities() {
  return exploreConfig.popularCities
    .map((id) => getCityById(id))
    .filter(Boolean)
}

export function getAttractionInfo(id) {
  return attractionInfo[id] || null
}

export function getStats() {
  let cityCount = 0
  let attractionCount = 0
  for (const c of countries) {
    cityCount += c.cities.length
    for (const city of c.cities) {
      attractionCount += city.attractions.length
    }
  }
  return {
    countryCount: countries.length,
    cityCount,
    attractionCount,
  }
}

export function getCountryCoverImage(countryId) {
  // Returns path; component handles loading/fallback
  return `/images/countries/${countryId}.jpg`
}

export function getAttractionImagePath(attractionId) {
  return `/images/attractions/${attractionId}.jpg`
}

export function getCityImagePath(cityId) {
  return `/images/cities/${cityId}.jpg`
}

export function getAllCitiesWithCoords() {
  const cities = []
  for (const c of countries) {
    for (const city of c.cities) {
      cities.push({
        id: city.id,
        name: city.name,
        nameEn: city.nameEn,
        lat: city.lat,
        lng: city.lng,
        country: { id: c.id, name: c.name, nameEn: c.nameEn },
        attractionCount: city.attractions.length,
      })
    }
  }
  return cities
}

export function getCountryCentroids() {
  const centroids = {}
  for (const c of countries) {
    const coords = c.cities.filter((city) => city.lat != null && city.lng != null)
    if (coords.length === 0) continue
    centroids[c.id] = {
      lat: coords.reduce((s, city) => s + city.lat, 0) / coords.length,
      lng: coords.reduce((s, city) => s + city.lng, 0) / coords.length,
      name: c.name,
      nameEn: c.nameEn,
      cityCount: coords.length,
    }
  }
  return centroids
}
