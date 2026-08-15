// scripts/build-quos-cities.js
// One-shot build: node scripts/build-quos-cities.js
// Reads Cities.xlsx（项目根目录优先，回退 KT 路径）+ euro-travel.json → outputs quos-cities.json
// Reads KT 巴黎景点.xlsx → outputs quos-attractions.json

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// Cities.xlsx 优先用项目根目录的副本（可复现构建）；找不到再回退到 KT 知识库路径
const LOCAL_CITIES = path.join(__dirname, '../Cities.xlsx')
const KT_CITIES = '/Users/michael/Projects/KT/系统拷贝列表/Cities.xlsx'
const CITIES_PATH = fs.existsSync(LOCAL_CITIES) ? LOCAL_CITIES : KT_CITIES
const ATTRACTIONS_PATH = '/Users/michael/Projects/KT/系统拷贝列表/巴黎景点.xlsx'
const TRAVEL_DATA_PATH = path.join(__dirname, '../src/data/europe-travel.json')
const OUT_CITIES = path.join(__dirname, '../src/data/quos-cities.json')
const OUT_ATTRACTIONS = path.join(__dirname, '../src/data/quos-attractions.json')

// ---- Build quos-cities.json ----
function buildCities() {
  const wb = XLSX.readFile(CITIES_PATH)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // data[0] = ['Link', null, 'City Name', 'City Code', 'Phone Prefix', 'Latitude', 'Longitude', 'City ID', 'Country Code']
  // Valid city rows: col 2 (City Name) and col 3 (City Code) both present and not "TO BE DELETED"

  const lookup = {}

  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    const cityName = row[2]
    const cityCode = row[3]
    const countryCode = row[8]

    if (!cityName || !cityCode) continue
    if (cityName === 'TO BE DELETED' || cityCode === 'TO BE DELETED') continue
    if (!countryCode || countryCode.length !== 2) continue

    // Index by English name
    lookup[cityName] = { cityCode, countryCode }
  }

  // Cross-reference with europe-travel.json for Chinese name mapping
  const travelData = JSON.parse(fs.readFileSync(TRAVEL_DATA_PATH, 'utf-8'))
  let chineseMatchCount = 0

  for (const country of travelData.countries) {
    for (const city of country.cities) {
      if (city.nameEn && lookup[city.nameEn]) {
        // Chinese name → same data
        lookup[city.name] = lookup[city.nameEn]
        chineseMatchCount++
      }
    }
  }

  // 扩展中文键：精选常用欧洲城市表（scripts/curated-cities.cjs，含不在 europe-travel.json
  // 里的城市，如 圣特罗佩→Saint Tropez→JSZ）。已有键不覆盖。
  const curatedCities = require('./curated-cities.cjs')
  let curatedMatchCount = 0
  for (const [cn, en] of curatedCities) {
    if (!lookup[cn] && lookup[en]) {
      lookup[cn] = lookup[en]
      curatedMatchCount++
    }
  }

  console.log(`quos-cities.json: ${Object.keys(lookup).length} keys (${chineseMatchCount} europe-travel + ${curatedMatchCount} curated Chinese names)`)
  fs.writeFileSync(OUT_CITIES, JSON.stringify(lookup, null, 2))
}

// ---- Build quos-attractions.json ----
function buildAttractions() {
  if (!fs.existsSync(ATTRACTIONS_PATH)) {
    console.log('巴黎景点.xlsx not found, writing empty quos-attractions.json')
    fs.writeFileSync(OUT_ATTRACTIONS, '{}')
    return
  }

  const wb = XLSX.readFile(ATTRACTIONS_PATH)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // data[0] = ['原文名称', '标准中文译名', '景点简介（行程游览用途）']
  const lookup = {}

  for (let i = 1; i < data.length; i++) {
    const originalName = data[i][0]   // e.g. "EIFFEL TOWER"
    const chineseName = data[i][1]    // e.g. "埃菲尔铁塔"
    if (originalName && chineseName) {
      lookup[chineseName] = originalName
    }
  }

  console.log(`quos-attractions.json: ${Object.keys(lookup).length} entries`)
  fs.writeFileSync(OUT_ATTRACTIONS, JSON.stringify(lookup, null, 2))
}

// ---- Run ----
buildCities()
buildAttractions()
console.log('Done.')
