// Google My Maps 列表：新增一张图只需在数组里加一行（label 用于切换标签）
export const MAPS = [
  { mid: '15mNXV_q5YES1DmwC4kMlUUCHqMwghGo', label: '冰岛' },
  { mid: '1LsaRGYuCakiBT7zt9QjcEpFUcyLjBbA', label: '新地图' },
]

export const embedUrl = (mid) =>
  `https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F&noprof=1`

export const openUrl = (mid) =>
  `https://www.google.com/maps/d/edit?mid=${mid}&usp=sharing`
