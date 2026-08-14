const SITE = {
  name: 'Euro Atlas',
  tagline: '每天认识一个欧洲角落',
  description: '欧洲旅行知识大全 — 按国家、城市、景点浏览，每日一景逐步探索整个欧洲。',
  url: 'https://euro.831225.xyz',
}

const TYPE_LABELS = {
  landmark: '地标',
  museum: '博物馆',
  nature: '自然',
  hotel: '酒店',
  restaurant: '餐厅',
  transport: '交通',
  guide: '导游',
}

const TYPE_ICONS = {
  landmark: '🏛️',
  museum: '🏺',
  nature: '🌿',
  hotel: '🏨',
  restaurant: '🍽️',
  transport: '🚌',
  guide: '🧑‍💼',
}

const ENTITY_MARKER_COLORS = {
  landmark:   { fill: '#d4a854', border: '#b8933a' },
  museum:     { fill: '#4984AC', border: '#3a6f96' },
  nature:     { fill: '#4a9e4a', border: '#358535' },
  hotel:      { fill: '#4a8fcf', border: '#3570a5' },
  restaurant: { fill: '#e8784a', border: '#c05a30' },
  transport:  { fill: '#8b5cf6', border: '#6d3fd4' },
  guide:      { fill: '#718096', border: '#556677' },
}

function getEntityMarkerColor(type, subtype) {
  const key = type === 'attraction' ? subtype || 'landmark' : type
  return ENTITY_MARKER_COLORS[key] || ENTITY_MARKER_COLORS.landmark
}

const EMPTY_TEXT = {
  noItems: '暂无项目',
  allFree: '已全部隐藏',
}

const CURRENCY_SYMBOLS = {
  EUR: '€',
  GBP: '£',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  SEK: 'kr',
  DKK: 'kr',
  NOK: 'kr',
  USD: '$',
}

const MAP = {
  initialCenter: [50, 10],
  initialZoom: 6,
  defaultZoom: 4.5, // 默认视野缩放（用户已确认固定 4.5，勿改为 4.3）
  entityVisibleZoom: 8, // 实体标记（景点/酒店/餐厅）在 zoom > 该值时显示
}

export { SITE, TYPE_LABELS, TYPE_ICONS, ENTITY_MARKER_COLORS, MAP, EMPTY_TEXT, CURRENCY_SYMBOLS, getEntityMarkerColor }
