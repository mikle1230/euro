// Google My Maps 列表：新增一张图只需在数组里加一行（label 用于切换标签）
export const MAPS = [
  { mid: '15mNXV_q5YES1DmwC4kMlUUCHqMwghGo', label: '冰岛' },
  { mid: '1LsaRGYuCakiBT7zt9QjcEpFUcyLjBbA', label: '地图 2' },
  { mid: '1EUo7zZ9Nbz-aegFu639ptLPNftdeEsg', label: '地图 3' },
]

export const embedUrl = (mid) =>
  `https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F&noprof=1`

export const openUrl = (mid) =>
  `https://www.google.com/maps/d/edit?mid=${mid}&usp=sharing`
