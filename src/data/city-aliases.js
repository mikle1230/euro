// 城市别名表（单一数据源）：集中维护「名称变体 → 规范名」映射。
// 三个查找模块（码查找 / 城市匹配 / 酒店库）各取所需，避免别名散落多处、改一处漏一处。

// ① 中文名变体 → europe-travel.json 标准中文名（city-match 匹配用，避免重复建城）
export const CN_NAME_ALIASES = {
  琉森: '卢塞恩',
  苏莲托: '索伦托',
}

// ② 码查找别名 → 英文规范名 / Cities.xlsx 本地拼写（quos-mapping getCityCode 用）
export const CITY_CODE_ALIASES = {
  // 中文名变体（同城不同译名）
  '琉森': '卢塞恩',
  '圣特罗佩': 'Saint Tropez',
  '锡拉库扎': 'Siracusa',
  '锡拉库萨': 'Siracusa',
  // 英文 → 本地拼写（Cities.xlsx 用本地名）
  'Milan': 'Milano',
  'Genoa': 'Genova',
  // 中文 → 本地/英文拼写
  '米兰': 'Milan',
  '安特卫普': 'Antwerpen',
  '根特': 'Gent',
  '法兰克福': 'Frankfurt am Main',
  '塞维利亚': 'Sevilla',
  '圣米歇尔山': 'Mont-St-Michel',
  '庞贝': 'Pompei',
  '奥勒松': 'Aalesund',
  '特罗姆瑟': 'Tromsoe',
  '特伦特河畔斯托克': 'Stoke on Trent',
  // 中国出发城市（不在 europe-travel.json）
  '北京': 'Beijing',
  '上海': 'Shanghai',
  '广州': 'Guangzhou',
  '深圳': 'Shenzhen',
  '成都': 'Chengdu',
  '西安': 'Xi An',
}

// ③ 酒店库别名 → 英文规范名（hotel-recommendations.js 的 nameEn 键）
export const HOTEL_ALIASES = {
  瓦朗索勒: 'Valensole',
  圣特罗佩: 'Saint Tropez',
  奇维塔维基亚: 'Civitavecchia',
  那不勒斯: 'Naples',
  苏莲托: 'Sorrento',
  阿尔贝罗贝洛: 'Alberobello',
  波西塔诺: 'Positano',
  巴勒莫: 'Palermo',
  阿格里真托: 'Agrigento',
  锡拉库扎: 'Siracusa',
  锡拉库萨: 'Siracusa',
  陶尔米纳: 'Taormina',
  热那亚: 'Genoa',
  因特拉肯: 'Interlaken',
  卢塞恩: 'Lucerne',
  琉森: 'Lucerne',
  马赛: 'Marseille',
  塞维利亚: 'Seville',
  波尔图: 'Porto',
}
