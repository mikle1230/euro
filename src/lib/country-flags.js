// 国家库 ID -> ISO 3166-1 alpha-2 二字码（用于国旗文件名 /flags/{iso}.svg）。
// 纯数据，无副作用；服务端 / 客户端通用（勿加 'use client'）。
// 注意：country-meta.json 的 abbr 部分用的是 QUOS/展示码（united-kingdom -> UK），
// 而国旗文件名必须用 ISO 码（UK 的 ISO 是 GB），所以这里显式维护国家 ID -> ISO 映射。
const COUNTRY_ISO = {
  'united-kingdom': 'gb',
  'france': 'fr',
  'germany': 'de',
  'italy': 'it',
  'spain': 'es',
  'portugal': 'pt',
  'netherlands': 'nl',
  'belgium': 'be',
  'switzerland': 'ch',
  'austria': 'at',
  'greece': 'gr',
  'sweden': 'se',
  'norway': 'no',
  'denmark': 'dk',
  'ireland': 'ie',
  'poland': 'pl',
  'czech-republic': 'cz',
  'hungary': 'hu',
  'croatia': 'hr',
  'turkey': 'tr',
  'finland': 'fi',
  'iceland': 'is',
  'estonia': 'ee',
  'montenegro': 'me',
  'russia': 'ru',
  'bulgaria': 'bg',
  'luxembourg': 'lu',
  'serbia': 'rs',
  'cyprus': 'cy',
  'latvia': 'lv',
  'monaco': 'mc',
  'slovakia': 'sk',
  'slovenia': 'si',
  'lithuania': 'lt',
  'romania': 'ro',
  'malta': 'mt',
}

// 根据国家库 ID 返回 ISO 二字码；未知国家返回 null（调用方自行回退）。
export function countryIsoCode(countryId) {
  return COUNTRY_ISO[countryId] || null
}
