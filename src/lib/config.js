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
  museum:     { fill: '#14b8a6', border: '#0d9488' },
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

export { SITE, TYPE_LABELS, TYPE_ICONS, ENTITY_MARKER_COLORS, getEntityMarkerColor }
