// 给没有坐标的景点补「城市坐标 + 微小确定性偏移」作为占位近似坐标，
// 使其可显示在地图上、并支持「周边景点」跨城距离计算。
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const travelPath = path.join(root, 'src/data/europe-travel.json')
const travel = JSON.parse(fs.readFileSync(travelPath, 'utf8'))

let patched = 0
for (const c of travel.countries) {
  for (const city of c.cities) {
    if (city.lat == null || city.lng == null) continue
    let i = 0
    for (const a of (city.attractions || [])) {
      if (a.lat != null && a.lng != null) continue
      // 3×3 网格微偏移（约 ±200m），避免同城景点完全重叠
      const dLat = ((i % 3) - 1) * 0.002
      const dLng = ((Math.floor(i / 3) % 3) - 1) * 0.002
      a.lat = Number((city.lat + dLat).toFixed(4))
      a.lng = Number((city.lng + dLng).toFixed(4))
      patched++
      i++
    }
  }
}

fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2) + '\n')
console.log(`✅ 已给 ${patched} 个景点补城市坐标（占位近似）`)
