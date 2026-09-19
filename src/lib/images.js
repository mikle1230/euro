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

import imageManifest from '@/data/image-manifest.json'

// 真实存在的图片清单（public/images 扫描产物，见 scripts/build-image-manifest.mjs）。
// 只有清单里的 id 才会渲染 <img>，其余直接走占位梯度 —— 缺图不再产生 404 请求。
const CITY_IMAGE_IDS = new Set(imageManifest.cities)
const ATTRACTION_IMAGE_IDS = new Set(imageManifest.attractions)

/** 城市图路径；仓库里没有该城市的图时返回 null（交给占位逻辑）。 */
export function getCityImagePath(cityId) {
  if (!cityId || !CITY_IMAGE_IDS.has(cityId)) return null
  return `/images/cities/${cityId}.jpg`
}

/** 景点主图路径；没有图时返回 null（交给占位逻辑）。 */
export function getAttractionImagePath(attractionId) {
  if (!attractionId || !ATTRACTION_IMAGE_IDS.has(attractionId)) return null
  return `/images/attractions/${attractionId}.jpg`
}

/**
 * 景点图片组的候选源：主图 + {id}-1/2/3 附加图，只返回磁盘上真实存在的。
 * 返回空数组时调用方直接渲染占位，省掉旧的隐藏探测 <img>（那会发 404）。
 */
export function getAttractionImageSources(attractionId) {
  if (!attractionId) return []
  const candidates = [attractionId, `${attractionId}-1`, `${attractionId}-2`, `${attractionId}-3`]
  return candidates
    .filter((id) => ATTRACTION_IMAGE_IDS.has(id))
    .map((id) => `/images/attractions/${id}.jpg`)
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
