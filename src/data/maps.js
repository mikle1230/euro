// Google My Maps 列表
// 新增一张图：在 MAPS 里加一行即可，左侧列表和搜索会自动带上
// group：用于分组（如「北欧」「西欧」「主题图」），留空归到「未分组」
// note：可选，列表里的小字说明（如「2026 夏」「酒店+餐厅」）
// 国家分组显示顺序（未列出的分组排在后面，按添加顺序）
export const GROUP_ORDER = ['冰岛', '挪威', '瑞典', '丹麦', '芬兰', '意大利', '其他']

export const MAPS = [
  { mid: '15mNXV_q5YES1DmwC4kMlUUCHqMwghGo', label: '冰岛', group: '冰岛' },
  { mid: '1LsaRGYuCakiBT7zt9QjcEpFUcyLjBbA', label: '地图 2', group: '未命名' },
  { mid: '1EUo7zZ9Nbz-aegFu639ptLPNftdeEsg', label: '地图 3', group: '未命名' },
]

export const embedUrl = (mid) =>
  `https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F&noprof=1`

export const openUrl = (mid) =>
  `https://www.google.com/maps/d/edit?mid=${mid}&usp=sharing`
