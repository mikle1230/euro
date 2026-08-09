/**
 * Image resolution for the Euro site.
 *
 * Strategy: local images only. Each attraction/city/country has a designated
 * path in public/images/. If the file exists (loaded via <img>), it displays.
 * If not, the ImageWithPlaceholder component renders a styled CSS gradient.
 *
 * The user adds images by dropping files into public/images/ following the
 * naming convention: <id>.jpg
 */

export function getCountryImage(countryId) {
  return `/images/countries/${countryId}.jpg`
}

export function getCityImage(cityId) {
  return `/images/cities/${cityId}.jpg`
}

export function getAttractionImage(attractionId) {
  return `/images/attractions/${attractionId}.jpg`
}

/**
 * Generate deterministic gradient colors from a name string.
 * Returns { from, to, text } – colors for a placeholder gradient.
 */
export function getPlaceholderColors(name, type) {
  const hash = [...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0)
  const typePalettes = {
    landmark: { hue: 30, sat: 25 },   // warm stone
    museum: { hue: 210, sat: 15 },    // cool marble
    nature: { hue: 140, sat: 20 },    // forest green
  }
  const p = typePalettes[type] || typePalettes.landmark
  const h1 = (p.hue + (hash % 30) - 15) % 360
  const h2 = (h1 + 20) % 360
  return {
    from: `hsl(${h1}, ${p.sat}%, 28%)`,
    to: `hsl(${h2}, ${p.sat}%, 18%)`,
    text: `hsl(${h1}, ${p.sat + 10}%, 85%)`,
  }
}

/**
 * Generate a color palette for country card placeholders.
 */
export function getCountryPlaceholderColors(name) {
  const hash = [...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0)
  const h = hash % 360
  return {
    from: `hsl(${h}, 30%, 35%)`,
    to: `hsl(${(h + 40) % 360}, 25%, 20%)`,
    text: `hsl(${h}, 20%, 88%)`,
  }
}
